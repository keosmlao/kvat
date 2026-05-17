import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ active?: string; kind?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const onlyActive = sp.active !== "all";
  const kindFilter =
    sp.kind === "PRODUCT" || sp.kind === "SERVICE" ? sp.kind : undefined;
  const query = sp.q?.trim();

  const products = await masterPrisma.billingProduct.findMany({
    where: {
      ...(onlyActive ? { active: true } : {}),
      ...(kindFilter ? { kind: kindFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { code: { contains: query, mode: "insensitive" as const } },
              {
                description: { contains: query, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
    },
    include: { _count: { select: { items: true } } },
    orderBy: [{ kind: "asc" }, { code: "asc" }],
  });

  return (
    <OdooListPage
      title={tm("billingProdTitle")}
      subtitle="ລາຍການທີ່ໃຊ້ສຳລັບອອກໃບເກັບເງິນ — ສະພາ ປ່ຽນລາຄາ default ໄດ້"
      actions={
        <Link
          href="/manage/billing/products/new"
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium"
        >
          + ເພີ່ມສິນຄ້າ/ບໍລິການ
        </Link>
      }
      filters={
        <form className="bg-white border border-gray-200 rounded p-3" method="get">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[13px]">
            <select
              name="kind"
              defaultValue={kindFilter ?? ""}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="">ທຸກປະເພດ</option>
              <option value="PRODUCT">📦 ສິນຄ້າ</option>
              <option value="SERVICE">🛠 ບໍລິການ</option>
            </select>
            <select
              name="active"
              defaultValue={onlyActive ? "" : "all"}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="">ສະເພາະ active</option>
              <option value="all">ທັງໝົດ</option>
            </select>
            <div className="md:col-span-2 flex gap-1">
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
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">Code</th>
              <th className="text-left py-2 px-3">ປະເພດ</th>
              <th className="text-left py-2 px-3">ຊື່</th>
              <th className="text-left py-2 px-3">ຫົວໜ່ວຍ</th>
              <th className="text-right py-2 px-3">ລາຄາ (ກີບ)</th>
              <th className="text-left py-2 px-3">ສະຖານະ</th>
              <th className="text-right py-2 px-3">ໃຊ້</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  ບໍ່ມີສິນຄ້າ
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-[12px] text-gray-600">
                    {p.code}
                  </td>
                  <td className="py-2 px-3">
                    {p.kind === "PRODUCT" ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-odoo/10 text-odoo">
                        📦 ສິນຄ້າ
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-odoo/10 text-odoo">
                        🛠 ບໍລິການ
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="text-gray-800">{p.name}</div>
                    {p.description && (
                      <div className="text-[11px] text-gray-500 truncate max-w-md">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{p.unit}</td>
                  <td className="py-2 px-3 text-right font-medium font-mono">
                    {fmt(p.priceLak)}
                  </td>
                  <td className="py-2 px-3">
                    {p.active ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        active
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-[12px] text-gray-500">
                    {p._count.items}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Link
                      href={`/manage/billing/products/${p.id}`}
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
    </OdooListPage>
  );
}
