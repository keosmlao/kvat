"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ProductFormState } from "./actions";
import { ImageUpload } from "@/components/image-upload";
import { t, type Locale } from "@/lib/i18n/messages";

type Action = (prev: ProductFormState, fd: FormData) => Promise<ProductFormState>;

type Initial = {
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unit: string;
  unitId: string | null;
  categoryId: string | null;
  typeId: string | null;
  warehouseId: string | null;
  costingMethod: string;
  priceLak: number;
  costLak: number;
  stock: number;
  minStock: number;
  active: boolean;
};

type Option = { id: string; code: string; name: string };

export function ProductForm({
  action,
  initial,
  units,
  categories,
  types,
  warehouses,
  chatter,
  locale,
}: {
  action: Action;
  initial?: Initial;
  units: Option[];
  categories: Option[];
  types: Option[];
  warehouses: Option[];
  chatter?: React.ReactNode;
  locale: Locale;
}) {
  const tp = (k: string) => t(locale, "product", k);
  const tc = (k: string) => t(locale, "common", k);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    undefined,
  );
  const [tab, setTab] = useState<"general" | "inventory" | "pricing">(
    "general",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [name, setName] = useState(initial?.name ?? "");

  const fe = state?.fieldErrors ?? {};
  const isNew = !initial;

  return (
    <>
    <form action={formAction} className="odoo-pform">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/products" className="hover:underline">
          {tp("listTitle")}
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isNew ? tp("headingNew") : initial?.name ?? tp("editing")}
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
            {pending ? tc("saving") : tc("save")}
          </button>
          <Link
            href="/products"
            className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
          >
            {tc("cancel")}
          </Link>
        </div>
        <StatusBar active={active} locale={locale} />
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-6 md:px-10 pt-6 pb-6">
          {/* Top: image + title */}
          <div className="flex gap-6 items-start mb-6">
            <ImageUpload
              name="image"
              defaultUrl={initial?.imageUrl}
              shape="square"
              size="md"
              placeholder={tp("photo")}
            />

            <div className="flex-1 min-w-0">
              <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                {tp("productName")}
              </label>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tp("productNamePh")}
                className="w-full text-[24px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-odoo focus:outline-none focus:ring-0 pb-1 mb-3 bg-transparent"
              />
              {fe.name && (
                <p className="text-xs text-red-600 -mt-2 mb-2">{fe.name[0]}</p>
              )}

              <div className="flex items-center gap-4 text-[13px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="accent-odoo w-4 h-4"
                  />
                  <span className="text-gray-700">{tp("sellable")}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-3">
            <div className="flex gap-1 text-[13px]">
              <TabBtn
                active={tab === "general"}
                onClick={() => setTab("general")}
              >
                {tp("tabGeneral")}
              </TabBtn>
              <TabBtn
                active={tab === "inventory"}
                onClick={() => setTab("inventory")}
              >
                {tp("tabInventory")}
              </TabBtn>
              <TabBtn
                active={tab === "pricing"}
                onClick={() => setTab("pricing")}
              >
                {tp("tabPricing")}
              </TabBtn>
            </div>
          </div>

          {/* Tab: General */}
          {tab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              <div>
                <Field label={tp("productCode")} required error={fe.code?.[0]}>
                  <input
                    name="code"
                    required
                    defaultValue={initial?.code}
                    className="o-field"
                    placeholder={tp("productCodeHint")}
                  />
                </Field>
                <Field label={tp("unitLabel")} required error={fe.unit?.[0]}>
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="unitId"
                      defaultValue={initial?.unitId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">{tp("pickOption")}</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-odoo hover:underline whitespace-nowrap"
                      title={tp("manageUnits")}
                    >
                      ⚙
                    </Link>
                  </div>
                  <input
                    type="hidden"
                    name="unit"
                    defaultValue={initial?.unit ?? tp("defaultUnit")}
                  />
                </Field>
              </div>
              <div>
                <Field label={tp("typeLabel")}>
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="typeId"
                      defaultValue={initial?.typeId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">{tp("pickOption")}</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-odoo hover:underline whitespace-nowrap"
                      title={tp("manageTypes")}
                    >
                      ⚙
                    </Link>
                  </div>
                </Field>
                <Field label={tp("categoryLabel")}>
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="categoryId"
                      defaultValue={initial?.categoryId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">{tp("pickOption")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-odoo hover:underline whitespace-nowrap"
                      title={tp("manageCategories")}
                    >
                      ⚙
                    </Link>
                  </div>
                </Field>
              </div>

              <div className="md:col-span-2 mt-3">
                <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                  {tp("descLabel")}
                </label>
                <textarea
                  name="description"
                  defaultValue={initial?.description ?? ""}
                  rows={3}
                  className="o-field w-full resize-none"
                  placeholder={tp("descPh")}
                />
                {fe.description && (
                  <p className="text-xs text-red-600 mt-1">
                    {fe.description[0]}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab: Inventory */}
          {tab === "inventory" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              <div>
                <Field label={tp("stockInitial")} error={fe.stock?.[0]}>
                  <input
                    name="stock"
                    type="number"
                    step="0.01"
                    defaultValue={initial?.stock ?? 0}
                    className="o-field text-right tabular-nums"
                  />
                </Field>
                <Field label={tp("stockMin")} error={fe.minStock?.[0]} hint={tp("stockMinHint")}>
                  <input
                    name="minStock"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={initial?.minStock ?? 0}
                    className="o-field text-right tabular-nums"
                  />
                </Field>
              </div>
              <div>
                <Field label={tp("warehouse")}>
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="warehouseId"
                      defaultValue={initial?.warehouseId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">{tp("pickWarehouse")}</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-odoo hover:underline whitespace-nowrap"
                      title={tp("manageWarehouses")}
                    >
                      ⚙
                    </Link>
                  </div>
                </Field>
                <Field label={tp("costingMethod")}>
                  <select
                    name="costingMethod"
                    defaultValue={initial?.costingMethod ?? "STANDARD"}
                    className="o-field"
                  >
                    <option value="STANDARD">{tp("costStandard")}</option>
                    <option value="AVERAGE">{tp("costAverage")}</option>
                    <option value="FIFO">{tp("costFifo")}</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* Tab: Pricing */}
          {tab === "pricing" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              <div>
                <Field
                  label={tp("sellPriceField")}
                  required
                  error={fe.priceLak?.[0]}
                  hint={tp("kip")}
                >
                  <input
                    name="priceLak"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={initial?.priceLak ?? 0}
                    className="o-field text-right tabular-nums"
                  />
                </Field>
              </div>
              <div>
                <Field label={tp("costPrice")} error={fe.costLak?.[0]} hint={tp("kip")}>
                  <input
                    name="costLak"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={initial?.costLak ?? 0}
                    className="o-field text-right tabular-nums"
                  />
                </Field>
              </div>
            </div>
          )}

          {state?.error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {state.error}
            </div>
          )}
        </div>
      </div>
    </form>
    {chatter ? (
      <div className="mt-4 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        {chatter}
      </div>
    ) : (
      <div className="mt-4 bg-white border border-gray-200 rounded-md px-6 md:px-10 py-3 text-[12px] text-gray-400 italic">
        {tp("chatterHint")}
      </div>
    )}
    </>
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

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 border-b-2 -mb-px transition ${
        active
          ? "border-odoo text-odoo font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBar({ active, locale }: { active: boolean; locale: Locale }) {
  const tp = (k: string) => t(locale, "product", k);
  const steps = [
    { key: "active", label: tp("statusActive"), on: active },
    { key: "archived", label: tp("statusArchived"), on: !active },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <span
            className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
              s.on
                ? "bg-odoo text-white"
                : "text-gray-400"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <span className="text-gray-300 text-xs">›</span>
          )}
        </div>
      ))}
    </div>
  );
}
