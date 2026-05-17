import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { TenantStatus } from "@/generated/master/client";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmt(d: Date | null) {
  return d ? DATE_FMT.format(d) : "—";
}

// Trial tenants awaiting approval — owners that signed up and are using the
// 30-day window. Click into the tenant to approve to YEARLY/LIFETIME.
export default async function ApprovalsPage() {
  const pending = await masterPrisma.tenant.findMany({
    where: { status: TenantStatus.TRIAL, isTemplate: false },
    orderBy: { trialEndsAt: "asc" },
  });
  const nowMs = new Date().getTime();

  return (
    <OdooListPage
      title={tm("approvalsTitle")}
      subtitle={tm("approvalsSubtitle")}
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Tenant</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">ໝົດ trial</th>
              <th className="px-3 py-2 text-left">ສ້າງເມື່ອ</th>
              <th className="px-3 py-2 text-right">ກະທຳ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pending.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-gray-400 italic"
                >
                  ບໍ່ມີ tenant ລໍຖ້າ approve
                </td>
              </tr>
            )}
            {pending.map((t) => {
              const days = Math.ceil(
                (t.trialEndsAt.getTime() - nowMs) / (1000 * 60 * 60 * 24),
              );
              const expired = days < 0;
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{t.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      /t/{t.slug}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{t.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        expired ? "text-red-600 font-medium" : "text-gray-700"
                      }
                    >
                      {fmt(t.trialEndsAt)}
                      <span className="ml-1 text-[11px] text-gray-400">
                        ({expired ? `ໝົດ ${-days}d` : `${days}d`})
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-[12px]">
                    {fmt(t.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/manage/tenants/${t.id}`}
                      className="text-[12px] text-slate-900 hover:underline font-medium"
                    >
                      ເບິ່ງ + approve →
                    </Link>
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
