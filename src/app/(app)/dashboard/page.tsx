import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { masterPrisma } from "@/lib/master-prisma";
import { requireUser } from "@/lib/session";
import { formatMoney, formatDate } from "@/lib/format";
import { OnboardingBanner } from "@/components/onboarding-banner";

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

const PERIOD_LABEL: Record<Period, string> = {
  day: "ມື້ນີ້",
  week: "ອາທິດນີ້",
  month: "ເດືອນນີ້",
  year: "ປີນີ້",
};

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

  // Credit notes don't count as "ບິນຂາຍ" — only count regular invoices
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
      label: "ຍອດຂາຍວັນນີ້",
      value: formatMoney(todayInvoices.sum),
      sub: `${todayInvoices.count} ບິນ`,
      icon: "📈",
      tint: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      label: `ຍອດຂາຍ${PERIOD_LABEL[period]}`,
      value: formatMoney(periodInvoices.sum),
      sub: `${periodInvoices.count} ບິນ`,
      icon: "💰",
      tint: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      label: "ສິນຄ້າທັງໝົດ",
      value: totalProducts.toString(),
      sub: "ລາຍການທີ່ໃຊ້ງານ",
      icon: "📦",
      tint: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      label: "ລູກຄ້າທັງໝົດ",
      value: totalCustomers.toString(),
      sub: "ຄົນ",
      icon: "👥",
      tint: "bg-violet-50 text-violet-700 border-violet-200",
    },
  ];

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Control panel */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[18px] font-medium text-gray-800">ໜ້າຫຼັກ</h1>
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
            {(["day", "week", "month", "year"] as Period[]).map((p, i) => (
              <span key={p} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">·</span>}
                <Link
                  href={p === "month" ? "/dashboard" : `/dashboard?period=${p}`}
                  className={
                    period === p
                      ? "font-medium text-[#b91c1c]"
                      : "hover:text-[#b91c1c]"
                  }
                >
                  {PERIOD_LABEL[p]}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        {tenant && (
          <OnboardingBanner
            tenantCreatedAt={tenant.createdAt}
            ownerName={session.name}
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
                ບິນຫຼ້າສຸດ
              </h2>
              <Link
                href="/invoices"
                className="text-[12px] text-[#b91c1c] hover:underline"
              >
                ເບິ່ງທັງໝົດ →
              </Link>
            </div>
            <div>
              {recentInvoices.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center">
                  ຍັງບໍ່ມີຂໍ້ມູນ
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
                      : "hover:bg-[#b91c1c]/5"
                  }`}
                  title={hasReversal ? "ບິນນີ້ຖືກລົດໜີ້" : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#b91c1c]/10 text-[#b91c1c] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
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
                        ? "ໃບລົດໜີ້"
                        : inv.status === "ISSUED"
                          ? "ອອກແລ້ວ"
                          : inv.status === "CANCELLED"
                            ? "ຍົກເລີກ"
                            : "ຮ່າງ"}
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
                ສິນຄ້າເຫຼືອນ້ອຍ
              </h2>
              <Link
                href="/products"
                className="text-[12px] text-[#b91c1c] hover:underline"
              >
                ຈັດການ →
              </Link>
            </div>
            <div>
              {lowStock.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center">
                  ສິນຄ້າທຸກລາຍການມີຄັງພຽງພໍ
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
                    <div className="text-[10px] text-gray-400">ຄົງເຫຼືອ</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
