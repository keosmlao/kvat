"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/messages";
import { saveEtaxConfig, type EtaxConfigState } from "./actions";

const tm = (k: string) => t("lo", "manage", k);

export function EtaxConfigForm({
  initial,
}: {
  initial: {
    gateway: string;
    env: string;
    username: string;
    secret: string;
  };
}) {
  const [state, action, pending] = useActionState<EtaxConfigState, FormData>(
    saveEtaxConfig,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Environment" hint={tm("etxEnvHint")}>
          <select
            name="env"
            defaultValue={initial.env || "dev"}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="dev">{tm("etxEnvDev")}</option>
            <option value="prod">{tm("etxEnvProd")}</option>
          </select>
        </Field>

        <Field label="Username">
          <input
            type="text"
            name="username"
            defaultValue={initial.username}
            placeholder="smlao-443545674000-dev"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
          />
        </Field>

        <Field
          label="Secret"
          hint={initial.secret ? tm("etxSecretSet") : tm("etxSecretNone")}
        >
          <input
            type="password"
            name="secret"
            defaultValue={initial.secret}
            placeholder={initial.secret ? "••••••••" : ""}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
          />
        </Field>

        <Field
          label="Gateway URL"
          hint={tm("etxGwHint")}
          full
        >
          <input
            type="text"
            name="gateway"
            defaultValue={initial.gateway}
            placeholder="https://etax-dev.la"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? tm("saving") : tm("save")}
        </button>
        {state?.error && (
          <span className="text-[12px] text-red-600">{state.error}</span>
        )}
        {state?.success && (
          <span className="text-[12px] text-emerald-700">{state.success}</span>
        )}
        <span className="text-[11px] text-gray-400 ml-auto">
          {tm("etxCacheNote")}
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${full ? "md:col-span-2" : ""}`}>
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
