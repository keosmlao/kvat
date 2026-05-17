import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { cycleLabel, daysUntil } from "@/lib/ledger";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtMoney(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? "ກີບ" : currency)
  );
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.status === "CANCELLED" ? "CANCELLED" : "ACTIVE";

  const subs = await masterPrisma.subscription.findMany({
    where: { status: filter },
    include: {
      category: { select: { name: true } },
      _count: { select: { entries: true } },
    },
    orderBy: [{ nextRenewalDate: "asc" }, { name: "asc" }],
  });

  // Sum monthly equivalent expense across all active subscriptions so admin
  // sees their burn rate at a glance.
  const monthlyBurn = subs
    .filter((s) => s.status === "ACTIVE" && s.currency === "LAK")
    .reduce((sum, s) => {
      const monthly =
        s.billingCycle === "MONTHLY"
          ? s.amount
          : s.billingCycle === "QUARTERLY"
            ? s.amount / 3
            : s.amount / 12;
      return sum + monthly;
    }, 0);

  return (
    <OdooListPage
      title={tm("subscriptionsTitle")}
      subtitle={tm("subscriptionsSubtitle")}
      actions={
        <Link
          href="/manage/subscriptions/new"
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium"
        >
          + ເພີ່ມສັນຍາ
        </Link>
      }
      filters={
        <div className="flex items-center gap-1 text-[12px]">
          <Tab
            label="ໃຊ້ງານຢູ່"
            href="/manage/subscriptions"
            active={filter === "ACTIVE"}
          />
          <Tab
            label="ຍົກເລີກແລ້ວ"
            href="/manage/subscriptions?status=CANCELLED"
            active={filter === "CANCELLED"}
          />
        </div>
      }
    >
      {/* Monthly burn rate */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4 max-w-md">
        <div className="text-[11px] uppercase tracking-wider text-gray-500">
          ລາຍຈ່າຍປະຈຳເດືອນ (ປະມານ)
        </div>
        <div className="text-[20px] font-medium text-gray-900 mt-1">
          {fmtMoney(monthlyBurn, "LAK")}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          ປະມານ {fmtMoney(monthlyBurn * 12, "LAK")} ຕໍ່ປີ
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">ຊື່</th>
              <th className="text-left py-2 px-3">Vendor</th>
              <th className="text-left py-2 px-3">ໝວດ</th>
              <th className="text-right py-2 px-3">ລາຄາ</th>
              <th className="text-left py-2 px-3">ຮອບ</th>
              <th className="text-left py-2 px-3">ຕໍ່ໃໝ່</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  ບໍ່ມີ subscription
                </td>
              </tr>
            ) : (
              subs.map((s) => {
                const days = daysUntil(s.nextRenewalDate);
                const urgent = days <= 7;
                const overdue = days < 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="text-gray-800 font-medium">{s.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {s._count.entries} ການຈ່າຍ
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{s.vendor}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {s.category?.name ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {fmtMoney(s.amount, s.currency)}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {cycleLabel(s.billingCycle)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="text-gray-700">
                        {DATE_FMT.format(s.nextRenewalDate)}
                      </div>
                      <div
                        className={`text-[11px] ${
                          overdue
                            ? "text-red-600 font-medium"
                            : urgent
                              ? "text-amber-600 font-medium"
                              : "text-gray-500"
                        }`}
                      >
                        {overdue
                          ? `ເກີນກຳນົດ ${-days} ວັນ`
                          : days === 0
                            ? "ມື້ນີ້"
                            : `ເຫຼືອ ${days} ວັນ`}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Link
                        href={`/manage/subscriptions/${s.id}`}
                        className="text-[12px] text-slate-700 hover:underline"
                      >
                        ເບິ່ງ →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </OdooListPage>
  );
}

function Tab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-gray-700 hover:bg-gray-100 border border-transparent"
      }`}
    >
      {label}
    </Link>
  );
}
