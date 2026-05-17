import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { RecurringForm } from "../recurring-form";
import { getLocale } from "@/lib/i18n/server";

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

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function RecurringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [tmpl, customers, products, settings, locale] = await Promise.all([
    prisma.recurringInvoice.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        items: true,
        invoices: {
          orderBy: { date: "desc" },
          take: 20,
          select: {
            id: true,
            number: true,
            date: true,
            total: true,
            currency: true,
            paymentStatus: true,
            status: true,
          },
        },
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, unit: true, priceLak: true },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
    getLocale(),
  ]);
  if (!tmpl) notFound();

  return (
    <>
      {/* History strip — sits ABOVE the Odoo form so the form keeps its
          standard breadcrumb + action bar + sheet untouched. */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium">
            ບິນທີ່ສ້າງແລ້ວ ({tmpl.invoices.length})
            {tmpl.lastRunAt && (
              <span className="ml-2 text-[10px] text-gray-400 normal-case">
                ສຸດທ້າຍ: {DATETIME_FMT.format(tmpl.lastRunAt)}
              </span>
            )}
          </h2>
        </div>
        {tmpl.invoices.length === 0 ? (
          <p className="text-[12px] text-gray-400 italic">ຍັງບໍ່ມີ</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase text-gray-500">
              <tr>
                <th className="text-left py-1">ວັນທີ</th>
                <th className="text-left py-1">ເລກບິນ</th>
                <th className="text-right py-1">ມູນຄ່າ</th>
                <th className="text-left py-1">ສະຖານະຈ່າຍ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tmpl.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-1 text-gray-600">
                    {DATE_FMT.format(inv.date)}
                  </td>
                  <td className="py-1">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-odoo hover:underline font-mono text-[12px]"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="py-1 text-right font-mono">
                    {fmt(inv.total)} {inv.currency}
                  </td>
                  <td className="py-1 text-[11px]">
                    <span
                      className={`px-1.5 py-0.5 rounded uppercase ${
                        inv.paymentStatus === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : inv.paymentStatus === "PARTIAL"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Odoo invoice-style form */}
      <RecurringForm
        customers={customers}
        products={products}
        defaultVatRate={settings?.vatRate ?? 0.1}
        locale={locale}
        initial={{
          id: tmpl.id,
          code: tmpl.code,
          name: tmpl.name,
          active: tmpl.active,
          customerId: tmpl.customerId,
          cycle: tmpl.cycle,
          startDate: tmpl.startDate.toISOString().slice(0, 10),
          nextRunDate: tmpl.nextRunDate.toISOString().slice(0, 10),
          endDate: tmpl.endDate ? tmpl.endDate.toISOString().slice(0, 10) : "",
          currency: tmpl.currency as "LAK" | "USD" | "THB",
          exchangeRate: tmpl.exchangeRate,
          vatMode: tmpl.vatMode as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT",
          vatRate: tmpl.vatRate,
          discount: tmpl.discount,
          paymentMethod: tmpl.paymentMethod as "CASH" | "TRANSFER",
          note: tmpl.note ?? "",
          items: tmpl.items.map((it) => ({
            kind:
              it.lineType === "SECTION"
                ? "section"
                : it.lineType === "NOTE"
                  ? "note"
                  : "product",
            productId: it.productId,
            label: it.productName,
            quantity: it.quantity,
            priceLak: it.priceLak,
            discount: it.discount,
            taxRate: it.taxRate,
          })),
        }}
      />
    </>
  );
}
