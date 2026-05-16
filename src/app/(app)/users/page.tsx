import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { DeleteUserButton } from "./delete-button";

export default async function UsersPage(props: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const session = await requireAdmin();
  const { q, role } = await props.searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (role === "ADMIN" || role === "STAFF") where.role = role;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invoices: true } } },
  });

  const all = await prisma.user.findMany({ select: { role: true } });
  const adminCount = all.filter((u) => u.role === "ADMIN").length;
  const staffCount = all.filter((u) => u.role === "STAFF").length;

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Control panel */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 pt-3 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[15px]">
            <Link href="/settings" className="text-gray-500 hover:underline">
              ການກຳນົດຄ່າ
            </Link>
            <span className="text-gray-300">›</span>
            <span className="font-medium text-gray-800">ຜູ້ໃຊ້</span>
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
            {role && <input type="hidden" name="role" value={role} />}
          </form>
        </div>

        <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Link
              href="/users/new"
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium tracking-wide transition"
            >
              ໃໝ່
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <FilterChip label="ທັງໝົດ" href="/users" active={!role} />
            <FilterChip
              label={`ຜູ້ດູແລ (${adminCount})`}
              href="/users?role=ADMIN"
              active={role === "ADMIN"}
            />
            <FilterChip
              label={`ພະນັກງານ (${staffCount})`}
              href="/users?role=STAFF"
              active={role === "STAFF"}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 tabular-nums">
              1-{users.length} / {users.length}
            </span>
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
              <th className="px-2 py-2 text-left font-semibold">ຊື່</th>
              <th className="px-2 py-2 text-left font-semibold">Email</th>
              <th className="px-2 py-2 text-center font-semibold w-32">
                ບົດບາດ
              </th>
              <th className="px-2 py-2 text-right font-semibold w-24">
                ບິນທີ່ອອກ
              </th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="text-gray-500 text-sm mb-2">ບໍ່ມີຜູ້ໃຊ້</div>
                  <Link
                    href="/users/new"
                    className="text-[#b91c1c] hover:underline text-sm font-medium"
                  >
                    ສ້າງຜູ້ໃຊ້ໃໝ່
                  </Link>
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isSelf = u.id === session.userId;
              return (
                <tr
                  key={u.id}
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
                      href={`/users/${u.id}/edit`}
                      className="flex items-center gap-2 hover:text-[#b91c1c]"
                    >
                      <span className="w-7 h-7 rounded-full bg-[#b91c1c]/10 text-[#b91c1c] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-gray-800 font-medium">
                        {u.name}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          ທ່ານ
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-gray-600 font-mono text-[12px]">
                    {u.email}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {u.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#b91c1c]/10 text-[#b91c1c] text-[11px] font-medium border border-[#b91c1c]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
                        ຜູ້ດູແລ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        ພະນັກງານ
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-700">
                    {u._count.invoices}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        href={`/users/${u.id}/edit`}
                        className="text-[#b91c1c] hover:text-[#991b1b] text-[12px]"
                      >
                        ແກ້ໄຂ
                      </Link>
                      <DeleteUserButton id={u.id} disabled={isSelf} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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
