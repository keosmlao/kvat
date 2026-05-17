import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { getFeatures } from "@/lib/features";
import { OdooListPage } from "@/components/odoo/sheet";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

function parseRange(qs: { from?: string; to?: string }) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return {
    from: qs.from ? new Date(qs.from) : defaultFrom,
    to: qs.to ? new Date(qs.to + "T23:59:59") : defaultTo,
  };
}

export default async function ReportsPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const features = await getFeatures();
  if (!features.reports) redirect("/invoices");

  const sp = await props.searchParams;
  const { from, to } = parseRange(sp);
  const locale = await getLocale();
  const tr = (k: string) => t(locale, "report", k);

  const where = {
    date: { gte: from, lte: to },
    status: "ISSUED" as const,
  };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: true,
      reversals: { select: { id: true } },
    },
    orderBy: { date: "desc" },
  });

  const items = await prisma.invoiceItem.findMany({
    where: { invoice: where },
    include: { product: true, invoice: { select: { isCreditNote: true } } },
  });

  // Net aggregates — credit notes subtract
  const sign = (isCN: boolean) => (isCN ? -1 : 1);
  const agg = invoices.reduce(
    (acc, inv) => {
      const s = sign(inv.isCreditNote);
      const afterDiscount = Math.max(0, inv.subtotal - inv.discount);
      const taxBase =
        inv.vatMode === "INCLUSIVE"
          ? Math.max(0, afterDiscount - inv.vatAmount)
          : afterDiscount;
      acc.subtotal += taxBase * s;
      acc.vatAmount += inv.vatAmount * s;
      acc.total += inv.total * s;
      acc.discount += inv.discount * s;
      acc.count += 1;
      return acc;
    },
    { subtotal: 0, vatAmount: 0, total: 0, discount: 0, count: 0 },
  );

  const productSummary = new Map<
    string,
    { name: string; qty: number; total: number; unit: string }
  >();
  for (const it of items) {
    if (it.lineType !== "PRODUCT" || !it.productId) continue;
    const s = sign(it.invoice.isCreditNote);
    const cur = productSummary.get(it.productId);
    if (cur) {
      cur.qty += it.quantity * s;
      cur.total += it.total * s;
    } else {
      productSummary.set(it.productId, {
        name: it.productName,
        qty: it.quantity * s,
        total: it.total * s,
        unit: it.unit,
      });
    }
  }
  const topProducts = [...productSummary.values()]
    .filter((p) => p.qty > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const dailyMap = new Map<string, number>();
  for (const inv of invoices) {
    const key = inv.date.toISOString().slice(0, 10);
    dailyMap.set(
      key,
      (dailyMap.get(key) ?? 0) + inv.total * sign(inv.isCreditNote),
    );
  }
  const daily = [...dailyMap.entries()].sort().reverse();

  const cards = [
    {
      label: tr("salesTotal"),
      value: formatMoney(agg.total),
      tint: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: "💰",
    },
    {
      label: tr("subtotalBeforeVat"),
      value: formatMoney(agg.subtotal),
      tint: "bg-odoo/10 text-odoo border-odoo/30",
      icon: "📊",
    },
    {
      label: "VAT",
      value: formatMoney(agg.vatAmount),
      tint: "bg-amber-50 text-amber-700 border-amber-200",
      icon: "🧾",
    },
    {
      label: tr("invoiceCount"),
      value: agg.count.toString(),
      tint: "bg-odoo/10 text-odoo border-odoo/30",
      icon: "📄",
    },
  ];

  return (
    <OdooListPage
      title={tr("salesTitle")}
      subtitle={`${tr("range")}: ${formatDate(from)} ${tr("to")} ${formatDate(to)}`}
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[14px]">
            <a
              href="/reports/vat"
              className="text-gray-600 hover:text-odoo px-2 py-1 border-b-2 border-transparent transition"
            >
              {tr("vatReportLink")}
            </a>
          </div>
          <form className="flex items-end gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5">
                {tr("from")}
              </label>
              <input
                type="date"
                name="from"
                defaultValue={from.toISOString().slice(0, 10)}
                className="px-2 py-1 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-0.5">
                {tr("until")}
              </label>
              <input
                type="date"
                name="to"
                defaultValue={to.toISOString().slice(0, 10)}
                className="px-2 py-1 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo"
              />
            </div>
            <button className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1 rounded text-[13px] font-medium transition">
              {tr("show")}
            </button>
          </form>
        </div>
      }
    >
      <>
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                  {c.label}
                </div>
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-base ${c.tint}`}
                >
                  {c.icon}
                </div>
              </div>
              <div className="text-[22px] font-light text-gray-900 tabular-nums leading-tight">
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Top products + Daily sales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded border border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
                {tr("topProducts")}
              </h2>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-2 text-left font-semibold w-8">#</th>
                  <th className="px-2 py-2 text-left font-semibold">{tr("product")}</th>
                  <th className="px-2 py-2 text-right font-semibold w-24">
                    {tr("quantity")}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold w-32">
                    {tr("total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-gray-500 text-[13px]"
                    >
                      {tr("noData")}
                    </td>
                  </tr>
                )}
                {topProducts.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-odoo/5"
                  >
                    <td className="px-4 py-2 text-gray-400 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-2 py-2 text-gray-800 font-medium">
                      {p.name}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-700">
                      {p.qty} {p.unit}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900">
                      {formatMoney(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded border border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
                {tr("dailySales")}
              </h2>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-2 text-left font-semibold">{tr("date")}</th>
                  <th className="px-4 py-2 text-right font-semibold">{tr("salesCol")}</th>
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-center py-10 text-gray-500 text-[13px]"
                    >
                      {tr("noData")}
                    </td>
                  </tr>
                )}
                {daily.map(([d, total]) => (
                  <tr
                    key={d}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-odoo/5"
                  >
                    <td className="px-4 py-2 text-gray-800">
                      {formatDate(new Date(d))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-gray-900">
                      {formatMoney(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All invoices */}
        <div className="bg-white rounded border border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-200">
            <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
              {tr("allInvoicesInRange")}
            </h2>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
                <th className="px-4 py-2 text-left font-semibold">{tr("number")}</th>
                <th className="px-2 py-2 text-left font-semibold">{tr("date")}</th>
                <th className="px-2 py-2 text-left font-semibold">{tr("customer")}</th>
                <th className="px-4 py-2 text-right font-semibold w-32">{tr("sumCol")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-10 text-gray-500 text-[13px]"
                  >
                    {tr("noInvoicesInRange")}
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const hasReversal =
                  !inv.isCreditNote && inv.reversals.length > 0;
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-100 last:border-b-0 ${
                      hasReversal
                        ? "bg-red-50 hover:bg-red-100/70 text-red-700 line-through decoration-red-400/60"
                        : "hover:bg-odoo/5"
                    }`}
                    title={hasReversal ? tr("reversedTooltip") : undefined}
                  >
                    <td className="px-4 py-2 font-mono text-[12px]">
                      <span
                        className={
                          hasReversal ? "text-red-700" : "text-gray-800"
                        }
                      >
                        {inv.number}
                      </span>
                      {inv.isCreditNote && (
                        <span className="no-underline ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 border border-orange-200 font-medium uppercase tracking-wider">
                          CN
                        </span>
                      )}
                      {hasReversal && (
                        <span className="no-underline ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 border border-red-200 font-medium uppercase tracking-wider">
                          {tr("reversedChip")}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-2 py-2 text-gray-800">
                      {inv.customer.name}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        inv.isCreditNote
                          ? "text-orange-700"
                          : hasReversal
                            ? "text-red-700"
                            : "text-gray-900"
                      }`}
                    >
                      {inv.isCreditNote ? "- " : ""}
                      {formatMoney(inv.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {invoices.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-800">
                  <td
                    colSpan={3}
                    className="px-4 py-2 text-right text-gray-600 text-[12px] uppercase tracking-wider"
                  >
                    {tr("sumCol")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(agg.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </>
    </OdooListPage>
  );
}
