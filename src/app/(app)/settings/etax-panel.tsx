"use client";

import { useState, useTransition } from "react";
import {
  testEtaxConnection,
  type EtaxTestResult,
} from "./etax-actions";
import { t, type Locale } from "@/lib/i18n/messages";

export function EtaxPanel({ locale = "lo" }: { locale?: Locale } = {}) {
  const ts = (k: string) => t(locale, "settings", k);
  const [result, setResult] = useState<EtaxTestResult | null>(null);
  const [pending, start] = useTransition();

  const onTest = () => {
    setResult(null);
    start(async () => {
      const r = await testEtaxConnection();
      setResult(r);
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-gray-800">
            {ts("etaxConnTitle")}
          </h3>
          <p className="text-[12px] text-gray-500">
            {ts("etaxConnDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={pending}
          className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50 transition"
        >
          {pending ? ts("etaxTesting") : ts("etaxTest")}
        </button>
      </div>

      {result?.config && (
        <div className="text-[12px] grid grid-cols-2 gap-x-3 gap-y-0.5 bg-gray-50 rounded p-2 border border-gray-200 font-mono">
          <div className="text-gray-500">Gateway:</div>
          <div className="text-gray-800 truncate">{result.config.gateway}</div>
          <div className="text-gray-500">Env:</div>
          <div className="text-gray-800">{result.config.env}</div>
          <div className="text-gray-500">User:</div>
          <div className="text-gray-800 truncate">{result.config.username}</div>
          <div className="text-gray-500">issueCode:</div>
          <div className="text-gray-800">{result.config.issueCode}</div>
        </div>
      )}

      {result && (
        <div
          className={`rounded p-3 text-[13px] ${
            result.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <div className="font-medium">{result.message}</div>
          {result.detail && (
            <div className="text-[11px] mt-0.5 font-mono">{result.detail}</div>
          )}
          {result.requestId && (
            <div className="text-[11px] mt-0.5 text-gray-500 font-mono">
              requestId: {result.requestId}
            </div>
          )}

          {result.ok && result.rates && (
            <div className="mt-2 border-t border-emerald-200 pt-2">
              <div className="text-[11px] uppercase tracking-wider font-medium mb-1 text-emerald-700">
                {ts("etaxRates")} ({result.rates.length})
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-emerald-700">
                    <th className="text-left font-medium px-1 py-0.5">{ts("etaxRateType")}</th>
                    <th className="text-left font-medium px-1 py-0.5">{ts("etaxRateName")}</th>
                    <th className="text-right font-medium px-1 py-0.5">
                      {ts("etaxRateValue")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.rates.map((r, i) => (
                    <tr key={i} className="text-gray-800">
                      <td className="px-1 py-0.5 font-mono">{r.taxType}</td>
                      <td className="px-1 py-0.5">{r.taxTypeName}</td>
                      <td className="px-1 py-0.5 text-right tabular-nums">
                        {(Number(r.taxRate) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] text-gray-500 italic">
        {ts("etaxEnvHint")}
      </div>
    </div>
  );
}
