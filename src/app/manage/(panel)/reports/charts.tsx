"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type PnLPoint = {
  label: string;
  income: number;
  expense: number;
  net: number;
};

type GrowthPoint = {
  label: string;
  signups: number;
  cumulative: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);

export function PnLChart({ data }: { data: PnLPoint[] }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v))}
          />
          <Tooltip
            formatter={(v) =>
              typeof v === "number" ? `${fmt(v)} ກີບ` : String(v)
            }
            contentStyle={{
              fontSize: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 4,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          <Bar dataKey="income" name="ລາຍຮັບ" fill="#059669" radius={[3, 3, 0, 0]} />
          <Bar dataKey="expense" name="ລາຍຈ່າຍ" fill="#dc2626" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TenantGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 4,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="signups"
            name="ໃໝ່/ເດືອນ"
            stroke="var(--odoo-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--odoo-primary)" }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name="ລວມສະສົມ"
            stroke="#0f172a"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 2, fill: "#0f172a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
