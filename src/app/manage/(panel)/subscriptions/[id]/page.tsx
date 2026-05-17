import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { SubForm } from "../sub-form";
import { RecordPaymentForm } from "./record-payment";
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

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function fmtMoney(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? "ກີບ" : currency)
  );
}

export default async function SubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sub, categories] = await Promise.all([
    masterPrisma.subscription.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        entries: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    }),
    masterPrisma.ledgerCategory.findMany({
      where: { type: "EXPENSE", archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!sub) notFound();

  const days = daysUntil(sub.nextRenewalDate);
  const overdue = days < 0;
  const urgent = days >= 0 && days <= 7;

  return (
    <OdooListPage
      title={sub.name}
      subtitle={`${sub.vendor} · ${cycleLabel(sub.billingCycle)} · ${fmtMoney(sub.amount, sub.currency)}`}
      actions={
        sub.status === "ACTIVE" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
            {tm("subActive")}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-700 border-gray-200">
            {tm("subCancelled")}
          </span>
        )
      }
    >
      <>
      <div className="mb-3">
        <Link
          href="/manage/subscriptions"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          {tm("subBackLink")}
        </Link>
      </div>

      {/* Renewal status banner */}
      {sub.status === "ACTIVE" && (
        <div
          className={`border rounded p-3 mb-4 ${
            overdue
              ? "bg-red-50 border-red-200"
              : urgent
                ? "bg-amber-50 border-amber-200"
                : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[13px]">
              <span className="text-gray-700">{tm("subNextRenewalLbl")} </span>
              <span className="font-medium">
                {DATE_FMT.format(sub.nextRenewalDate)}
              </span>
              <span
                className={`ml-2 text-[12px] ${
                  overdue
                    ? "text-red-700 font-medium"
                    : urgent
                      ? "text-amber-700 font-medium"
                      : "text-gray-600"
                }`}
              >
                ({overdue
                  ? `${tm("overdueDaysPrefix")} ${-days} ${tm("daysSuffix")}`
                  : days === 0
                    ? tm("today")
                    : `${tm("remainingDays")} ${days} ${tm("daysSuffix")}`})
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sub.status === "ACTIVE" && (
          <div className="bg-white border border-gray-200 rounded p-4 md:col-span-2">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
              {tm("subRecordPay")}
            </h2>
            <RecordPaymentForm
              id={sub.id}
              defaultAmount={sub.amount}
              currency={sub.currency}
            />
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded p-4 md:col-span-2">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            {tm("subPayHistory")} ({sub.entries.length})
          </h2>
          {sub.entries.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">{tm("nothingYet")}</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="text-left py-1">{tm("subColDate")}</th>
                  <th className="text-left py-1">{tm("subColPayMethod")}</th>
                  <th className="text-left py-1">{tm("subColRef")}</th>
                  <th className="text-right py-1">{tm("subColAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sub.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1 text-gray-600">
                      {DATETIME_FMT.format(e.date)}
                    </td>
                    <td className="py-1">
                      {e.paymentMethod === "CASH"
                        ? tm("ledCash")
                        : e.paymentMethod === "TRANSFER"
                          ? tm("ledTransfer")
                          : "—"}
                    </td>
                    <td className="py-1 text-gray-600 font-mono text-[11px]">
                      {e.paymentRef ?? "—"}
                    </td>
                    <td className="py-1 text-right font-medium text-rose-700">
                      − {fmtMoney(e.amount, e.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded p-4 md:col-span-2">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            {tm("subEditTitle")}
          </h2>
          <SubForm
            mode="edit"
            id={sub.id}
            status={sub.status}
            categories={categories}
            initial={{
              name: sub.name,
              vendor: sub.vendor,
              categoryId: sub.categoryId ?? "",
              amount: sub.amount,
              currency: sub.currency,
              billingCycle: sub.billingCycle,
              startDate: sub.startDate.toISOString().slice(0, 10),
              nextRenewalDate: sub.nextRenewalDate.toISOString().slice(0, 10),
              autoRenew: sub.autoRenew,
              notes: sub.notes ?? "",
            }}
          />
        </div>
      </div>
      </>
    </OdooListPage>
  );
}
