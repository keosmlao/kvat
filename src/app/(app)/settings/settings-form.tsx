"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSettings, type SettingFormState } from "./actions";
import { ImageUpload } from "@/components/image-upload";
import { EtaxPanel } from "./etax-panel";
import { UpgradeRequestForm } from "./upgrade-form";

type Initial = {
  shopName: string;
  shopNameEn: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  vatRate: number;
  defaultCurrency: string;
  invoicePrefix: string;
  enablePos: boolean;
  enableCreditNotes: boolean;
  enableChatter: boolean;
  enableReports: boolean;
  enableDashboard: boolean;
  etaxAutoSubmit: boolean;
  etaxEnv: string;
  etaxUsername: string;
  etaxSecret: string;
  etaxIssueCode: string;
};

type Section =
  | "general"
  | "company"
  | "invoicing"
  | "inventory"
  | "etax"
  | "modules"
  | "users"
  | "about";

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
}: {
  initial: Initial;
  userCount: number;
  tenantInfo: TenantInfo;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SettingFormState, FormData>(
    saveSettings,
    undefined,
  );
  const [section, setSection] = useState<Section>("general");
  const [search, setSearch] = useState("");
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const fe = state?.fieldErrors ?? {};

  // Refresh the page (including layout/topbar) after a successful save so
  // feature-toggle changes take effect immediately without a manual reload.
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "general", label: "ທົ່ວໄປ", icon: "⚙" },
    { key: "company", label: "ບໍລິສັດ", icon: "🏢" },
    { key: "invoicing", label: "ການອອກບິນ", icon: "🧾" },
    { key: "inventory", label: "ສິນຄ້າ ແລະ ຄັງ", icon: "📦" },
    { key: "etax", label: "eTax Gateway", icon: "🧾" },
    { key: "modules", label: "ໂມດູນ (ເປີດ/ປິດ)", icon: "🧩" },
    { key: "users", label: "ຜູ້ໃຊ້ ແລະ ສິດ", icon: "👥" },
    { key: "about", label: "ກ່ຽວກັບ", icon: "ℹ" },
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
              className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 transition tracking-wide"
            >
              {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
            </button>
            <button
              type="reset"
              className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
            >
              ຍົກເລີກ
            </button>
            {state?.success && (
              <span className="ml-2 text-[12px] text-emerald-600 inline-flex items-center gap-1">
                ✓ ບັນທຶກສຳເລັດ
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
              placeholder="ຄົ້ນຫາການກຳນົດຄ່າ..."
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15 bg-white"
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
                      ? "bg-[#b91c1c]/8 text-[#b91c1c] font-medium border-r-2 border-[#b91c1c]"
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
              title="ການກຳນົດຄ່າທົ່ວໄປ"
              description="ການກຳນົດຄ່າຫລັກຂອງລະບົບ"
            >
              <FeatureCard
                title="ສະກຸນເງິນຫລັກ"
                description="ສະກຸນເງິນທີ່ໃຊ້ໂດຍຄ່າເລີ່ມຕົ້ນສຳລັບການອອກບິນ"
              >
                <select
                  name="defaultCurrency"
                  defaultValue={initial.defaultCurrency}
                  className="o-field w-32"
                >
                  <option value="LAK">LAK — ກີບ</option>
                  <option value="USD">USD — ໂດລາ</option>
                  <option value="THB">THB — ບາດ</option>
                </select>
              </FeatureCard>

              <FeatureCard
                title="ພາສາຂອງລະບົບ"
                description="ພາສາທີ່ໃຊ້ສະແດງຜົນ"
              >
                <select className="o-field w-40" disabled>
                  <option>ລາວ (Lao)</option>
                </select>
              </FeatureCard>

              <FeatureCard
                title="ໂມງເຂດເວລາ"
                description="ເຂດເວລາສຳລັບການບັນທຶກວັນທີ"
              >
                <select className="o-field w-48" disabled>
                  <option>Asia/Vientiane (UTC+7)</option>
                </select>
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "company" && (
            <SectionPanel
              title="ຂໍ້ມູນບໍລິສັດ"
              description="ຂໍ້ມູນທີ່ຈະປະກົດໃນໃບບິນ ແລະ ເອກະສານອື່ນໆ"
            >
              <div className="bg-white border border-gray-200 rounded p-6">
                {/* Logo + main identity (Odoo header style) */}
                <div className="flex gap-6 items-start mb-6 pb-6 border-b border-gray-100">
                  <ImageUpload
                    name="logo"
                    defaultUrl={initial.logoUrl}
                    shape="square"
                    size="lg"
                    placeholder="ໂລໂກ້"
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                      ຊື່ບໍລິສັດ
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      name="shopName"
                      required
                      defaultValue={initial.shopName}
                      placeholder="ຊື່ບໍລິສັດ..."
                      className="w-full text-[22px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-[#b91c1c] focus:outline-none focus:ring-0 pb-1 mb-2 bg-transparent"
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
                      className="w-full text-[14px] text-gray-600 border-0 border-b border-transparent hover:border-gray-300 focus:border-[#b91c1c] focus:outline-none focus:ring-0 pb-0.5 bg-transparent italic"
                    />
                    <div className="text-[11px] text-gray-400 mt-2">
                      ໂລໂກ້: PNG / JPG / WEBP (ສູງສຸດ 2MB)
                    </div>
                  </div>
                </div>

                {/* Contact details — 2-col compact grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <CompactField
                    label="ເລກອາກອນ (TIN)"
                    hint="ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ"
                  >
                    <input
                      name="taxId"
                      defaultValue={initial.taxId}
                      placeholder="1234567890"
                      className="o-field"
                    />
                  </CompactField>

                  <CompactField label="ໂທລະສັບ">
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
                    ທີ່ຢູ່ບໍລິສັດ
                  </label>
                  <textarea
                    name="address"
                    defaultValue={initial.address}
                    rows={2}
                    placeholder="ບ້ານ, ເມືອງ, ແຂວງ..."
                    className="o-field w-full resize-none"
                  />
                </div>
              </div>
            </SectionPanel>
          )}

          {section === "invoicing" && (
            <SectionPanel
              title="ການອອກບິນ"
              description="ການກຳນົດຄ່າສຳລັບການອອກໃບບິນອາກອນ"
            >
              <FeatureCard
                title="ອັດຕາ VAT ເລີ່ມຕົ້ນ"
                description="ອັດຕາພາສີມູນຄ່າເພີ່ມທີ່ໃຊ້ໂດຍຄ່າເລີ່ມຕົ້ນ"
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
                title="Prefix ເລກບິນ"
                description="ຄຳນຳໜ້າຂອງເລກບິນ ເຊັ່ນ INV ສຳລັບ INV-202605-0001"
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
                title="ຮູບແບບເລກບິນ"
                description="ຮູບແບບເລກບິນອັດຕະໂນມັດ"
              >
                <code className="px-2 py-1 bg-gray-100 rounded text-[12px] text-gray-700">
                  {initial.invoicePrefix}-YYYYMM-NNNN
                </code>
              </FeatureCard>

              <FeatureCard
                title="ການລົງຊື່ໃນບິນ"
                description="ສະແດງຊ່ອງລາຍເຊັນຜູ້ຮັບ ແລະ ຜູ້ອອກ"
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title="ສະແດງສ່ວນຫລຸດໃນບິນ"
                description="ສະແດງລາຍການສ່ວນຫລຸດໃນຫົວບິນ"
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "inventory" && (
            <SectionPanel
              title="ສິນຄ້າ ແລະ ຄັງ"
              description="ການກຳນົດຄ່າສຳລັບສິນຄ້າ ແລະ ການຈັດການຄັງ"
            >
              <FeatureCard
                title="ການແຈ້ງເຕືອນສິນຄ້າເຫລືອນ້ອຍ"
                description="ສະແດງການແຈ້ງເຕືອນເມື່ອສິນຄ້າເຫລືອຕ່ຳກວ່າຄ່າຂັ້ນຕ່ຳ"
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title="ປ້ອງກັນຂາຍຫລາຍກວ່າຄັງ"
                description="ບໍ່ໃຫ້ອອກບິນຖ້າສິນຄ້າໃນຄັງບໍ່ພຽງພໍ"
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title="ໜ່ວຍວັດແທກເລີ່ມຕົ້ນ"
                description="ໜ່ວຍສຳລັບສິນຄ້າໃໝ່"
              >
                <select className="o-field w-32" disabled>
                  <option>ອັນ</option>
                  <option>ກິໂລ</option>
                  <option>ກ່ອງ</option>
                </select>
              </FeatureCard>

              <FeatureCard
                title="ບັນທຶກການເຄື່ອນໄຫວຄັງ"
                description="ບັນທຶກປະຫວັດການເຂົ້າ-ອອກສິນຄ້າ"
              >
                <ToggleSwitch defaultChecked disabled />
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "etax" && (
            <SectionPanel
              title="eTax Invoice Gateway"
              description="ການເຊື່ອມຕໍ່ກັບລະບົບໃບອາກອນເອເລັກໂຕຣນິກ ກົມສ່ວຍສາ (HMAC-SHA256)"
            >
              <FeatureCard
                title="ສົ່ງເຂົ້າ eTax ອັດຕະໂນມັດ"
                description="ເມື່ອອອກບິນສຳເລັດ ລະບົບຈະສົ່ງເຂົ້າ eTax ທັນທີ ເພື່ອຮັບເລກບິນ + QR ມາແສດງ. ຖ້າປິດ → ຕ້ອງກົດ 'ສົ່ງເຂົ້າ eTax' ໃນແຕ່ລະບິນເອງ"
              >
                <ToggleSwitchInput
                  name="etaxAutoSubmit"
                  defaultChecked={initial.etaxAutoSubmit}
                />
              </FeatureCard>

              <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
                <h4 className="text-[13px] font-medium text-gray-800">
                  ຂໍ້ມູນປະຈຳຕົວ eTax
                </h4>
                <p className="text-[11px] text-gray-500">
                  ຖ້າຫວ່າງ — ໃຊ້ຄ່າຈາກ environment (admin global default)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] text-gray-500 block mb-0.5">
                      Environment
                    </span>
                    <select
                      name="etaxEnv"
                      defaultValue={initial.etaxEnv ?? ""}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
                    >
                      <option value="">— ໃຊ້ env default —</option>
                      <option value="dev">dev (ທົດສອບ)</option>
                      <option value="prod">prod (ໃຊ້ງານຈິງ)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-gray-500 block mb-0.5">
                      Issue Code (TIN)
                    </span>
                    <input
                      name="etaxIssueCode"
                      defaultValue={initial.etaxIssueCode ?? ""}
                      placeholder="443545674000"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-gray-500 block mb-0.5">
                      Username
                    </span>
                    <input
                      name="etaxUsername"
                      defaultValue={initial.etaxUsername ?? ""}
                      placeholder="smlao-443545674000-dev"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-gray-500 block mb-0.5">
                      Secret
                    </span>
                    <input
                      name="etaxSecret"
                      type="password"
                      defaultValue={initial.etaxSecret ?? ""}
                      placeholder={
                        initial.etaxSecret
                          ? "•••••••••• (ປ່ຽນແລ້ວປ້ອນໃໝ່)"
                          : ""
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
                    />
                  </label>
                </div>
              </div>

              <EtaxPanel />
            </SectionPanel>
          )}

          {section === "modules" && (
            <SectionPanel
              title="ໂມດູນທີ່ໃຊ້ງານ"
              description="ເປີດ/ປິດໂມດູນ — ໂມດູນທີ່ປິດຈະບໍ່ປະກົດໃນເມນູ"
            >
              <FeatureCard
                title="📋 ໜ້າຫຼັກ (Dashboard)"
                description="ສະຫລຸບ KPI ແລະ ບິນຫຼ້າສຸດ"
              >
                <ToggleSwitchInput
                  name="enableDashboard"
                  defaultChecked={initial.enableDashboard}
                />
              </FeatureCard>
              <FeatureCard
                title="🛒 ໜ້າຂາຍ (POS)"
                description="ໜ້າຂາຍດ່ວນ touch-friendly ສຳລັບໜ້າຮ້ານ"
              >
                <ToggleSwitchInput
                  name="enablePos"
                  defaultChecked={initial.enablePos}
                />
              </FeatureCard>
              <FeatureCard
                title="🔄 ໃບລົດໜີ້ (Credit Notes)"
                description="ປຸ່ມສ້າງໃບລົດໜີ້/ຄືນສິນຄ້າຈາກບິນ"
              >
                <ToggleSwitchInput
                  name="enableCreditNotes"
                  defaultChecked={initial.enableCreditNotes}
                />
              </FeatureCard>
              <FeatureCard
                title="💬 Chatter"
                description="ການສື່ສານ + ກິດຈະກຳ + ຜູ້ຕິດຕາມ ໃນບິນ/ສິນຄ້າ/ລູກຄ້າ"
              >
                <ToggleSwitchInput
                  name="enableChatter"
                  defaultChecked={initial.enableChatter}
                />
              </FeatureCard>
              <FeatureCard
                title="📊 ລາຍງານ (Reports)"
                description="ໜ້າລາຍງານການຂາຍ + KPI ໄລຍະເວລາ"
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
              title="ຜູ້ໃຊ້ ແລະ ສິດເຂົ້າເຖິງ"
              description="ການຈັດການຜູ້ໃຊ້ ແລະ ສິດໃນລະບົບ"
            >
              <FeatureCard
                title="ຜູ້ໃຊ້ໃນລະບົບ"
                description={`ປະຈຸບັນມີ ${userCount} ຜູ້ໃຊ້`}
                fullRow
              >
                <div className="flex items-center gap-2">
                  <Link
                    href="/users"
                    className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium transition"
                  >
                    ຈັດການຜູ້ໃຊ້
                  </Link>
                  <Link
                    href="/users/new"
                    className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] hover:bg-gray-50"
                  >
                    + ເພີ່ມຜູ້ໃຊ້
                  </Link>
                </div>
              </FeatureCard>

              <FeatureCard
                title="ບົດບາດ (Roles)"
                description="ສິດໃນລະບົບ"
                fullRow
              >
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#b91c1c]/10 text-[#b91c1c] text-[11px] font-medium uppercase tracking-wider">
                      ADMIN
                    </span>
                    <span className="text-gray-600">
                      ສິດທິເຕັມ ເຂົ້າເຖິງທຸກໂມດູນ ແລະ ການກຳນົດຄ່າ
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[11px] font-medium uppercase tracking-wider">
                      STAFF
                    </span>
                    <span className="text-gray-600">
                      ອອກບິນ, ຈັດການລູກຄ້າ, ສິນຄ້າ — ບໍ່ສາມາດເຂົ້າການກຳນົດຄ່າ
                    </span>
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                title="ລະຫັດຜ່ານ"
                description="ບັງຄັບໃຊ້ລະຫັດຜ່ານທີ່ມີຄວາມຍາວຢ່າງໜ້ອຍ 8 ຕົວ"
              >
                <ToggleSwitch defaultChecked />
              </FeatureCard>

              <FeatureCard
                title="Session Timeout"
                description="ໝົດອາຍຸ session ອັດຕະໂນມັດ"
              >
                <select className="o-field w-32" disabled>
                  <option>7 ມື້</option>
                  <option>30 ມື້</option>
                </select>
              </FeatureCard>
            </SectionPanel>
          )}

          {section === "about" && (
            <SectionPanel title="ກ່ຽວກັບ" description="ຂໍ້ມູນລະບົບ">
              <div className="bg-white border border-gray-200 rounded p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded bg-[#b91c1c] text-white font-bold text-xl flex items-center justify-center">
                    S
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      SMLAO
                    </h3>
                    <p className="text-[13px] text-gray-500">
                      ລະບົບອອກບິນອາກອນສຳລັບຮ້ານຄ້າ
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
                  <dt className="text-gray-500">ສະບັບ:</dt>
                  <dd className="text-gray-800">1.0.0</dd>
                  <dt className="text-gray-500">ຖານຂໍ້ມູນ:</dt>
                  <dd className="text-gray-800">
                    PostgreSQL —{" "}
                    <span className="font-mono">{tenantInfo.dbName}</span>
                  </dd>
                  <dt className="text-gray-500">Tenant slug:</dt>
                  <dd className="text-gray-800 font-mono">
                    {tenantInfo.slug}
                  </dd>
                  <dt className="text-gray-500">ແພັກເກດ:</dt>
                  <dd className="text-gray-800">
                    {tenantInfo.plan}
                    <span className="ml-2 text-gray-500">
                      · ສະຖານະ {tenantInfo.status}
                    </span>
                  </dd>
                  {tenantInfo.status === "TRIAL" && tenantInfo.trialEndsAt && (
                    <>
                      <dt className="text-gray-500">ໝົດທົດລອງ:</dt>
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
                      <dt className="text-gray-500">ຈ່າຍຮອດ:</dt>
                      <dd className="text-gray-800">
                        {new Date(tenantInfo.paidUntil).toLocaleDateString(
                          "en-GB",
                          { timeZone: "Asia/Vientiane" },
                        )}
                      </dd>
                    </>
                  )}
                  <dt className="text-gray-500">ໂມດູນ:</dt>
                  <dd className="text-gray-800">
                    ບິນອາກອນ, ສິນຄ້າ, ລູກຄ້າ, ລາຍງານ
                  </dd>
                </dl>

                {tenantInfo.status !== "LIFETIME" &&
                  tenantInfo.plan !== "LIFETIME" && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-[13px] font-medium text-gray-800">
                        ຂໍຍ້າຍແພັກເກດ
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        ສົ່ງຄຳຂໍຫາທີມ — ຈະ approve ໃຫ້ໃຊ້ງານແບບເຕັມຮູບແບບ
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
        <>
          <input
            type="hidden"
            name="etaxAutoSubmit"
            defaultValue={initial.etaxAutoSubmit ? "true" : "false"}
          />
          <input type="hidden" name="etaxEnv" defaultValue={initial.etaxEnv} />
          <input
            type="hidden"
            name="etaxUsername"
            defaultValue={initial.etaxUsername}
          />
          <input
            type="hidden"
            name="etaxSecret"
            defaultValue={initial.etaxSecret}
          />
          <input
            type="hidden"
            name="etaxIssueCode"
            defaultValue={initial.etaxIssueCode}
          />
        </>
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
        on ? "bg-[#b91c1c]" : "bg-gray-300"
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
      <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-[#b91c1c]" />
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[20px]" />
    </label>
  );
}
