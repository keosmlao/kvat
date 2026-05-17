"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { saveSettings, type SettingFormState } from "./actions";
import { ImageUpload } from "@/components/image-upload";
import { EtaxPanel } from "./etax-panel";
import { EmailTab } from "./email-tab";
import { UpgradeRequestForm } from "./upgrade-form";
import { t, type Locale } from "@/lib/i18n/messages";

type Initial = {
  shopName: string;
  shopNameEn: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  licenseNumber: string;
  licenseDate: string;
  vatRate: number;
  defaultCurrency: string;
  invoicePrefix: string;
  enablePos: boolean;
  enableCreditNotes: boolean;
  enableChatter: boolean;
  enableReports: boolean;
  enableDashboard: boolean;
  enableTodo: boolean;
  etaxAutoSubmit: boolean;
  // SMTP (Email tab) — only flags whether password exists; the value
  // itself is never sent to the client.
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpHasPassword: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  smtpSecure: boolean;
};

type Section =
  | "general"
  | "company"
  | "invoicing"
  | "inventory"
  | "etax"
  | "email"
  | "modules"
  | "users"
  | "about";

const SECTION_KEYS: readonly Section[] = [
  "general",
  "company",
  "invoicing",
  "inventory",
  "etax",
  "email",
  "modules",
  "users",
  "about",
];

function isSection(v: string | null): v is Section {
  return v !== null && (SECTION_KEYS as readonly string[]).includes(v);
}

type TenantInfo = {
  slug: string;
  dbName: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  paidUntil: string | null;
  hasPendingRequest: boolean;
};

export function SettingsForm({
  initial,
  userCount,
  tenantInfo,
  locale,
}: {
  initial: Initial;
  userCount: number;
  tenantInfo: TenantInfo;
  locale: Locale;
}) {
  const ts = (k: string) => t(locale, "settings", k);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState<SettingFormState, FormData>(
    saveSettings,
    undefined,
  );
  // Initialise from ?tab=... so refresh + deep links land on the same tab.
  const initialSection: Section = (() => {
    const t = searchParams.get("tab");
    return isSection(t) ? t : "general";
  })();
  const [section, setSectionState] = useState<Section>(initialSection);
  const setSection = (next: Section) => {
    setSectionState(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };
  const [search, setSearch] = useState("");
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const fe = state?.fieldErrors ?? {};

  // Refresh the page (including layout/topbar) after a successful save so
  // feature-toggle changes take effect immediately without a manual reload.
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "general",   label: ts("navGeneral"),   icon: "⚙" },
    { key: "company",   label: ts("navCompany"),   icon: "🏢" },
    { key: "invoicing", label: ts("navInvoicing"), icon: "🧾" },
    { key: "inventory", label: ts("navInventory"), icon: "📦" },
    { key: "etax",      label: "eTax Gateway",     icon: "🧾" },
    { key: "email",     label: "Email (SMTP)",     icon: "📧" },
    { key: "modules",   label: ts("navModules"),   icon: "🧩" },
    { key: "users",     label: ts("navUsers"),     icon: "👥" },
    { key: "about",     label: ts("navAbout"),     icon: "ℹ" },
  ];

  return (
    <form action={action} className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Action bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="submit"
              disabled={pending}
              className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-odoo-hover disabled:opacity-50 transition tracking-wide"
            >
              {pending ? ts("saving") : ts("save")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
            >
              {ts("cancel")}
            </button>
            {state?.success && (
              <span className="ml-2 text-[12px] text-emerald-600 inline-flex items-center gap-1">
                {ts("savedOk")}
              </span>
            )}
            {state?.error && (
              <span className="ml-2 text-[12px] text-red-600">
                {state.error}
              </span>
            )}
          </div>
          <div className="relative w-full max-w-xs">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ts("searchPh")}
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-odoo focus:ring-2 focus:ring-odoo/15 bg-white"
            />
            <svg
              className="absolute left-2.5 top-2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Left section tabs */}
        <aside className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex-shrink-0">
          <nav className="py-2">
            {sections.map((s) => {
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition ${
                    active
                      ? "bg-odoo/8 text-odoo font-medium border-r-2 border-odoo"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-base w-5 text-center">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right content */}
        <div className="flex-1 min-w-0 px-4 md:px-6 py-6 bg-gray-50">
          {section === "general" && (
            <SectionPanel
              title={ts("generalTitle")}
              description={ts("generalDesc")}
            >
              <FeatureCard
                title={ts("mainCurrency")}
                description={ts("mainCurrencyDesc")}
              >
                <select
                  name="defaultCurrency"
                  defaultValue={initial.defaultCurrency}
                  className="o-field w-32"
                >
                  <option value="LAK">{ts("curLak")}</option>
                  <option value="USD">{ts("curUsd")}</option>
                  <option value="THB">{ts("curThb")}</option>
                </select>
              </FeatureCard>

              <FeatureCard
                title={ts("uiLanguage")}
                description={ts("uiLanguageDesc")}
              >
                <select className="o-field w-40" disabled>
                  <option>{ts("langLao")}</option>
                </select>
              </FeatureCard>

              <FeatureCard
                title={ts("timezone")}
                description={ts("timezoneDesc")}
              >
                <select className="o-field w-48" disabled>
                  <option>Asia/Vientiane (UTC+7)</option>
                </select>
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "company" && (
            <SectionPanel
              title={ts("companyTitle")}
              description={ts("companyDesc")}
            >
              <div className="bg-white border border-gray-200 rounded p-6">
                {/* Logo + main identity (Odoo header style) */}
                <div className="flex gap-6 items-start mb-6 pb-6 border-b border-gray-100">
                  <ImageUpload
                    name="logo"
                    defaultUrl={initial.logoUrl}
                    shape="square"
                    size="lg"
                    placeholder={ts("logo")}
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                      {ts("companyName")}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      name="shopName"
                      required
                      defaultValue={initial.shopName}
                      placeholder={ts("companyNamePh")}
                      className="w-full text-[22px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-odoo focus:outline-none focus:ring-0 pb-1 mb-2 bg-transparent"
                    />
                    {fe.shopName && (
                      <p className="text-xs text-red-600 mb-1">
                        {fe.shopName[0]}
                      </p>
                    )}
                    <input
                      name="shopNameEn"
                      defaultValue={initial.shopNameEn}
                      placeholder="Company name in English (optional)"
                      className="w-full text-[14px] text-gray-600 border-0 border-b border-transparent hover:border-gray-300 focus:border-odoo focus:outline-none focus:ring-0 pb-0.5 bg-transparent italic"
                    />
                    <div className="text-[11px] text-gray-400 mt-2">
                      {ts("logoHint")}
                    </div>
                  </div>
                </div>

                {/* Contact details — 2-col compact grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <CompactField
                    label={ts("taxId")}
                    hint={ts("taxIdHint")}
                  >
                    <input
                      name="taxId"
                      defaultValue={initial.taxId}
                      placeholder="1234567890"
                      className="o-field"
                    />
                  </CompactField>

                  <CompactField label={ts("phone")}>
                    <input
                      name="phone"
                      defaultValue={initial.phone}
                      placeholder="020 xx xxx xxx"
                      className="o-field"
                    />
                  </CompactField>

                  <CompactField label="Email">
                    <input
                      name="email"
                      type="email"
                      defaultValue={initial.email}
                      placeholder="info@example.com"
                      className="o-field"
                    />
                    {fe.email && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {fe.email[0]}
                      </p>
                    )}
                  </CompactField>
                </div>

                {/* Address — full width */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                    {ts("companyAddress")}
                  </label>
                  <textarea
                    name="address"
                    defaultValue={initial.address}
                    rows={2}
                    placeholder={ts("addressPh")}
                    className="o-field w-full resize-none"
                  />
                </div>

                {/* Bank account — printed on invoice PDF */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">
                    {ts("bankAccount")}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-0">
                    <CompactField label={ts("bankAccountName")}>
                      <input
                        name="bankAccountName"
                        defaultValue={initial.bankAccountName}
                        placeholder="SMLAO ACCOUNT PROGRAM..."
                        className="o-field"
                      />
                    </CompactField>
                    <CompactField label={ts("bankAccountNumber")}>
                      <input
                        name="bankAccount"
                        defaultValue={initial.bankAccount}
                        placeholder="220-11-00036139"
                        className="o-field"
                      />
                    </CompactField>
                    <CompactField label={ts("bankName")}>
                      <input
                        name="bankName"
                        defaultValue={initial.bankName}
                        placeholder="BCEL LAK"
                        className="o-field"
                      />
                    </CompactField>
                  </div>
                </div>

                {/* Business license — printed at invoice footer */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">
                    {ts("businessLicense")}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                    <CompactField label={ts("licenseNumber")}>
                      <input
                        name="licenseNumber"
                        defaultValue={initial.licenseNumber}
                        placeholder={ts("licenseNumberPh")}
                        className="o-field"
                      />
                    </CompactField>
                    <CompactField label={ts("licenseDate")}>
                      <input
                        name="licenseDate"
                        defaultValue={initial.licenseDate}
                        placeholder="19-02-2025"
                        className="o-field"
                      />
                    </CompactField>
                  </div>
                </div>
              </div>
            </SectionPanel>
          )}

          {section === "invoicing" && (
            <SectionPanel
              title={ts("invoicingTitle")}
              description={ts("invoicingDesc")}
            >
              <FeatureCard
                title={ts("defaultVat")}
                description={ts("defaultVatDesc")}
                required
              >
                <div className="flex items-center gap-2">
                  <input
                    name="vatRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={vatRate}
                    onChange={(e) => setVatRate(+e.target.value)}
                    className="o-field w-24 text-right tabular-nums"
                  />
                  <span className="text-[13px] text-gray-500">
                    = {(vatRate * 100).toFixed(0)}%
                  </span>
                </div>
              </FeatureCard>

              <FeatureCard
                title={ts("invoicePrefix")}
                description={ts("invoicePrefixDesc")}
                required
              >
                <input
                  name="invoicePrefix"
                  required
                  defaultValue={initial.invoicePrefix}
                  className="o-field w-32 uppercase"
                />
                {fe.invoicePrefix && (
                  <p className="text-xs text-red-600 mt-1">
                    {fe.invoicePrefix[0]}
                  </p>
                )}
              </FeatureCard>

              <FeatureCard
                title={ts("invoiceFormat")}
                description={ts("invoiceFormatDesc")}
              >
                <code className="px-2 py-1 bg-gray-100 rounded text-[12px] text-gray-700">
                  {initial.invoicePrefix}-YYYYMM-NNNN
                </code>
              </FeatureCard>

              <FeatureCard
                title={ts("signatureField")}
                description={ts("signatureFieldDesc")}
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title={ts("showDiscount")}
                description={ts("showDiscountDesc")}
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "inventory" && (
            <SectionPanel
              title={ts("inventoryTitle")}
              description={ts("inventoryDesc")}
            >
              <FeatureCard
                title={ts("lowStockAlert")}
                description={ts("lowStockAlertDesc")}
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title={ts("preventOversell")}
                description={ts("preventOversellDesc")}
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title={ts("defaultUnit")}
                description={ts("defaultUnitDesc")}
              >
                <select className="o-field w-32" disabled>
                  <option>{ts("unitPiece")}</option>
                  <option>{ts("unitKilo")}</option>
                  <option>{ts("unitBox")}</option>
                </select>
              </FeatureCard>

              <FeatureCard
                title={ts("stockMovements")}
                description={ts("stockMovementsDesc")}
              >
                <ToggleSwitch defaultChecked disabled />
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "etax" && (
            <SectionPanel
              title="eTax Invoice Gateway"
              description={ts("etaxDesc")}
            >
              <FeatureCard
                title={ts("etaxAutoSubmit")}
                description={ts("etaxAutoSubmitDesc")}
              >
                <ToggleSwitchInput
                  name="etaxAutoSubmit"
                  defaultChecked={initial.etaxAutoSubmit}
                />
              </FeatureCard>

              <div className="bg-white border border-gray-200 rounded p-4 text-[12px] text-gray-600">
                <p className="font-medium text-gray-700 mb-1">
                  {ts("etaxCredentials")}
                </p>
                <p>
                  {ts("etaxAdminMoved")} {ts("etaxContactAdmin")}
                </p>
              </div>

              <EtaxPanel locale={locale} />
            </SectionPanel>
          )}

          {section === "email" && (
            <SectionPanel
              title="Email (SMTP)"
              description={ts("emailDesc")}
            >
              <EmailTab
                locale={locale}
                initial={{
                  smtpHost: initial.smtpHost ?? "",
                  smtpPort: initial.smtpPort ?? 587,
                  smtpUser: initial.smtpUser ?? "",
                  smtpHasPassword: Boolean(initial.smtpHasPassword),
                  smtpFromName: initial.smtpFromName ?? "",
                  smtpFromEmail: initial.smtpFromEmail ?? "",
                  smtpSecure: initial.smtpSecure ?? false,
                }}
              />
            </SectionPanel>
          )}

          {section === "modules" && (
            <SectionPanel
              title={ts("modulesTitle")}
              description={ts("modulesDesc")}
            >
              <FeatureCard
                title={ts("modDashboardTitle")}
                description={ts("modDashboardDesc")}
              >
                <ToggleSwitchInput
                  name="enableDashboard"
                  defaultChecked={initial.enableDashboard}
                />
              </FeatureCard>
              <FeatureCard
                title="✓ Todo"
                description="Odoo-style task board for personal and team work."
              >
                <ToggleSwitchInput
                  name="enableTodo"
                  defaultChecked={initial.enableTodo}
                />
              </FeatureCard>
              <FeatureCard
                title={ts("modPosTitle")}
                description={ts("modPosDesc")}
              >
                <ToggleSwitchInput
                  name="enablePos"
                  defaultChecked={initial.enablePos}
                />
              </FeatureCard>
              <FeatureCard
                title={ts("modCreditTitle")}
                description={ts("modCreditDesc")}
              >
                <ToggleSwitchInput
                  name="enableCreditNotes"
                  defaultChecked={initial.enableCreditNotes}
                />
              </FeatureCard>
              <FeatureCard
                title="💬 Chatter"
                description={ts("modChatterDesc")}
              >
                <ToggleSwitchInput
                  name="enableChatter"
                  defaultChecked={initial.enableChatter}
                />
              </FeatureCard>
              <FeatureCard
                title={ts("modReportsTitle")}
                description={ts("modReportsDesc")}
              >
                <ToggleSwitchInput
                  name="enableReports"
                  defaultChecked={initial.enableReports}
                />
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "users" && (
            <SectionPanel
              title={ts("usersTitle")}
              description={ts("usersDesc")}
            >
              <FeatureCard
                title={ts("usersInSystem")}
                description={ts("currentUsers").replace("{n}", String(userCount))}
                fullRow
              >
                <div className="flex items-center gap-2">
                  <Link
                    href="/users"
                    className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1 rounded text-[13px] font-medium transition"
                  >
                    {ts("manageUsers")}
                  </Link>
                  <Link
                    href="/users/new"
                    className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] hover:bg-gray-50"
                  >
                    {ts("addUser")}
                  </Link>
                </div>
              </FeatureCard>

              <FeatureCard
                title={ts("rolesTitle")}
                description={ts("rolesDesc")}
                fullRow
              >
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-odoo/10 text-odoo text-[11px] font-medium uppercase tracking-wider">
                      ADMIN
                    </span>
                    <span className="text-gray-600">
                      {ts("adminRoleDesc")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[11px] font-medium uppercase tracking-wider">
                      STAFF
                    </span>
                    <span className="text-gray-600">
                      {ts("staffRoleDesc")}
                    </span>
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                title={ts("passwordTitle")}
                description={ts("passwordDesc")}
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title="Session Timeout"
                description={ts("sessionExpiry")}
              >
                <select className="o-field w-32" disabled>
                  <option>{ts("days7")}</option>
                  <option>{ts("days30")}</option>
                </select>
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "about" && (
            <SectionPanel title={ts("aboutTitle")} description={ts("aboutDesc")}>
              <div className="bg-white border border-gray-200 rounded p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded bg-odoo text-white font-bold text-xl flex items-center justify-center">
                    S
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      SMLAO
                    </h3>
                    <p className="text-[13px] text-gray-500">
                      {ts("systemTagline")}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
                  <dt className="text-gray-500">{ts("version")}:</dt>
                  <dd className="text-gray-800">1.0.0</dd>
                  <dt className="text-gray-500">{ts("database")}:</dt>
                  <dd className="text-gray-800">
                    PostgreSQL —{" "}
                    <span className="font-mono">{tenantInfo.dbName}</span>
                  </dd>
                  <dt className="text-gray-500">Tenant slug:</dt>
                  <dd className="text-gray-800 font-mono">
                    {tenantInfo.slug}
                  </dd>
                  <dt className="text-gray-500">{ts("plan")}:</dt>
                  <dd className="text-gray-800">
                    {tenantInfo.plan}
                    <span className="ml-2 text-gray-500">
                      · {ts("status")} {tenantInfo.status}
                    </span>
                  </dd>
                  {tenantInfo.status === "TRIAL" && tenantInfo.trialEndsAt && (
                    <>
                      <dt className="text-gray-500">{ts("trialEnds")}:</dt>
                      <dd className="text-gray-800">
                        {new Date(tenantInfo.trialEndsAt).toLocaleDateString(
                          "en-GB",
                          { timeZone: "Asia/Vientiane" },
                        )}
                      </dd>
                    </>
                  )}
                  {tenantInfo.paidUntil && (
                    <>
                      <dt className="text-gray-500">{ts("paidUntil")}:</dt>
                      <dd className="text-gray-800">
                        {new Date(tenantInfo.paidUntil).toLocaleDateString(
                          "en-GB",
                          { timeZone: "Asia/Vientiane" },
                        )}
                      </dd>
                    </>
                  )}
                  <dt className="text-gray-500">{ts("modules")}:</dt>
                  <dd className="text-gray-800">
                    {ts("modulesList")}
                  </dd>
                </dl>

                {tenantInfo.status !== "LIFETIME" &&
                  tenantInfo.plan !== "LIFETIME" && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-[13px] font-medium text-gray-800">
                        {ts("requestUpgrade")}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {ts("requestUpgradeDesc")}
                      </p>
                      <UpgradeRequestForm
                        pending={tenantInfo.hasPendingRequest}
                      />
                    </div>
                  )}
              </div>
            </SectionPanel>
          )}
        </div>
      </div>

      {/* Always carry hidden inputs for fields outside current section */}
      <HiddenInputs section={section} initial={initial} />
    </form>
  );
}

function HiddenInputs({
  section,
  initial,
}: {
  section: Section;
  initial: Initial;
}) {
  const include = {
    company: section !== "company",
    invoicing: section !== "invoicing",
    general: section !== "general",
    modules: section !== "modules",
    etax: section !== "etax",
  };
  return (
    <>
      {include.general && (
        <input
          type="hidden"
          name="defaultCurrency"
          defaultValue={initial.defaultCurrency}
        />
      )}
      {include.company && (
        <>
          <input type="hidden" name="shopName" defaultValue={initial.shopName} />
          <input
            type="hidden"
            name="shopNameEn"
            defaultValue={initial.shopNameEn}
          />
          <input type="hidden" name="taxId" defaultValue={initial.taxId} />
          <input type="hidden" name="phone" defaultValue={initial.phone} />
          <input type="hidden" name="email" defaultValue={initial.email} />
          <input type="hidden" name="address" defaultValue={initial.address} />
          <input type="hidden" name="logoUrl" defaultValue={initial.logoUrl} />
          <input
            type="hidden"
            name="bankName"
            defaultValue={initial.bankName}
          />
          <input
            type="hidden"
            name="bankAccount"
            defaultValue={initial.bankAccount}
          />
          <input
            type="hidden"
            name="bankAccountName"
            defaultValue={initial.bankAccountName}
          />
          <input
            type="hidden"
            name="licenseNumber"
            defaultValue={initial.licenseNumber}
          />
          <input
            type="hidden"
            name="licenseDate"
            defaultValue={initial.licenseDate}
          />
        </>
      )}
      {include.invoicing && (
        <>
          <input
            type="hidden"
            name="vatRate"
            defaultValue={initial.vatRate}
          />
          <input
            type="hidden"
            name="invoicePrefix"
            defaultValue={initial.invoicePrefix}
          />
        </>
      )}
      {include.modules && (
        <>
          <input
            type="hidden"
            name="enableDashboard"
            defaultValue={initial.enableDashboard ? "true" : "false"}
          />
          <input
            type="hidden"
            name="enableTodo"
            defaultValue={initial.enableTodo ? "true" : "false"}
          />
          <input
            type="hidden"
            name="enablePos"
            defaultValue={initial.enablePos ? "true" : "false"}
          />
          <input
            type="hidden"
            name="enableCreditNotes"
            defaultValue={initial.enableCreditNotes ? "true" : "false"}
          />
          <input
            type="hidden"
            name="enableChatter"
            defaultValue={initial.enableChatter ? "true" : "false"}
          />
          <input
            type="hidden"
            name="enableReports"
            defaultValue={initial.enableReports ? "true" : "false"}
          />
        </>
      )}
      {include.etax && (
        <input
          type="hidden"
          name="etaxAutoSubmit"
          defaultValue={initial.etaxAutoSubmit ? "true" : "false"}
        />
      )}
    </>
  );
}

function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[20px] font-light text-gray-900">{title}</h2>
        {description && (
          <p className="text-[13px] text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CompactField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function FeatureCard({
  title,
  description,
  required,
  fullRow,
  children,
}: {
  title: string;
  description?: string;
  required?: boolean;
  fullRow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded px-4 py-3 hover:border-gray-300 transition">
      <div
        className={`flex gap-6 ${
          fullRow ? "flex-col" : "items-center justify-between"
        }`}
      >
        <div className={fullRow ? "" : "flex-1"}>
          <div className="text-[13px] font-medium text-gray-800">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </div>
          {description && (
            <p className="text-[12px] text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <div className={fullRow ? "mt-2" : "flex-shrink-0"}>{children}</div>
      </div>
    </div>
  );
}

function ToggleSwitch({
  defaultChecked,
  disabled,
}: {
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && setOn(!on)}
      className={`relative inline-flex items-center w-10 h-5 rounded-full transition flex-shrink-0 ${
        on ? "bg-odoo" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

/**
 * Toggle switch wired to a form field via a native `<input type="checkbox">`.
 * Uses Tailwind `peer-checked:` classes so the browser owns the state — no
 * React useState/useEffect to get out of sync after `router.refresh()`.
 * When unchecked the field name is omitted from form data (standard HTML);
 * the action's `boolish` preprocessor treats that as `false`.
 */
function ToggleSwitchInput({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  // `key` forces React to remount the input when defaultChecked changes
  // (after router.refresh), so the new server value wins.
  return (
    <label className="relative inline-block w-10 h-5 cursor-pointer flex-shrink-0">
      <input
        key={`${name}-${defaultChecked}`}
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-odoo" />
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[20px]" />
    </label>
  );
}
