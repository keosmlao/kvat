import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cycleLabel } from "@/lib/recurring";
import { OdooListPage } from "@/components/odoo/sheet";
import { RunDueButton } from "./run-due-button";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function RecurringListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const onlyActive = sp.status !== "all";

  const now = new Date();
  const templates = await prisma.recurringInvoice.findMany({
    where: onlyActive ? { active: true } : {},
    include: {
      customer: { select: { name: true, code: true } },
      items: {
        select: {
          lineType: true,
          quantity: true,
          priceLak: true,
          discount: true,
          taxRate: true,
        },
      },
      _count: { select: { invoices: true } },
    },
    orderBy: [{ active: "desc" }, { nextRunDate: "asc" }],
  });

  const dueCount = templates.filter(
    (t) => t.active && t.nextRunDate <= now,
  ).length;

  return (
    <OdooListPage
      title="ບິນອັດຕະໂນມັດ (Recurring)"
      subtitle="ສ້າງ template ໜຶ່ງເທື່ອ → ລະບົບອອກບິນໃຫ້ອັດຕະໂນມັດທຸກຮອບ"
      actions={
        <>
          <Link
            href="/invoices"
            className="text-[12px] text-gray-600 hover:text-odoo"
          >
            ← ບິນອາກອນ
          </Link>
          {dueCount > 0 && <RunDueButton count={dueCount} />}
          <Link
            href="/invoices/recurring/new"
            className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium"
          >
            + ສ້າງ template
          </Link>
        </>
      }
      filters={
        <div className="flex items-center gap-1 text-[12px]">
          <Tab
            label="ໃຊ້ງານຢູ່"
            href="/invoices/recurring"
            active={onlyActive}
          />
          <Tab
            label="ທັງໝົດ"
            href="/invoices/recurring?status=all"
            active={!onlyActive}
          />
        </div>
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left py-2 px-3">Code</th>
                <th className="text-left py-2 px-3">ຊື່ / ລູກຄ້າ</th>
                <th className="text-left py-2 px-3">ຮອບ</th>
                <th className="text-right py-2 px-3">ມູນຄ່າ (ປະມານ)</th>
                <th className="text-left py-2 px-3">ຄັ້ງຕໍ່ໄປ</th>
                <th className="text-right py-2 px-3">ສ້າງແລ້ວ</th>
                <th className="text-left py-2 px-3">ສະຖານະ</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    ບໍ່ມີ template
                  </td>
                </tr>
              ) : (
                templates.map((t) => {
                  const subtotal = t.items.reduce(
                    (s, it) =>
                      it.lineType === "PRODUCT"
                        ? s +
                          Math.max(0, it.quantity * it.priceLak - it.discount)
                        : s,
                    0,
                  );
                  const afterDisc = Math.max(0, subtotal - t.discount);
                  const discountRatio = subtotal > 0 ? afterDisc / subtotal : 0;
                  const vatAmount =
                    t.vatMode === "EXEMPT"
                      ? 0
                      : t.items.reduce(
                          (s, it) =>
                            it.lineType === "PRODUCT"
                              ? s +
                                Math.max(
                                  0,
                                  it.quantity * it.priceLak - it.discount,
                                ) *
                                  discountRatio *
                                  it.taxRate
                              : s,
                          0,
                        );
                  const total =
                    t.vatMode === "EXCLUSIVE" ? afterDisc + vatAmount : afterDisc;
                  const due = t.active && t.nextRunDate <= now;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 group">
                      <td className="py-2 px-3 font-mono text-[12px] text-gray-600">
                        {t.code}
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-gray-800">{t.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {t.customer.name}{" "}
                          <span className="font-mono">[{t.customer.code}]</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {cycleLabel(t.cycle)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium tabular-nums">
                        {fmt(total)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            due
                              ? "text-red-700 font-medium"
                              : "text-gray-700"
                          }
                        >
                          {DATE_FMT.format(t.nextRunDate)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {t._count.invoices}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] border ${
                            t.active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                        >
                          {t.active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          href={`/invoices/recurring/${t.id}`}
                          className="text-odoo hover:underline opacity-0 group-hover:opacity-100"
                        >
                          ເປີດ
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
      className={`px-2.5 py-1 rounded border ${
        active
          ? "bg-odoo text-white border-odoo"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
