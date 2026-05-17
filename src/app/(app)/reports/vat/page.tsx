import Link from "next/link";
import { requireUser } from "@/lib/session";
import { vatReportByMonth } from "@/lib/vat-report";
import { OdooListPage } from "@/components/odoo/sheet";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function VatReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const locale = await getLocale();
  const tr = (k: string) => t(locale, "report", k);
  const currentYear = new Date().getFullYear();
  const year = parseInt(sp.year ?? String(currentYear), 10) || currentYear;

  const rows = await vatReportByMonth(year);
  const totals = rows.reduce(
    (acc, r) => ({
      invoiceCount: acc.invoiceCount + r.invoiceCount,
      exemptBase: acc.exemptBase + r.exemptBase,
      taxableBase: acc.taxableBase + r.taxableBase,
      vatCollected: acc.vatCollected + r.vatCollected,
      total: acc.total + r.total,
    }),
    {
      invoiceCount: 0,
      exemptBase: 0,
      taxableBase: 0,
      vatCollected: 0,
      total: 0,
    },
  );

  // Year picker — last 5 years
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Build CSV download link
  const csvHref = `/api/reports/vat?year=${year}`;

  return (
    <OdooListPage
      title={tr("vatTitle")}
      subtitle={tr("vatSubtitle")}
      actions={
        <div className="flex gap-2">
          <form method="get" className="flex gap-2">
            <select
              name="year"
              defaultValue={String(year)}
              className="px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {tr("year")} {y}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 bg-odoo text-white rounded text-[13px] font-medium"
            >
              {tr("show")}
            </button>
          </form>
          <a
            href={csvHref}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-[13px] font-medium"
          >
            {tr("exportCsv")}
          </a>
        </div>
      }
    >
      <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card label={tr("totalInvoices")} value={String(totals.invoiceCount)} />
        <Card
          label={tr("taxableValue")}
          value={`${fmt(totals.taxableBase)} ${tr("kipUnit")}`}
        />
        <Card
          label={tr("exemptValue")}
          value={`${fmt(totals.exemptBase)} ${tr("kipUnit")}`}
        />
        <Card
          label={tr("vatCollected")}
          value={`${fmt(totals.vatCollected)} ${tr("kipUnit")}`}
          highlight
        />
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">{tr("month")}</th>
              <th className="text-right py-2 px-3">{tr("invoices")}</th>
              <th className="text-right py-2 px-3">{tr("taxableShort")} ({tr("kipUnit")})</th>
              <th className="text-right py-2 px-3">{tr("exemptShort")} ({tr("kipUnit")})</th>
              <th className="text-right py-2 px-3">VAT ({tr("kipUnit")})</th>
              <th className="text-right py-2 px-3">{tr("sum")} ({tr("kipUnit")})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr
                key={r.ym}
                className={r.invoiceCount === 0 ? "text-gray-400" : ""}
              >
                <td className="py-2 px-3">{r.label}</td>
                <td className="py-2 px-3 text-right">{r.invoiceCount}</td>
                <td className="py-2 px-3 text-right font-mono">
                  {fmt(r.taxableBase)}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {fmt(r.exemptBase)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-medium">
                  {fmt(r.vatCollected)}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {fmt(r.total)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 bg-red-50">
              <td className="py-2 px-3 font-medium">{tr("yearTotal")} {year}</td>
              <td className="py-2 px-3 text-right font-medium">
                {totals.invoiceCount}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium">
                {fmt(totals.taxableBase)}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium">
                {fmt(totals.exemptBase)}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium text-odoo">
                {fmt(totals.vatCollected)}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium">
                {fmt(totals.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Link
          href="/invoices"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          {tr("backToInvoices")}
        </Link>
      </div>
      </>
    </OdooListPage>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border rounded p-4 ${
        highlight
          ? "border-red-200 bg-red-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider text-gray-600">
        {label}
      </div>
      <div className="text-[18px] font-medium text-gray-900 mt-1 font-mono">
        {value}
      </div>
    </div>
  );
}
