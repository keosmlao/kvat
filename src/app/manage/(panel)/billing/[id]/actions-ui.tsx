"use client";

import { useActionState } from "react";
import { markBillingPaid, type BillingState } from "../actions";

export function MarkPaidForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(
    markBillingPaid.bind(null, id),
    undefined,
  );
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
            ວິທີຈ່າຍ
          </label>
          <select
            name="paymentMethod"
            defaultValue="CASH"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="CASH">ເງິນສົດ</option>
            <option value="TRANSFER">ໂອນ</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
            ວັນທີຈ່າຍ
          </label>
          <input
            type="date"
            name="paidAt"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
            Reference (ບໍ່ບັງຄັບ)
          </label>
          <input
            type="text"
            name="paymentRef"
            placeholder="slip / transaction id"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງ..." : "✓ ບັນທຶກການຈ່າຍ"}
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
