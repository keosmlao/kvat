"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  OdooLayout,
  OdooHeading,
  OdooHeaderGrid,
  Field,
  PrimaryButton,
  SecondaryButton,
} from "@/components/odoo/sheet";
import { updateProfile, type ProfileState } from "./actions";
import { t, type Locale } from "@/lib/i18n/messages";

type Initial = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  createdAt: string;
  lastSeenAt: string | null;
};

export function ProfileForm({
  initial,
  locale,
}: {
  initial: Initial;
  locale: Locale;
}) {
  const tp = (k: string) => t(locale, "profile", k);
  const tn = (k: string) => t(locale, "nav", k);
  const tc = (k: string) => t(locale, "common", k);
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const [name, setName] = useState(initial.name);
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <form action={formAction}>
      <OdooLayout
        breadcrumb={[
          { href: "/dashboard", label: tn("dashboard") },
          { href: "/profile", label: tn("profile") },
        ]}
        actions={
          <>
            <PrimaryButton disabled={pending}>
              {pending ? tc("saving") : tc("save")}
            </PrimaryButton>
            <SecondaryButton href="/dashboard">{tc("cancel")}</SecondaryButton>
          </>
        }
        status={
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              initial.role === "ADMIN"
                ? "bg-odoo/10 text-odoo border-odoo/30"
                : "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {initial.role === "ADMIN" ? tn("admin") : tn("staff")}
          </span>
        }
      >
        <OdooHeading
          tag={tp("tag")}
          title={
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-odoo/10 text-odoo flex items-center justify-center text-2xl font-light flex-shrink-0">
                {name.charAt(0).toUpperCase() || "?"}
              </div>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tp("name")}
                className="flex-1 text-[24px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-odoo focus:outline-none focus:ring-0 pb-1 bg-transparent"
              />
            </div>
          }
        />
        {fe.name && (
          <p className="px-8 -mt-2 mb-2 text-xs text-red-600">{fe.name[0]}</p>
        )}

        <OdooHeaderGrid
          left={
            <>
              <Field label={tp("email")} required>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={initial.email}
                  className="o-input"
                  autoComplete="email"
                />
                {fe.email && (
                  <p className="text-xs text-red-600 mt-0.5">{fe.email[0]}</p>
                )}
              </Field>
              <Field label={tp("role")}>
                <div className="text-[13px] text-gray-700 py-1">
                  {initial.role === "ADMIN"
                    ? `${tn("admin")} (ADMIN)`
                    : `${tn("staff")} (STAFF)`}
                  <span className="text-[11px] text-gray-400 ml-2">
                    {tp("readOnly")}
                  </span>
                </div>
              </Field>
            </>
          }
          right={
            <>
              <Field label={tp("createdAt")}>
                <div className="text-[13px] text-gray-600 py-1">
                  {formatDateTime(initial.createdAt)}
                </div>
              </Field>
              <Field label={tp("lastSeenAt")}>
                <div className="text-[13px] text-gray-600 py-1">
                  {initial.lastSeenAt
                    ? formatDateTime(initial.lastSeenAt)
                    : "—"}
                </div>
              </Field>
            </>
          }
        />

        {/* Password section — collapsed by default */}
        <div className="px-8 pb-6 pt-2 border-t border-gray-100 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
              {tp("password")}
            </h3>
            {!changingPassword && (
              <button
                type="button"
                onClick={() => setChangingPassword(true)}
                className="text-[12px] text-odoo hover:underline"
              >
                {tp("changePassword")}
              </button>
            )}
          </div>
          {changingPassword ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 max-w-3xl">
              <Field label={tp("currentPassword")} required>
                <input
                  name="currentPassword"
                  type="password"
                  className="o-input"
                  autoComplete="current-password"
                  required
                />
                {fe.currentPassword && (
                  <p className="text-xs text-red-600 mt-0.5">
                    {fe.currentPassword[0]}
                  </p>
                )}
              </Field>
              <Field label={tp("newPassword")} required>
                <input
                  name="newPassword"
                  type="password"
                  className="o-input"
                  autoComplete="new-password"
                  placeholder={tp("newPasswordHint")}
                  required
                />
                {fe.newPassword && (
                  <p className="text-xs text-red-600 mt-0.5">
                    {fe.newPassword[0]}
                  </p>
                )}
              </Field>
            </div>
          ) : (
            <p className="text-[12px] text-gray-500">
              {tp("notChanging")}
            </p>
          )}
        </div>

        {/* Footer messages */}
        {(state?.error || state?.ok) && (
          <div className="px-8 pb-6">
            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {state.error}
              </div>
            )}
            {state?.ok && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-sm">
                {state.ok}
              </div>
            )}
          </div>
        )}

        <div className="px-8 pb-6 flex items-center gap-4">
          <Link
            href="/preferences"
            className="text-[12px] text-gray-500 hover:text-gray-800 hover:underline"
          >
            {tp("preferencesLink")}
          </Link>
          <Link
            href={`/users/${initial.id}/activity`}
            className="text-[12px] text-gray-500 hover:text-gray-800 hover:underline"
          >
            {tp("activityLink")}
          </Link>
        </div>
      </OdooLayout>
    </form>
  );
}

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDateTime(iso: string) {
  return DATETIME_FMT.format(new Date(iso));
}
