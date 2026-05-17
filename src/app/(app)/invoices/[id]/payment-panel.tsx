"use client";

import { useActionState, useState, useTransition } from "react";
import {
  registerPayment,
  deletePayment,
  type PaymentFormState,
} from "../payment-actions";
import { t, type Locale } from "@/lib/i18n/messages";

type Payment = {
  id: string;
  number: string;
  amount: number;
  method: string;
  date: Date | string;
  reference: string | null;
  note: string | null;
  user: { name: string };
};

function methodLabel(method: string, locale: Locale) {
  const tp = (k: string) => t(locale, "payment", k);
  switch (method) {
    case "CASH": return tp("cash");
    case "BANK": return tp("bank");
    case "TRANSFER": return tp("transfer");
    case "OTHER":
    default: return tp("other");
  }
}

function formatMoney(n: number, currency: string, kipSuffix: string) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n) + (currency === "LAK" ? ` ${kipSuffix}` : ` ${currency}`);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PaymentPanel({
  invoiceId,
  total,
  paidAmount,
  paymentStatus,
  currency,
  payments,
  canRegister,
  locale = "lo",
}: {
  invoiceId: string;
  total: number;
  paidAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  currency: string;
  payments: Payment[];
  canRegister: boolean;
  locale?: Locale;
}) {
  const tp = (k: string) => t(locale, "payment", k);
  const remaining = Math.max(0, total - paidAmount);
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-gray-200 mt-4 pt-4 mb-6 no-print">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
          {tp("title")}
        </h3>
        {canRegister && remaining > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[13px] font-medium transition tracking-wide"
          >
            {tp("addPaymentBtn")}
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-[13px]">
        <div className="bg-gray-50 border border-gray-200 rounded p-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">
            {tp("grandTotal")}
          </div>
          <div className="font-semibold tabular-nums text-gray-900">
            {formatMoney(total, currency, tp("kipSuffix"))}
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
          <div className="text-[10px] uppercase tracking-wider text-emerald-700">
            {tp("paidSum")}
          </div>
          <div className="font-semibold tabular-nums text-emerald-800">
            {formatMoney(paidAmount, currency, tp("kipSuffix"))}
          </div>
        </div>
        <div
          className={`border rounded p-2 ${
            remaining > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div
            className={`text-[10px] uppercase tracking-wider ${
              remaining > 0 ? "text-amber-700" : "text-gray-500"
            }`}
          >
            {tp("outstanding")}
          </div>
          <div
            className={`font-semibold tabular-nums ${
              remaining > 0 ? "text-amber-800" : "text-gray-600"
            }`}
          >
            {formatMoney(remaining, currency, tp("kipSuffix"))}
          </div>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded overflow-hidden mb-2">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
                <th className="px-3 py-2 text-left font-semibold">{tp("colNo")}</th>
                <th className="px-2 py-2 text-left font-semibold">{tp("colDate")}</th>
                <th className="px-2 py-2 text-left font-semibold">{tp("colMethod")}</th>
                <th className="px-2 py-2 text-left font-semibold">{tp("colRef")}</th>
                <th className="px-2 py-2 text-left font-semibold">{tp("colBy")}</th>
                <th className="px-2 py-2 text-right font-semibold">
                  {tp("colAmount")}
                </th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} currency={currency} canRegister={canRegister} locale={locale} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {paymentStatus === "PAID" && (
        <div className="text-[12px] text-emerald-700 mt-2">{tp("paidInFull")}</div>
      )}

      {open && (
        <PaymentModal
          invoiceId={invoiceId}
          remaining={remaining}
          currency={currency}
          onClose={() => setOpen(false)}
          locale={locale}
        />
      )}
    </div>
  );
}

function PaymentRow({
  payment,
  currency,
  canRegister,
  locale,
}: {
  payment: Payment;
  currency: string;
  canRegister: boolean;
  locale: Locale;
}) {
  const tp = (k: string) => t(locale, "payment", k);
  const [pending, start] = useTransition();
  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
      <td className="px-3 py-2 font-mono text-[12px]">{payment.number}</td>
      <td className="px-2 py-2 text-gray-700">{formatDate(payment.date)}</td>
      <td className="px-2 py-2 text-gray-700">{methodLabel(payment.method, locale)}</td>
      <td className="px-2 py-2 text-gray-600 text-[12px]">
        {payment.reference ?? "—"}
      </td>
      <td className="px-2 py-2 text-gray-700 text-[12px]">{payment.user.name}</td>
      <td className="px-2 py-2 text-right tabular-nums font-medium text-emerald-800">
        {formatMoney(payment.amount, currency, tp("kipSuffix"))}
      </td>
      <td className="px-3 py-2 text-right">
        {canRegister && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`${tp("deletePmtConfirm")} ${payment.number}?`)) return;
              start(async () => {
                try {
                  await deletePayment(payment.id);
                } catch (e) {
                  alert(e instanceof Error ? e.message : tp("deletePmtFailed"));
                }
              });
            }}
            className="text-red-600 hover:text-red-800 text-[12px]"
          >
            {tp("deleteBtn")}
          </button>
        )}
      </td>
    </tr>
  );
}

function PaymentModal({
  invoiceId,
  remaining,
  currency,
  onClose,
  locale,
}: {
  invoiceId: string;
  remaining: number;
  currency: string;
  onClose: () => void;
  locale: Locale;
}) {
  const tp = (k: string) => t(locale, "payment", k);
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(
    registerPayment.bind(null, invoiceId),
    undefined,
  );

  const today = new Date().toISOString().slice(0, 10);

  if (state?.success) {
    setTimeout(onClose, 0);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-xl max-w-md w-full">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-[15px] font-medium text-gray-900">
            {tp("modalTitle")}
          </h3>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {tp("outstandingLabel")}:{" "}
            <span className="font-mono">
              {formatMoney(remaining, currency, tp("kipSuffix"))}
            </span>
          </p>
        </div>
        <form action={formAction} className="px-5 py-4 space-y-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
              {tp("amountLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              required
              min={0.01}
              max={remaining}
              step="any"
              defaultValue={remaining.toString()}
              className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] tabular-nums focus:outline-none focus:border-odoo focus:ring-2 focus:ring-odoo/15"
            />
            {state?.fieldErrors?.amount && (
              <p className="text-xs text-red-600 mt-0.5">
                {state.fieldErrors.amount[0]}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                {tp("methodLabel")}
              </label>
              <select
                name="method"
                defaultValue="CASH"
                className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo"
              >
                <option value="CASH">{tp("cash")}</option>
                <option value="BANK">{tp("bank")}</option>
                <option value="TRANSFER">{tp("transfer")}</option>
                <option value="OTHER">{tp("other")}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                {tp("dateLabel")}
              </label>
              <input
                type="date"
                name="date"
                defaultValue={today}
                className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
              {tp("refLabel")}
            </label>
            <input
              type="text"
              name="reference"
              placeholder={tp("refPh")}
              className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
              {tp("noteLabel")}
            </label>
            <textarea
              name="note"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] resize-none focus:outline-none focus:border-odoo"
            />
          </div>
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-[12px]">
              {state.error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-100 rounded"
            >
              {tp("cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-medium rounded disabled:opacity-50"
            >
              {pending ? tp("saving") : tp("saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
