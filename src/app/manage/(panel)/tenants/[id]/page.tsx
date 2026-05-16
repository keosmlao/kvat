import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { TenantStatus, TenantPlan } from "@/generated/master/client";
import { ApproveForm, StatusActions, NotesForm } from "./tenant-actions";

const STATUS_LABEL: Record<TenantStatus, { label: string; cls: string }> = {
  TRIAL: { label: "ທົດລອງ", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ACTIVE: {
    label: "ໃຊ້ງານ",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SUSPENDED: {
    label: "ໂມດສ",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CANCELLED: {
    label: "ຍົກເລີກ",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const PLAN_LABEL: Record<TenantPlan, string> = {
  TRIAL: "ທົດລອງ 30 ວັນ",
  YEARLY: "ລາຍປີ",
  LIFETIME: "ຕະຫຼອດຊີບ",
};

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmt(d: Date | null) {
  return d ? DATETIME_FMT.format(d) : "—";
}

const PAGE_SIZE = 20;

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ logins?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.logins ?? "1", 10) || 1);

  const tenant = await masterPrisma.tenant.findUnique({
    where: { id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      logins: {
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      },
      _count: { select: { logins: true } },
    },
  });
  if (!tenant) notFound();
  const totalLogins = tenant._count.logins;
  const totalPages = Math.max(1, Math.ceil(totalLogins / PAGE_SIZE));

  const statusInfo = STATUS_LABEL[tenant.status];
  const days = Math.ceil(
    (tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const isPending = tenant.status === "TRIAL";

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/manage/tenants"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Tenants
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">
            {tenant.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[12px]">
            <span className="font-mono text-gray-600">/t/{tenant.slug}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.cls}`}
            >
              {statusInfo.label}
            </span>
            <span className="text-gray-500">{PLAN_LABEL[tenant.plan]}</span>
            {tenant.isTemplate && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] uppercase tracking-wider">
                template
              </span>
            )}
          </div>
        </div>
        <StatusActions
          id={tenant.id}
          status={tenant.status}
          canHardDelete={!tenant.isTemplate && tenant.status === "CANCELLED"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="ຂໍ້ມູນ tenant">
          <Row label="DB">
            <span className="font-mono">{tenant.dbName}</span>
          </Row>
          <Row label="ເຈົ້າຂອງ">{tenant.ownerName}</Row>
          <Row label="Email">{tenant.email}</Row>
          {tenant.phone && <Row label="ໂທ">{tenant.phone}</Row>}
          <Row label="ສ້າງເມື່ອ">{fmt(tenant.createdAt)}</Row>
        </Card>

        <Card title="Plan + ສະຖານະ">
          <Row label="Plan">{PLAN_LABEL[tenant.plan]}</Row>
          <Row label="Trial ໝົດ">
            {fmt(tenant.trialEndsAt)}
            {tenant.status === "TRIAL" && (
              <span
                className={`ml-2 text-[11px] ${
                  days < 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                ({days < 0 ? `ເກີນ ${-days}d` : `ເຫຼືອ ${days}d`})
              </span>
            )}
          </Row>
          <Row label="ຈ່າຍຮອດ">
            {tenant.plan === "LIFETIME" ? "∞" : fmt(tenant.paidUntil)}
          </Row>
          <Row label="Approved">
            {fmt(tenant.approvedAt)}
            {tenant.approvedBy && (
              <span className="ml-2 text-[11px] text-gray-500 font-mono">
                ({tenant.approvedBy.slice(0, 8)})
              </span>
            )}
          </Row>
        </Card>

        {isPending && (
          <Card title="✓ Approve plan">
            <p className="text-[12px] text-gray-600 mb-3">
              ຍ້າຍ tenant ນີ້ຈາກ TRIAL ໄປ ACTIVE ດ້ວຍ plan ທີ່ເລືອກ.
            </p>
            <ApproveForm id={tenant.id} />
          </Card>
        )}

        <Card title="ບັນທຶກພາຍໃນ">
          <NotesForm id={tenant.id} initialNotes={tenant.notes ?? ""} />
        </Card>

        <Card title="Approval requests" className="md:col-span-2">
          {tenant.requests.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">ບໍ່ມີ</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="text-left py-1">ວັນທີ</th>
                  <th className="text-left py-1">Plan</th>
                  <th className="text-left py-1">ສະຖານະ</th>
                  <th className="text-left py-1">ເຫດຜົນ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenant.requests.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1 text-gray-600">{fmt(r.createdAt)}</td>
                    <td className="py-1">{PLAN_LABEL[r.requestedPlan]}</td>
                    <td className="py-1">{r.status}</td>
                    <td className="py-1 text-gray-700">{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title={`Login logs (${totalLogins})`}
          className="md:col-span-2"
        >
          {tenant.logins.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">
              ຍັງບໍ່ມີການ login
            </p>
          ) : (
            <>
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left py-1">ເວລາ</th>
                    <th className="text-left py-1">User</th>
                    <th className="text-left py-1">IP</th>
                    <th className="text-left py-1">User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tenant.logins.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1 text-gray-600">{fmt(l.createdAt)}</td>
                      <td className="py-1">{l.userEmail}</td>
                      <td className="py-1 font-mono text-[11px] text-gray-500">
                        {l.ipAddress ?? "—"}
                      </td>
                      <td className="py-1 text-[11px] text-gray-500 truncate max-w-xs">
                        {l.userAgent ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-[12px]">
                  <span className="text-gray-500">
                    ໜ້າ {page} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/manage/tenants/${tenant.id}?logins=${page - 1}`}
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        ← ກ່ອນ
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/manage/tenants/${tenant.id}?logins=${page + 1}`}
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        ຕໍ່ →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded p-4 ${className}`}
    >
      <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
        {title}
      </h3>
      <div className="space-y-1.5 text-[13px]">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <span className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="text-gray-800">{children}</span>
    </div>
  );
}
