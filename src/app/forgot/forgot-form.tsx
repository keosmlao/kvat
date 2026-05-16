"use client";

import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    undefined,
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15 transition"
        />
      </div>
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-[12px]">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-[12px]">
          {state.success}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#b91c1c] text-white py-2 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 disabled:cursor-not-allowed transition tracking-wide"
      >
        {pending ? "ກຳລັງສົ່ງ..." : "ສົ່ງລິ້ງຣີເຊັດ"}
      </button>
    </form>
  );
}
