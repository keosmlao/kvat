import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { TenantStatus, TenantPlan } from "@/generated/master/client";
import { OdooListPage } from "@/components/odoo/sheet";
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
  TRIAL: "ທົດລອງ 30 ວັນ",
  YEARLY: "ລາຍປີ",
  LIFETIME: "ຕະຫຼອດຊີບ",
};

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmt(d: Date | null) {
  return d ? DATE_FMT.format(d) : "—";
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function TenantsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status?.toUpperCase();
  const q = sp.q?.trim() ?? "";

  const where = {
    ...(statusFilter && statusFilter in STATUS_LABEL
      ? { status: statusFilter as TenantStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { slug: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tenants, counts] = await Promise.all([
    masterPrisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    masterPrisma.tenant.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus: Record<string, number> = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  );
  const totalCount = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <OdooListPage
      title={tm("tenantsTitle")}
      subtitle={`${totalCount} tenant${q ? ` · "${q}"` : ""}`}
      actions={
        <form
          action="/manage/tenants"
          className="flex items-center gap-2 text-[12px]"
        >
          {statusFilter && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder={tm("search")}
            className="px-2 py-1 border border-gray-300 rounded text-[12px] focus:outline-none focus:border-slate-700 w-64"
          />
        </form>
      }
      filters={
        <div className="flex items-center gap-1 text-[12px]">
          <FilterTab
            href="/manage/tenants"
            active={!statusFilter}
            label={tm("filterAll")}
            count={totalCount}
          />
          {(Object.keys(STATUS_LABEL) as TenantStatus[]).map((s) => (
            <FilterTab
              key={s}
              href={`/manage/tenants?status=${s.toLowerCase()}`}
              active={statusFilter === s}
              label={STATUS_LABEL[s].label}
              count={countByStatus[s] ?? 0}
            />
          ))}
        </div>
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Tenant</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">{tm("colTenantPlan")}</th>
              <th className="px-3 py-2 text-left">{tm("colTenantStatus")}</th>
              <th className="px-3 py-2 text-left">Trial / Paid until</th>
              <th className="px-3 py-2 text-left">{tm("colTenantSignup")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-gray-400 italic"
                >
                  {tm("tenantsNoData")}
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const statusInfo = STATUS_LABEL[t.status];
              const days = daysUntil(t.trialEndsAt);
              const expired = t.status === "TRIAL" && days !== null && days < 0;
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2">
                    <Link
                      href={`/manage/tenants/${t.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {t.name}
                    </Link>
                    <div className="text-[11px] text-gray-500 font-mono">
                      /t/{t.slug}
                      {t.isTemplate && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-odoo/10 text-odoo text-[10px] uppercase tracking-wider">
                          template
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{t.email}</td>
                  <td className="px-3 py-2 text-gray-700">{PLAN_LABEL[t.plan]}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.cls}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {t.status === "TRIAL" ? (
                      <span
                        className={
                          expired ? "text-red-600 font-medium" : "text-gray-700"
                        }
                      >
                        {fmt(t.trialEndsAt)}
                        {days !== null && (
                          <span className="ml-1 text-[11px] text-gray-400">
                            ({expired ? `ໝົດ ${-days}d` : `${days}d`})
                          </span>
                        )}
                      </span>
                    ) : t.plan === "LIFETIME" ? (
                      <span className="text-gray-400">∞</span>
                    ) : (
                      fmt(t.paidUntil)
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-[12px]">
                    {fmt(t.createdAt)}
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

function FilterTab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`px-2 py-1 rounded text-[12px] transition ${
        active
          ? "bg-slate-900 text-white"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
      <span
        className={`ml-1 text-[10px] ${active ? "text-slate-300" : "text-gray-400"}`}
      >
        {count}
      </span>
    </Link>
  );
}
