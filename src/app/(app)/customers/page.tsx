import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteCustomerButton } from "./delete-button";

export default async function CustomersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { taxId: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      province: { select: { name: true } },
      district: { select: { name: true } },
      village: { select: { name: true } },
    },
  });

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Control panel */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 pt-3 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[15px]">
            <span className="font-medium text-gray-800">ລູກຄ້າ</span>
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
          </form>
        </div>

        <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Link
              href="/customers/new"
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium tracking-wide transition"
            >
              ໃໝ່
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-[12px] text-gray-500 px-2.5 py-1">
              ທັງໝົດ {customers.length} ລາຍ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 tabular-nums">
              1-{customers.length} / {customers.length}
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
          </div>
        </div>
      </div>

      {/* Tree view */}
      <div className="bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 w-10 text-left">
                <input type="checkbox" className="accent-[#b91c1c]" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">ລະຫັດ</th>
              <th className="px-2 py-2 text-left font-semibold">ຊື່ລູກຄ້າ</th>
              <th className="px-2 py-2 text-left font-semibold">ເລກອາກອນ</th>
              <th className="px-2 py-2 text-left font-semibold">ໂທ</th>
              <th className="px-2 py-2 text-left font-semibold">Email</th>
              <th className="px-2 py-2 text-left font-semibold">ທີ່ຢູ່</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <div className="text-gray-500 text-sm mb-2">ບໍ່ມີລູກຄ້າ</div>
                  <Link
                    href="/customers/new"
                    className="text-[#b91c1c] hover:underline text-sm font-medium"
                  >
                    ສ້າງລູກຄ້າໃໝ່
                  </Link>
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr
                key={c.id}
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
                    href={`/customers/${c.id}/edit`}
                    className="font-mono text-[12px] text-gray-800 hover:text-[#b91c1c]"
                  >
                    {c.code}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <Link
                    href={`/customers/${c.id}/edit`}
                    className="flex items-center gap-2 hover:text-[#b91c1c]"
                  >
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-[#b91c1c]/10 text-[#b91c1c] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
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
                      href={`/customers/${c.id}/edit`}
                      className="text-[#b91c1c] hover:text-[#991b1b] text-[12px]"
                    >
                      ແກ້ໄຂ
                    </Link>
                    <DeleteCustomerButton id={c.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
