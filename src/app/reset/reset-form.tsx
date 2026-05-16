"use client";

import { useActionState } from "react";
import { performPasswordReset, type ResetState } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    performPasswordReset,
    undefined,
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">
          ລະຫັດຜ່ານໃໝ່ (≥ 8 ຕົວ)
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15 transition"
        />
      </div>
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-[12px]">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#b91c1c] text-white py-2 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 disabled:cursor-not-allowed transition tracking-wide"
      >
        {pending ? "ກຳລັງປ່ຽນ..." : "ປ່ຽນລະຫັດຜ່ານ"}
      </button>
    </form>
  );
}
