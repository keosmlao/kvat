"use client";

import { useActionState } from "react";
import { requestUpgrade, type UpgradeState } from "./upgrade-actions";

export function UpgradeRequestForm({ pending }: { pending: boolean }) {
  const [state, action, submitting] = useActionState<UpgradeState, FormData>(
    requestUpgrade,
    undefined,
  );

  return (
    <form action={action} className="space-y-2 mt-4">
      <div className="flex items-end gap-2 flex-wrap">
        <label className="block">
          <span className="text-[11px] text-gray-500 block mb-0.5">
            ແພັກເກດທີ່ຕ້ອງການ
          </span>
          <select
            name="plan"
            defaultValue="YEARLY"
            className="px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="YEARLY">ລາຍປີ</option>
            <option value="LIFETIME">ຕະຫຼອດຊີບ</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting || pending}
          className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {submitting ? "ກຳລັງສົ່ງ..." : pending ? "ມີຄຳຂໍຄ້າງຢູ່" : "ສົ່ງຄຳຂໍ"}
        </button>
      </div>
      <textarea
        name="reason"
        rows={2}
        placeholder="ບອກເຫດຜົນ (optional)"
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c]"
      />
      {state?.error && (
        <p className="text-[12px] text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-[12px] text-emerald-700">{state.success}</p>
      )}
    </form>
  );
}
