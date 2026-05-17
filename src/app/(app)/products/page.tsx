import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { OdooListPage, OdooPager } from "@/components/odoo/sheet";
import { OdooSearch, type SearchFacet } from "@/components/odoo-search";
import { DeleteProductButton } from "./delete-button";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

const PAGE_SIZE = 40;

export default async function ProductsPage(props: {
  searchParams: Promise<{ q?: string; filter?: string; view?: string; page?: string }>;
}) {
  const { q, filter, view, page: pageParam } = await props.searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const currentView: "list" | "kanban" = view === "kanban" ? "kanban" : "list";
  const locale = await getLocale();
  const tp = (k: string) => t(locale, "product", k);
  const tc = (k: string) => t(locale, "common", k);
  const ti = (k: string) => t(locale, "invoice", k);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
    ];
  }
  if (filter === "active") where.active = true;
  if (filter === "archived") where.active = false;

  const fetchedProducts = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: true, type: true },
  });

  const all = await prisma.product.findMany({ select: { active: true, stock: true, minStock: true } });
  const activeCount = all.filter((p) => p.active).length;
  const archivedCount = all.filter((p) => !p.active).length;
  const lowStockCount = all.filter((p) => p.stock <= p.minStock).length;

  const visible =
    filter === "low"
      ? fetchedProducts.filter((p) => p.stock <= p.minStock)
      : fetchedProducts;

  const totalCount = visible.length;
  const products = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalValue = visible.reduce(
    (s, p) => s + p.stock * p.priceLak,
    0,
  );

  const hrefForPage = (nextPage: number) =>
    buildUrl({ q, filter, view: currentView, page: nextPage });

  return (
    <OdooListPage
      title={tp("listTitle")}
      actions={
        <>
          <Link
            href="/products/new"
            className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium"
          >
            + {tc("new")}
          </Link>
          <OdooSearch
            facets={
              [
                q && { key: "q", label: `${ti("searchPrefix")}: ${q}`, value: q },
                filter && { key: "filter", label: `${tp("filter")}: ${filter}`, value: filter },
                currentView !== "list" && {
                  key: "view",
                  label: `View: ${currentView}`,
                  value: currentView,
                },
              ].filter(Boolean) as SearchFacet[]
            }
            options={[
              { key: "q", label: tp("searchHint") },
              {
                key: "filter",
                label: tp("filter"),
                values: [
                  { value: "active", label: tp("active") },
                  { value: "archived", label: tp("closed") },
                  { value: "low", label: tp("lowStock") },
                ],
              },
            ]}
          />
        </>
      }
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <FilterChip
              label={tc("all")}
              href={buildUrl({ view: currentView })}
              active={!filter}
            />
            <FilterChip
              label={`${tp("active")} (${activeCount})`}
              href={buildUrl({ filter: "active", view: currentView })}
              active={filter === "active"}
            />
            <FilterChip
              label={`${tp("closed")} (${archivedCount})`}
              href={buildUrl({ filter: "archived", view: currentView })}
              active={filter === "archived"}
            />
            <FilterChip
              label={`${tp("lowStock")} (${lowStockCount})`}
              href={buildUrl({ filter: "low", view: currentView })}
              active={filter === "low"}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 tabular-nums">
              {tp("stockValue")}: {formatMoney(totalValue)}
            </span>
            <OdooPager
              page={page}
              pageSize={PAGE_SIZE}
              total={totalCount}
              hrefForPage={hrefForPage}
            />
            <span className="mx-1 text-gray-300">|</span>
            <ViewSwitcher current={currentView} filter={filter} q={q} />
          </div>
        </div>
      }
    >
      {/* Kanban view */}
      {currentView === "kanban" && (
        <div>
          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-500 text-sm mb-2">{tp("noProducts")}</div>
              <Link
                href="/products/new"
                className="text-odoo hover:underline text-sm font-medium"
              >
                {tp("createFirst")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {products.map((p) => {
                const lowStock = p.stock <= p.minStock;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}/edit`}
                    className="bg-white border border-gray-200 rounded overflow-hidden hover:border-odoo hover:shadow-md transition flex flex-col group"
                  >
                    <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl font-light text-odoo/30">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {!p.active && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                            {tp("closed")}
                          </span>
                        </div>
                      )}
                      {p.active && lowStock && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium border border-red-200">
                          ⚠ {tp("lowStock")}
                        </span>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex flex-col">
                      <div className="text-[10px] font-mono text-gray-500">
                        {p.code}
                      </div>
                      <div className="text-[13px] font-medium text-gray-800 line-clamp-2 mb-1 group-hover:text-odoo">
                        {p.name}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="text-[13px] font-semibold text-gray-900 tabular-nums">
                          {formatMoney(p.priceLak)}
                        </span>
                        <span
                          className={`text-[11px] tabular-nums ${
                            lowStock ? "text-red-600 font-semibold" : "text-gray-500"
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </div>
                      {p.category && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-odoo/10 text-odoo border border-odoo/30">
                            {p.category.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tree view */}
      {currentView === "list" && (
      <div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 w-10 text-left">
                <input type="checkbox" className="accent-odoo" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">{tp("code")}</th>
              <th className="px-2 py-2 text-left font-semibold">
                <SortHeader label={tp("productName")} active dir="desc" />
              </th>
              <th className="px-2 py-2 text-left font-semibold w-32">{tp("category")}</th>
              <th className="px-2 py-2 text-left font-semibold w-28">{tp("type")}</th>
              <th className="px-2 py-2 text-center font-semibold w-16">{tp("unit")}</th>
              <th className="px-2 py-2 text-right font-semibold w-32">{tp("sellPrice")}</th>
              <th className="px-2 py-2 text-right font-semibold w-24">{tp("stock")}</th>
              <th className="px-2 py-2 text-center font-semibold w-20">{ti("status")}</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <div className="text-gray-500 text-sm mb-2">{tp("noProducts")}</div>
                  <Link
                    href="/products/new"
                    className="text-odoo hover:underline text-sm font-medium"
                  >
                    {tp("createFirst")}
                  </Link>
                </td>
              </tr>
            )}
            {products.map((p) => {
              const lowStock = p.stock <= p.minStock;
              return (
                <tr
                  key={p.id}
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
                      href={`/products/${p.id}/edit`}
                      className="font-mono text-[12px] text-gray-800 hover:text-odoo"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="flex items-center gap-2 hover:text-odoo"
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-7 h-7 rounded object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded bg-odoo/10 text-odoo flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-gray-800 font-medium">
                        {p.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-gray-700">
                    {p.category ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-odoo/10 text-odoo border border-odoo/30">
                        {p.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-gray-700">
                    {p.type ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-violet-50 text-violet-700 border border-violet-200">
                        {p.type.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600">
                    {p.unit}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-900">
                    {formatMoney(p.priceLak)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    <span
                      className={
                        lowStock
                          ? "text-red-600 font-semibold"
                          : "text-gray-800"
                      }
                    >
                      {p.stock}
                    </span>
                    {lowStock && (
                      <span className="ml-1 text-[10px] text-red-500">⚠</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {p.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {tp("active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        {tp("closed")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="text-odoo hover:text-odoo-hover text-[12px]"
                      >
                        {tc("edit")}
                      </Link>
                      <DeleteProductButton id={p.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {visible.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-800">
                <td colSpan={7} className="px-3 py-2 text-right text-gray-600 text-[12px] uppercase tracking-wider">
                  {tp("stockValueFooter")}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoney(totalValue)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      )}
    </OdooListPage>
  );
}

function buildUrl(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && !(k === "page" && v === 1)) search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `/products?${qs}` : "/products";
}

function FilterChip({
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
      className={`px-2.5 py-1 rounded text-[12px] font-medium transition ${
        active
          ? "bg-odoo/10 text-odoo"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}

function SortHeader({
  label,
  active,
  dir,
}: {
  label: string;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        active ? "text-odoo" : ""
      }`}
    >
      {label}
      {active && (
        <span className="text-[10px]">{dir === "desc" ? "▼" : "▲"}</span>
      )}
    </span>
  );
}

function ViewSwitcher({
  current,
  filter,
  q,
}: {
  current: "list" | "kanban";
  filter?: string;
  q?: string;
}) {
  const baseParams = { q, filter };
  return (
    <div className="flex border border-gray-200 rounded overflow-hidden text-gray-500">
      <Link
        href={buildUrl({ ...baseParams, view: "list" })}
        title="ລາຍການ"
        className={`px-2 py-1 ${
          current === "list"
            ? "bg-odoo/10 text-odoo"
            : "hover:bg-gray-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Link>
      <Link
        href={buildUrl({ ...baseParams, view: "kanban" })}
        title="Kanban"
        className={`px-2 py-1 ${
          current === "kanban"
            ? "bg-odoo/10 text-odoo"
            : "hover:bg-gray-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 4h7v16H4zM13 4h7v9h-7z" />
        </svg>
      </Link>
    </div>
  );
}
