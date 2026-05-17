import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { DeleteUserButton } from "./delete-button";
import { OdooListPage } from "@/components/odoo/sheet";

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
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { invoices: true } },
    },
  });

  const all = await prisma.user.findMany({ select: { role: true } });
  const adminCount = all.filter((u) => u.role === "ADMIN").length;
  const staffCount = all.filter((u) => u.role === "STAFF").length;

  return (
    <OdooListPage
      title="ຜູ້ໃຊ້"
      subtitle="ບັນຊີຜູ້ໃຊ້ໃນລະບົບຂອງທ່ານ"
      actions={
        <Link
          href="/users/new"
          className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium"
        >
          + ໃໝ່
        </Link>
      }
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
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
          <form className="flex items-center gap-2">
            <div className="relative">
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="ຄົ້ນຫາ..."
                className="w-72 pl-9 pr-3 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-odoo focus:ring-2 focus:ring-odoo/15 bg-white"
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
            <span className="text-[12px] text-gray-500 tabular-nums">
              {users.length}
            </span>
          </form>
        </div>
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 w-10 text-left">
                <input type="checkbox" className="accent-odoo" />
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
                    className="text-odoo hover:underline text-sm font-medium"
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
                      href={`/users/${u.id}/edit`}
                      className="flex items-center gap-2 hover:text-odoo"
                    >
                      <span className="w-7 h-7 rounded-full bg-odoo/10 text-odoo flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-gray-800 font-medium">
                        {u.name}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-odoo/10 text-odoo border border-odoo/30">
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-odoo/10 text-odoo text-[11px] font-medium border border-odoo/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-odoo" />
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
                        href={`/users/${u.id}/activity`}
                        className="text-gray-600 hover:text-gray-900 text-[12px]"
                      >
                        ປະຫວັດ
                      </Link>
                      <Link
                        href={`/users/${u.id}/edit`}
                        className="text-odoo hover:text-odoo-hover text-[12px]"
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
    </OdooListPage>
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
          ? "bg-odoo/10 text-odoo"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}
