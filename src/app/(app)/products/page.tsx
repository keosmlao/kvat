import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { DeleteProductButton } from "./delete-button";

export default async function ProductsPage(props: {
  searchParams: Promise<{ q?: string; filter?: string; view?: string }>;
}) {
  const { q, filter, view } = await props.searchParams;
  const currentView: "list" | "kanban" = view === "kanban" ? "kanban" : "list";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
    ];
  }
  if (filter === "active") where.active = true;
  if (filter === "archived") where.active = false;

  const products = await prisma.product.findMany({
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
      ? products.filter((p) => p.stock <= p.minStock)
      : products;

  const totalValue = visible.reduce(
    (s, p) => s + p.stock * p.priceLak,
    0,
  );

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Control panel */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 pt-3 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[15px]">
            <span className="font-medium text-gray-800">ສິນຄ້າ</span>
          </div>
          <form className="flex items-center">
            <div className="relative">
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="ຄົ້ນຫາ..."
                className="w-72 pl-9 pr-3 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15 bg-white"
              />
              <svg
                className="absolute left-2.5 top-2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>
            </div>
            {filter && <input type="hidden" name="filter" value={filter} />}
            {currentView !== "list" && (
              <input type="hidden" name="view" value={currentView} />
            )}
          </form>
        </div>

        <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Link
              href="/products/new"
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium tracking-wide transition"
            >
              ໃໝ່
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <FilterChip
              label="ທັງໝົດ"
              href={buildUrl({ view: currentView })}
              active={!filter}
            />
            <FilterChip
              label={`ໃຊ້ງານ (${activeCount})`}
              href={buildUrl({ filter: "active", view: currentView })}
              active={filter === "active"}
            />
            <FilterChip
              label={`ປິດ (${archivedCount})`}
              href={buildUrl({ filter: "archived", view: currentView })}
              active={filter === "archived"}
            />
            <FilterChip
              label={`ໃກ້ໝົດ (${lowStockCount})`}
              href={buildUrl({ filter: "low", view: currentView })}
              active={filter === "low"}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 tabular-nums">
              1-{visible.length} / {visible.length}
            </span>
            <div className="flex border border-gray-200 rounded overflow-hidden">
              <button
                type="button"
                className="px-1.5 py-1 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                disabled
              >
                ‹
              </button>
              <button
                type="button"
                className="px-1.5 py-1 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                disabled
              >
                ›
              </button>
            </div>
            <span className="mx-1 text-gray-300">|</span>
            <ViewSwitcher current={currentView} filter={filter} q={q} />
          </div>
        </div>
      </div>

      {/* Kanban view */}
      {currentView === "kanban" && (
        <div className="px-4 md:px-6 py-4">
          {visible.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-500 text-sm mb-2">ບໍ່ມີສິນຄ້າ</div>
              <Link
                href="/products/new"
                className="text-[#b91c1c] hover:underline text-sm font-medium"
              >
                ສ້າງສິນຄ້າໃໝ່
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {visible.map((p) => {
                const lowStock = p.stock <= p.minStock;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}/edit`}
                    className="bg-white border border-gray-200 rounded overflow-hidden hover:border-[#b91c1c] hover:shadow-md transition flex flex-col group"
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
                        <span className="text-5xl font-light text-[#b91c1c]/30">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {!p.active && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                            ປິດ
                          </span>
                        </div>
                      )}
                      {p.active && lowStock && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium border border-red-200">
                          ⚠ ໃກ້ໝົດ
                        </span>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex flex-col">
                      <div className="text-[10px] font-mono text-gray-500">
                        {p.code}
                      </div>
                      <div className="text-[13px] font-medium text-gray-800 line-clamp-2 mb-1 group-hover:text-[#b91c1c]">
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
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
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
      <div className="bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 w-10 text-left">
                <input type="checkbox" className="accent-[#b91c1c]" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">ລະຫັດ</th>
              <th className="px-2 py-2 text-left font-semibold">
                <SortHeader label="ຊື່ສິນຄ້າ" active dir="desc" />
              </th>
              <th className="px-2 py-2 text-left font-semibold w-32">ໝວດໝູ່</th>
              <th className="px-2 py-2 text-left font-semibold w-28">ປະເພດ</th>
              <th className="px-2 py-2 text-center font-semibold w-16">ໜ່ວຍ</th>
              <th className="px-2 py-2 text-right font-semibold w-32">ລາຄາຂາຍ</th>
              <th className="px-2 py-2 text-right font-semibold w-24">ຄັງ</th>
              <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <div className="text-gray-500 text-sm mb-2">ບໍ່ມີສິນຄ້າ</div>
                  <Link
                    href="/products/new"
                    className="text-[#b91c1c] hover:underline text-sm font-medium"
                  >
                    ສ້າງສິນຄ້າໃໝ່
                  </Link>
                </td>
              </tr>
            )}
            {visible.map((p) => {
              const lowStock = p.stock <= p.minStock;
              return (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 hover:bg-[#b91c1c]/5 group"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="accent-[#b91c1c] opacity-0 group-hover:opacity-100 transition"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="font-mono text-[12px] text-gray-800 hover:text-[#b91c1c]"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="flex items-center gap-2 hover:text-[#b91c1c]"
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="w-7 h-7 rounded object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded bg-[#b91c1c]/10 text-[#b91c1c] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
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
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
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
                        ໃຊ້ງານ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        ປິດ
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        href={`/products/${p.id}/edit`}
                        className="text-[#b91c1c] hover:text-[#991b1b] text-[12px]"
                      >
                        ແກ້ໄຂ
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
                  ມູນຄ່າສິນຄ້າຄົງເຫຼືອ
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
    </div>
  );
}

function buildUrl(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
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
          ? "bg-[#b91c1c]/10 text-[#b91c1c]"
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
        active ? "text-[#b91c1c]" : ""
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
            ? "bg-[#b91c1c]/10 text-[#b91c1c]"
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
            ? "bg-[#b91c1c]/10 text-[#b91c1c]"
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
