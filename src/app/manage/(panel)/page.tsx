import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { TenantStatus, BillingStatus } from "@/generated/master/client";
import { aggregatePnL, daysUntil, cycleLabel } from "@/lib/ledger";
import { loadInbox, inboxCounts } from "@/lib/inbox";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const LOCALE = "lo";
const tm = (k: string) => t(LOCALE, "manage", k);

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmtMoney(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    tenantsByStatus,
    pendingRequests,
    billingTotals,
    monthRevenue,
    recentInvoices,
    recentSignups,
    monthLedger,
    upcomingRenewals,
    inbox,
    recentAudit,
  ] = await Promise.all([
    masterPrisma.tenant.groupBy({
      by: ["status"],
      _count: true,
      where: { isTemplate: false },
    }),
    masterPrisma.approvalRequest.count({ where: { status: "PENDING" } }),
    masterPrisma.billingInvoice.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amount: true },
    }),
    masterPrisma.billingInvoice.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    }),
    masterPrisma.billingInvoice.findMany({
      take: 6,
      orderBy: { issueDate: "desc" },
      include: { customer: { select: { name: true, code: true } } },
    }),
    masterPrisma.tenant.findMany({
      where: { isTemplate: false },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    }),
    // P&L this month (LAK only) — billing revenue + manual income − expenses
    masterPrisma.ledgerEntry.findMany({
      where: { date: { gte: monthStart }, currency: "LAK" },
      select: { type: true, amount: true },
    }),
    // Next 30 days of subscription renewals
    masterPrisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextRenewalDate: {
          lte: next30Days,
        },
      },
      orderBy: { nextRenewalDate: "asc" },
      take: 8,
      include: { category: { select: { name: true } } },
    }),
    // Top of the inbox (alerts admin should action)
    loadInbox(),
    // Last 8 admin actions for the feed
    masterPrisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const inboxStats = inboxCounts(inbox);

  const monthPnl = aggregatePnL(monthLedger);
  const monthNet =
    (monthRevenue._sum.amount ?? 0) + monthPnl.income - monthPnl.expense;

  const tenantCount = (st: TenantStatus) =>
    tenantsByStatus.find((t) => t.status === st)?._count ?? 0;
  const billingCount = (st: BillingStatus) =>
    billingTotals.find((b) => b.status === st)?._count ?? 0;
  const billingAmount = (st: BillingStatus) =>
    billingTotals.find((b) => b.status === st)?._sum.amount ?? 0;

  return (
    <OdooListPage
      title={tm("dashTitle")}
      subtitle={tm("dashSubtitleFull")}
    >
      <>
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label={tm("kpiRevenue")}
          value={`${fmtMoney((monthRevenue._sum.amount ?? 0) + monthPnl.income)} ກີບ`}
          sub={`${monthRevenue._count} ${tm("kpiInvSuffix")} + ${monthLedger.filter((e) => e.type === "INCOME").length} ${tm("kpiOther")}`}
          colour="emerald"
        />
        <Kpi
          label={tm("kpiExpense")}
          value={`${fmtMoney(monthPnl.expense)} ກີບ`}
          sub={`${monthLedger.filter((e) => e.type === "EXPENSE").length} ${tm("kpiItems")}`}
          colour="rose"
        />
        <Kpi
          label={tm("kpiProfit")}
          value={`${fmtMoney(monthNet)} ກີບ`}
          sub={tm("kpiPnLFormula")}
          colour={monthNet >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          label={tm("kpiPendingAprv")}
          value={String(pendingRequests)}
          sub={tm("kpiPending")}
          colour={pendingRequests > 0 ? "rose" : "slate"}
          href={pendingRequests > 0 ? "/manage/approvals" : undefined}
        />
      </div>

      {/* Second row: tenant + billing snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label={tm("kpiTenantActive")}
          value={String(tenantCount(TenantStatus.ACTIVE))}
          sub={`${tenantCount(TenantStatus.TRIAL)} ${tm("kpiTenantTrialing")}`}
          colour="slate"
        />
        <Kpi
          label={tm("kpiUnpaidInv")}
          value={`${fmtMoney(billingAmount("UNPAID"))} ກີບ`}
          sub={`${billingCount("UNPAID")} ${tm("kpiInvSuffix")}`}
          colour="amber"
          href="/manage/billing?status=UNPAID"
        />
        <Kpi
          label={tm("kpiPaidInv")}
          value={`${fmtMoney(billingAmount("PAID"))} ກີບ`}
          sub={`${billingCount("PAID")} ${tm("kpiPaidInvSuffix")}`}
          colour="emerald"
        />
        <Kpi
          label={tm("kpiRenewals")}
          value={String(upcomingRenewals.length)}
          sub={tm("kpiSubsExpire")}
          colour={upcomingRenewals.length > 0 ? "amber" : "slate"}
          href="/manage/subscriptions"
        />
      </div>

      {/* Tenant breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            {tm("tenantsByStatus")}
          </h2>
          <div className="space-y-2">
            <StatusBar
              label="ACTIVE"
              count={tenantCount(TenantStatus.ACTIVE)}
              total={tenantCount(TenantStatus.ACTIVE) +
                tenantCount(TenantStatus.TRIAL) +
                tenantCount(TenantStatus.SUSPENDED) +
                tenantCount(TenantStatus.CANCELLED)}
              colour="emerald"
            />
            <StatusBar
              label="TRIAL"
              count={tenantCount(TenantStatus.TRIAL)}
              total={tenantCount(TenantStatus.ACTIVE) +
                tenantCount(TenantStatus.TRIAL) +
                tenantCount(TenantStatus.SUSPENDED) +
                tenantCount(TenantStatus.CANCELLED)}
              colour="odoo"
            />
            <StatusBar
              label="SUSPENDED"
              count={tenantCount(TenantStatus.SUSPENDED)}
              total={tenantCount(TenantStatus.ACTIVE) +
                tenantCount(TenantStatus.TRIAL) +
                tenantCount(TenantStatus.SUSPENDED) +
                tenantCount(TenantStatus.CANCELLED)}
              colour="amber"
            />
            <StatusBar
              label="CANCELLED"
              count={tenantCount(TenantStatus.CANCELLED)}
              total={tenantCount(TenantStatus.ACTIVE) +
                tenantCount(TenantStatus.TRIAL) +
                tenantCount(TenantStatus.SUSPENDED) +
                tenantCount(TenantStatus.CANCELLED)}
              colour="gray"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            {tm("billingSummary")}
          </h2>
          <div className="space-y-2 text-[13px]">
            <BillingRow
              label={tm("unpaid")}
              amount={billingAmount("UNPAID")}
              count={billingCount("UNPAID")}
              colour="amber"
            />
            <BillingRow
              label={tm("paid")}
              amount={billingAmount("PAID")}
              count={billingCount("PAID")}
              colour="emerald"
            />
            <BillingRow
              label={tm("cancelled")}
              amount={billingAmount("CANCELLED")}
              count={billingCount("CANCELLED")}
              colour="gray"
            />
          </div>
        </div>
      </div>

      {/* Inbox preview + Audit feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
              📥 Inbox{" "}
              {inboxStats.total > 0 && (
                <span className="ml-1 text-[10px] bg-odoo text-white px-1.5 rounded-full">
                  {inboxStats.total}
                </span>
              )}
            </h2>
            <Link
              href="/manage/inbox"
              className="text-[11px] text-slate-700 hover:underline"
            >
              {tm("viewAll")} →
            </Link>
          </div>
          {inbox.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">
              {tm("nothingToDo")}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 text-[13px]">
              {inbox.slice(0, 6).map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href ?? "/manage/inbox"}
                    className="flex items-start gap-2 py-1.5 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <span
                      className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        it.severity === "critical"
                          ? "bg-red-500"
                          : it.severity === "warning"
                            ? "bg-amber-500"
                            : "bg-odoo"
                      }`}
                    />
                    <span className="flex-1 truncate text-gray-800">
                      {it.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
              {tm("activityFeed")}
            </h2>
            <Link
              href="/manage/audit"
              className="text-[11px] text-slate-700 hover:underline"
            >
              {tm("viewAll")} →
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">{tm("nothingYet")}</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-[13px]">
              {recentAudit.map((a) => (
                <li
                  key={a.id}
                  className="py-1.5 flex items-start gap-2"
                >
                  <span className="text-[10px] text-gray-400 w-24 flex-shrink-0">
                    {DATETIME_FMT.format(a.createdAt)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <div className="text-gray-800 truncate">
                      <span className="font-mono text-[11px] text-gray-500">
                        {a.action}
                      </span>{" "}
                      {a.entityLabel && (
                        <span className="text-gray-700">— {a.entityLabel}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {a.actorEmail ?? "system"}
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Upcoming renewals */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
              {tm("upcomingRenewals")}
            </h2>
            <Link
              href="/manage/subscriptions"
              className="text-[11px] text-slate-700 hover:underline"
            >
              {tm("viewAll")} →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 text-[13px]">
            {upcomingRenewals.map((s) => {
              const d = daysUntil(s.nextRenewalDate);
              const overdue = d < 0;
              const urgent = d >= 0 && d <= 7;
              return (
                <Link
                  key={s.id}
                  href={`/manage/subscriptions/${s.id}`}
                  className="block py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-gray-800 truncate">
                        {s.name}{" "}
                        <span className="text-[11px] text-gray-500">
                          ({s.vendor})
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {s.category?.name ?? "—"} · {cycleLabel(s.billingCycle)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {fmtMoney(s.amount)}{" "}
                        <span className="text-[11px] text-gray-500">
                          {s.currency}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] ${
                          overdue
                            ? "text-red-600 font-medium"
                            : urgent
                              ? "text-amber-600 font-medium"
                              : "text-gray-500"
                        }`}
                      >
                        {overdue
                          ? `${tm("overdueDaysPrefix")} ${-d} ${tm("overdueDaysSuffix")}`
                          : d === 0
                            ? tm("today")
                            : `${tm("remainingDays")} ${d} ${tm("daysSuffix")}`}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
              {tm("recentInvoices")}
            </h2>
            <Link
              href="/manage/billing"
              className="text-[11px] text-slate-700 hover:underline"
            >
              {tm("viewAll")} →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">{tm("nothingYet")}</p>
          ) : (
            <div className="divide-y divide-gray-100 text-[13px]">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/manage/billing/${inv.id}`}
                  className="block py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-[12px] text-gray-600">
                      {inv.number}
                    </div>
                    <div className="font-medium">{fmtMoney(inv.amount)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-gray-500 truncate">
                      {inv.customer.name}
                    </span>
                    <span
                      className={`text-[10px] uppercase ${
                        inv.status === "PAID"
                          ? "text-emerald-600"
                          : inv.status === "UNPAID"
                            ? "text-amber-600"
                            : "text-gray-400"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
              {tm("newTenants")}
            </h2>
            <Link
              href="/manage/tenants"
              className="text-[11px] text-slate-700 hover:underline"
            >
              {tm("viewAll")} →
            </Link>
          </div>
          {recentSignups.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">{tm("nothingYet")}</p>
          ) : (
            <div className="divide-y divide-gray-100 text-[13px]">
              {recentSignups.map((t) => (
                <Link
                  key={t.id}
                  href={`/manage/tenants/${t.id}`}
                  className="block py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-gray-800 truncate">{t.name}</div>
                    <div className="text-[10px] uppercase text-gray-500">
                      {t.plan}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-gray-500 font-mono">
                      /t/{t.slug}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {DATETIME_FMT.format(t.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
    </OdooListPage>
  );
}

function Kpi({
  label,
  value,
  sub,
  colour,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  colour: "emerald" | "amber" | "slate" | "rose";
  href?: string;
}) {
  const colourMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-gray-200 bg-white text-gray-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };
  const content = (
    <div className={`border rounded p-4 ${colourMap[colour]} h-full`}>
      <div className="text-[11px] uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="text-[22px] font-medium mt-1">{value}</div>
      {sub && <div className="text-[11px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {content}
    </Link>
  ) : (
    content
  );
}

function StatusBar({
  label,
  count,
  total,
  colour,
}: {
  label: string;
  count: number;
  total: number;
  colour: "emerald" | "odoo" | "amber" | "gray";
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColour = {
    emerald: "bg-emerald-500",
    odoo: "bg-odoo",
    amber: "bg-amber-500",
    gray: "bg-gray-400",
  }[colour];
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-0.5">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BillingRow({
  label,
  amount,
  count,
  colour,
}: {
  label: string;
  amount: number;
  count: number;
  colour: "amber" | "emerald" | "gray";
}) {
  const dotColour = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    gray: "bg-gray-400",
  }[colour];
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColour}`} />
        <span className="text-gray-700">{label}</span>
        <span className="text-[11px] text-gray-500">({count})</span>
      </span>
      <span className="font-medium">{fmtMoney(amount)} ກີບ</span>
    </div>
  );
}
