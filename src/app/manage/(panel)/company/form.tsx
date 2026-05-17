"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n/messages";
import {
  saveBillingConfig,
  type BillingState,
} from "../billing/actions";

const tm = (k: string) => t("lo", "manage", k);

type Initial = {
  invoicePrefix: string;
  yearlyProductId: string;
  lifetimeProductId: string;
  sellerName: string;
  sellerNameEn: string;
  sellerTaxId: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerBankAccount: string;
  sellerBankName: string;
  sellerBankAccountName: string;
};

type ProductOption = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceLak: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export function BillingConfigForm({
  initial,
  products,
}: {
  initial: Initial;
  products: ProductOption[];
}) {
  const [state, action, pending] = useActionState<BillingState, FormData>(
    saveBillingConfig,
    undefined,
  );

  return (
    <form action={action} className="space-y-6">
      <section>
        <h2 className="text-[13px] uppercase tracking-widest text-gray-500 font-medium mb-3 border-b border-gray-200 pb-1">
          {tm("compInvoiceNum")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={tm("compPrefixLabel")} hint={tm("compPrefixHint")}>
            <input
              type="text"
              name="invoicePrefix"
              defaultValue={initial.invoicePrefix}
              required
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-1">
          <h2 className="text-[13px] uppercase tracking-widest text-gray-500 font-medium">
            {tm("compPlanProducts")}
          </h2>
          <Link
            href="/manage/billing/products"
            className="text-[12px] text-slate-700 hover:underline"
          >
            {tm("compManageProd")}
          </Link>
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          {tm("compPlanDesc")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={tm("compPlanYearly")} hint={tm("compPlanYearlyHint")}>
            <ProductPicker
              name="yearlyProductId"
              defaultValue={initial.yearlyProductId}
              products={products}
            />
          </Field>
          <Field label={tm("compPlanLifetime")} hint={tm("compPlanLifeHint")}>
            <ProductPicker
              name="lifetimeProductId"
              defaultValue={initial.lifetimeProductId}
              products={products}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] uppercase tracking-widest text-gray-500 font-medium mb-3 border-b border-gray-200 pb-1">
          {tm("compSellerInfo")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={tm("compNameLo")}>
            <input
              type="text"
              name="sellerName"
              defaultValue={initial.sellerName}
              required
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label={tm("compNameEn")}>
            <input
              type="text"
              name="sellerNameEn"
              defaultValue={initial.sellerNameEn}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label={tm("compTin")}>
            <input
              type="text"
              name="sellerTaxId"
              defaultValue={initial.sellerTaxId}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
          <Field label={tm("compPhone")}>
            <input
              type="text"
              name="sellerPhone"
              defaultValue={initial.sellerPhone}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label={tm("compAddress")} full>
            <textarea
              name="sellerAddress"
              defaultValue={initial.sellerAddress}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] resize-none"
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] uppercase tracking-widest text-gray-500 font-medium mb-3 border-b border-gray-200 pb-1">
          {tm("compBankAccount")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={tm("compAcctName")}>
            <input
              type="text"
              name="sellerBankAccountName"
              defaultValue={initial.sellerBankAccountName}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label={tm("compAcctNo")}>
            <input
              type="text"
              name="sellerBankAccount"
              defaultValue={initial.sellerBankAccount}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
          <Field label={tm("compBank")}>
            <input
              type="text"
              name="sellerBankName"
              defaultValue={initial.sellerBankName}
              placeholder="BCEL LAK"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
        </div>
      </section>

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
      </div>
    </form>
  );
}

function ProductPicker({
  name,
  defaultValue,
  products,
}: {
  name: string;
  defaultValue: string;
  products: ProductOption[];
}) {
  const selected = products.find((p) => p.id === defaultValue);
  return (
    <div className="space-y-1">
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
      >
        <option value="">{tm("compProdEmpty")}</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            [{p.code}] {p.name} — {fmt(p.priceLak)} {tm("reportsKipSuffix")} / {p.unit}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-[11px] text-emerald-700">
          ✓ {tm("compProdPrice")} {fmt(selected.priceLak)} {tm("reportsKipSuffix")} · {tm("compProdUnit")} {selected.unit}
        </p>
      )}
    </div>
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
