import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const ACTION_LABELS: Record<string, { label: string; colour: string }> = {
  "tenant.approve": { label: "Approve tenant", colour: "emerald" },
  "tenant.suspend": { label: "Suspend tenant", colour: "amber" },
  "tenant.reactivate": { label: "Reactivate tenant", colour: "emerald" },
  "tenant.cancel": { label: "Cancel tenant", colour: "rose" },
  "tenant.delete": { label: "Delete tenant + DB", colour: "rose" },
  "tenant.reset-password": { label: "Reset user password", colour: "amber" },
  "tenant.notes": { label: "Update notes", colour: "slate" },
  "billing.create": { label: "Create invoice", colour: "emerald" },
  "billing.update": { label: "Edit invoice", colour: "slate" },
  "billing.mark-paid": { label: "Mark paid", colour: "emerald" },
  "billing.cancel": { label: "Cancel invoice", colour: "amber" },
  "billing.delete": { label: "Delete invoice", colour: "rose" },
  "billing-customer.create": { label: "Create customer", colour: "emerald" },
  "billing-customer.update": { label: "Edit customer", colour: "slate" },
  "billing-customer.delete": { label: "Delete customer", colour: "rose" },
  "billing-product.create": { label: "Create product", colour: "emerald" },
  "billing-product.update": { label: "Edit product", colour: "slate" },
  "billing-product.delete": { label: "Delete product", colour: "rose" },
  "billing-config.save": { label: "Update company config", colour: "slate" },
  "etax-config.save": { label: "Update eTax config", colour: "slate" },
};

const COLOUR_CLS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-gray-50 text-gray-700 border-gray-200",
};

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    action?: string;
    entityType?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {
    ...(sp.actor ? { actorEmail: { contains: sp.actor } } : {}),
    ...(sp.action ? { action: sp.action } : {}),
    ...(sp.entityType ? { entityType: sp.entityType } : {}),
  };

  const [logs, total, distinctActions] = await Promise.all([
    masterPrisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    masterPrisma.adminAuditLog.count({ where }),
    masterPrisma.adminAuditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (sp.actor && !("actor" in over)) params.set("actor", sp.actor);
    if (sp.action && !("action" in over)) params.set("action", sp.action);
    if (sp.entityType && !("entityType" in over))
      params.set("entityType", sp.entityType);
    for (const [k, v] of Object.entries(over)) if (v) params.set(k, v);
    return params.toString();
  };

  return (
    <OdooListPage
      title={tm("auditTitle")}
      subtitle={tm("auditSubtitle")}
      filters={
        <form className="bg-white border border-gray-200 rounded p-3" method="get">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[13px]">
            <input
              type="text"
              name="actor"
              defaultValue={sp.actor ?? ""}
              placeholder={tm("audSearchEmail")}
              className="px-2 py-1 border border-gray-300 rounded"
            />
            <select
              name="action"
              defaultValue={sp.action ?? ""}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="">{tm("audAllActions")}</option>
              {distinctActions.map((d) => (
                <option key={d.action} value={d.action}>
                  {ACTION_LABELS[d.action]?.label ?? d.action}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="entityType"
              defaultValue={sp.entityType ?? ""}
              placeholder="Tenant / BillingInvoice / ..."
              className="px-2 py-1 border border-gray-300 rounded font-mono text-[12px]"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 text-white rounded"
            >
              {tm("audFilterBtn")}
            </button>
          </div>
        </form>
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3 w-44">{tm("audColTime")}</th>
              <th className="text-left py-2 px-3">Action</th>
              <th className="text-left py-2 px-3">Entity</th>
              <th className="text-left py-2 px-3">Admin</th>
              <th className="text-left py-2 px-3 w-32">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  {tm("audNoData")}
                </td>
              </tr>
            ) : (
              logs.map((l) => {
                const meta = ACTION_LABELS[l.action] ?? {
                  label: l.action,
                  colour: "slate",
                };
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600 text-[12px]">
                      {DATETIME_FMT.format(l.createdAt)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium border ${COLOUR_CLS[meta.colour]}`}
                      >
                        {meta.label}
                      </span>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {l.action}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-gray-700">{l.entityLabel ?? "—"}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {l.entityType}
                        {l.entityId ? ` · ${l.entityId.slice(0, 12)}` : ""}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700">
                      {l.actorEmail ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                      {l.ipAddress ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px]">
          <span className="text-gray-500">
            {tm("audPagePrefix")} {page} / {totalPages} ({total} entries)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/manage/audit?${buildQuery({ page: String(page - 1) })}`}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                {tm("audPrev")}
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/manage/audit?${buildQuery({ page: String(page + 1) })}`}
                className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                {tm("audNext")}
              </Link>
            )}
          </div>
        </div>
      )}
    </OdooListPage>
  );
}
