import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { TenantStatus, BillingStatus } from "@/generated/master/client";
import { aggregatePnL, daysUntil, cycleLabel } from "@/lib/ledger";

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

  const [
    tenantsByStatus,
    pendingRequests,
    billingTotals,
    monthRevenue,
    recentInvoices,
    recentSignups,
    monthLedger,
    upcomingRenewals,
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
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { nextRenewalDate: "asc" },
      take: 8,
      include: { category: { select: { name: true } } },
    }),
  ]);

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
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-medium text-gray-900">Dashboard</h1>
        <p className="text-[12px] text-gray-500 mt-1">
          ສະຫຼຸບສະພາບລະບົບ — ອັບເດດອັດຕະໂນມັດ
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="ລາຍຮັບເດືອນນີ້"
          value={`${fmtMoney((monthRevenue._sum.amount ?? 0) + monthPnl.income)} ກີບ`}
          sub={`${monthRevenue._count} ໃບ + ${monthLedger.filter((e) => e.type === "INCOME").length} ອື່ນໆ`}
          colour="emerald"
        />
        <Kpi
          label="ລາຍຈ່າຍເດືອນນີ້"
          value={`${fmtMoney(monthPnl.expense)} ກີບ`}
          sub={`${monthLedger.filter((e) => e.type === "EXPENSE").length} ລາຍການ`}
          colour="rose"
        />
        <Kpi
          label="ກຳໄລເດືອນນີ້"
          value={`${fmtMoney(monthNet)} ກີບ`}
          sub="ລາຍຮັບ − ລາຍຈ່າຍ"
          colour={monthNet >= 0 ? "emerald" : "rose"}
        />
        <Kpi
          label="Pending approval"
          value={String(pendingRequests)}
          sub="ລໍຖ້າຕັດສິນ"
          colour={pendingRequests > 0 ? "rose" : "slate"}
          href={pendingRequests > 0 ? "/manage/approvals" : undefined}
        />
      </div>

      {/* Second row: tenant + billing snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Tenants ACTIVE"
          value={String(tenantCount(TenantStatus.ACTIVE))}
          sub={`${tenantCount(TenantStatus.TRIAL)} ກຳລັງທົດລອງ`}
          colour="slate"
        />
        <Kpi
          label="ໃບເກັບເງິນຍັງບໍ່ຈ່າຍ"
          value={`${fmtMoney(billingAmount("UNPAID"))} ກີບ`}
          sub={`${billingCount("UNPAID")} ໃບ`}
          colour="amber"
          href="/manage/billing?status=UNPAID"
        />
        <Kpi
          label="ໃບເກັບເງິນຈ່າຍແລ້ວ"
          value={`${fmtMoney(billingAmount("PAID"))} ກີບ`}
          sub={`${billingCount("PAID")} ໃບ ສະສົມ`}
          colour="emerald"
        />
        <Kpi
          label="Renewals ໃນ 30 ວັນ"
          value={String(upcomingRenewals.length)}
          sub="subscription ໃກ້ໝົດ"
          colour={upcomingRenewals.length > 0 ? "amber" : "slate"}
          href="/manage/subscriptions"
        />
      </div>

      {/* Tenant breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            Tenants ຕາມສະຖານະ
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
              colour="blue"
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
            Billing ສະຫຼຸບ
          </h2>
          <div className="space-y-2 text-[13px]">
            <BillingRow
              label="ຍັງບໍ່ຈ່າຍ"
              amount={billingAmount("UNPAID")}
              count={billingCount("UNPAID")}
              colour="amber"
            />
            <BillingRow
              label="ຈ່າຍແລ້ວ"
              amount={billingAmount("PAID")}
              count={billingCount("PAID")}
              colour="emerald"
            />
            <BillingRow
              label="ຍົກເລີກ"
              amount={billingAmount("CANCELLED")}
              count={billingCount("CANCELLED")}
              colour="gray"
            />
          </div>
        </div>
      </div>

      {/* Upcoming renewals */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
              🔄 ສັນຍາໃກ້ໝົດອາຍຸ (30 ວັນຂ້າງໜ້າ)
            </h2>
            <Link
              href="/manage/subscriptions"
              className="text-[11px] text-slate-700 hover:underline"
            >
              ເບິ່ງທັງໝົດ →
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
                          ? `ເກີນກຳນົດ ${-d} ວັນ`
                          : d === 0
                            ? "ມື້ນີ້"
                            : `ເຫຼືອ ${d} ວັນ`}
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
              ໃບເກັບເງິນຫຼ້າສຸດ
            </h2>
            <Link
              href="/manage/billing"
              className="text-[11px] text-slate-700 hover:underline"
            >
              ເບິ່ງທັງໝົດ →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">ຍັງບໍ່ມີ</p>
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
              Tenants ໃໝ່
            </h2>
            <Link
              href="/manage/tenants"
              className="text-[11px] text-slate-700 hover:underline"
            >
              ເບິ່ງທັງໝົດ →
            </Link>
          </div>
          {recentSignups.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">ຍັງບໍ່ມີ</p>
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
    </div>
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
  colour: "emerald" | "blue" | "amber" | "gray";
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barColour = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
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
