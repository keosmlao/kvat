"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { UserFormState } from "./actions";

type Action = (prev: UserFormState, fd: FormData) => Promise<UserFormState>;

type Initial = {
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
};

export function UserForm({
  action,
  initial,
}: {
  action: Action;
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const isNew = !initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<"ADMIN" | "STAFF">(
    initial?.role ?? "STAFF",
  );

  return (
    <form action={formAction}>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/settings" className="hover:underline">
          ການກຳນົດຄ່າ
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <Link href="/users" className="hover:underline">
          ຜູ້ໃຊ້
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isNew ? "ໃໝ່" : initial?.name ?? "ແກ້ໄຂ"}
        </span>
      </div>

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            disabled={pending}
            className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-odoo-hover disabled:opacity-50 transition tracking-wide"
          >
            {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
          </button>
          <Link
            href="/users"
            className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
          >
            ຍົກເລີກ
          </Link>
        </div>
        <RoleBar role={role} />
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-6 md:px-10 pt-6 pb-6">
          {/* Top: avatar + title */}
          <div className="flex gap-6 items-start mb-6">
            <div className="w-28 h-28 rounded-full bg-odoo/10 text-odoo flex items-center justify-center text-4xl font-light flex-shrink-0">
              {name.charAt(0).toUpperCase() || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ຊື່ ນາມສະກຸນ
              </label>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ຊື່..."
                className="w-full text-[24px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-odoo focus:outline-none focus:ring-0 pb-1 mb-1 bg-transparent"
              />
              {fe.name && (
                <p className="text-xs text-red-600 mb-2">{fe.name[0]}</p>
              )}
              <div className="text-[12px] text-gray-500">
                ບັນຊີຜູ້ໃຊ້ໃນລະບົບ
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
            <div>
              <Field label="Email" required error={fe.email?.[0]}>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={initial?.email}
                  className="o-field"
                  placeholder="user@example.com"
                />
              </Field>
              <Field label="ບົດບາດ" required>
                <select
                  name="role"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "ADMIN" | "STAFF")
                  }
                  className="o-field w-48"
                >
                  <option value="STAFF">ພະນັກງານ (STAFF)</option>
                  <option value="ADMIN">ຜູ້ດູແລ (ADMIN)</option>
                </select>
              </Field>
            </div>
            <div>
              <Field
                label="ລະຫັດຜ່ານ"
                required={isNew}
                error={fe.password?.[0]}
                hint={isNew ? "" : "(ປ່ອຍຫວ່າງເພື່ອບໍ່ປ່ຽນ)"}
              >
                <input
                  name="password"
                  type="password"
                  required={isNew}
                  className="o-field"
                  placeholder={isNew ? "ຢ່າງໜ້ອຍ 6 ຕົວ" : "••••••"}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          </div>

          {/* Permission summary */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">
              ສິດເຂົ້າເຖິງ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px]">
              <PermItem
                allowed={true}
                label="ອອກບິນ, ດູບິນ, ຍົກເລີກບິນ"
              />
              <PermItem
                allowed={true}
                label="ຈັດການລູກຄ້າ ແລະ ສິນຄ້າ"
              />
              <PermItem
                allowed={true}
                label="ດູລາຍງານການຂາຍ"
              />
              <PermItem
                allowed={role === "ADMIN"}
                label="ການກຳນົດຄ່າລະບົບ"
              />
              <PermItem
                allowed={role === "ADMIN"}
                label="ຈັດການຜູ້ໃຊ້"
              />
              <PermItem
                allowed={role === "ADMIN"}
                label="ຂໍ້ມູນບໍລິສັດ ແລະ ໂລໂກ້"
              />
            </div>
          </div>

          {state?.error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {state.error}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-1">
      <label className="text-[13px] text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && (
          <span className="text-[11px] text-gray-400 ml-1">{hint}</span>
        )}
      </label>
      <div>
        {children}
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
      </div>
    </div>
  );
}

function RoleBar({ role }: { role: "ADMIN" | "STAFF" }) {
  return (
    <div className="flex items-center gap-0">
      <span
        className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
          role === "STAFF"
            ? "bg-odoo text-white"
            : "text-gray-400"
        }`}
      >
        ພະນັກງານ
      </span>
      <span className="text-gray-300 text-xs">›</span>
      <span
        className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
          role === "ADMIN"
            ? "bg-odoo text-white"
            : "text-gray-400"
        }`}
      >
        ຜູ້ດູແລ
      </span>
    </div>
  );
}

function PermItem({ allowed, label }: { allowed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
          allowed
            ? "bg-emerald-100 text-emerald-700"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {allowed ? "✓" : "×"}
      </span>
      <span className={allowed ? "text-gray-700" : "text-gray-400 line-through"}>
        {label}
      </span>
    </div>
  );
}
