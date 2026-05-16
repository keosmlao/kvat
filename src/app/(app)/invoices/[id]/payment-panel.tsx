"use client";

import { useActionState, useState, useTransition } from "react";
import {
  registerPayment,
  deletePayment,
  type PaymentFormState,
} from "../payment-actions";

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

const METHOD_LABEL: Record<string, string> = {
  CASH: "ເງິນສົດ",
  BANK: "ໂອນທະນາຄານ",
  TRANSFER: "ໂອນຜ່ານແອັບ",
  OTHER: "ອື່ນໆ",
};

function formatMoney(n: number, currency: string = "LAK") {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n) + (currency === "LAK" ? " ກີບ" : " " + currency);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("lo-LA", {
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
}: {
  invoiceId: string;
  total: number;
  paidAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  currency: string;
  payments: Payment[];
  canRegister: boolean;
}) {
  const remaining = Math.max(0, total - paidAmount);
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-gray-200 mt-4 pt-4 mb-6 no-print">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
          ການຊຳລະ
        </h3>
        {canRegister && remaining > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[13px] font-medium transition tracking-wide"
          >
            + ບັນທຶກການຊຳລະ
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-[13px]">
        <div className="bg-gray-50 border border-gray-200 rounded p-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">
            ມູນຄ່າທັງໝົດ
          </div>
          <div className="font-semibold tabular-nums text-gray-900">
            {formatMoney(total, currency)}
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
          <div className="text-[10px] uppercase tracking-wider text-emerald-700">
            ຊຳລະແລ້ວ
          </div>
          <div className="font-semibold tabular-nums text-emerald-800">
            {formatMoney(paidAmount, currency)}
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
            ຄ້າງຈ່າຍ
          </div>
          <div
            className={`font-semibold tabular-nums ${
              remaining > 0 ? "text-amber-800" : "text-gray-600"
            }`}
          >
            {formatMoney(remaining, currency)}
          </div>
        </div>
      </div>

      {/* Payment list */}
      {payments.length > 0 && (
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
                <th className="px-3 py-2 text-left font-semibold">ເລກ</th>
                <th className="px-2 py-2 text-left font-semibold">ວັນທີ</th>
                <th className="px-2 py-2 text-left font-semibold">ວິທີ</th>
                <th className="px-2 py-2 text-left font-semibold">ອ້າງອີງ</th>
                <th className="px-2 py-2 text-left font-semibold">ໂດຍ</th>
                <th className="px-3 py-2 text-right font-semibold w-32">
                  ຈຳນວນ
                </th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} currency={currency} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paymentStatus === "PAID" && payments.length > 0 && (
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium">
          ✓ ບິນນີ້ຊຳລະຄົບແລ້ວ
        </div>
      )}

      {/* Modal */}
      {open && canRegister && (
        <PaymentModal
          invoiceId={invoiceId}
          remaining={remaining}
          currency={currency}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PaymentRow({
  payment,
  currency,
}: {
  payment: Payment;
  currency: string;
}) {
  const [pending, start] = useTransition();
  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 group">
      <td className="px-3 py-2 font-mono text-[12px] text-gray-700">
        {payment.number}
      </td>
      <td className="px-2 py-2 text-gray-700">{formatDate(payment.date)}</td>
      <td className="px-2 py-2 text-gray-700">
        {METHOD_LABEL[payment.method] ?? payment.method}
      </td>
      <td className="px-2 py-2 text-gray-500">{payment.reference || "—"}</td>
      <td className="px-2 py-2 text-gray-600">{payment.user.name}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-700">
        {formatMoney(payment.amount, currency)}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => {
            if (!confirm(`ລົບການຊຳລະ ${payment.number}?`)) return;
            start(async () => {
              try {
                await deletePayment(payment.id);
              } catch (e) {
                alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
              }
            });
          }}
          disabled={pending}
          className="text-red-500 hover:text-red-700 text-[12px] opacity-0 group-hover:opacity-100 transition"
        >
          ລົບ
        </button>
      </td>
    </tr>
  );
}

function PaymentModal({
  invoiceId,
  remaining,
  currency,
  onClose,
}: {
  invoiceId: string;
  remaining: number;
  currency: string;
  onClose: () => void;
}) {
  const action = registerPayment.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState<
    PaymentFormState,
    FormData
  >(action, undefined);

  // Close on success
  if (state?.success) {
    setTimeout(onClose, 100);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-800">
            ບັນທຶກການຊຳລະ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <form action={formAction} className="p-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[13px] text-amber-800">
            ຄ້າງຈ່າຍ:{" "}
            <span className="font-semibold tabular-nums">
              {formatMoney(remaining, currency)}
            </span>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">
              ຈຳນວນເງິນ <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              required
              min="0.01"
              step="0.01"
              defaultValue={remaining.toFixed(2)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-[14px] tabular-nums focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15"
              autoFocus
            />
            {state?.fieldErrors?.amount && (
              <p className="text-xs text-red-600 mt-0.5">
                {state.fieldErrors.amount[0]}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">
                ວິທີຊຳລະ
              </label>
              <select
                name="method"
                defaultValue="CASH"
                className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c]"
              >
                <option value="CASH">ເງິນສົດ</option>
                <option value="BANK">ໂອນທະນາຄານ</option>
                <option value="TRANSFER">ໂອນຜ່ານແອັບ</option>
                <option value="OTHER">ອື່ນໆ</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">
                ວັນທີ
              </label>
              <input
                type="date"
                name="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">
              ການອ້າງອີງ
            </label>
            <input
              type="text"
              name="reference"
              placeholder="ເລກໂອນ, slip number, ..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">
              ໝາຍເຫດ
            </label>
            <textarea
              name="note"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c] resize-none"
            />
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-[13px]">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-100 rounded"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
            >
              {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກການຊຳລະ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
