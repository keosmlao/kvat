import "server-only";
import { prisma } from "./prisma";

export type VatMonthRow = {
  ym: string;          // "2026-05"
  label: string;       // "ພ.05 / 2026"
  invoiceCount: number;
  // Tax-excluding amounts (the base on which VAT is calculated)
  exemptBase: number;  // sum of subtotals for EXEMPT invoices
  taxableBase: number; // VAT-exclusive taxable base for non-exempt invoices
  vatCollected: number; // sum of vatAmount
  total: number;        // sum of grand totals
};

const LAO_MONTHS = [
  "ມ.ກ.",
  "ກ.ພ.",
  "ມ.ນ.",
  "ມ.ສ.",
  "ພ.ພ.",
  "ມິ.ຖ.",
  "ກ.ລ.",
  "ສ.ຫ.",
  "ກ.ຍ.",
  "ຕ.ລ.",
  "ພ.ຈ.",
  "ທ.ວ.",
];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymLabel(d: Date): string {
  return `${LAO_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/**
 * Aggregate output-VAT (ອາກອນຂາຍ) by month for the current tenant. Filters to
 * ISSUED invoices in the chosen year — CANCELLED bills don't owe tax.
 */
export async function vatReportByMonth(year: number): Promise<VatMonthRow[]> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "ISSUED",
      date: { gte: start, lt: end },
    },
    select: {
      date: true,
      currency: true,
      exchangeRate: true,
      isCreditNote: true,
      subtotal: true,
      discount: true,
      vatMode: true,
      vatAmount: true,
      total: true,
    },
  });

  // Initialise 12 months
  const buckets = new Map<string, VatMonthRow>();
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    const key = ym(d);
    buckets.set(key, {
      ym: key,
      label: ymLabel(d),
      invoiceCount: 0,
      exemptBase: 0,
      taxableBase: 0,
      vatCollected: 0,
      total: 0,
    });
  }

  for (const inv of invoices) {
    const b = buckets.get(ym(inv.date));
    if (!b) continue;
    // Normalise to LAK for the report (VAT filings are in LAK).
    const toLak = inv.currency === "LAK" ? 1 : inv.exchangeRate;
    const sign = inv.isCreditNote ? -1 : 1;
    const afterDiscount = Math.max(0, inv.subtotal - inv.discount);
    const taxBase =
      inv.vatMode === "INCLUSIVE"
        ? Math.max(0, afterDiscount - inv.vatAmount)
        : afterDiscount;
    const base = taxBase * toLak * sign;
    b.invoiceCount++;
    if (inv.vatMode === "EXEMPT") {
      b.exemptBase += base;
    } else {
      b.taxableBase += base;
    }
    b.vatCollected += inv.vatAmount * toLak * sign;
    b.total += inv.total * toLak * sign;
  }

  return Array.from(buckets.values());
}

export type CustomerStatementInvoice = {
  id: string;
  number: string;
  date: Date;
  dueDate: Date | null;
  total: number;
  paidAmount: number;
  outstanding: number;
  paymentStatus: string;
  status: string;
  currency: string;
};

export type CustomerStatement = {
  customer: {
    id: string;
    code: string;
    name: string;
    taxId: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  asOf: Date;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoices: CustomerStatementInvoice[];
  // Outstanding bucketed by age (LAK normalised)
  ageing: {
    current: number;    // not yet due / no due date
    d1to30: number;
    d31to60: number;
    d61to90: number;
    over90: number;
  };
};

/**
 * Build a full statement for one customer: every invoice, what's paid, what's
 * outstanding, plus an ageing breakdown of the unpaid balance. Currency is
 * normalised to LAK using each invoice's stored exchangeRate.
 */
export async function customerStatement(
  customerId: string,
): Promise<CustomerStatement | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      code: true,
      name: true,
      taxId: true,
      phone: true,
      email: true,
      address: true,
    },
  });
  if (!customer) return null;

  const invoices = await prisma.invoice.findMany({
    where: { customerId, status: { not: "CANCELLED" } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      number: true,
      date: true,
      dueDate: true,
      currency: true,
      exchangeRate: true,
      total: true,
      paidAmount: true,
      paymentStatus: true,
      status: true,
    },
  });

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const ageing = {
    current: 0,
    d1to30: 0,
    d31to60: 0,
    d61to90: 0,
    over90: 0,
  };
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  const rows: CustomerStatementInvoice[] = invoices.map((inv) => {
    const toLak = inv.currency === "LAK" ? 1 : inv.exchangeRate;
    const totalLak = inv.total * toLak;
    const paidLak = inv.paidAmount * toLak;
    const outstanding = Math.max(0, totalLak - paidLak);
    totalInvoiced += totalLak;
    totalPaid += paidLak;
    totalOutstanding += outstanding;

    if (outstanding > 0) {
      if (!inv.dueDate || inv.dueDate >= now) {
        ageing.current += outstanding;
      } else {
        const days = Math.floor(
          (now.getTime() - inv.dueDate.getTime()) / dayMs,
        );
        if (days <= 30) ageing.d1to30 += outstanding;
        else if (days <= 60) ageing.d31to60 += outstanding;
        else if (days <= 90) ageing.d61to90 += outstanding;
        else ageing.over90 += outstanding;
      }
    }

    return {
      id: inv.id,
      number: inv.number,
      date: inv.date,
      dueDate: inv.dueDate,
      total: totalLak,
      paidAmount: paidLak,
      outstanding,
      paymentStatus: inv.paymentStatus,
      status: inv.status,
      currency: inv.currency,
    };
  });

  return {
    customer,
    asOf: now,
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    invoices: rows,
    ageing,
  };
}
