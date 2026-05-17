"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { nextBillingInvoiceNumber } from "@/lib/billing";
import { recordAudit } from "@/lib/audit";
import { BillingStatus } from "@/generated/master/client";

export type BillingState = { error?: string; success?: string } | undefined;

// ───────────────────────── Item math ─────────────────────────

const itemInputSchema = z.object({
  kind: z.enum(["product", "section", "note"]).default("product"),
  lineType: z.enum(["PRODUCT", "SECTION", "NOTE"]).optional(),
  productId: z.string().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().max(40).optional(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
});

type ItemInput = z.infer<typeof itemInputSchema>;

type Totals = {
  items: (ItemInput & { total: number; taxAmount: number; sn: number })[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  amount: number;
};

function computeTotals(args: {
  items: ItemInput[];
  vatMode: "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
  vatRate: number;
  invoiceDiscount: number;
}): Totals {
  const items = args.items.map((it, i) => {
    const kind: "product" | "section" | "note" =
      it.lineType === "SECTION" || it.kind === "section"
        ? "section"
        : it.lineType === "NOTE" || it.kind === "note"
          ? "note"
          : "product";
    if (kind !== "product") {
      const lineType: "SECTION" | "NOTE" =
        kind === "section" ? "SECTION" : "NOTE";
      return {
        ...it,
        kind,
        lineType,
        productId: undefined,
        unit: "",
        quantity: 0,
        unitPrice: 0,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        sn: i + 1,
        total: 0,
      };
    }
    const lineDiscount = it.discount ?? 0;
    const total = Math.max(0, it.quantity * it.unitPrice - lineDiscount);
    return {
      ...it,
      kind,
      lineType: "PRODUCT" as const,
      discount: lineDiscount,
      taxRate: it.taxRate ?? args.vatRate,
      taxAmount: 0,
      unit: it.unit ?? "ໜ່ວຍ",
      sn: i + 1,
      total,
    };
  });

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const afterDiscount = Math.max(0, subtotal - args.invoiceDiscount);
  const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;
  let vatAmount = 0;
  let grandTotal = afterDiscount;
  if (args.vatMode === "EXEMPT") {
    vatAmount = 0;
    grandTotal = afterDiscount;
  } else {
    for (const it of items) {
      if (it.kind !== "product") continue;
      const taxableBase = it.total * discountRatio;
      it.taxAmount =
        args.vatMode === "INCLUSIVE"
          ? Math.round(((taxableBase * (it.taxRate ?? 0)) / (1 + (it.taxRate ?? 0))) * 100) / 100
          : Math.round(taxableBase * (it.taxRate ?? 0) * 100) / 100;
      vatAmount += it.taxAmount;
    }
    vatAmount = Math.round(vatAmount * 100) / 100;
  }
  if (args.vatMode === "EXCLUSIVE") {
    grandTotal = afterDiscount + vatAmount;
  } else if (args.vatMode === "INCLUSIVE") {
    grandTotal = afterDiscount;
  }

  return {
    items,
    subtotal,
    discount: args.invoiceDiscount,
    vatAmount,
    amount: grandTotal,
  };
}

/**
 * FormData carries items as a single JSON-encoded "items" field, matching
 * the tenant invoice form pattern. Drops rows where description is empty.
 */
function parseItems(formData: FormData): ItemInput[] {
  const raw = String(formData.get("items") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: ItemInput[] = [];
  for (const r of parsed) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const description = String(o.description ?? "").trim();
    if (!description) continue;
    const rawKind = String(o.kind ?? o.lineType ?? "product").toUpperCase();
    const kind: "product" | "section" | "note" =
      rawKind === "SECTION" ? "section" : rawKind === "NOTE" ? "note" : "product";
    out.push({
      kind,
      lineType: kind === "section" ? "SECTION" : kind === "note" ? "NOTE" : "PRODUCT",
      productId:
        kind === "product" && typeof o.productId === "string" && o.productId.trim()
          ? o.productId.trim()
          : undefined,
      description,
      unit: String(o.unit ?? "ໜ່ວຍ").trim() || "ໜ່ວຍ",
      quantity: Number(o.quantity ?? 1) || 0,
      unitPrice: Number(o.unitPrice ?? 0) || 0,
      discount: Number(o.discount ?? 0) || 0,
      taxRate: Number(o.taxRate ?? 0.1) || 0,
    });
  }
  return out;
}

// ───────────────────────── Invoice CRUD ─────────────────────────

const invoiceSchema = z.object({
  customerId: z.string().min(1, "ເລືອກລູກຄ້າ"),
  description: z.string().min(1, "ໃສ່ຫົວເລື່ອງ").max(500),
  currency: z.enum(["LAK", "USD", "THB"]),
  vatMode: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT"]),
  vatRate: z.coerce.number().min(0).max(1),
  invoiceDiscount: z.coerce.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createBillingInvoice(
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const mgmt = await requireManagement();
  const parsed = invoiceSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    invoiceDiscount: String(formData.get("invoiceDiscount") ?? "0"),
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  for (const it of items) {
    if (!itemInputSchema.safeParse(it).success) {
      return { error: "ຂໍ້ມູນລາຍການບໍ່ຖືກຕ້ອງ" };
    }
  }

  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    invoiceDiscount: parsed.data.invoiceDiscount,
  });

  const number = await nextBillingInvoiceNumber();
  const created = await masterPrisma.billingInvoice.create({
    data: {
      number,
      customerId: parsed.data.customerId,
      description: parsed.data.description,
      currency: parsed.data.currency,
      vatMode: parsed.data.vatMode,
      vatRate: parsed.data.vatRate,
      subtotal: totals.subtotal,
      discount: totals.discount,
      vatAmount: totals.vatAmount,
      amount: totals.amount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes || null,
      createdBy: mgmt.managementUserId,
      items: {
        create: totals.items.map((it) => ({
          lineType: it.lineType ?? "PRODUCT",
          sn: it.sn,
          productId: it.productId ?? null,
          description: it.description,
          unit: it.unit ?? "ໜ່ວຍ",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount ?? 0,
          taxRate: it.taxRate ?? 0,
          taxAmount: it.taxAmount,
          total: it.total,
        })),
      },
    },
  });

  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "billing.create",
    entityType: "BillingInvoice",
    entityId: created.id,
    entityLabel: created.number,
    metadata: { amount: totals.amount, customerId: parsed.data.customerId },
  });

  revalidatePath("/manage/billing");
  redirect(`/manage/billing/${created.id}`);
}

export async function updateBillingInvoice(
  id: string,
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const mgmt = await requireManagement();
  const parsed = invoiceSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    invoiceDiscount: String(formData.get("invoiceDiscount") ?? "0"),
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };

  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    invoiceDiscount: parsed.data.invoiceDiscount,
  });

  // Replace items wholesale — simpler than reconciling diffs.
  const [, updated] = await masterPrisma.$transaction([
    masterPrisma.billingInvoiceItem.deleteMany({ where: { invoiceId: id } }),
    masterPrisma.billingInvoice.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        description: parsed.data.description,
        currency: parsed.data.currency,
        vatMode: parsed.data.vatMode,
        vatRate: parsed.data.vatRate,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vatAmount: totals.vatAmount,
        amount: totals.amount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        notes: parsed.data.notes || null,
        items: {
          create: totals.items.map((it) => ({
            lineType: it.lineType ?? "PRODUCT",
            sn: it.sn,
            productId: it.productId ?? null,
            description: it.description,
            unit: it.unit ?? "ໜ່ວຍ",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount ?? 0,
            taxRate: it.taxRate ?? 0,
            taxAmount: it.taxAmount,
            total: it.total,
          })),
        },
      },
      select: { number: true },
    }),
  ]);
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "billing.update",
    entityType: "BillingInvoice",
    entityId: id,
    entityLabel: updated.number,
    metadata: { amount: totals.amount },
  });

  revalidatePath("/manage/billing");
  revalidatePath(`/manage/billing/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

// ───────────────────────── Status actions ─────────────────────────

const markPaidSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  paymentRef: z.string().optional(),
  paidAt: z.string().optional(),
});

export async function markBillingPaid(
  id: string,
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const mgmt = await requireManagement();
  const parsed = markPaidSchema.safeParse({
    paymentMethod: String(formData.get("paymentMethod") ?? "CASH"),
    paymentRef: String(formData.get("paymentRef") ?? "").trim(),
    paidAt: String(formData.get("paidAt") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const inv = await masterPrisma.billingInvoice.update({
    where: { id },
    data: {
      status: BillingStatus.PAID,
      paymentMethod: parsed.data.paymentMethod,
      paymentRef: parsed.data.paymentRef || null,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
    },
    select: { number: true, amount: true },
  });
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "billing.mark-paid",
    entityType: "BillingInvoice",
    entityId: id,
    entityLabel: inv.number,
    metadata: { method: parsed.data.paymentMethod, amount: inv.amount },
  });

  revalidatePath("/manage/billing");
  revalidatePath(`/manage/billing/${id}`);
  return { success: "✓ ບັນທຶກການຈ່າຍແລ້ວ" };
}

export async function cancelBillingInvoice(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.billingInvoice.update({
    where: { id },
    data: { status: BillingStatus.CANCELLED },
  });
  revalidatePath("/manage/billing");
  revalidatePath(`/manage/billing/${id}`);
}

export async function deleteBillingInvoice(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.billingInvoice.delete({ where: { id } });
  revalidatePath("/manage/billing");
  redirect("/manage/billing");
}

// ───────────────────────── BillingConfig (unchanged) ─────────────────────────

const configSchema = z.object({
  invoicePrefix: z.string().min(1).max(20),
  yearlyProductId: z.string().optional(),
  lifetimeProductId: z.string().optional(),
  sellerName: z.string().min(1).max(200),
  sellerNameEn: z.string().optional(),
  sellerTaxId: z.string().optional(),
  sellerAddress: z.string().optional(),
  sellerPhone: z.string().optional(),
  sellerBankAccount: z.string().optional(),
  sellerBankName: z.string().optional(),
  sellerBankAccountName: z.string().optional(),
});

export async function saveBillingConfig(
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  await requireManagement();
  const parsed = configSchema.safeParse({
    invoicePrefix: String(formData.get("invoicePrefix") ?? "BIL-").trim(),
    yearlyProductId: String(formData.get("yearlyProductId") ?? "").trim(),
    lifetimeProductId: String(formData.get("lifetimeProductId") ?? "").trim(),
    sellerName: String(formData.get("sellerName") ?? "").trim(),
    sellerNameEn: String(formData.get("sellerNameEn") ?? "").trim(),
    sellerTaxId: String(formData.get("sellerTaxId") ?? "").trim(),
    sellerAddress: String(formData.get("sellerAddress") ?? "").trim(),
    sellerPhone: String(formData.get("sellerPhone") ?? "").trim(),
    sellerBankAccount: String(formData.get("sellerBankAccount") ?? "").trim(),
    sellerBankName: String(formData.get("sellerBankName") ?? "").trim(),
    sellerBankAccountName: String(
      formData.get("sellerBankAccountName") ?? "",
    ).trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const data = {
    invoicePrefix: parsed.data.invoicePrefix,
    yearlyProductId: parsed.data.yearlyProductId || null,
    lifetimeProductId: parsed.data.lifetimeProductId || null,
    sellerName: parsed.data.sellerName,
    sellerNameEn: parsed.data.sellerNameEn || null,
    sellerTaxId: parsed.data.sellerTaxId || null,
    sellerAddress: parsed.data.sellerAddress || null,
    sellerPhone: parsed.data.sellerPhone || null,
    sellerBankAccount: parsed.data.sellerBankAccount || null,
    sellerBankName: parsed.data.sellerBankName || null,
    sellerBankAccountName: parsed.data.sellerBankAccountName || null,
  };
  await masterPrisma.billingConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  revalidatePath("/manage/company");
  return { success: "✓ ບັນທຶກສຳເລັດ" };
}
