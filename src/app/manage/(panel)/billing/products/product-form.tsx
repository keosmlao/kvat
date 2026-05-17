"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/messages";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProdState,
} from "./actions";

const tm = (k: string) => t("lo", "manage", k);

export type ProductInitial = {
  name: string;
  kind: "PRODUCT" | "SERVICE";
  description: string;
  unit: string;
  priceLak: number;
  active: boolean;
};

export function ProductForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: ProductInitial;
}) {
  const router = useRouter();
  const boundAction =
    mode === "create"
      ? (createProduct as (prev: ProdState, fd: FormData) => Promise<ProdState>)
      : updateProduct.bind(null, id!);
  const [state, action, pending] = useActionState<ProdState, FormData>(
    boundAction,
    undefined,
  );
  const [kind, setKind] = useState<"PRODUCT" | "SERVICE">(initial.kind);

  return (
    <form action={action} className="space-y-4">
      <Field label={tm("prodType")}>
        <div className="flex gap-2">
          {(
            [
              { value: "PRODUCT", label: tm("prodProduct"), hint: tm("prodHintProduct") },
              { value: "SERVICE", label: tm("prodService"), hint: tm("prodHintService") },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex-1 cursor-pointer border rounded px-3 py-2 text-center text-[13px] transition ${
                kind === opt.value
                  ? "border-slate-900 bg-slate-50 text-slate-900 font-medium"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={opt.value}
                checked={kind === opt.value}
                onChange={() => setKind(opt.value)}
                className="sr-only"
              />
              <div>{opt.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{opt.hint}</div>
            </label>
          ))}
        </div>
      </Field>

      <Field label={kind === "PRODUCT" ? tm("prodNameProduct") : tm("prodNameService")}>
        <input
          type="text"
          name="name"
          defaultValue={initial.name}
          required
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
        />
      </Field>

      <Field label={tm("prodDescOpt")}>
        <textarea
          name="description"
          defaultValue={initial.description}
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={tm("prodUnit")}>
          <input
            type="text"
            name="unit"
            defaultValue={initial.unit}
            required
            placeholder={tm("prodUnitPh")}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <Field label={tm("prodPriceLak")}>
          <input
            type="number"
            name="priceLak"
            defaultValue={initial.priceLak}
            min={0}
            step="any"
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] cursor-pointer">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initial.active}
          className="w-4 h-4"
        />
        <span>{tm("prodActiveHint")}</span>
      </label>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? tm("working") : mode === "create" ? tm("prodCreate") : tm("save")}
        </button>
        {mode === "edit" && id && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(tm("prodDeleteConfirm"))) return;
              await deleteProduct(id);
              router.push("/manage/billing/products");
            }}
            className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-[13px] font-medium"
          >
            {tm("prodDeleteBtn")}
          </button>
        )}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
