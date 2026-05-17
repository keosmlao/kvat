"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/messages";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type CustState,
} from "./actions";

const tm = (k: string) => t("lo", "manage", k);

type TenantOption = { id: string; label: string };

export type CustomerInitial = {
  name: string;
  type: "TENANT" | "EXTERNAL";
  tenantId: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  contactName: string;
  notes: string;
};

export function CustomerForm({
  mode,
  id,
  invoiceCount,
  tenants,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  invoiceCount?: number;
  tenants: TenantOption[];
  initial: CustomerInitial;
}) {
  const router = useRouter();
  const boundAction =
    mode === "create"
      ? (createCustomer as (
          prev: CustState,
          fd: FormData,
        ) => Promise<CustState>)
      : updateCustomer.bind(null, id!);
  const [state, action, pending] = useActionState<CustState, FormData>(
    boundAction,
    undefined,
  );

  const [type, setType] = useState<"TENANT" | "EXTERNAL">(initial.type);

  return (
    <form action={action} className="space-y-4">
      <Field label={tm("custTypeLabel")}>
        <div className="flex gap-2">
          {(["EXTERNAL", "TENANT"] as const).map((kind) => (
            <label
              key={kind}
              className={`flex-1 cursor-pointer border rounded px-3 py-2 text-center text-[13px] ${
                type === kind
                  ? "border-slate-900 bg-slate-50 text-slate-900 font-medium"
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
              {kind === "TENANT" ? tm("custSaasTenant") : tm("custExternal")}
            </label>
          ))}
        </div>
      </Field>

      {type === "TENANT" && (
        <Field label="Tenant">
          <select
            name="tenantId"
            defaultValue={initial.tenantId}
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="">{tm("custPickTenant")}</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label={tm("custCompanyName")}>
          <input
            type="text"
            name="name"
            defaultValue={initial.name}
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <Field label={tm("custContact")}>
          <input
            type="text"
            name="contactName"
            defaultValue={initial.contactName}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="TIN">
          <input
            type="text"
            name="taxId"
            defaultValue={initial.taxId}
            placeholder="123456789012"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
          />
        </Field>
        <Field label={tm("custPhone")}>
          <input
            type="text"
            name="phone"
            defaultValue={initial.phone}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            name="email"
            defaultValue={initial.email}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>

      <Field label={tm("custAddress")}>
        <textarea
          name="address"
          defaultValue={initial.address}
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] resize-none"
        />
      </Field>

      <Field label={tm("custNotes")}>
        <textarea
          name="notes"
          defaultValue={initial.notes}
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] resize-none"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? tm("working") : mode === "create" ? tm("custCreate") : tm("save")}
        </button>
        {mode === "edit" && id && (invoiceCount ?? 0) === 0 && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(tm("custDeleteConfirm"))) return;
              try {
                await deleteCustomer(id);
                router.push("/manage/billing/customers");
              } catch (e) {
                alert(e instanceof Error ? e.message : tm("custDeleteFailed"));
              }
            }}
            className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-[13px] font-medium"
          >
            {tm("custDeleteBtn")}
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
