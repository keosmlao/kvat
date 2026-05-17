import "server-only";
import { masterPrisma } from "./master-prisma";

export type MonthPoint = {
  ym: string;          // "2026-05"
  label: string;       // "ພ.05 / 2026" — short Lao month label
  income: number;
  expense: number;
  net: number;
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
 * Build a 12-month rolling series of income vs expense for the dashboard
 * chart. Income = billing (PAID) + manual ledger income. Expense = manual
 * ledger expenses. All filtered to LAK to keep the chart single-currency.
 */
export async function monthlyPnL(months = 12): Promise<MonthPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [paidInvoices, ledger] = await Promise.all([
    masterPrisma.billingInvoice.findMany({
      where: {
        status: "PAID",
        currency: "LAK",
        paidAt: { gte: start },
      },
      select: { paidAt: true, amount: true },
    }),
    masterPrisma.ledgerEntry.findMany({
      where: { currency: "LAK", date: { gte: start } },
      select: { date: true, amount: true, type: true },
    }),
  ]);

  // Initialise 12 empty buckets
  const buckets = new Map<string, MonthPoint>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = ym(d);
    buckets.set(key, {
      ym: key,
      label: ymLabel(d),
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const b = buckets.get(ym(inv.paidAt));
    if (b) b.income += inv.amount;
  }
  for (const e of ledger) {
    const b = buckets.get(ym(e.date));
    if (!b) continue;
    if (e.type === "INCOME") b.income += e.amount;
    else b.expense += e.amount;
  }
  for (const b of buckets.values()) b.net = b.income - b.expense;

  return Array.from(buckets.values());
}

export type TenantGrowthPoint = {
  ym: string;
  label: string;
  signups: number;     // new tenants this month
  cumulative: number;  // running total of tenants that existed at month end
};

/**
 * Cohort signup count per month + cumulative tenant total over time. Useful
 * for spotting growth trends and the impact of campaigns.
 */
export async function tenantGrowth(months = 12): Promise<TenantGrowthPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const tenants = await masterPrisma.tenant.findMany({
    where: { isTemplate: false },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const beforeWindow = tenants.filter((t) => t.createdAt < start).length;

  const buckets = new Map<string, TenantGrowthPoint>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = ym(d);
    buckets.set(key, {
      ym: key,
      label: ymLabel(d),
      signups: 0,
      cumulative: 0,
    });
  }
  for (const t of tenants) {
    if (t.createdAt < start) continue;
    const b = buckets.get(ym(t.createdAt));
    if (b) b.signups++;
  }

  let running = beforeWindow;
  for (const b of buckets.values()) {
    running += b.signups;
    b.cumulative = running;
  }
  return Array.from(buckets.values());
}

export type TopCustomer = {
  id: string;
  code: string;
  name: string;
  type: "TENANT" | "EXTERNAL";
  totalPaid: number;
  invoiceCount: number;
};

export async function topCustomers(limit = 10): Promise<TopCustomer[]> {
  // Group PAID invoices by customer, sum amount.
  const rows = await masterPrisma.billingInvoice.groupBy({
    by: ["customerId"],
    where: { status: "PAID", currency: "LAK" },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });
  if (rows.length === 0) return [];

  const customers = await masterPrisma.billingCustomer.findMany({
    where: { id: { in: rows.map((r) => r.customerId) } },
    select: { id: true, code: true, name: true, type: true },
  });
  const byId = new Map(customers.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const c = byId.get(r.customerId);
      if (!c) return null;
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        type: c.type,
        totalPaid: r._sum.amount ?? 0,
        invoiceCount: r._count,
      };
    })
    .filter((x): x is TopCustomer => x !== null);
}
