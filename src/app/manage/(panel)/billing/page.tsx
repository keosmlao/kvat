import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { BillingStatus } from "@/generated/master/client";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const STATUS_LABEL: Record<BillingStatus, { label: string; cls: string }> = {
  UNPAID: {
    label: "ຍັງບໍ່ຈ່າຍ",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PAID: {
    label: "ຈ່າຍແລ້ວ",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "ຍົກເລີກ",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function fmtMoney(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? "ກີບ" : currency)
  );
}

const PAGE_SIZE = 30;

export default async function BillingListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filter =
    sp.status && ["UNPAID", "PAID", "CANCELLED"].includes(sp.status)
      ? (sp.status as BillingStatus)
      : undefined;

  const where = filter ? { status: filter } : {};

  const [invoices, totalCount, summary] = await Promise.all([
    masterPrisma.billingInvoice.findMany({
      where,
      include: {
        customer: { select: { code: true, name: true, type: true } },
      },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    masterPrisma.billingInvoice.count({ where }),
    masterPrisma.billingInvoice.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totals = Object.fromEntries(
    summary.map((s) => [
      s.status,
      { count: s._count, amount: s._sum.amount ?? 0 },
    ]),
  ) as Record<BillingStatus, { count: number; amount: number }>;

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">
            ໃບເກັບເງິນ
          </h1>
          <p className="text-[12px] text-gray-500 mt-1">
            ໃບເກັບເງິນສຳລັບລູກຄ້າ — SaaS tenant + ລູກຄ້າພາຍນອກ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/manage/billing/customers"
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
          >
            👥 ລູກຄ້າ
          </Link>
          <Link
            href="/manage/billing/products"
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
          >
            📦 ສິນຄ້າ
          </Link>
          <Link
            href="/manage/company"
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
          >
            🏢 ກຳນົດບໍລິສັດ
          </Link>
          <Link
            href="/manage/billing/new"
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium"
          >
            + ສ້າງໃບເກັບເງິນ
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <SummaryCard
          label="ຍັງບໍ່ຈ່າຍ"
          count={totals.UNPAID?.count ?? 0}
          amount={totals.UNPAID?.amount ?? 0}
          colour="amber"
        />
        <SummaryCard
          label="ຈ່າຍແລ້ວ"
          count={totals.PAID?.count ?? 0}
          amount={totals.PAID?.amount ?? 0}
          colour="emerald"
        />
        <SummaryCard
          label="ຍົກເລີກ"
          count={totals.CANCELLED?.count ?? 0}
          amount={totals.CANCELLED?.amount ?? 0}
          colour="gray"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3 text-[12px]">
        <FilterTab label="ທັງໝົດ" href="/manage/billing" active={!filter} />
        <FilterTab
          label="ຍັງບໍ່ຈ່າຍ"
          href="/manage/billing?status=UNPAID"
          active={filter === "UNPAID"}
        />
        <FilterTab
          label="ຈ່າຍແລ້ວ"
          href="/manage/billing?status=PAID"
          active={filter === "PAID"}
        />
        <FilterTab
          label="ຍົກເລີກ"
          href="/manage/billing?status=CANCELLED"
          active={filter === "CANCELLED"}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">ເລກໃບເກັບເງິນ</th>
              <th className="text-left py-2 px-3">ລູກຄ້າ</th>
              <th className="text-left py-2 px-3">ລາຍລະອຽດ</th>
              <th className="text-right py-2 px-3">ຈໍານວນ</th>
              <th className="text-left py-2 px-3">ວັນທີອອກ</th>
              <th className="text-left py-2 px-3">ສະຖານະ</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ບໍ່ມີໃບເກັບເງິນ
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const st = STATUS_LABEL[inv.status];
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-[12px]">
                      {inv.number}
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-gray-800">{inv.customer.name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {inv.customer.code} ·{" "}
                        {inv.customer.type === "TENANT" ? "Tenant" : "ພາຍນອກ"}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700 truncate max-w-xs">
                      {inv.description}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {fmtMoney(inv.amount, inv.currency)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {DATE_FMT.format(inv.issueDate)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        href={`/manage/billing/${inv.id}`}
                        className="text-[12px] text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        ເບິ່ງ →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px]">
          <span className="text-gray-500">
            ໜ້າ {page} / {totalPages} ({totalCount} ໃບ)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/manage/billing?${filter ? `status=${filter}&` : ""}page=${page - 1}`}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ← ກ່ອນ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/manage/billing?${filter ? `status=${filter}&` : ""}page=${page + 1}`}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ຕໍ່ →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  count,
  amount,
  colour,
}: {
  label: string;
  count: number;
  amount: number;
  colour: "amber" | "emerald" | "gray";
}) {
  const colourMap = {
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    gray: "border-gray-200 bg-gray-50",
  };
  return (
    <div className={`border rounded p-4 ${colourMap[colour]}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-600">
        {label}
      </div>
      <div className="text-[20px] font-medium text-gray-900 mt-1">
        {new Intl.NumberFormat("lo-LA").format(amount)}{" "}
        <span className="text-[12px] text-gray-500">ກີບ</span>
      </div>
      <div className="text-[11px] text-gray-500 mt-0.5">{count} ໃບ</div>
    </div>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-gray-700 hover:bg-gray-100 border border-transparent"
      }`}
    >
      {label}
    </Link>
  );
}
