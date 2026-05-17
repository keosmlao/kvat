import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { OdooListPage } from "@/components/odoo/sheet";

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const KIND_LABEL: Record<string, string> = {
  invoice: "ບິນ",
  reminder: "ເຕືອນຈ່າຍ",
  quotation: "ໃບສະເໜີລາຄາ",
  statement: "Statement",
  test: "ທົດສອບ",
};

export default async function EmailLogPage() {
  await requireUser();
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sentBy: { select: { name: true } } },
  });

  return (
    <OdooListPage
      title="ປະຫວັດ Email"
      subtitle="100 email ລ່າສຸດທີ່ສົ່ງຈາກລະບົບ"
      actions={
        <Link
          href="/settings?tab=email"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Settings
        </Link>
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3 w-44">ເວລາ</th>
              <th className="text-left py-2 px-3">ປະເພດ</th>
              <th className="text-left py-2 px-3">ປາຍທາງ</th>
              <th className="text-left py-2 px-3">ຫົວເລື່ອງ</th>
              <th className="text-left py-2 px-3">ສະຖານະ</th>
              <th className="text-left py-2 px-3">ໂດຍ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  ຍັງບໍ່ມີ email
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-600 text-[12px]">
                    {DATETIME_FMT.format(l.createdAt)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {KIND_LABEL[l.kind] ?? l.kind}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-700">{l.toEmail}</td>
                  <td className="py-2 px-3 text-gray-700 truncate max-w-xs">
                    {l.subject}
                  </td>
                  <td className="py-2 px-3">
                    {l.status === "SENT" ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        ✓ ສຳເລັດ
                      </span>
                    ) : (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700"
                        title={l.errorMsg ?? ""}
                      >
                        ✗ ບໍ່ສຳເລັດ
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-600 text-[12px]">
                    {l.sentBy?.name ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </OdooListPage>
  );
}
