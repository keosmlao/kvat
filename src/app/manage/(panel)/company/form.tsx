"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  saveBillingConfig,
  type BillingState,
} from "../billing/actions";

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
          ໝາຍເລກບິນ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Prefix ເລກບິນ" hint="ເຊັ່ນ BIL- → BIL-2026-0001">
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
            ສິນຄ້າ/ບໍລິການ ສຳລັບ Plan
          </h2>
          <Link
            href="/manage/billing/products"
            className="text-[12px] text-slate-700 hover:underline"
          >
            ຈັດການສິນຄ້າ →
          </Link>
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          ເລືອກ product ທີ່ຈະຖືກໃຊ້ເປັນ line item ຕອນ auto-create invoice ສຳລັບ
          tenant ທີ່ approve plan
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Plan YEARLY" hint="ສຳລັບ tenant ທີ່ approve YEARLY">
            <ProductPicker
              name="yearlyProductId"
              defaultValue={initial.yearlyProductId}
              products={products}
            />
          </Field>
          <Field label="Plan LIFETIME" hint="ສຳລັບ tenant ທີ່ approve LIFETIME">
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
          ຂໍ້ມູນຜູ້ອອກບິນ (SMLAO)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ຊື່ (Lao)">
            <input
              type="text"
              name="sellerName"
              defaultValue={initial.sellerName}
              required
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="ຊື່ (English)">
            <input
              type="text"
              name="sellerNameEn"
              defaultValue={initial.sellerNameEn}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="TIN">
            <input
              type="text"
              name="sellerTaxId"
              defaultValue={initial.sellerTaxId}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
          <Field label="ໂທ">
            <input
              type="text"
              name="sellerPhone"
              defaultValue={initial.sellerPhone}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="ທີ່ຢູ່" full>
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
          ບັນຊີທະນາຄານ (ສຳລັບ TRANSFER)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="ຊື່ບັນຊີ">
            <input
              type="text"
              name="sellerBankAccountName"
              defaultValue={initial.sellerBankAccountName}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
            />
          </Field>
          <Field label="ເລກບັນຊີ">
            <input
              type="text"
              name="sellerBankAccount"
              defaultValue={initial.sellerBankAccount}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
          <Field label="ທະນາຄານ">
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
          {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
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
        <option value="">— ບໍ່ໄດ້ກຳນົດ (ບໍ່ສ້າງ invoice ອັດຕະໂນມັດ) —</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            [{p.code}] {p.name} — {fmt(p.priceLak)} ກີບ / {p.unit}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-[11px] text-emerald-700">
          ✓ ລາຄາ: {fmt(selected.priceLak)} ກີບ · ຫົວໜ່ວຍ: {selected.unit}
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
