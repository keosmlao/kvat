import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OdooListPage, OdooPager } from "@/components/odoo/sheet";
import { OdooSearch, type SearchFacet } from "@/components/odoo-search";
import { DeleteCustomerButton } from "./delete-button";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

const PAGE_SIZE = 40;

export default async function CustomersPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const locale = await getLocale();
  const tcu = (k: string) => t(locale, "customer", k);
  const tc = (k: string) => t(locale, "common", k);
  const ti = (k: string) => t(locale, "invoice", k);
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { taxId: { contains: q } },
        ],
      }
    : undefined;

  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        province: { select: { name: true } },
        district: { select: { name: true } },
        village: { select: { name: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const hrefForPage = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const qs = sp.toString();
    return qs ? `/customers?${qs}` : "/customers";
  };

  return (
    <OdooListPage
      title={tcu("listTitle")}
      actions={
        <>
          <Link href="/customers/new" className="o-btn-primary">
            + {tc("new")}
          </Link>
          <OdooSearch
            facets={
              [
                q && { key: "q", label: `${ti("searchPrefix")}: ${q}`, value: q },
              ].filter(Boolean) as SearchFacet[]
            }
            options={[{ key: "q", label: tcu("searchHint") }]}
          />
        </>
      }
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[12px] text-gray-500">
            {tcu("totalCount")} {totalCount} {tcu("items")}
          </span>
          <OdooPager
            page={page}
            pageSize={PAGE_SIZE}
            total={totalCount}
            hrefForPage={hrefForPage}
          />
        </div>
      }
    >
      {/* Tree view */}
      <div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 w-10 text-left">
                <input type="checkbox" className="accent-odoo" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">{tcu("code")}</th>
              <th className="px-2 py-2 text-left font-semibold">{tcu("name")}</th>
              <th className="px-2 py-2 text-left font-semibold">{tcu("taxId")}</th>
              <th className="px-2 py-2 text-left font-semibold">{tcu("phone")}</th>
              <th className="px-2 py-2 text-left font-semibold">{tcu("email")}</th>
              <th className="px-2 py-2 text-left font-semibold">{tcu("address")}</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <div className="text-gray-500 text-sm mb-2">{tcu("noCustomers")}</div>
                  <Link href="/customers/new" className="o-btn-link">
                    {tcu("createFirst")}
                  </Link>
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-100 hover:bg-odoo/5 group"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="accent-odoo opacity-0 group-hover:opacity-100 transition"
                  />
                </td>
                <td className="px-2 py-2">
                  <Link
                    href={`/customers/${c.id}/edit`}
                    className="font-mono text-[12px] text-gray-800 hover:text-odoo"
                  >
                    {c.code}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <Link
                    href={`/customers/${c.id}/edit`}
                    className="flex items-center gap-2 hover:text-odoo"
                  >
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-odoo/10 text-odoo flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-gray-800 font-medium">{c.name}</span>
                  </Link>
                </td>
                <td className="px-2 py-2 text-gray-600">{c.taxId ?? "—"}</td>
                <td className="px-2 py-2 text-gray-600">{c.phone ?? "—"}</td>
                <td className="px-2 py-2 text-gray-600">{c.email ?? "—"}</td>
                <td className="px-2 py-2 text-gray-600 truncate max-w-[280px]">
                  {(() => {
                    const parts = [
                      c.village?.name,
                      c.district?.name,
                      c.province?.name,
                    ].filter(Boolean);
                    const place = parts.join(", ");
                    return (
                      <>
                        {place && (
                          <span className="text-gray-700">{place}</span>
                        )}
                        {c.address && (
                          <span className="text-gray-500">
                            {place ? " — " : ""}
                            {c.address}
                          </span>
                        )}
                        {!place && !c.address && "—"}
                      </>
                    );
                  })()}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <Link
                      href={`/customers/${c.id}/statement`}
                      className="text-gray-600 hover:text-odoo text-[12px]"
                      title={tcu("statementTitle")}
                    >
                      📋
                    </Link>
                    <Link
                      href={`/customers/${c.id}/edit`}
                      className="text-odoo hover:text-odoo-hover text-[12px]"
                    >
                      {tc("edit")}
                    </Link>
                    <DeleteCustomerButton id={c.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OdooListPage>
  );
}
