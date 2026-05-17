import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { TenantStatus, TenantPlan } from "@/generated/master/client";
import {
  ApproveForm,
  StatusActions,
  NotesForm,
  ResetPasswordForm,
} from "./tenant-actions";
import { OdooListPage } from "@/components/odoo/sheet";
import { ManagementChatter } from "@/components/management-chatter";
import { getManagementChatterData } from "@/lib/management-chatter";
import { t } from "@/lib/i18n/messages";

const LOCALE = "lo";
const tm = (k: string) => t(LOCALE, "manage", k);

const STATUS_LABEL: Record<TenantStatus, { label: string; cls: string }> = {
  TRIAL:     { label: tm("filterTrial"),     cls: "bg-odoo/10 text-odoo border-odoo/30" },
  ACTIVE:    { label: tm("filterActive"),    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUSPENDED: { label: tm("filterSuspended"), cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CANCELLED: { label: tm("filterCancelled"), cls: "bg-gray-100 text-gray-700 border-gray-200" },
};

const PLAN_LABEL: Record<TenantPlan, string> = {
  TRIAL:    tm("planTrial30"),
  YEARLY:   tm("planYearly"),
  LIFETIME: tm("planLifetime"),
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
  const tenantDb = getTenantPrisma(tenant.dbName);
  const [tenantUsers, billingCfg, billingProducts, chatter] = await Promise.all([
    tenantDb.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    masterPrisma.billingConfig.findUnique({
      where: { id: 1 },
      include: {
        yearlyProduct: {
          select: { id: true, code: true, name: true, priceLak: true },
        },
        lifetimeProduct: {
          select: { id: true, code: true, name: true, priceLak: true },
        },
      },
    }),
    masterPrisma.billingProduct.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, unit: true, priceLak: true },
    }),
    getManagementChatterData("Tenant", id),
  ]);
  const totalLogins = tenant._count.logins;
  // "Online" = activity in the last 5 minutes. The session.ts throttle writes
  // lastSeenAt at most every 60s, so a 5-min window covers active users
  // without false negatives during quiet stretches.
  const ONLINE_WINDOW_MS = 5 * 60_000;
  const nowMs = new Date().getTime();
  const totalPages = Math.max(1, Math.ceil(totalLogins / PAGE_SIZE));

  const statusInfo = STATUS_LABEL[tenant.status];
  const days = Math.ceil(
    (tenant.trialEndsAt.getTime() - nowMs) / (1000 * 60 * 60 * 24),
  );
  const isPending = tenant.status === "TRIAL";

  return (
    <OdooListPage
      title={tenant.name}
      subtitle={`/t/${tenant.slug} · ${statusInfo.label} · ${PLAN_LABEL[tenant.plan]}${tenant.isTemplate ? " · template" : ""}`}
      actions={
        <StatusActions
          id={tenant.id}
          status={tenant.status}
          canHardDelete={!tenant.isTemplate && tenant.status === "CANCELLED"}
        />
      }
    >
      <>
      <div className="mb-3">
        <Link
          href="/manage/tenants"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Tenants
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title={tm("tenantInfo")}>
          <Row label="DB">
            <span className="font-mono">{tenant.dbName}</span>
          </Row>
          <Row label={tm("tenantOwner")}>{tenant.ownerName}</Row>
          <Row label="Email">{tenant.email}</Row>
          {tenant.phone && <Row label={tm("tenantPhone")}>{tenant.phone}</Row>}
          <Row label={tm("tenantCreatedAt")}>{fmt(tenant.createdAt)}</Row>
        </Card>

        <Card title={tm("tenantPlanStatus")}>
          <Row label="Plan">{PLAN_LABEL[tenant.plan]}</Row>
          <Row label={tm("tenantTrialEnd")}>
            {fmt(tenant.trialEndsAt)}
            {tenant.status === "TRIAL" && (
              <span
                className={`ml-2 text-[11px] ${
                  days < 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                ({days < 0 ? `${tm("tenantOverdue")} ${-days}d` : `${tm("tenantRemaining")} ${days}d`})
              </span>
            )}
          </Row>
          <Row label={tm("tenantPaidUntil")}>
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
              {tm("tenantPlanMove")}
            </p>
            <ApproveForm
              id={tenant.id}
              defaults={{
                yearly: billingCfg?.yearlyProduct ?? null,
                lifetime: billingCfg?.lifetimeProduct ?? null,
              }}
              products={billingProducts}
            />
          </Card>
        )}

        <Card title={tm("tenantInternalNote")}>
          <NotesForm id={tenant.id} initialNotes={tenant.notes ?? ""} />
        </Card>

        <Card title={`Users (${tenantUsers.length})`} className="md:col-span-2">
          {tenantUsers.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">{tm("tenantNoUser")}</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="text-left py-1">{tm("tenantUserStatus")}</th>
                  <th className="text-left py-1">{tm("tenantUserName")}</th>
                  <th className="text-left py-1">Email</th>
                  <th className="text-left py-1">Role</th>
                  <th className="text-left py-1">{tm("tenantLastSeen")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenantUsers.map((u) => {
                  const seenMs = u.lastSeenAt?.getTime() ?? 0;
                  const online =
                    seenMs > 0 && nowMs - seenMs < ONLINE_WINDOW_MS;
                  return (
                    <tr key={u.email}>
                      <td className="py-1">
                        {online ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            offline
                          </span>
                        )}
                      </td>
                      <td className="py-1">{u.name}</td>
                      <td className="py-1 text-gray-700">{u.email}</td>
                      <td className="py-1 text-[11px] uppercase tracking-wider text-gray-500">
                        {u.role}
                      </td>
                      <td className="py-1 text-gray-600">
                        {u.lastSeenAt ? fmt(u.lastSeenAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={tm("tenantResetTitle")}>
          <p className="text-[12px] text-gray-600 mb-3">
            {tm("tenantResetDesc")}
          </p>
          <ResetPasswordForm id={tenant.id} users={tenantUsers} />
        </Card>

        <Card title="Approval requests" className="md:col-span-2">
          {tenant.requests.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">{tm("tenantResetNone")}</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="text-left py-1">{tm("tenantDate")}</th>
                  <th className="text-left py-1">Plan</th>
                  <th className="text-left py-1">{tm("tenantUserStatus")}</th>
                  <th className="text-left py-1">{tm("tenantReason")}</th>
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
              {tm("tenantNoLogin")}
            </p>
          ) : (
            <>
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left py-1">{tm("tenantTime")}</th>
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
                    {tm("page")} {page} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/manage/tenants/${tenant.id}?logins=${page - 1}`}
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {tm("prev")}
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/manage/tenants/${tenant.id}?logins=${page + 1}`}
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        {tm("next")}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      <div className="mt-4 bg-white border border-gray-200 rounded overflow-hidden">
        <ManagementChatter
          recordType="Tenant"
          recordId={id}
          revalidate={`/manage/tenants/${id}`}
          messages={chatter.messages}
          followers={chatter.followers}
          activities={chatter.activities}
          users={chatter.users}
          isFollowing={chatter.isFollowing}
          currentUserId={chatter.currentUserId}
        />
      </div>
      </>
    </OdooListPage>
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
