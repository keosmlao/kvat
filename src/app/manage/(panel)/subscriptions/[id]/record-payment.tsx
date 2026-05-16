"use client";

import { useActionState } from "react";
import {
  recordSubscriptionPayment,
  type SubState,
} from "../actions";

export function RecordPaymentForm({
  id,
  defaultAmount,
  currency,
}: {
  id: string;
  defaultAmount: number;
  currency: string;
}) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    recordSubscriptionPayment.bind(null, id),
    undefined,
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="ວັນທີຈ່າຍ">
          <input
            type="date"
            name="paidAt"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <Field label="ວິທີຈ່າຍ">
          <select
            name="paymentMethod"
            defaultValue="TRANSFER"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="CASH">ເງິນສົດ</option>
            <option value="TRANSFER">ໂອນ</option>
          </select>
        </Field>
        <Field label={`ຈໍານວນ (${currency})`}>
          <input
            type="number"
            name="amount"
            defaultValue={defaultAmount}
            min={0}
            step="any"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
          />
        </Field>
        <Field label="Reference (ບໍ່ບັງຄັບ)">
          <input
            type="text"
            name="paymentRef"
            placeholder="slip / txn id"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງ..." : "✓ ບັນທຶກການຈ່າຍ + ຕໍ່ໃໝ່"}
        </button>
        {state?.error && (
          <span className="text-[12px] text-red-600">{state.error}</span>
        )}
        {state?.success && (
          <span className="text-[12px] text-emerald-700">{state.success}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
