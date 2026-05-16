"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  issueInvoice,
  queryInvoiceResult,
  cancelInvoice as etaxCancelInvoice,
  isEtaxConfigured,
  withEtaxCreds,
  type EtaxCreds,
  type EtaxIssueData,
  type EtaxLine,
  type EtaxParty,
} from "@/lib/etax";

// Resolve per-tenant credentials with env fallback. Gateway URL is global —
// the same MoF endpoint serves every TIN — but env/username/secret/issueCode
// can vary per tenant.
async function loadTenantEtaxCreds(): Promise<EtaxCreds> {
  const setting = await prisma.setting.findUnique({
    where: { id: "default" },
    select: {
      etaxEnv: true,
      etaxUsername: true,
      etaxSecret: true,
      etaxIssueCode: true,
    },
  });
  return {
    gateway: process.env.ETAX_GATEWAY_URL ?? "",
    env: ((setting?.etaxEnv || process.env.ETAX_ENV) ?? "dev") as
      | "dev"
      | "prod",
    username: setting?.etaxUsername || process.env.ETAX_USERNAME || "",
    secret: setting?.etaxSecret || process.env.ETAX_SECRET || "",
    issueCode: setting?.etaxIssueCode || process.env.ETAX_ISSUE_CODE || "",
  };
}

function generateSerialNum(): string {
  // 32 lowercase hex chars
  return crypto.randomBytes(16).toString("hex");
}

function dec(n: number, places = 2): string {
  return n.toFixed(places);
}

/** Format a tax rate decimal — match doc example ("0.1" not "0.100000"). */
function rate(r: number): string {
  // Remove trailing zeros: 0.10 → "0.1", 0.075 → "0.075"
  return String(parseFloat(r.toFixed(6)));
}

/** Round to 2 decimals to avoid floating point noise in totals. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the EtaxIssueData payload from a local invoice.
 * - For EXCLUSIVE VAT: line.priceLak is tax-free → taxExcluding = qty*price, taxAmount = ex*rate
 * - For INCLUSIVE VAT: line.priceLak includes tax → back it out
 * - For EXEMPT: taxRate "0", taxAmount "0"
 */
async function buildPayload(
  invoiceId: string,
  serialNum: string,
): Promise<
  | { ok: true; data: EtaxIssueData; warnings: string[] }
  | { ok: false; error: string }
> {
  const [invoice, setting] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
        reversed: {
          select: { etaxInvoiceNumber: true, etaxIssueTime: true },
        },
      },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);

  if (!invoice) return { ok: false, error: "ບໍ່ພົບບິນ" };
  if (invoice.status !== "ISSUED") {
    return { ok: false, error: "ສົ່ງໄດ້ສະເພາະບິນທີ່ສະຖານະ ISSUED" };
  }

  // Tax authority TIN — from .env (allowlist) or settings
  const issueCode = process.env.ETAX_ISSUE_CODE ?? setting?.taxId ?? "";
  if (!issueCode) {
    return { ok: false, error: "ບໍ່ມີ issueCode (ETAX_ISSUE_CODE ໃນ .env)" };
  }

  const sellerName = setting?.shopName ?? "Shop";
  const sellerCode = issueCode;
  const buyerCode = invoice.customer.taxId?.trim();
  if (!buyerCode) {
    return {
      ok: false,
      error: `ລູກຄ້າ "${invoice.customer.name}" ບໍ່ມີເລກອາກອນ (TIN). ກະຣຸນາໃສ່ກ່ອນສົ່ງເຂົ້າ eTax`,
    };
  }

  const warnings: string[] = [];
  const vatRate = invoice.vatRate;
  const vatMode = invoice.vatMode as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
  const effectiveRate = vatMode === "EXEMPT" ? 0 : vatRate;

  // Build line items — round each amount to 2 decimals to keep totals consistent
  const lines: EtaxLine[] = invoice.items.map((it, idx) => {
    const qty = it.quantity;
    const price = it.priceLak;
    let taxExcluding: number;
    let taxAmt: number;
    if (vatMode === "INCLUSIVE") {
      const gross = qty * price - it.discount;
      taxExcluding = round2(gross / (1 + vatRate));
      taxAmt = round2(gross - taxExcluding);
    } else if (vatMode === "EXEMPT") {
      taxExcluding = round2(qty * price - it.discount);
      taxAmt = 0;
    } else {
      // EXCLUSIVE
      taxExcluding = round2(qty * price - it.discount);
      taxAmt = round2(taxExcluding * vatRate);
    }
    const taxIncluding = round2(taxExcluding + taxAmt);

    return {
      sn: idx + 1,
      description: it.productName,
      unitPrice: dec(price, 2),
      quantity: dec(qty, 3),
      unit: it.unit,
      taxExcludingAmount: dec(taxExcluding, 2),
      taxAmount: dec(taxAmt, 2),
      taxIncludingAmount: dec(taxIncluding, 2),
      taxList: [
        {
          sn: 1,
          taxType: "001",
          taxRate: rate(effectiveRate),
          taxAmount: dec(taxAmt, 2),
        },
      ],
    };
  });

  // Sum from rounded line values so totals match exactly
  const totalTaxExcluding = round2(
    lines.reduce((s, l) => s + Number(l.taxExcludingAmount), 0),
  );
  const totalTax = round2(
    lines.reduce((s, l) => s + Number(l.taxAmount), 0),
  );

  // Parties
  const parties: EtaxParty[] = [
    {
      sn: 1,
      partyType: "001",
      code: sellerCode,
      name: sellerName,
      ...(setting?.address ? { fullAddress: setting.address } : {}),
      ...(setting?.phone ? { telephone: setting.phone } : {}),
      ...(setting?.email ? { email: setting.email } : {}),
    },
    {
      sn: 2,
      partyType: "003",
      code: buyerCode,
      name: invoice.customer.name,
      ...(invoice.customer.address
        ? { fullAddress: invoice.customer.address }
        : {}),
      ...(invoice.customer.phone
        ? { telephone: invoice.customer.phone }
        : {}),
      ...(invoice.customer.email ? { email: invoice.customer.email } : {}),
    },
  ];

  // Top-level taxList aggregate
  const taxListAgg: EtaxIssueData["taxList"] = [
    { sn: 1, taxType: "001", taxAmount: dec(totalTax, 2) },
  ];

  const data: EtaxIssueData = {
    serialNum,
    issueType: invoice.isCreditNote ? 1 : 0,
    issueCode,
    supplierCode: sellerCode,
    buyerCode,
    totalNetAmount: dec(totalTaxExcluding, 2),
    totalTaxAmount: dec(totalTax, 2),
    remarks: invoice.note ?? undefined,
    partyList: parties,
    taxList: taxListAgg,
    lineList: lines,
  };

  // Credit note specifics
  if (invoice.isCreditNote) {
    if (!invoice.reversed?.etaxInvoiceNumber) {
      return {
        ok: false,
        error:
          "ໃບລົດໜີ້: ບິນຕົ້ນສະບັບຍັງບໍ່ໄດ້ສົ່ງເຂົ້າ eTax (ບໍ່ມີ etaxInvoiceNumber)",
      };
    }
    data.originalInvoiceNumber = invoice.reversed.etaxInvoiceNumber;
    data.originalIssueTime = invoice.reversed.etaxIssueTime ?? "";
    // Each line needs originalLineSn — assume 1:1 mapping by sn
    data.lineList = lines.map((l, i) => ({ ...l, originalLineSn: i + 1 }));
  }

  return { ok: true, data, warnings };
}

export type SubmitResult =
  | {
      ok: true;
      invoiceNumber: string;
      issueTime: string;
      checkCode: string;
      url: string;
      requestId?: string;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      requestId?: string;
    };

/**
 * Submit a local invoice to the eTax gateway.
 * Idempotent — reuses an existing serialNum if one is already stored.
 */
export async function submitInvoiceToEtax(
  invoiceId: string,
): Promise<SubmitResult> {
  await requireUser();
  const creds = await loadTenantEtaxCreds();
  return withEtaxCreds(creds, () => submitInvoiceToEtaxInner(invoiceId));
}

async function submitInvoiceToEtaxInner(
  invoiceId: string,
): Promise<SubmitResult> {
  if (!isEtaxConfigured()) {
    return { ok: false, error: "eTax ບໍ່ໄດ້ກຳນົດຄ່າ — ໄປ Settings → eTax Gateway" };
  }

  // Already submitted successfully? Just return existing data
  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      etaxSerialNum: true,
      etaxInvoiceNumber: true,
      etaxIssueTime: true,
      etaxCheckCode: true,
      etaxQrUrl: true,
    },
  });
  if (existing?.etaxInvoiceNumber) {
    return {
      ok: true,
      invoiceNumber: existing.etaxInvoiceNumber,
      issueTime: existing.etaxIssueTime ?? "",
      checkCode: existing.etaxCheckCode ?? "",
      url: existing.etaxQrUrl ?? "",
    };
  }

  // Reuse serialNum if previously generated (retry scenario)
  const serialNum = existing?.etaxSerialNum ?? generateSerialNum();

  // Persist serialNum + submission timestamp first
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      etaxSerialNum: serialNum,
      etaxSubmittedAt: new Date(),
      etaxErrorCode: null,
      etaxErrorMsg: null,
    },
  });

  const built = await buildPayload(invoiceId, serialNum);
  if (!built.ok) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { etaxErrorCode: "BUILD_ERROR", etaxErrorMsg: built.error },
    });
    return { ok: false, error: built.error };
  }

  const res = await issueInvoice(built.data);
  if (!res.ok) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        etaxErrorCode: res.error.code ?? `HTTP_${res.error.status}`,
        etaxErrorMsg: res.error.message,
      },
    });
    return {
      ok: false,
      error: res.error.message,
      code: res.error.code,
      requestId: res.error.requestId,
    };
  }

  const result = res.data?.[0];
  if (!result) {
    return { ok: false, error: "ບໍ່ມີຂໍ້ມູນກັບມາຈາກ Gateway" };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      etaxInvoiceNumber: result.invoiceNumber,
      etaxIssueTime: result.issueTime,
      etaxCheckCode: result.checkCode,
      etaxQrUrl: result.url,
      etaxStatus: result.invoiceStatus,
      etaxErrorCode: null,
      etaxErrorMsg: null,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");

  return {
    ok: true,
    invoiceNumber: result.invoiceNumber,
    issueTime: result.issueTime,
    checkCode: result.checkCode,
    url: result.url,
    requestId: res.requestId,
  };
}

export type PollResult =
  | { ok: true; status: string; statusReason?: string; requestId?: string }
  | { ok: false; error: string; requestId?: string };

/** Refresh verification status from the gateway. */
export async function pollEtaxStatus(invoiceId: string): Promise<PollResult> {
  await requireUser();
  const creds = await loadTenantEtaxCreds();
  return withEtaxCreds(creds, () => pollEtaxStatusInner(invoiceId));
}

async function pollEtaxStatusInner(invoiceId: string): Promise<PollResult> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { etaxSerialNum: true },
  });
  if (!inv?.etaxSerialNum) {
    return { ok: false, error: "ບິນນີ້ຍັງບໍ່ໄດ້ສົ່ງເຂົ້າ eTax" };
  }

  const res = await queryInvoiceResult(inv.etaxSerialNum);
  if (!res.ok) {
    return {
      ok: false,
      error: res.error.message,
      requestId: res.error.requestId,
    };
  }

  const r = res.data?.[0];
  if (!r) return { ok: false, error: "ບໍ່ມີຂໍ້ມູນກັບມາ" };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      etaxStatus: r.invoiceStatus,
      etaxStatusReason: r.invoiceStatusReason ?? null,
      etaxLastCheckedAt: new Date(),
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return {
    ok: true,
    status: r.invoiceStatus,
    statusReason: r.invoiceStatusReason,
    requestId: res.requestId,
  };
}

/** Build payload without sending — for debugging the exact JSON we'd POST. */
export async function previewEtaxPayload(
  invoiceId: string,
): Promise<{ ok: boolean; payload?: unknown; error?: string }> {
  await requireUser();
  const creds = await loadTenantEtaxCreds();
  return withEtaxCreds(creds, async () => {
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { etaxSerialNum: true },
    });
    const serial = inv?.etaxSerialNum ?? generateSerialNum();
    const built = await buildPayload(invoiceId, serial);
    if (!built.ok) return { ok: false, error: built.error };
    return {
      ok: true,
      payload: {
        issueCode: creds.issueCode,
        data: built.data,
      },
    };
  });
}

/** Cancel on the tax server side (only valid when etaxStatus = "3" Invalid). */
export async function cancelEtaxInvoice(
  invoiceId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  await requireUser();
  const creds = await loadTenantEtaxCreds();
  return withEtaxCreds(creds, () => cancelEtaxInvoiceInner(invoiceId));
}

async function cancelEtaxInvoiceInner(
  invoiceId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { etaxInvoiceNumber: true, etaxIssueTime: true, etaxStatus: true },
  });
  if (!inv?.etaxInvoiceNumber || !inv.etaxIssueTime) {
    return { ok: false, error: "ບິນຍັງບໍ່ໄດ້ສົ່ງເຂົ້າ eTax" };
  }
  if (inv.etaxStatus !== "3") {
    return {
      ok: false,
      error: "cancelInvoice ໃຊ້ໄດ້ສະເພາະບິນທີ່ສະຖານະ Invalid (3) ໃນ eTax",
    };
  }

  const res = await etaxCancelInvoice({
    invoiceNumber: inv.etaxInvoiceNumber,
    issueTime: inv.etaxIssueTime,
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error.message,
      requestId: res.error.requestId,
    };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { etaxStatus: "6" },
  });
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, requestId: res.requestId };
}
