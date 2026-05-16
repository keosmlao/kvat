import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { SubForm } from "../sub-form";
import { RecordPaymentForm } from "./record-payment";
import { cycleLabel, daysUntil } from "@/lib/ledger";

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
    <div>
      <div className="mb-4">
        <Link
          href="/manage/subscriptions"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Subscriptions
        </Link>
      </div>

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900">{sub.name}</h1>
          <div className="text-[13px] text-gray-600 mt-0.5">
            {sub.vendor} · {cycleLabel(sub.billingCycle)} ·{" "}
            {fmtMoney(sub.amount, sub.currency)}
          </div>
        </div>
        <div>
          {sub.status === "ACTIVE" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
              ໃຊ້ງານຢູ່
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-700 border-gray-200">
              ຍົກເລີກແລ້ວ
            </span>
          )}
        </div>
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
              <span className="text-gray-700">ຄັ້ງຕໍ່ໄປ: </span>
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
                  ? `ເກີນກຳນົດ ${-days} ວັນ`
                  : days === 0
                    ? "ມື້ນີ້"
                    : `ເຫຼືອ ${days} ວັນ`})
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sub.status === "ACTIVE" && (
          <div className="bg-white border border-gray-200 rounded p-4 md:col-span-2">
            <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
              ບັນທຶກການຈ່າຍ (ຕໍ່ໃໝ່)
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
            ປະຫວັດການຈ່າຍ ({sub.entries.length})
          </h2>
          {sub.entries.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">ຍັງບໍ່ມີ</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase text-gray-500">
                <tr>
                  <th className="text-left py-1">ວັນທີ</th>
                  <th className="text-left py-1">ວິທີຈ່າຍ</th>
                  <th className="text-left py-1">Ref</th>
                  <th className="text-right py-1">ຈໍານວນ</th>
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
                        ? "ເງິນສົດ"
                        : e.paymentMethod === "TRANSFER"
                          ? "ໂອນ"
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
            ແກ້ໄຂສັນຍາ
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
    </div>
  );
}
