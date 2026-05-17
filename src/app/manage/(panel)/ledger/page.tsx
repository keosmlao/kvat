import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { LedgerType } from "@/generated/master/client";
import { aggregatePnL } from "@/lib/ledger";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtMoney(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? "ກີບ" : currency)
  );
}

const PAGE_SIZE = 30;

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const typeFilter =
    sp.type && (sp.type === "INCOME" || sp.type === "EXPENSE")
      ? (sp.type as LedgerType)
      : undefined;
  const categoryId = sp.categoryId || undefined;
  const fromDate = sp.from ? new Date(sp.from) : undefined;
  const toDate = sp.to ? new Date(sp.to + "T23:59:59") : undefined;
  const query = sp.q?.trim() || undefined;

  const where = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query, mode: "insensitive" as const } },
            { vendor: { contains: query, mode: "insensitive" as const } },
            { notes: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [entries, totalCount, allEntries, categories, billingRevenue] =
    await Promise.all([
      masterPrisma.ledgerEntry.findMany({
        where,
        include: {
          category: { select: { name: true } },
          subscription: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      masterPrisma.ledgerEntry.count({ where }),
      masterPrisma.ledgerEntry.findMany({
        where,
        select: { type: true, amount: true, currency: true },
      }),
      masterPrisma.ledgerCategory.findMany({
        where: { archived: false },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      // Billing revenue (PAID invoices) inside same date filter — counted as
      // implicit income so the P&L matches reality without double-entry.
      masterPrisma.billingInvoice.aggregate({
        where: {
          status: "PAID",
          ...(fromDate || toDate
            ? {
                paidAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

  // Aggregate only LAK rows so we don't sum mixed currencies.
  const lakRows = allEntries.filter((e) => e.currency === "LAK");
  const pnl = aggregatePnL(lakRows);
  const billingTotal = billingRevenue._sum.amount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const queryString = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (typeFilter && !("type" in overrides)) params.set("type", typeFilter);
    if (categoryId && !("categoryId" in overrides))
      params.set("categoryId", categoryId);
    if (sp.from && !("from" in overrides)) params.set("from", sp.from);
    if (sp.to && !("to" in overrides)) params.set("to", sp.to);
    if (query && !("q" in overrides)) params.set("q", query);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
    }
    return params.toString();
  };

  const exportHref = `/api/manage/ledger/export${queryString({}) ? `?${queryString({})}` : ""}`;

  return (
    <OdooListPage
      title={tm("ledgerTitle")}
      subtitle="ບັນທຶກລາຍຮັບ/ລາຍຈ່າຍຂອງລະບົບ (ບໍ່ລວມ BillingInvoice)"
      actions={
        <>
          <Link
            href="/manage/ledger/categories"
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
          >
            ⚙ ປະເພດ
          </Link>
          <a
            href={exportHref}
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
          >
            ↓ Export CSV
          </a>
          <Link
            href="/manage/ledger/new?type=EXPENSE"
            className="border border-red-300 text-red-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-red-50"
          >
            + ລາຍຈ່າຍ
          </Link>
          <Link
            href="/manage/ledger/new?type=INCOME"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-[13px] font-medium"
          >
            + ລາຍຮັບ
          </Link>
        </>
      }
    >
      {/* P&L summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="ລາຍຮັບ (Billing)"
          value={fmtMoney(billingTotal, "LAK")}
          sub={`${billingRevenue._count} ໃບ PAID`}
          colour="emerald"
        />
        <Kpi
          label="ລາຍຮັບອື່ນໆ"
          value={fmtMoney(pnl.income, "LAK")}
          sub={`${lakRows.filter((e) => e.type === "INCOME").length} ລາຍການ`}
          colour="emerald"
        />
        <Kpi
          label="ລາຍຈ່າຍ"
          value={fmtMoney(pnl.expense, "LAK")}
          sub={`${lakRows.filter((e) => e.type === "EXPENSE").length} ລາຍການ`}
          colour="rose"
        />
        <Kpi
          label="ກຳໄລ (Net)"
          value={fmtMoney(pnl.net + billingTotal, "LAK")}
          sub="ລາຍຮັບລວມ − ລາຍຈ່າຍ"
          colour={pnl.net + billingTotal >= 0 ? "slate" : "rose"}
        />
      </div>

      {/* Filters */}
      <form className="bg-white border border-gray-200 rounded p-3 mb-3" method="get">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[13px]">
          <select
            name="type"
            defaultValue={typeFilter ?? ""}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="">ທຸກປະເພດ</option>
            <option value="INCOME">ລາຍຮັບ</option>
            <option value="EXPENSE">ລາຍຈ່າຍ</option>
          </select>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="">ທຸກໝວດ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === "INCOME" ? "📈" : "📉"} {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="px-2 py-1 border border-gray-300 rounded"
            placeholder="ຈາກ"
          />
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="px-2 py-1 border border-gray-300 rounded"
            placeholder="ຮອດ"
          />
          <div className="flex gap-1">
            <input
              type="text"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="ຄົ້ນຫາ..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 text-white rounded"
            >
              🔍
            </button>
          </div>
        </div>
      </form>

      {/* Entries */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">ວັນທີ</th>
              <th className="text-left py-2 px-3">ປະເພດ</th>
              <th className="text-left py-2 px-3">ໝວດ</th>
              <th className="text-left py-2 px-3">ລາຍລະອຽດ</th>
              <th className="text-left py-2 px-3">Vendor</th>
              <th className="text-right py-2 px-3">ຈໍານວນ</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ບໍ່ມີລາຍການ
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600">
                    {DATE_FMT.format(e.date)}
                  </td>
                  <td className="py-2 px-3">
                    {e.type === "INCOME" ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        ລາຍຮັບ
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                        ລາຍຈ່າຍ
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-700">
                    {e.category?.name ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-gray-800">
                    {e.description}
                    {e.subscription && (
                      <span className="ml-1 text-[10px] text-odoo">
                        🔄 {e.subscription.name}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {e.vendor ?? "—"}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      e.type === "INCOME" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {e.type === "INCOME" ? "+" : "−"} {fmtMoney(e.amount, e.currency)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Link
                      href={`/manage/ledger/${e.id}`}
                      className="text-[12px] text-slate-700 hover:underline"
                    >
                      ແກ້ →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px]">
          <span className="text-gray-500">
            ໜ້າ {page} / {totalPages} ({totalCount} ລາຍການ)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/manage/ledger?${queryString({ page: String(page - 1) })}`}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ← ກ່ອນ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/manage/ledger?${queryString({ page: String(page + 1) })}`}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                ຕໍ່ →
              </Link>
            )}
          </div>
        </div>
      )}
    </OdooListPage>
  );
}

function Kpi({
  label,
  value,
  sub,
  colour,
}: {
  label: string;
  value: string;
  sub?: string;
  colour: "emerald" | "rose" | "slate";
}) {
  const colourMap = {
    emerald: "border-emerald-200 bg-emerald-50",
    rose: "border-rose-200 bg-rose-50",
    slate: "border-gray-200 bg-white",
  };
  return (
    <div className={`border rounded p-3 ${colourMap[colour]}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="text-[16px] font-medium text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
