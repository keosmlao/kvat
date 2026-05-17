import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { quotationStatusLabel } from "@/lib/quotation";
import { OdooListPage, OdooPager } from "@/components/odoo/sheet";
import { OdooSearch, type SearchFacet } from "@/components/odoo-search";
import type { QuotationStatus } from "@/generated/prisma/client";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

const STATUS_LIST: (QuotationStatus | "all")[] = [
  "all",
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
];
const PAGE_SIZE = 50;

export default async function QuotationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const status =
    sp.status && STATUS_LIST.includes(sp.status as QuotationStatus | "all")
      ? sp.status === "all"
        ? undefined
        : (sp.status as QuotationStatus)
      : undefined;
  const query = sp.q?.trim();

  const where = {
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { number: { contains: query, mode: "insensitive" as const } },
            { reference: { contains: query, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [quotations, totalCount] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { name: true, code: true } },
        _count: { select: { items: true } },
      },
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.quotation.count({ where }),
  ]);

  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/quotations?${qs}` : "/quotations";
  };

  return (
    <OdooListPage
      title="ໃບສະເໜີລາຄາ (Quotations)"
      subtitle="ສະເໜີລາຄາໃຫ້ລູກຄ້າ → ຍອມຮັບ → ກາຍເປັນບິນອັດຕະໂນມັດ"
      actions={
        <>
          <Link
            href="/quotations/new"
            className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium"
          >
            + ສະເໜີລາຄາໃໝ່
          </Link>
          <OdooSearch
            facets={
              [
                query && { key: "q", label: `ຄົ້ນຫາ: ${query}`, value: query },
                status && {
                  key: "status",
                  label: `ສະຖານະ: ${quotationStatusLabel(status).label}`,
                  value: status,
                },
              ].filter(Boolean) as SearchFacet[]
            }
            options={[
              { key: "q", label: "ຄົ້ນຫາເລກ / ລູກຄ້າ / ref" },
              {
                key: "status",
                label: "ສະຖານະ",
                values: STATUS_LIST.filter((s) => s !== "all").map((s) => ({
                  value: s,
                  label: quotationStatusLabel(s).label,
                })),
              },
            ]}
          />
        </>
      }
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5 text-[12px] flex-wrap">
            <FilterTab label="ທັງໝົດ" href="/quotations" active={!status} />
            {STATUS_LIST.filter((s) => s !== "all").map((s) => (
              <FilterTab
                key={s}
                label={quotationStatusLabel(s).label}
                href={`/quotations?status=${s}`}
                active={status === s}
              />
            ))}
          </div>
          <OdooPager
            page={page}
            pageSize={PAGE_SIZE}
            total={totalCount}
            hrefForPage={hrefForPage}
          />
        </div>
      }
    >
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left py-2 px-3">ເລກ</th>
                <th className="text-left py-2 px-3">ລູກຄ້າ</th>
                <th className="text-left py-2 px-3">ວັນທີ</th>
                <th className="text-left py-2 px-3">ໝົດອາຍຸ</th>
                <th className="text-right py-2 px-3">ມູນຄ່າ</th>
                <th className="text-left py-2 px-3">ສະຖານະ</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    ບໍ່ມີໃບສະເໜີລາຄາ
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const st = quotationStatusLabel(q.status);
                  const overdue =
                    q.validUntil !== null &&
                    q.validUntil < new Date() &&
                    (q.status === "DRAFT" || q.status === "SENT");
                  return (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-[12px]">
                        {q.number}
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-gray-800">{q.customer.name}</div>
                        {q.reference && (
                          <div className="text-[11px] text-gray-500">
                            ref: {q.reference}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {DATE_FMT.format(q.date)}
                      </td>
                      <td className={`py-2 px-3 ${overdue ? "text-amber-600 font-medium" : "text-gray-600"}`}>
                        {q.validUntil ? DATE_FMT.format(q.validUntil) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-medium font-mono">
                        {fmt(q.total)} {q.currency}
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
                          href={`/quotations/${q.id}`}
                          className="text-[12px] text-odoo hover:underline"
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
    </OdooListPage>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-2.5 py-1 rounded border ${
        active
          ? "bg-odoo/10 text-odoo border-odoo/20"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
