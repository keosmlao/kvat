import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
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

export default async function UserActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const { action } = await searchParams;

  // Non-admins can only view their own timeline.
  if (session.role !== "ADMIN" && session.userId !== id) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) notFound();

  // Tolerate missing UserActivity table — the migration script may not have
  // been run yet. Show a friendly hint rather than crashing.
  let activities: Awaited<ReturnType<typeof prisma.userActivity.findMany>> = [];
  let tableMissing = false;
  try {
    activities = await prisma.userActivity.findMany({
      where: { userId: id, ...(action ? { action } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (e) {
    tableMissing =
      e instanceof Error && /does not exist/i.test(e.message);
    if (!tableMissing) throw e;
  }

  return (
    <OdooListPage
      title={`ປະຫວັດການໃຊ້ງານ: ${user.name}`}
      subtitle={`${user.email} · ${user.role === "ADMIN" ? "ຜູ້ດູແລ" : "ພະນັກງານ"}`}
      actions={
        <>
          <Link
            href={`/users/${user.id}/edit`}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 rounded text-[13px]"
          >
            ← ໂປຣໄຟລ໌
          </Link>
          {session.role === "ADMIN" && (
            <Link
              href="/activity"
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 rounded text-[13px]"
            >
              ທຸກຄົນ →
            </Link>
          )}
        </>
      }
      filters={
        <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
          <FilterChip label="ທັງໝົດ" href={`/users/${id}/activity`} active={!action} />
          <FilterChip label="ເຂົ້າ/ອອກ" href={`/users/${id}/activity?action=LOGIN`} active={action === "LOGIN"} />
          <FilterChip label="ສ້າງ" href={`/users/${id}/activity?action=CREATE`} active={action === "CREATE"} />
          <FilterChip label="ອອກບິນ" href={`/users/${id}/activity?action=ISSUE`} active={action === "ISSUE"} />
          <FilterChip label="ແກ້ໄຂ" href={`/users/${id}/activity?action=UPDATE`} active={action === "UPDATE"} />
          <FilterChip label="ລົບ" href={`/users/${id}/activity?action=DELETE`} active={action === "DELETE"} />
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
          ຍັງບໍ່ມີປະຫວັດການໃຊ້ງານ
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
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                    <span>{DATETIME_FMT.format(a.createdAt)}</span>
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
