import "server-only";
import { prisma } from "./prisma";
import type { QuotationStatus } from "@/generated/prisma/client";

export function quotationStatusLabel(s: QuotationStatus): {
  label: string;
  cls: string;
} {
  switch (s) {
    case "DRAFT":
      return { label: "ຮ່າງ", cls: "bg-gray-100 text-gray-700 border-gray-200" };
    case "SENT":
      return { label: "ສົ່ງແລ້ວ", cls: "bg-blue-50 text-blue-700 border-blue-200" };
    case "ACCEPTED":
      return {
        label: "ຍອມຮັບ",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "REJECTED":
      return { label: "ປະຕິເສດ", cls: "bg-red-50 text-red-700 border-red-200" };
    case "EXPIRED":
      return {
        label: "ໝົດອາຍຸ",
        cls: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "CONVERTED":
      return {
        label: "ກາຍເປັນບິນ",
        cls: "bg-purple-50 text-purple-700 border-purple-200",
      };
  }
}

/** QT-YYYYMM-#### serial — restarts each month. */
export async function nextQuotationNumber(): Promise<string> {
  const now = new Date();
  const stem = `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const latest = await prisma.quotation.findFirst({
    where: { number: { startsWith: stem } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let next = 1;
  if (latest) {
    const tail = latest.number.slice(stem.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${stem}${String(next).padStart(4, "0")}`;
}

async function nextInvoiceNumber(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { id: "default" },
    select: { invoicePrefix: true },
  });
  const prefix = setting?.invoicePrefix ?? "INV";
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const stem = `${prefix}${ym}`;
  const latest = await prisma.invoice.findFirst({
    where: { number: { startsWith: stem } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let next = 1;
  if (latest) {
    const tail = latest.number.slice(stem.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `${stem}${String(next).padStart(4, "0")}`;
}

export type ConvertResult =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; error: string };

/**
 * Promote an ACCEPTED Quotation to an Invoice. Wrapped in a transaction so
 * the quotation only flips to CONVERTED if the invoice is created cleanly.
 */
export async function convertQuotationToInvoice(
  quotationId: string,
  userId: string,
): Promise<ConvertResult> {
  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true },
  });
  if (!q) return { ok: false, error: "ບໍ່ພົບ quotation" };
  if (q.status !== "ACCEPTED" && q.status !== "SENT") {
    return {
      ok: false,
      error: `ຕ້ອງເປັນ status ACCEPTED ຫຼື SENT ກ່ອນ (ປະຈຸບັນ ${q.status})`,
    };
  }
  if (q.invoiceId) return { ok: false, error: "ກາຍເປັນບິນແລ້ວ" };
  if (q.items.length === 0) return { ok: false, error: "ບໍ່ມີລາຍການ" };

  const number = await nextInvoiceNumber();

  try {
    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          number,
          date: new Date(),
          customerId: q.customerId,
          userId,
          currency: q.currency,
          exchangeRate: q.exchangeRate,
          subtotal: q.subtotal,
          discount: q.discount,
          vatRate: q.vatRate,
          vatMode: q.vatMode,
          vatAmount: q.vatAmount,
          total: q.total,
          paymentMethod: "CASH",
          note: q.note,
          items: {
            create: q.items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              unit: it.unit,
              quantity: it.quantity,
              priceLak: it.priceLak,
              discount: it.discount,
              total: it.total,
              lineType: it.lineType,
              taxRate: it.taxRate,
              taxAmount: it.taxAmount,
            })),
          },
        },
        select: { id: true, number: true },
      }),
    ]);
    await prisma.quotation.update({
      where: { id: q.id },
      data: {
        status: "CONVERTED",
        invoiceId: invoice.id,
        decidedAt: q.decidedAt ?? new Date(),
      },
    });
    return { ok: true, invoiceId: invoice.id, invoiceNumber: invoice.number };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "ສ້າງບິນບໍ່ສຳເລັດ",
    };
  }
}
