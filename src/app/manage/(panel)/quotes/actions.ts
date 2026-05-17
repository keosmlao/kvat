"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BillingQuoteStatus } from "@/generated/master/client";
import { recordAudit } from "@/lib/audit";
import { nextBillingInvoiceNumber, nextBillingQuoteNumber } from "@/lib/billing";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";

export type QuoteState = { error?: string; success?: string } | undefined;
export type ConvertQuoteState =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; error: string };

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

const quoteSchema = z.object({
  customerId: z.string().min(1, "ເລືອກລູກຄ້າ"),
  title: z.string().min(1, "ໃສ່ຫົວເລື່ອງ").max(500),
  currency: z.enum(["LAK", "USD", "THB"]),
  vatMode: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT"]),
  vatRate: z.coerce.number().min(0).max(1),
  discount: z.coerce.number().min(0),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

function parseItems(formData: FormData): ItemInput[] {
  const raw = String(formData.get("items") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const o = row as Record<string, unknown>;
    const description = String(o.description ?? "").trim();
    if (!description) return [];
    const rawKind = String(o.kind ?? o.lineType ?? "product").toUpperCase();
    const kind: "product" | "section" | "note" =
      rawKind === "SECTION" ? "section" : rawKind === "NOTE" ? "note" : "product";
    return [
      {
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
      },
    ];
  });
}

function computeTotals(args: {
  items: ItemInput[];
  vatMode: "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
  vatRate: number;
  discount: number;
}) {
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
    const discount = it.discount ?? 0;
    const total = Math.max(0, it.quantity * it.unitPrice - discount);
    return {
      ...it,
      kind,
      lineType: "PRODUCT" as const,
      discount,
      taxRate: it.taxRate ?? args.vatRate,
      taxAmount: 0,
      unit: it.unit ?? "ໜ່ວຍ",
      sn: i + 1,
      total,
    };
  });
  const subtotal = items.reduce((sum, it) => sum + it.total, 0);
  const afterDiscount = Math.max(0, subtotal - args.discount);
  const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;

  let vatAmount = 0;
  let amount = afterDiscount;
  if (args.vatMode !== "EXEMPT") {
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
    amount = afterDiscount + vatAmount;
  } else if (args.vatMode === "INCLUSIVE") {
    amount = afterDiscount;
  }

  return { items, subtotal, discount: args.discount, vatAmount, amount };
}

function parseQuote(formData: FormData) {
  return quoteSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    discount: String(formData.get("discount") ?? "0"),
    validUntil: String(formData.get("validUntil") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
}

export async function createBillingQuote(
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const mgmt = await requireManagement();
  const parsed = parseQuote(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  if (items.some((it) => !itemInputSchema.safeParse(it).success)) {
    return { error: "ຂໍ້ມູນລາຍການບໍ່ຖືກຕ້ອງ" };
  }

  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    discount: parsed.data.discount,
  });

  const created = await masterPrisma.billingQuote.create({
    data: {
      number: await nextBillingQuoteNumber(),
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      currency: parsed.data.currency,
      vatMode: parsed.data.vatMode,
      vatRate: parsed.data.vatRate,
      subtotal: totals.subtotal,
      discount: totals.discount,
      vatAmount: totals.vatAmount,
      amount: totals.amount,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      notes: parsed.data.notes || null,
      createdBy: mgmt.managementUserId,
      items: {
        create: totals.items.map((it) => ({
          lineType: it.lineType ?? "PRODUCT",
          sn: it.sn,
          productId: it.productId ?? null,
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
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
    action: "quote.create",
    entityType: "BillingQuote",
    entityId: created.id,
    entityLabel: created.number,
    metadata: { amount: totals.amount, customerId: parsed.data.customerId },
  });

  revalidatePath("/manage/quotes");
  redirect(`/manage/quotes/${created.id}`);
}

export async function updateBillingQuote(
  id: string,
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const mgmt = await requireManagement();
  const current = await masterPrisma.billingQuote.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) return { error: "ບໍ່ພົບໃບສະເໜີລາຄາ" };
  if (
    current.status === BillingQuoteStatus.ACCEPTED ||
    current.status === BillingQuoteStatus.REJECTED ||
    current.status === BillingQuoteStatus.CANCELLED
  ) {
    return { error: "ໃບສະເໜີລາຄານີ້ປິດ workflow ແລ້ວ — ແກ້ໄຂບໍ່ໄດ້" };
  }

  const parsed = parseQuote(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };

  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    discount: parsed.data.discount,
  });

  const [, updated] = await masterPrisma.$transaction([
    masterPrisma.billingQuoteItem.deleteMany({ where: { quoteId: id } }),
    masterPrisma.billingQuote.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        title: parsed.data.title,
        currency: parsed.data.currency,
        vatMode: parsed.data.vatMode,
        vatRate: parsed.data.vatRate,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vatAmount: totals.vatAmount,
        amount: totals.amount,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        notes: parsed.data.notes || null,
        items: {
          create: totals.items.map((it) => ({
            lineType: it.lineType ?? "PRODUCT",
            sn: it.sn,
            productId: it.productId ?? null,
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            taxRate: it.taxRate ?? 0,
            taxAmount: it.taxAmount,
            total: it.total,
          })),
        },
      },
      select: { number: true, amount: true },
    }),
  ]);

  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "quote.update",
    entityType: "BillingQuote",
    entityId: id,
    entityLabel: updated.number,
    metadata: { amount: updated.amount },
  });

  revalidatePath("/manage/quotes");
  revalidatePath(`/manage/quotes/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function setBillingQuoteStatus(
  id: string,
  status: BillingQuoteStatus,
): Promise<void> {
  const mgmt = await requireManagement();
  const quote = await masterPrisma.billingQuote.update({
    where: { id },
    data: { status },
    select: { number: true },
  });
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "quote.status",
    entityType: "BillingQuote",
    entityId: id,
    entityLabel: quote.number,
    metadata: { status },
  });
  revalidatePath("/manage/quotes");
  revalidatePath(`/manage/quotes/${id}`);
}

export async function convertBillingQuoteToInvoice(
  id: string,
): Promise<ConvertQuoteState> {
  const mgmt = await requireManagement();
  const quote = await masterPrisma.billingQuote.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!quote) return { ok: false, error: "ບໍ່ພົບໃບສະເໜີລາຄາ" };
  if (
    quote.status !== BillingQuoteStatus.SENT &&
    quote.status !== BillingQuoteStatus.ACCEPTED
  ) {
    return { ok: false, error: "ຕ້ອງສົ່ງ ຫຼື ຢືນຢັນກ່ອນສ້າງໃບເກັບເງິນ" };
  }
  if (quote.items.length === 0) return { ok: false, error: "ບໍ່ມີລາຍການ" };

  try {
    const invoice = await masterPrisma.$transaction(async (tx) => {
      const created = await tx.billingInvoice.create({
        data: {
          number: await nextBillingInvoiceNumber(),
          customerId: quote.customerId,
          description: quote.title,
          currency: quote.currency,
          vatMode: quote.vatMode,
          vatRate: quote.vatRate,
          subtotal: quote.subtotal,
          discount: quote.discount,
          vatAmount: quote.vatAmount,
          amount: quote.amount,
          notes: quote.notes,
          createdBy: mgmt.managementUserId,
          items: {
            create: quote.items.map((item) => ({
              lineType: item.lineType,
              sn: item.sn,
              productId: item.productId,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
        select: { id: true, number: true },
      });
      await tx.billingQuote.update({
        where: { id },
        data: { status: BillingQuoteStatus.ACCEPTED },
      });
      return created;
    });

    await recordAudit({
      actorId: mgmt.managementUserId,
      actorEmail: mgmt.email,
      action: "quote.convert-to-invoice",
      entityType: "BillingQuote",
      entityId: id,
      entityLabel: quote.number,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.number },
    });

    revalidatePath("/manage/quotes");
    revalidatePath(`/manage/quotes/${id}`);
    revalidatePath("/manage/billing");
    return { ok: true, invoiceId: invoice.id, invoiceNumber: invoice.number };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "ສ້າງໃບເກັບເງິນບໍ່ສຳເລັດ",
    };
  }
}

export async function deleteBillingQuote(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.billingQuote.delete({ where: { id } });
  revalidatePath("/manage/quotes");
  redirect("/manage/quotes");
}
