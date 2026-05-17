import "server-only";
import { prisma } from "./prisma";
import type { RecurringCycle } from "@/generated/prisma/client";

/** Roll a date forward by one billing cycle. */
export function advanceByCycle(from: Date, cycle: RecurringCycle): Date {
  const d = new Date(from);
  switch (cycle) {
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export function cycleLabel(c: RecurringCycle): string {
  switch (c) {
    case "MONTHLY":
      return "ລາຍເດືອນ";
    case "QUARTERLY":
      return "ລາຍໄຕມາດ";
    case "YEARLY":
      return "ລາຍປີ";
  }
}

/** Auto-allocate the next RC-#### code for a recurring template. */
export async function nextRecurringCode(): Promise<string> {
  const latest = await prisma.recurringInvoice.findFirst({
    where: { code: { startsWith: "RC-" } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let next = 1;
  if (latest) {
    const tail = latest.code.slice(3);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) next = n + 1;
  }
  return `RC-${String(next).padStart(4, "0")}`;
}

/** Auto-allocate the next INV/YYYYMM/#### invoice number (matches Invoice). */
async function nextInvoiceNumber(): Promise<string> {
  // Match the format used elsewhere: prefix from Setting + year-month + serial.
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

export type GenerateResult =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; error: string };

type RecurringInvoiceLine = {
  lineType: string;
  productId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  priceLak: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function applyLineTaxes(
  items: RecurringInvoiceLine[],
  subtotal: number,
  discount: number,
  vatMode: string,
) {
  const afterDisc = Math.max(0, subtotal - discount);
  const discountRatio = subtotal > 0 ? afterDisc / subtotal : 0;
  let vatAmount = 0;

  for (const item of items) {
    if (item.lineType !== "PRODUCT" || vatMode === "EXEMPT") {
      item.taxAmount = 0;
      continue;
    }
    const base = item.total * discountRatio;
    item.taxAmount =
      vatMode === "INCLUSIVE"
        ? round2((base * item.taxRate) / (1 + item.taxRate))
        : round2(base * item.taxRate);
    vatAmount += item.taxAmount;
  }

  vatAmount = round2(vatAmount);
  return {
    vatAmount,
    total: vatMode === "EXCLUSIVE" ? afterDisc + vatAmount : afterDisc,
  };
}

/**
 * Generate one Invoice from a RecurringInvoice template, then roll the
 * template's nextRunDate forward and bump the counter. Used by both the
 * "Run now" button and the batch run-due cron. Runs in a transaction so
 * the template never advances without a matching invoice.
 */
export async function generateInvoiceFromRecurring(
  recurringId: string,
  userId: string,
): Promise<GenerateResult> {
  const tmpl = await prisma.recurringInvoice.findUnique({
    where: { id: recurringId },
    include: { items: true },
  });
  if (!tmpl) return { ok: false, error: "ບໍ່ພົບ recurring template" };
  if (!tmpl.active) return { ok: false, error: "Template ປິດໃຊ້ງານ" };
  if (tmpl.items.length === 0)
    return { ok: false, error: "Template ບໍ່ມີລາຍການ" };
  if (tmpl.endDate && tmpl.endDate < new Date()) {
    return { ok: false, error: "Template ໝົດອາຍຸ" };
  }

  // Replay item math the same way the manual invoice form does.
  const items: RecurringInvoiceLine[] = tmpl.items.map((it) => {
    if (it.lineType !== "PRODUCT") {
      return {
        lineType: it.lineType,
        productId: null,
        productName: it.productName,
        unit: "",
        quantity: 0,
        priceLak: 0,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
      };
    }
    const lineTotal = Math.max(
      0,
      it.quantity * it.priceLak - it.discount,
    );
    return {
      lineType: "PRODUCT",
      productId: it.productId,
      productName: it.productName,
      unit: it.unit,
      quantity: it.quantity,
      priceLak: it.priceLak,
      discount: it.discount,
      taxRate: it.taxRate,
      taxAmount: 0,
      total: lineTotal,
    };
  });
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const { vatAmount, total } = applyLineTaxes(
    items,
    subtotal,
    tmpl.discount,
    tmpl.vatMode,
  );

  const number = await nextInvoiceNumber();
  const issueDate = tmpl.nextRunDate; // bill the customer for the scheduled period
  const next = advanceByCycle(tmpl.nextRunDate, tmpl.cycle);

  try {
    const [created] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          number,
          date: issueDate,
          customerId: tmpl.customerId,
          userId,
          currency: tmpl.currency,
          exchangeRate: tmpl.exchangeRate,
          subtotal,
          discount: tmpl.discount,
          vatRate: tmpl.vatRate,
          vatMode: tmpl.vatMode,
          vatAmount,
          total,
          paymentMethod: tmpl.paymentMethod,
          note: tmpl.note,
          recurringId: tmpl.id,
          items: { create: items },
        },
        select: { id: true, number: true },
      }),
      prisma.recurringInvoice.update({
        where: { id: tmpl.id },
        data: {
          nextRunDate: next,
          lastRunAt: new Date(),
          generatedCount: { increment: 1 },
        },
      }),
    ]);
    return { ok: true, invoiceId: created.id, invoiceNumber: created.number };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "ສ້າງ invoice ບໍ່ສຳເລັດ",
    };
  }
}
