"use client";

import { useActionState } from "react";
import { managementLoginAction, type LoginState } from "./actions";

export function ManagementLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    managementLoginAction,
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
          defaultValue={state?.email ?? ""}
          className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-700/15 transition"
        />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">
          ລະຫັດຜ່ານ
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-700/15 transition"
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
        className="w-full bg-slate-900 text-white py-2 rounded text-[13px] font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition tracking-wide"
      >
        {pending ? "ກຳລັງເຂົ້າ..." : "ເຂົ້າ Management Portal"}
      </button>
    </form>
  );
}
