import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { OdooListPage } from "@/components/odoo/sheet";
import { actionStyle, recordLink } from "@/lib/activity-format";

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const PAGE_SIZE = 100;

export default async function ActivityFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; user?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.user ? { userId: sp.user } : {}),
  };

  let users: { id: string; name: string }[] = [];
  try {
    users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } catch {
    /* tolerate — empty user list */
  }

  // Tolerate missing UserActivity table — migration may be pending.
  let activities: Awaited<
    ReturnType<
      typeof prisma.userActivity.findMany<{
        include: {
          user: { select: { id: true; name: true; email: true } };
        };
      }>
    >
  > = [];
  let total = 0;
  let tableMissing = false;
  try {
    [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.userActivity.count({ where }),
    ]);
  } catch (e) {
    tableMissing = e instanceof Error && /does not exist/i.test(e.message);
    if (!tableMissing) throw e;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (overrides: Partial<typeof sp>) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    if (merged.action) params.set("action", merged.action);
    if (merged.user) params.set("user", merged.user);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const qs = params.toString();
    return qs ? `/activity?${qs}` : "/activity";
  };

  return (
    <OdooListPage
      title="ປະຫວັດການໃຊ້ງານທັງໝົດ"
      subtitle={`${total.toLocaleString()} ລາຍການ · ໜ້າ ${page}/${totalPages}`}
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
            <FilterChip label="ທັງໝົດ" href={buildHref({ action: undefined, page: undefined })} active={!sp.action} />
            <FilterChip label="ເຂົ້າ" href={buildHref({ action: "LOGIN", page: undefined })} active={sp.action === "LOGIN"} />
            <FilterChip label="ອອກບິນ" href={buildHref({ action: "ISSUE", page: undefined })} active={sp.action === "ISSUE"} />
            <FilterChip label="ສ້າງ" href={buildHref({ action: "CREATE", page: undefined })} active={sp.action === "CREATE"} />
            <FilterChip label="ແກ້ໄຂ" href={buildHref({ action: "UPDATE", page: undefined })} active={sp.action === "UPDATE"} />
            <FilterChip label="ລົບ" href={buildHref({ action: "DELETE", page: undefined })} active={sp.action === "DELETE"} />
            <FilterChip label="ປ່ຽນບົດບາດ" href={buildHref({ action: "ROLE_CHANGE", page: undefined })} active={sp.action === "ROLE_CHANGE"} />
          </div>
          <form method="get" className="flex items-center gap-2 text-[12px]">
            {sp.action && <input type="hidden" name="action" value={sp.action} />}
            <select
              name="user"
              defaultValue={sp.user ?? ""}
              className="px-2 py-1 border border-gray-300 rounded text-[12px]"
            >
              <option value="">ທຸກຄົນ</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 text-white rounded text-[12px]"
            >
              ກັ່ນ
            </button>
          </form>
        </div>
      }
    >
      {tableMissing ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-6 text-[13px] text-amber-800">
          <div className="font-medium mb-1">⚠ ຍັງບໍ່ໄດ້ migrate ຖານຂໍ້ມູນ</div>
          <p className="text-[12px] text-amber-700">
            ໃຫ້ admin run ຄຳສັ່ງ <code className="px-1 bg-amber-100 rounded font-mono">npm exec tsx scripts/add-user-activity.ts</code> ໃນ server
            ເພື່ອສ້າງຕາຕະລາງ UserActivity ກ່ອນ ຈຶ່ງຈະເຫັນປະຫວັດການໃຊ້ງານ.
          </p>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded p-10 text-center text-gray-500 text-[13px]">
          ບໍ່ມີຂໍ້ມູນ
        </div>
      ) : (
        <ol className="bg-white border border-gray-200 rounded divide-y divide-gray-100">
          {activities.map((a) => {
            const st = actionStyle(a.action);
            const link = recordLink(a.recordType, a.recordId);
            return (
              <li key={a.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] border ${st.cls} flex-shrink-0`}
                  title={a.action}
                >
                  {st.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-gray-800">
                    {link ? (
                      <Link href={link} className="hover:text-odoo hover:underline">
                        {a.summary}
                      </Link>
                    ) : (
                      a.summary
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{DATETIME_FMT.format(a.createdAt)}</span>
                    {a.user ? (
                      <Link
                        href={`/users/${a.user.id}/activity`}
                        className="hover:text-odoo hover:underline"
                      >
                        {a.user.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400 italic">ບໍ່ມີຜູ້ໃຊ້</span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${st.cls}`}
                    >
                      {st.label}
                    </span>
                    {a.recordType && (
                      <span className="text-gray-400">{a.recordType}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 text-[12px]">
          {page > 1 && (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              ← ກ່ອນ
            </Link>
          )}
          <span className="text-gray-500">
            ໜ້າ {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildHref({ page: String(page + 1) })}
              className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              ຕໍ່ →
            </Link>
          )}
        </div>
      )}
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
      className={`px-2.5 py-1 rounded font-medium transition ${
        active
          ? "bg-odoo/10 text-odoo"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}
