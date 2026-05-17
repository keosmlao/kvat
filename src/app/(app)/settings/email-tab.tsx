"use client";

import { useActionState, useState } from "react";
import {
  saveSmtpConfig,
  testSmtp,
  type EmailState,
} from "./email-actions";
import { t, type Locale } from "@/lib/i18n/messages";

type Initial = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpHasPassword: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpSecure: boolean;
};

export function EmailTab({ initial, locale = "lo" }: { initial: Initial; locale?: Locale }) {
  const ts = (k: string) => t(locale, "settings", k);
  const [saveState, saveAction, savePending] = useActionState<
    EmailState,
    FormData
  >(saveSmtpConfig, undefined);
  const [testState, testAction, testPending] = useActionState<
    EmailState,
    FormData
  >(testSmtp, undefined);
  const [secure, setSecure] = useState(initial.smtpSecure);

  return (
    <div className="space-y-6">
      <form action={saveAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SMTP Host" hint={ts("smtpHostHint")}>
            <input
              type="text"
              name="smtpHost"
              defaultValue={initial.smtpHost}
              placeholder="smtp.example.com"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="Port" hint={ts("smtpPortHint")}>
            <input
              type="number"
              name="smtpPort"
              defaultValue={initial.smtpPort}
              min={1}
              max={65535}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
          <Field label="Username">
            <input
              type="text"
              name="smtpUser"
              defaultValue={initial.smtpUser}
              placeholder="account@example.com"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field
            label="Password"
            hint={
              initial.smtpHasPassword
                ? ts("pwdKeepHint")
                : ts("pwdEnterHint")
            }
          >
            <input
              type="password"
              name="smtpPassword"
              autoComplete="new-password"
              placeholder={
                initial.smtpHasPassword ? "••••••••" : ts("pwdPh")
              }
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="From Name">
            <input
              type="text"
              name="smtpFromName"
              defaultValue={initial.smtpFromName}
              placeholder="SMLAO Co.,Ltd."
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="From Email">
            <input
              type="email"
              name="smtpFromEmail"
              defaultValue={initial.smtpFromEmail}
              placeholder="noreply@smlao.la"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer">
          <input
            type="checkbox"
            name="smtpSecure"
            checked={secure}
            onChange={(e) => setSecure(e.target.checked)}
            className="w-4 h-4"
          />
          <span>{ts("useSslLabel")}</span>
        </label>
        <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
          <button
            type="submit"
            disabled={savePending}
            className="bg-odoo hover:bg-odoo-hover text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
          >
            {savePending ? ts("smtpSaving") : ts("smtpSaveBtn")}
          </button>
          {saveState?.error && (
            <span className="text-[12px] text-red-600">{saveState.error}</span>
          )}
          {saveState?.success && (
            <span className="text-[12px] text-emerald-700">
              {saveState.success}
            </span>
          )}
        </div>
      </form>

      <div className="bg-gray-50 border border-gray-200 rounded p-4">
        <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
          {ts("smtpTestHeader")}
        </h3>
        <form action={testAction} className="flex gap-2 flex-wrap">
          <input
            type="email"
            name="to"
            required
            placeholder={ts("smtpTestPh")}
            className="flex-1 min-w-[200px] px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
          <button
            type="submit"
            disabled={testPending}
            className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
          >
            {testPending ? ts("smtpTesting") : ts("smtpSendTest")}
          </button>
        </form>
        {testState?.error && (
          <p className="text-[12px] text-red-600 mt-2">{testState.error}</p>
        )}
        {testState?.success && (
          <p className="text-[12px] text-emerald-700 mt-2">
            {testState.success}
          </p>
        )}
        <p className="text-[11px] text-gray-500 mt-3">
          {ts("smtpGmailHint")} myaccount.google.com → Security → 2-step verification → App passwords.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
