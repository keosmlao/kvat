import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const typeFilter =
    sp.type === "TENANT" || sp.type === "EXTERNAL" ? sp.type : undefined;
  const query = sp.q?.trim();

  const customers = await masterPrisma.billingCustomer.findMany({
    where: {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { code: { contains: query, mode: "insensitive" as const } },
              { taxId: { contains: query, mode: "insensitive" as const } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { invoices: true } },
      tenant: { select: { slug: true } },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return (
    <OdooListPage
      title={tm("billingCustTitle")}
      subtitle="ລູກຄ້າ SaaS (tenant) + ລູກຄ້າຊື້ລະບົບ/ບໍລິການອື່ນ"
      actions={
        <Link
          href="/manage/billing/customers/new"
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium"
        >
          + ເພີ່ມລູກຄ້າ
        </Link>
      }
      filters={
        <form className="bg-white border border-gray-200 rounded p-3" method="get">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[13px]">
            <select
              name="type"
              defaultValue={typeFilter ?? ""}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="">ທຸກປະເພດ</option>
              <option value="TENANT">SaaS Tenant</option>
              <option value="EXTERNAL">ລູກຄ້າພາຍນອກ</option>
            </select>
            <div className="md:col-span-2 flex gap-1">
              <input
                type="text"
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="ຄົ້ນຫາຊື່ / code / TIN / email..."
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
              <th className="text-left py-2 px-3">ຕິດຕໍ່</th>
              <th className="text-left py-2 px-3">TIN</th>
              <th className="text-right py-2 px-3">ໃບເກັບເງິນ</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ບໍ່ມີລູກຄ້າ
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-mono text-[12px] text-gray-600">
                    {c.code}
                  </td>
                  <td className="py-2 px-3">
                    {c.type === "TENANT" ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-odoo/10 text-odoo">
                        Tenant
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        ພາຍນອກ
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="text-gray-800">{c.name}</div>
                    {c.tenant && (
                      <div className="text-[11px] text-gray-500 font-mono">
                        /t/{c.tenant.slug}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {c.contactName && (
                      <div className="text-[12px]">{c.contactName}</div>
                    )}
                    <div className="text-[11px] text-gray-500">
                      {c.email ?? ""} {c.phone ? `· ${c.phone}` : ""}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-700 font-mono text-[12px]">
                    {c.taxId ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-right">{c._count.invoices}</td>
                  <td className="py-2 px-3 text-right">
                    <Link
                      href={`/manage/billing/customers/${c.id}`}
                      className="text-[12px] text-slate-700 hover:underline"
                    >
                      ເບິ່ງ →
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
