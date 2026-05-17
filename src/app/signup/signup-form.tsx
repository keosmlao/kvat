"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";
import { t, type Locale } from "@/lib/i18n/messages";

export function SignupForm({ locale }: { locale: Locale }) {
  const ta = (k: string) => t(locale, "auth", k);
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signupAction,
    undefined,
  );

  const fe = state?.fieldErrors ?? {};
  const v = state?.values;

  return (
    <form action={action} className="space-y-3">
      <Field label={`${ta("shopName")} *`} error={fe.shopName?.[0]}>
        <input
          name="shopName"
          required
          defaultValue={v?.shopName ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label={`${ta("ownerName")} *`} error={fe.ownerName?.[0]}>
        <input
          name="ownerName"
          required
          defaultValue={v?.ownerName ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label={`${ta("email")} *`} error={fe.email?.[0]}>
        <input
          name="email"
          type="email"
          required
          defaultValue={v?.email ?? ""}
          className={inputCls}
        />
      </Field>

      <Field
        label={`${ta("phone")} *`}
        error={fe.phone?.[0]}
        hint={ta("phoneHint")}
      >
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          defaultValue={v?.phone ?? ""}
          className={inputCls}
        />
      </Field>

      <Field
        label={`${ta("password")} *`}
        error={fe.password?.[0]}
        hint={ta("passwordHint")}
      >
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className={inputCls}
        />
      </Field>

      <Field label={ta("taxIdLabel")} error={fe.taxId?.[0]}>
        <input
          name="taxId"
          defaultValue={v?.taxId ?? ""}
          className={inputCls}
        />
      </Field>

      {state?.error && !state.fieldErrors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-[12px]">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-odoo text-white py-2 rounded text-[13px] font-medium hover:bg-odoo-hover disabled:opacity-50 disabled:cursor-not-allowed transition tracking-wide mt-2"
      >
        {pending ? ta("signupCreating") : ta("signupCta")}
      </button>

      <p className="text-[11px] text-gray-500 text-center mt-2">
        {ta("signupTerms")}
      </p>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-odoo focus:ring-2 focus:ring-odoo/15 transition";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-gray-600 mb-1">
        {label}
        {hint && (
          <span className="ml-1 text-[11px] font-normal text-gray-400">
            — {hint}
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
