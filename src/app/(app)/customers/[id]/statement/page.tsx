import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { customerStatement } from "@/lib/vat-report";
import { OdooListPage } from "@/components/odoo/sheet";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function CustomerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const stmt = await customerStatement(id);
  if (!stmt) notFound();
  const locale = await getLocale();
  const ts = (k: string) => t(locale, "statement", k);

  return (
    <OdooListPage
      title={ts("title")}
      subtitle={`${ts("asOf")} ${DATE_FMT.format(stmt.asOf)}`}
      actions={
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="o-btn-secondary print:hidden"
        >
          {ts("print")}
        </button>
      }
    >
      <>
      <div className="mb-3">
        <Link
          href={`/customers/${id}`}
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          {ts("backToCustomer")}
        </Link>
      </div>

      {/* Customer info card */}
      <div className="bg-white border border-gray-200 rounded p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 text-[13px]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              {ts("customer")}
            </div>
            <div className="text-[16px] text-gray-900 font-medium mt-0.5">
              {stmt.customer.name}
            </div>
            <div className="text-[12px] text-gray-500 font-mono">
              {stmt.customer.code}
            </div>
          </div>
          <div className="text-[12px] text-gray-700 space-y-0.5">
            {stmt.customer.taxId && (
              <div>
                <span className="text-gray-500">{ts("tin")}: </span>
                {stmt.customer.taxId}
              </div>
            )}
            {stmt.customer.phone && (
              <div>
                <span className="text-gray-500">{ts("phone")}: </span>
                {stmt.customer.phone}
              </div>
            )}
            {stmt.customer.email && (
              <div>
                <span className="text-gray-500">{ts("email")}: </span>
                {stmt.customer.email}
              </div>
            )}
            {stmt.customer.address && (
              <div>
                <span className="text-gray-500">{ts("address")}: </span>
                {stmt.customer.address}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card
          label={ts("totalInvoiced")}
          value={`${fmt(stmt.totalInvoiced)} ${ts("kipUnit")}`}
          colour="slate"
        />
        <Card
          label={ts("totalPaid")}
          value={`${fmt(stmt.totalPaid)} ${ts("kipUnit")}`}
          colour="emerald"
        />
        <Card
          label={ts("outstanding")}
          value={`${fmt(stmt.totalOutstanding)} ${ts("kipUnit")}`}
          colour={stmt.totalOutstanding > 0 ? "rose" : "slate"}
          highlight
        />
      </div>

      {/* Ageing */}
      {stmt.totalOutstanding > 0 && (
        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            {ts("ageingHeading")}
          </h2>
          <div className="grid grid-cols-5 gap-2 text-[12px]">
            <AgeingCell label={ts("ageingCurrent")} value={stmt.ageing.current} />
            <AgeingCell
              label={ts("ageingD1to30")}
              value={stmt.ageing.d1to30}
              warn={stmt.ageing.d1to30 > 0}
            />
            <AgeingCell
              label={ts("ageingD31to60")}
              value={stmt.ageing.d31to60}
              warn={stmt.ageing.d31to60 > 0}
            />
            <AgeingCell
              label={ts("ageingD61to90")}
              value={stmt.ageing.d61to90}
              warn={stmt.ageing.d61to90 > 0}
              danger
            />
            <AgeingCell
              label={ts("ageingOver90")}
              value={stmt.ageing.over90}
              danger
            />
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-[12px] uppercase tracking-widest text-gray-500 font-medium">
          {ts("invoiceHistory")} ({stmt.invoices.length})
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">{ts("date")}</th>
              <th className="text-left py-2 px-3">{ts("number")}</th>
              <th className="text-left py-2 px-3">{ts("dueDate")}</th>
              <th className="text-right py-2 px-3">{ts("amount")} ({ts("kipUnit")})</th>
              <th className="text-right py-2 px-3">{ts("paid")}</th>
              <th className="text-right py-2 px-3">{ts("remaining")}</th>
              <th className="text-left py-2 px-3">{ts("status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stmt.invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  {ts("noInvoices")}
                </td>
              </tr>
            ) : (
              stmt.invoices.map((inv) => {
                const overdue =
                  inv.outstanding > 0 &&
                  inv.dueDate !== null &&
                  inv.dueDate < new Date();
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 print:hover:bg-transparent"
                  >
                    <td className="py-1.5 px-3 text-gray-600">
                      {DATE_FMT.format(inv.date)}
                    </td>
                    <td className="py-1.5 px-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-slate-700 hover:underline font-mono text-[12px]"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td
                      className={`py-1.5 px-3 ${overdue ? "text-red-600 font-medium" : "text-gray-600"}`}
                    >
                      {inv.dueDate ? DATE_FMT.format(inv.dueDate) : "—"}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono">
                      {fmt(inv.total)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-emerald-700">
                      {fmt(inv.paidAmount)}
                    </td>
                    <td
                      className={`py-1.5 px-3 text-right font-mono ${inv.outstanding > 0 ? "text-rose-700 font-medium" : "text-gray-400"}`}
                    >
                      {fmt(inv.outstanding)}
                    </td>
                    <td className="py-1.5 px-3 text-[11px]">
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
                );
              })
            )}
            <tr className="border-t-2 border-gray-300 bg-red-50">
              <td colSpan={3} className="py-2 px-3 font-medium">
                {ts("sum")}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium">
                {fmt(stmt.totalInvoiced)}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">
                {fmt(stmt.totalPaid)}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium text-rose-700">
                {fmt(stmt.totalOutstanding)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
      </>
    </OdooListPage>
  );
}

function Card({
  label,
  value,
  colour,
  highlight,
}: {
  label: string;
  value: string;
  colour: "emerald" | "rose" | "slate";
  highlight?: boolean;
}) {
  const colourMap = {
    emerald: "border-emerald-200 bg-emerald-50",
    rose: "border-rose-200 bg-rose-50",
    slate: "border-gray-200 bg-white",
  };
  return (
    <div
      className={`border rounded p-4 ${colourMap[colour]} ${highlight ? "ring-1 ring-rose-200" : ""}`}
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

function AgeingCell({
  label,
  value,
  warn,
  danger,
}: {
  label: string;
  value: number;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`p-2 rounded border ${
        danger
          ? "border-red-200 bg-red-50"
          : warn
            ? "border-amber-200 bg-amber-50"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </div>
      <div className="text-[14px] font-medium text-gray-900 font-mono mt-0.5">
        {fmt(value)}
      </div>
    </div>
  );
}
