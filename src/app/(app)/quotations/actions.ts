"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  nextQuotationNumber,
  convertQuotationToInvoice,
} from "@/lib/quotation";
import { recordActivity } from "@/lib/activity";

export type QState = { error?: string; success?: string } | undefined;

const itemSchema = z.object({
  kind: z.enum(["product", "section", "note"]).default("product"),
  productId: z.string().optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  priceLak: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(1).optional(),
});

const schema = z.object({
  customerId: z.string().min(1, "ເລືອກລູກຄ້າ"),
  reference: z.string().optional(),
  validUntil: z.string().optional(),
  currency: z.enum(["LAK", "USD", "THB"]),
  exchangeRate: z.coerce.number().min(0).default(1),
  vatMode: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT"]),
  vatRate: z.coerce.number().min(0).max(1),
  discount: z.coerce.number().min(0).default(0),
  note: z.string().optional(),
});

function parseItems(formData: FormData) {
  const raw = String(formData.get("items") ?? "[]");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => itemSchema.safeParse(r))
      .filter((p) => p.success)
      .map(
        (p) => (p as { success: true; data: z.infer<typeof itemSchema> }).data,
      );
  } catch {
    return [];
  }
}

type QuoteLineCreate = {
  lineType: "PRODUCT" | "SECTION" | "NOTE";
  productId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  priceLak: number;
  discount: number;
  total: number;
  taxRate: number;
  taxAmount: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function fetchProductSnapshot(
  items: ReturnType<typeof parseItems>,
  defaultTaxRate: number,
) {
  const productLines = items.filter((i) => i.kind === "product" && i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productLines.map((i) => i.productId!) } },
    select: { id: true, name: true, unit: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((it): QuoteLineCreate => {
    if (it.kind !== "product") {
      return {
        lineType: it.kind === "section" ? "SECTION" : "NOTE",
        productId: null,
        productName: it.label?.trim() || (it.kind === "section" ? "Section" : "Note"),
        unit: "",
        quantity: 0,
        priceLak: 0,
        discount: 0,
        total: 0,
        taxRate: 0,
        taxAmount: 0,
      };
    }
    if (!it.productId) throw new Error("Product not found");
    const p = byId.get(it.productId);
    if (!p) throw new Error("Product not found");
    const total = Math.max(0, it.quantity * it.priceLak - it.discount);
    return {
      lineType: "PRODUCT",
      productId: it.productId,
      productName: p.name,
      unit: it.unit?.trim() || p.unit,
      quantity: it.quantity,
      priceLak: it.priceLak,
      discount: it.discount,
      total,
      taxRate: it.taxRate ?? defaultTaxRate,
      taxAmount: 0,
    };
  });
}

function computeTotals(args: {
  items: QuoteLineCreate[];
  vatMode: "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
  vatRate: number;
  invoiceDiscount: number;
}) {
  const subtotal = args.items.reduce((s, it) => s + it.total, 0);
  const afterDisc = Math.max(0, subtotal - args.invoiceDiscount);
  const discountRatio = subtotal > 0 ? afterDisc / subtotal : 0;
  let vatAmount = 0;

  for (const item of args.items) {
    if (item.lineType !== "PRODUCT" || args.vatMode === "EXEMPT") {
      item.taxAmount = 0;
      continue;
    }
    if (!item.taxRate) item.taxRate = args.vatRate;
    const base = item.total * discountRatio;
    item.taxAmount =
      args.vatMode === "INCLUSIVE"
        ? round2((base * item.taxRate) / (1 + item.taxRate))
        : round2(base * item.taxRate);
    vatAmount += item.taxAmount;
  }

  vatAmount = round2(vatAmount);
  const total = args.vatMode === "EXCLUSIVE" ? afterDisc + vatAmount : afterDisc;
  return { subtotal, vatAmount, total };
}

export async function createQuotation(
  _prev: QState,
  formData: FormData,
): Promise<QState> {
  const session = await requireUser();
  const parsed = schema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    reference: String(formData.get("reference") ?? "").trim(),
    validUntil: String(formData.get("validUntil") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    exchangeRate: String(formData.get("exchangeRate") ?? "1"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    discount: String(formData.get("discount") ?? "0"),
    note: String(formData.get("note") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = await fetchProductSnapshot(
    parseItems(formData),
    parsed.data.vatRate,
  );
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    invoiceDiscount: parsed.data.discount,
  });

  const number = await nextQuotationNumber();
  const created = await prisma.quotation.create({
    data: {
      number,
      customerId: parsed.data.customerId,
      userId: session.userId,
      reference: parsed.data.reference || null,
      validUntil: parsed.data.validUntil
        ? new Date(parsed.data.validUntil)
        : null,
      currency: parsed.data.currency,
      exchangeRate: parsed.data.exchangeRate,
      vatMode: parsed.data.vatMode,
      vatRate: parsed.data.vatRate,
      discount: parsed.data.discount,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      note: parsed.data.note || null,
      items: { create: items },
    },
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "CREATE",
    recordType: "Quotation",
    recordId: created.id,
    summary: `ສ້າງໃບສະເໜີລາຄາ ${number} (${totals.total.toLocaleString()} ${parsed.data.currency})`,
  });

  revalidatePath("/quotations");
  redirect(`/quotations/${created.id}`);
}

export async function updateQuotation(
  id: string,
  _prev: QState,
  formData: FormData,
): Promise<QState> {
  const session = await requireUser();
  const cur = await prisma.quotation.findUnique({
    where: { id },
    select: { status: true, number: true },
  });
  if (!cur) return { error: "ບໍ່ພົບ quotation" };
  if (cur.status === "CONVERTED")
    return { error: "ກາຍເປັນບິນແລ້ວ — ແກ້ໄຂບໍ່ໄດ້" };

  const parsed = schema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    reference: String(formData.get("reference") ?? "").trim(),
    validUntil: String(formData.get("validUntil") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    exchangeRate: String(formData.get("exchangeRate") ?? "1"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    discount: String(formData.get("discount") ?? "0"),
    note: String(formData.get("note") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = await fetchProductSnapshot(
    parseItems(formData),
    parsed.data.vatRate,
  );
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    invoiceDiscount: parsed.data.discount,
  });

  await prisma.$transaction([
    prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
    prisma.quotation.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        reference: parsed.data.reference || null,
        validUntil: parsed.data.validUntil
          ? new Date(parsed.data.validUntil)
          : null,
        currency: parsed.data.currency,
        exchangeRate: parsed.data.exchangeRate,
        vatMode: parsed.data.vatMode,
        vatRate: parsed.data.vatRate,
        discount: parsed.data.discount,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        note: parsed.data.note || null,
        items: { create: items },
      },
    }),
  ]);

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "UPDATE",
    recordType: "Quotation",
    recordId: id,
    summary: `ແກ້ໄຂໃບສະເໜີລາຄາ ${cur.number}`,
  });
  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function markQuotationSent(id: string): Promise<void> {
  const session = await requireUser();
  const q = await prisma.quotation.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    select: { number: true },
  });
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "ISSUE",
    recordType: "Quotation",
    recordId: id,
    summary: `ສົ່ງໃບສະເໜີລາຄາ ${q.number}`,
  });
  revalidatePath(`/quotations/${id}`);
}

export async function acceptQuotation(id: string): Promise<void> {
  const session = await requireUser();
  const q = await prisma.quotation.update({
    where: { id },
    data: { status: "ACCEPTED", decidedAt: new Date() },
    select: { number: true },
  });
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "UPDATE",
    recordType: "Quotation",
    recordId: id,
    summary: `ລູກຄ້າຍອມຮັບໃບສະເໜີລາຄາ ${q.number}`,
  });
  revalidatePath(`/quotations/${id}`);
}

export async function rejectQuotation(id: string): Promise<void> {
  const session = await requireUser();
  const q = await prisma.quotation.update({
    where: { id },
    data: { status: "REJECTED", decidedAt: new Date() },
    select: { number: true },
  });
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "CANCEL",
    recordType: "Quotation",
    recordId: id,
    summary: `ລູກຄ້າປະຕິເສດໃບສະເໜີລາຄາ ${q.number}`,
  });
  revalidatePath(`/quotations/${id}`);
}

export async function deleteQuotation(id: string): Promise<void> {
  const session = await requireUser();
  const q = await prisma.quotation.findUnique({
    where: { id },
    select: { number: true },
  });
  await prisma.quotation.delete({ where: { id } });
  if (q) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "DELETE",
      recordType: "Quotation",
      recordId: id,
      summary: `ລົບໃບສະເໜີລາຄາ ${q.number}`,
    });
  }
  revalidatePath("/quotations");
  redirect("/quotations");
}

export type ConvertResult =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; error: string };

export async function convertToInvoice(id: string): Promise<ConvertResult> {
  const session = await requireUser();
  const result = await convertQuotationToInvoice(id, session.userId);
  if (result.ok) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "ISSUE",
      recordType: "Invoice",
      recordId: result.invoiceId,
      summary: `ສ້າງບິນ ${result.invoiceNumber} ຈາກໃບສະເໜີລາຄາ`,
    });
  }
  return result;
}
