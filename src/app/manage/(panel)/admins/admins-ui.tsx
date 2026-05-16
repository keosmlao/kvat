"use client";

import { useActionState, useTransition } from "react";
import { createAdmin, deleteAdmin, type AdminState } from "./actions";

export function CreateAdminForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    createAdmin,
    undefined,
  );
  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-4 gap-2">
      <input
        name="email"
        type="email"
        required
        placeholder="email"
        className="px-2 py-1.5 border border-gray-300 rounded text-[13px]"
      />
      <input
        name="name"
        required
        placeholder="ຊື່"
        className="px-2 py-1.5 border border-gray-300 rounded text-[13px]"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="ລະຫັດຜ່ານ ≥ 8"
        className="px-2 py-1.5 border border-gray-300 rounded text-[13px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
      >
        {pending ? "ກຳລັງ..." : "ເພີ່ມ admin"}
      </button>
      {state?.error && (
        <p className="md:col-span-4 text-[12px] text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="md:col-span-4 text-[12px] text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

export function DeleteAdminButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("ລົບ admin ນີ້?")) return;
        start(() => deleteAdmin(id));
      }}
      disabled={pending}
      className="text-[12px] text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "..." : "ລົບ"}
    </button>
  );
}
