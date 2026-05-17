import Link from "next/link";
import { BillingQuoteStatus } from "@/generated/master/client";
import { OdooListPage, OdooPager } from "@/components/odoo/sheet";
import { OdooSearch, type SearchFacet } from "@/components/odoo-search";
import { masterPrisma } from "@/lib/master-prisma";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const STATUS_LABEL: Record<BillingQuoteStatus, { label: string; cls: string }> =
  {
    DRAFT: {
      label: "ຮ່າງ",
      cls: "bg-gray-100 text-gray-700 border-gray-200",
    },
    SENT: {
      label: "ສົ່ງແລ້ວ",
      cls: "bg-sky-50 text-sky-700 border-sky-200",
    },
    ACCEPTED: {
      label: "ອະນຸມັດ",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    REJECTED: {
      label: "ປະຕິເສດ",
      cls: "bg-red-50 text-red-700 border-red-200",
    },
    CANCELLED: {
      label: "ຍົກເລີກ",
      cls: "bg-gray-100 text-gray-700 border-gray-200",
    },
  };

function fmtMoney(n: number, currency: string) {
  return `${new Intl.NumberFormat("lo-LA", {
    maximumFractionDigits: 0,
  }).format(n)} ${currency === "LAK" ? "ກີບ" : currency}`;
}

const PAGE_SIZE = 30;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const query = sp.q?.trim();
  const filter =
    sp.status && Object.values(BillingQuoteStatus).includes(sp.status as BillingQuoteStatus)
      ? (sp.status as BillingQuoteStatus)
      : undefined;
  const where = {
    ...(filter ? { status: filter } : {}),
    ...(query
      ? {
          OR: [
            { number: { contains: query, mode: "insensitive" as const } },
            { title: { contains: query, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [quotes, totalCount, summary] = await Promise.all([
    masterPrisma.billingQuote.findMany({
      where,
      include: { customer: { select: { code: true, name: true, type: true } } },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    masterPrisma.billingQuote.count({ where }),
    masterPrisma.billingQuote.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totals = Object.fromEntries(
    summary.map((row) => [
      row.status,
      { count: row._count, amount: row._sum.amount ?? 0 },
    ]),
  ) as Partial<Record<BillingQuoteStatus, { count: number; amount: number }>>;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hrefForPage = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (filter) sp.set("status", filter);
    if (query) sp.set("q", query);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/manage/quotes?${qs}` : "/manage/quotes";
  };

  return (
    <OdooListPage
      title={tm("quotesTitle")}
      subtitle={tm("quotesSubtitle")}
      actions={
        <>
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
            href="/manage/quotes/new"
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium"
          >
            + ສ້າງໃບສະເໜີລາຄາ
          </Link>
          <OdooSearch
            facets={
              [
                query && { key: "q", label: `ຄົ້ນຫາ: ${query}`, value: query },
                filter && {
                  key: "status",
                  label: `ສະຖານະ: ${STATUS_LABEL[filter].label}`,
                  value: filter,
                },
              ].filter(Boolean) as SearchFacet[]
            }
            options={[
              { key: "q", label: "ຄົ້ນຫາເລກ / ລູກຄ້າ / ຫົວເລື່ອງ" },
              {
                key: "status",
                label: "ສະຖານະ",
                values: Object.entries(STATUS_LABEL).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              },
            ]}
          />
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="ຮ່າງ" value={totals.DRAFT} />
        <SummaryCard label="ສົ່ງແລ້ວ" value={totals.SENT} />
        <SummaryCard label="ອະນຸມັດ" value={totals.ACCEPTED} />
        <SummaryCard label="ປະຕິເສດ" value={totals.REJECTED} />
      </div>

      <div className="flex items-center gap-1 mb-3 text-[12px]">
        <FilterTab label="ທັງໝົດ" href="/manage/quotes" active={!filter} />
        {Object.entries(STATUS_LABEL).map(([status, meta]) => (
          <FilterTab
            key={status}
            label={meta.label}
            href={`/manage/quotes?status=${status}`}
            active={filter === status}
          />
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">ເລກ</th>
              <th className="text-left py-2 px-3">ລູກຄ້າ</th>
              <th className="text-left py-2 px-3">ຫົວເລື່ອງ</th>
              <th className="text-right py-2 px-3">ມູນຄ່າ</th>
              <th className="text-left py-2 px-3">ວັນທີ</th>
              <th className="text-left py-2 px-3">ສະຖານະ</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ບໍ່ມີໃບສະເໜີລາຄາ
                </td>
              </tr>
            ) : (
              quotes.map((quote) => {
                const st = STATUS_LABEL[quote.status];
                return (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-[12px]">
                      {quote.number}
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-gray-800">{quote.customer.name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {quote.customer.code} ·{" "}
                        {quote.customer.type === "TENANT" ? "Tenant" : "ພາຍນອກ"}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700 truncate max-w-xs">
                      {quote.title}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {fmtMoney(quote.amount, quote.currency)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {DATE_FMT.format(quote.issueDate)}
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
                        href={`/manage/quotes/${quote.id}`}
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
          <OdooPager
            page={page}
            pageSize={PAGE_SIZE}
            total={totalCount}
            hrefForPage={hrefForPage}
          />
        </div>
      )}
    </OdooListPage>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value?: { count: number; amount: number };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="text-[22px] font-light text-gray-900 mt-1">
        {value?.count ?? 0}
      </div>
      <div className="text-[12px] text-gray-500 mt-1">
        {fmtMoney(value?.amount ?? 0, "LAK")}
      </div>
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
      className={`px-2.5 py-1 rounded border ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
