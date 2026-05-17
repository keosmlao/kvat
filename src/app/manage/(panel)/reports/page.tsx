import { monthlyPnL, tenantGrowth, topCustomers } from "@/lib/reports";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";
import { PnLChart, TenantGrowthChart } from "./charts";

const tm = (k: string) => t("lo", "manage", k);

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export default async function ReportsPage() {
  const [pnl, growth, top] = await Promise.all([
    monthlyPnL(12),
    tenantGrowth(12),
    topCustomers(10),
  ]);

  const totalIncome = pnl.reduce((s, p) => s + p.income, 0);
  const totalExpense = pnl.reduce((s, p) => s + p.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const totalSignups = growth.reduce((s, g) => s + g.signups, 0);

  return (
    <OdooListPage
      title={tm("reportsTitle")}
      subtitle={tm("reportsSubtitleFull")}
    >
      {/* Year-to-date summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat
          label={tm("reportsIncome12m")}
          value={`${fmt(totalIncome)} ${tm("reportsKipSuffix")}`}
          colour="emerald"
        />
        <Stat
          label={tm("reportsExpense12m")}
          value={`${fmt(totalExpense)} ${tm("reportsKipSuffix")}`}
          colour="rose"
        />
        <Stat
          label={tm("reportsNetProfit")}
          value={`${fmt(totalNet)} ${tm("reportsKipSuffix")}`}
          colour={totalNet >= 0 ? "emerald" : "rose"}
        />
        <Stat
          label={tm("reportsNewTenants")}
          value={String(totalSignups)}
          colour="slate"
        />
      </div>

      {/* P&L chart */}
      <Section title={tm("reportsIncVsExp")}>
        <PnLChart data={pnl} />
      </Section>

      {/* Tenant growth chart */}
      <Section title={tm("reportsTenantGrow")}>
        <TenantGrowthChart data={growth} />
      </Section>

      {/* Top customers */}
      <Section title={tm("reportsTopCust")}>
        {top.length === 0 ? (
          <p className="text-[12px] text-gray-400 italic">{tm("reportsNoData")}</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left py-1.5 px-3 w-8">#</th>
                <th className="text-left py-1.5 px-3">{tm("reportsColCust")}</th>
                <th className="text-left py-1.5 px-3">{tm("reportsColType")}</th>
                <th className="text-right py-1.5 px-3">{tm("reportsColInvoice")}</th>
                <th className="text-right py-1.5 px-3">{tm("reportsColPaidLak")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {top.map((c, i) => (
                <tr key={c.id}>
                  <td className="py-1.5 px-3 text-gray-500">{i + 1}</td>
                  <td className="py-1.5 px-3">
                    <div className="text-gray-800">{c.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      {c.code}
                    </div>
                  </td>
                  <td className="py-1.5 px-3">
                    {c.type === "TENANT" ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-odoo/10 text-odoo">
                        Tenant
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                        {tm("reportsExternal")}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-right">{c.invoiceCount}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-medium">
                    {fmt(c.totalPaid)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </OdooListPage>
  );
}

function Stat({
  label,
  value,
  colour,
}: {
  label: string;
  value: string;
  colour: "emerald" | "rose" | "slate";
}) {
  const colourMap = {
    emerald: "border-emerald-200 bg-emerald-50",
    rose: "border-rose-200 bg-rose-50",
    slate: "border-gray-200 bg-white",
  };
  return (
    <div className={`border rounded p-4 ${colourMap[colour]}`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-600">
        {label}
      </div>
      <div className="text-[20px] font-medium text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-5 mb-4">
      <h2 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
