"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/messages";
import {
  createEntry,
  updateEntry,
  deleteEntry,
  type LedgerState,
} from "./actions";

const tm = (k: string) => t("lo", "manage", k);

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };

type EntryInitial = {
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  description: string;
  vendor: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  paymentRef: string;
  notes: string;
};

export function EntryForm({
  mode,
  id,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  categories: Category[];
  initial: EntryInitial;
}) {
  const router = useRouter();
  const boundAction =
    mode === "create"
      ? (createEntry as (
          prev: LedgerState,
          fd: FormData,
        ) => Promise<LedgerState>)
      : updateEntry.bind(null, id!);
  const [state, action, pending] = useActionState<LedgerState, FormData>(
    boundAction,
    undefined,
  );

  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial.type);
  const filteredCats = categories.filter((c) => c.type === type);

  return (
    <form action={action} className="space-y-4">
      <Field label={tm("ledType")}>
        <div className="flex gap-2">
          {(["EXPENSE", "INCOME"] as const).map((kind) => (
            <label
              key={kind}
              className={`flex-1 cursor-pointer border rounded px-3 py-2 text-center text-[13px] ${
                type === kind
                  ? kind === "INCOME"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium"
                    : "border-rose-500 bg-rose-50 text-rose-800 font-medium"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={kind}
                checked={type === kind}
                onChange={() => setType(kind)}
                className="sr-only"
              />
              {kind === "INCOME" ? tm("ledIncome") : tm("ledExpense")}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={tm("ledCategory")}>
          <select
            name="categoryId"
            defaultValue={initial.categoryId}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="">{tm("ledNoCategory")}</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tm("ledDate")}>
          <input
            type="date"
            name="date"
            defaultValue={initial.date}
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>

      <Field label={tm("ledDescription")}>
        <input
          type="text"
          name="description"
          defaultValue={initial.description}
          required
          placeholder={type === "INCOME" ? tm("ledDescPhInc") : tm("ledDescPhExp")}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={tm("ledVendor")}>
          <input
            type="text"
            name="vendor"
            defaultValue={initial.vendor}
            placeholder={type === "INCOME" ? tm("ledVendorPhInc") : tm("ledVendorPhExp")}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <div className="grid grid-cols-[1fr_80px] gap-2 items-end">
          <Field label={tm("ledAmount")}>
            <input
              type="number"
              name="amount"
              defaultValue={initial.amount}
              min={0}
              step="any"
              required
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
            />
          </Field>
          <select
            name="currency"
            defaultValue={initial.currency}
            className="px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="LAK">LAK</option>
            <option value="USD">USD</option>
            <option value="THB">THB</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={tm("ledPayMethod")}>
          <select
            name="paymentMethod"
            defaultValue={initial.paymentMethod}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="">—</option>
            <option value="CASH">{tm("ledCash")}</option>
            <option value="TRANSFER">{tm("ledTransfer")}</option>
          </select>
        </Field>
        <Field label={tm("ledRef")}>
          <input
            type="text"
            name="paymentRef"
            defaultValue={initial.paymentRef}
            placeholder={tm("ledRefPh")}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>

      <Field label={tm("ledNotes")}>
        <textarea
          name="notes"
          defaultValue={initial.notes}
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] resize-none"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? tm("working") : mode === "create" ? tm("save") : tm("ledSaveEdit")}
        </button>
        {mode === "edit" && id && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(tm("ledDeleteConfirm"))) return;
              await deleteEntry(id);
              router.push("/manage/ledger");
            }}
            className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-[13px] font-medium"
          >
            {tm("delete")}
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
