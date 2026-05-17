"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export type InvoiceRow = {
  id: string;
  number: string;
  date: string; // ISO
  customerName: string;
  total: number;
  isCreditNote: boolean;
  status: string;
};

function signed(inv: InvoiceRow) {
  return inv.isCreditNote ? -inv.total : inv.total;
}

function formatMoney(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

// ──────────── PIVOT VIEW ────────────
export function PivotView({ invoices }: { invoices: InvoiceRow[] }) {
  const [groupBy, setGroupBy] = useState<"customer" | "month" | "status">(
    "customer",
  );

  const data = useMemo(() => {
    const map = new Map<
      string,
      { label: string; count: number; total: number; vat: number }
    >();
    for (const inv of invoices) {
      let key: string;
      if (groupBy === "month") {
        const d = new Date(inv.date);
        key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      } else if (groupBy === "status") {
        key = inv.isCreditNote
          ? "CREDIT_NOTE"
          : inv.status;
      } else {
        key = inv.customerName;
      }
      const row = map.get(key) ?? { label: key, count: 0, total: 0, vat: 0 };
      row.count += 1;
      row.total += signed(inv);
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [invoices, groupBy]);

  const grandCount = data.reduce((s, d) => s + d.count, 0);
  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  const statusLabel = (s: string) =>
    s === "ISSUED"
      ? "ອອກແລ້ວ"
      : s === "DRAFT"
        ? "ຮ່າງ"
        : s === "CANCELLED"
          ? "ຍົກເລີກ"
          : s === "CREDIT_NOTE"
            ? "ໃບລົດໜີ້"
            : s;

  return (
    <div className="px-4 md:px-6 py-4">
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
            ສະຫລຸບແບບ Pivot
          </h2>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-gray-500">ຈັດກຸ່ມຕາມ:</span>
            <select
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as "customer" | "month" | "status")
              }
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-odoo"
            >
              <option value="customer">ລູກຄ້າ</option>
              <option value="month">ເດືອນ</option>
              <option value="status">ສະຖານະ</option>
            </select>
          </div>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 text-left font-semibold">
                {groupBy === "customer"
                  ? "ລູກຄ້າ"
                  : groupBy === "month"
                    ? "ເດືອນ"
                    : "ສະຖານະ"}
              </th>
              <th className="px-2 py-2 text-right font-semibold w-24">
                ຈຳນວນບິນ
              </th>
              <th className="px-3 py-2 text-right font-semibold w-40">
                ມູນຄ່າສຸດທິ
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-10 text-gray-500 text-[13px]"
                >
                  ບໍ່ມີຂໍ້ມູນ
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr
                key={row.label}
                className="border-b border-gray-100 last:border-b-0 hover:bg-odoo/5"
              >
                <td className="px-3 py-2 text-gray-800 font-medium">
                  {groupBy === "status" ? statusLabel(row.label) : row.label}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-gray-700">
                  {row.count}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                    row.total < 0 ? "text-red-700" : "text-gray-900"
                  }`}
                >
                  {formatMoney(row.total)} ກີບ
                </td>
              </tr>
            ))}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-800">
                <td className="px-3 py-2 text-right text-gray-600 text-[12px] uppercase tracking-wider">
                  ລວມ
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {grandCount}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums text-[14px] ${
                    grandTotal < 0 ? "text-red-700" : "text-gray-900"
                  }`}
                >
                  {formatMoney(grandTotal)} ກີບ
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ──────────── GRAPH VIEW ────────────
export function GraphView({ invoices }: { invoices: InvoiceRow[] }) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [groupBy, setGroupBy] = useState<"day" | "month" | "customer">("day");

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      let key: string;
      if (groupBy === "day") {
        key = new Date(inv.date).toISOString().slice(0, 10);
      } else if (groupBy === "month") {
        const d = new Date(inv.date);
        key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      } else {
        key = inv.customerName;
      }
      map.set(key, (map.get(key) ?? 0) + signed(inv));
    }
    const result = [...map.entries()]
      .map(([label, total]) => ({ label, total: Math.round(total) }))
      .sort((a, b) => {
        if (groupBy === "customer") return b.total - a.total;
        return a.label.localeCompare(b.label);
      });
    if (groupBy === "customer") return result.slice(0, 15);
    return result;
  }, [invoices, groupBy]);

  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="px-4 md:px-6 py-4">
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
            ກຣາຟຍອດຂາຍ
          </h2>
          <div className="flex items-center gap-2 text-[13px]">
            <div className="flex border border-gray-300 rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`px-2 py-1 ${
                  chartType === "bar"
                    ? "bg-odoo text-white"
                    : "hover:bg-gray-50"
                }`}
                title="Bar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    d="M4 20V10M10 20V4M16 20v-7M22 20H2"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setChartType("line")}
                className={`px-2 py-1 ${
                  chartType === "line"
                    ? "bg-odoo text-white"
                    : "hover:bg-gray-50"
                }`}
                title="Line"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 17l6-6 4 4 8-8"
                  />
                </svg>
              </button>
            </div>
            <span className="text-gray-500">ຕາມ:</span>
            <select
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as "day" | "month" | "customer")
              }
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-odoo"
            >
              <option value="day">ມື້</option>
              <option value="month">ເດືອນ</option>
              <option value="customer">ລູກຄ້າ (Top 15)</option>
            </select>
          </div>
        </div>
        <div className="p-4">
          {data.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-[13px]">
              ບໍ່ມີຂໍ້ມູນ
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === "bar" ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v) => [`${formatMoney(Number(v))} ກີບ`, "ມູນຄ່າ"] as [string, string]}
                  />
                  <Bar dataKey="total" fill="var(--odoo-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v) => [`${formatMoney(Number(v))} ກີບ`, "ມູນຄ່າ"] as [string, string]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="var(--odoo-primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--odoo-primary)", r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
          <div className="mt-3 text-right text-[13px]">
            <span className="text-gray-500">ລວມສຸດທິ:</span>{" "}
            <span
              className={`font-semibold tabular-nums ${
                grandTotal < 0 ? "text-red-700" : "text-gray-900"
              }`}
            >
              {formatMoney(grandTotal)} ກີບ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
