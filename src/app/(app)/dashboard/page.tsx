import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { masterPrisma } from "@/lib/master-prisma";
import { requireUser } from "@/lib/session";
import { formatMoney, formatDate } from "@/lib/format";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { OdooListPage } from "@/components/odoo/sheet";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

type Period = "day" | "week" | "month" | "year";

function periodStart(p: Period) {
  const now = new Date();
  if (p === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (p === "week") {
    const d = new Date(now);
    d.setDate(now.getDate() - 6); // last 7 days
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (p === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function DashboardPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await props.searchParams;
  const period: Period =
    sp.period === "day" ||
    sp.period === "week" ||
    sp.period === "year"
      ? sp.period
      : "month";

  const session = await requireUser();
  const locale = await getLocale();
  const td = (k: string) => t(locale, "dashboard", k);
  const ti = (k: string) => t(locale, "invoice", k);

  const periodLabel: Record<Period, string> = {
    day:   td("periodDay"),
    week:  td("periodWeek"),
    month: td("periodMonth"),
    year:  td("periodYear"),
  };

  const start = periodStart(period);
  const startOfDay = periodStart("day");

  const [
    totalProducts,
    totalCustomers,
    periodInvoicesRaw,
    todayInvoicesRaw,
    lowStock,
    recentInvoices,
    tenant,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.customer.count(),
    prisma.invoice.findMany({
      where: { date: { gte: start }, status: "ISSUED" },
      select: { total: true, isCreditNote: true },
    }),
    prisma.invoice.findMany({
      where: { date: { gte: startOfDay }, status: "ISSUED" },
      select: { total: true, isCreditNote: true },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { lte: 10 } },
      take: 5,
      orderBy: { stock: "asc" },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        customer: true,
        reversals: { select: { id: true } },
      },
    }),
    masterPrisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { createdAt: true },
    }),
  ]);

  const sumSigned = (rows: { total: number; isCreditNote: boolean }[]) =>
    rows.reduce(
      (s, r) => s + (r.isCreditNote ? -r.total : r.total),
      0,
    );

  // Credit notes don't count as sales — only count regular invoices
  const countReal = (rows: { isCreditNote: boolean }[]) =>
    rows.filter((r) => !r.isCreditNote).length;

  const periodInvoices = {
    sum: sumSigned(periodInvoicesRaw),
    count: countReal(periodInvoicesRaw),
  };
  const todayInvoices = {
    sum: sumSigned(todayInvoicesRaw),
    count: countReal(todayInvoicesRaw),
  };

  const cards = [
    {
      label: td("salesToday"),
      value: formatMoney(todayInvoices.sum),
      sub: `${todayInvoices.count} ${td("bills")}`,
      icon: "📈",
      tint: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      label: `${td("salesIn")} ${periodLabel[period]}`,
      value: formatMoney(periodInvoices.sum),
      sub: `${periodInvoices.count} ${td("bills")}`,
      icon: "💰",
      tint: "bg-odoo/10 text-odoo border-odoo/30",
    },
    {
      label: td("totalProducts"),
      value: totalProducts.toString(),
      sub: td("activeItems"),
      icon: "📦",
      tint: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      label: td("totalCustomers"),
      value: totalCustomers.toString(),
      sub: td("people"),
      icon: "👥",
      tint: "bg-violet-50 text-violet-700 border-violet-200",
    },
  ];

  return (
    <OdooListPage
      title={td("title")}
      actions={
        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
          {(["day", "week", "month", "year"] as Period[]).map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-300">·</span>}
              <Link
                href={p === "month" ? "/dashboard" : `/dashboard?period=${p}`}
                className={
                  period === p
                    ? "font-medium text-odoo"
                    : "hover:text-odoo"
                }
              >
                {periodLabel[p]}
              </Link>
            </span>
          ))}
        </div>
      }
    >
      <>
        {tenant && (
          <OnboardingBanner
            tenantCreatedAt={tenant.createdAt}
            ownerName={session.name}
            locale={locale}
          />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded border border-gray-200 p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                  {c.label}
                </div>
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-base ${c.tint}`}
                >
                  {c.icon}
                </div>
              </div>
              <div className="text-[22px] font-light text-gray-900 tabular-nums leading-tight">
                {c.value}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent invoices */}
          <div className="bg-white rounded border border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
                {td("recentInvoices")}
              </h2>
              <Link
                href="/invoices"
                className="text-[12px] text-odoo hover:underline"
              >
                {td("viewAll")} →
              </Link>
            </div>
            <div>
              {recentInvoices.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center">
                  {td("noData")}
                </div>
              )}
              {recentInvoices.map((inv) => {
                const hasReversal =
                  !inv.isCreditNote && inv.reversals.length > 0;
                return (
                  <Link
                    href={`/invoices/${inv.id}`}
                    key={inv.id}
                    className={`flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-b-0 ${
                      hasReversal
                        ? "bg-red-50 hover:bg-red-100/70"
                        : "hover:bg-odoo/5"
                    }`}
                    title={hasReversal ? td("reversedTitle") : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-odoo/10 text-odoo flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {inv.customer.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-mono text-gray-800 truncate">
                          {inv.number}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {inv.customer.name} · {formatDate(inv.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-[13px] font-medium tabular-nums ${
                          inv.isCreditNote
                            ? "text-orange-700"
                            : "text-gray-900"
                        }`}
                      >
                        {inv.isCreditNote ? "- " : ""}
                        {formatMoney(
                          inv.total,
                          inv.currency as "LAK" | "USD" | "THB",
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {inv.isCreditNote
                          ? ti("creditNote")
                          : inv.status === "ISSUED"
                            ? ti("issued")
                            : inv.status === "CANCELLED"
                              ? ti("cancelled")
                              : ti("draft")}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Low stock */}
          <div className="bg-white rounded border border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
                {td("lowStock")}
              </h2>
              <Link
                href="/products"
                className="text-[12px] text-odoo hover:underline"
              >
                {td("manage")} →
              </Link>
            </div>
            <div>
              {lowStock.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center">
                  {td("allStocked")}
                </div>
              )}
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded bg-amber-50 text-amber-700 flex items-center justify-center text-[11px] font-semibold flex-shrink-0 border border-amber-200">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-800 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {p.code}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-[13px] font-semibold tabular-nums ${
                        p.stock <= 0 ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {p.stock} {p.unit}
                    </div>
                    <div className="text-[10px] text-gray-400">{td("remaining")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    </OdooListPage>
  );
}
