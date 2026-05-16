"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ProductFormState } from "./actions";
import { ImageUpload } from "@/components/image-upload";

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
}: {
  action: Action;
  initial?: Initial;
  units: Option[];
  categories: Option[];
  types: Option[];
  warehouses: Option[];
  chatter?: React.ReactNode;
}) {
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
          ສິນຄ້າ
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
            className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 transition tracking-wide"
          >
            {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
          </button>
          <Link
            href="/products"
            className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
          >
            ຍົກເລີກ
          </Link>
        </div>
        <StatusBar active={active} />
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
              placeholder="ຮູບສິນຄ້າ"
            />

            <div className="flex-1 min-w-0">
              <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ຊື່ສິນຄ້າ
              </label>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ຊື່ສິນຄ້າ..."
                className="w-full text-[24px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-[#b91c1c] focus:outline-none focus:ring-0 pb-1 mb-3 bg-transparent"
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
                    className="accent-[#b91c1c] w-4 h-4"
                  />
                  <span className="text-gray-700">ສາມາດຂາຍໄດ້</span>
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
                ຂໍ້ມູນທົ່ວໄປ
              </TabBtn>
              <TabBtn
                active={tab === "inventory"}
                onClick={() => setTab("inventory")}
              >
                ຄັງສິນຄ້າ
              </TabBtn>
              <TabBtn
                active={tab === "pricing"}
                onClick={() => setTab("pricing")}
              >
                ລາຄາ
              </TabBtn>
            </div>
          </div>

          {/* Tab: General */}
          {tab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              <div>
                <Field label="ລະຫັດສິນຄ້າ" required error={fe.code?.[0]}>
                  <input
                    name="code"
                    required
                    defaultValue={initial?.code}
                    className="o-field"
                    placeholder="ເຊັ່ນ: P0001"
                  />
                </Field>
                <Field label="ໜ່ວຍວັດແທກ" required error={fe.unit?.[0]}>
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="unitId"
                      defaultValue={initial?.unitId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">— ເລືອກ —</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-[#b91c1c] hover:underline whitespace-nowrap"
                      title="ຈັດການໜ່ວຍ"
                    >
                      ⚙
                    </Link>
                  </div>
                  <input
                    type="hidden"
                    name="unit"
                    defaultValue={initial?.unit ?? "ອັນ"}
                  />
                </Field>
              </div>
              <div>
                <Field label="ປະເພດ">
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="typeId"
                      defaultValue={initial?.typeId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">— ເລືອກ —</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-[#b91c1c] hover:underline whitespace-nowrap"
                      title="ຈັດການປະເພດ"
                    >
                      ⚙
                    </Link>
                  </div>
                </Field>
                <Field label="ໝວດໝູ່">
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="categoryId"
                      defaultValue={initial?.categoryId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">— ເລືອກ —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-[#b91c1c] hover:underline whitespace-nowrap"
                      title="ຈັດການໝວດໝູ່"
                    >
                      ⚙
                    </Link>
                  </div>
                </Field>
              </div>

              <div className="md:col-span-2 mt-3">
                <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                  ລາຍລະອຽດ
                </label>
                <textarea
                  name="description"
                  defaultValue={initial?.description ?? ""}
                  rows={3}
                  className="o-field w-full resize-none"
                  placeholder="ລາຍລະອຽດສິນຄ້າ..."
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
                <Field label="ຄັງເລີ່ມຕົ້ນ" error={fe.stock?.[0]}>
                  <input
                    name="stock"
                    type="number"
                    step="0.01"
                    defaultValue={initial?.stock ?? 0}
                    className="o-field text-right tabular-nums"
                  />
                </Field>
                <Field label="ຄັງຂັ້ນຕ່ຳ" error={fe.minStock?.[0]} hint="(ເຕືອນ)">
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
                <Field label="ສະຖານທີ່ເກັບ">
                  <div className="flex gap-2 items-center w-full">
                    <select
                      name="warehouseId"
                      defaultValue={initial?.warehouseId ?? ""}
                      className="o-field flex-1"
                    >
                      <option value="">— ເລືອກສາງ —</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/products/configuration"
                      target="_blank"
                      className="text-[11px] text-[#b91c1c] hover:underline whitespace-nowrap"
                      title="ຈັດການສາງ"
                    >
                      ⚙
                    </Link>
                  </div>
                </Field>
                <Field label="ວິທີຄິດຄ່າ">
                  <select
                    name="costingMethod"
                    defaultValue={initial?.costingMethod ?? "STANDARD"}
                    className="o-field"
                  >
                    <option value="STANDARD">ລາຄາມາດຕະຖານ (Standard)</option>
                    <option value="AVERAGE">ລາຄາສະເລ່ຍ (Average)</option>
                    <option value="FIFO">ເຂົ້າກ່ອນ-ອອກກ່ອນ (FIFO)</option>
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
                  label="ລາຄາຂາຍ"
                  required
                  error={fe.priceLak?.[0]}
                  hint="(ກີບ)"
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
                <Field label="ຕົ້ນທຶນ" error={fe.costLak?.[0]} hint="(ກີບ)">
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
        ບັນທຶກກ່ອນຈຶ່ງສາມາດສົ່ງຂໍ້ຄວາມ ຫລື ສ້າງກິດຈະກຳໄດ້
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
          ? "border-[#b91c1c] text-[#b91c1c] font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBar({ active }: { active: boolean }) {
  const steps = [
    { key: "active", label: "ໃຊ້ງານ", on: active },
    { key: "archived", label: "ປິດ", on: !active },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <span
            className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
              s.on
                ? "bg-[#b91c1c] text-white"
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
