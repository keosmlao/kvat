"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  deleteSubscription,
  type SubState,
} from "./actions";

type Category = { id: string; name: string };

type Initial = {
  name: string;
  vendor: string;
  categoryId: string;
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: string;
  nextRenewalDate: string;
  autoRenew: boolean;
  notes: string;
};

export function SubForm({
  mode,
  id,
  status,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  status?: "ACTIVE" | "CANCELLED";
  categories: Category[];
  initial: Initial;
}) {
  const router = useRouter();
  const boundAction =
    mode === "create"
      ? (createSubscription as (
          prev: SubState,
          fd: FormData,
        ) => Promise<SubState>)
      : updateSubscription.bind(null, id!);
  const [state, action, pending] = useActionState<SubState, FormData>(
    boundAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="ຊື່">
          <input
            type="text"
            name="name"
            defaultValue={initial.name}
            required
            placeholder="ເຊັ່ນ Vultr server US-East"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <Field label="Vendor">
          <input
            type="text"
            name="vendor"
            defaultValue={initial.vendor}
            required
            placeholder="Vultr / AWS / BCEL ..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>

      <Field label="ໝວດ">
        <select
          name="categoryId"
          defaultValue={initial.categoryId}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
        >
          <option value="">— ບໍ່ໄດ້ຈັດໝວດ —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="ລາຄາ">
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
        <Field label="ສະກຸນເງິນ">
          <select
            name="currency"
            defaultValue={initial.currency}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="LAK">LAK (ກີບ)</option>
            <option value="USD">USD</option>
            <option value="THB">THB</option>
          </select>
        </Field>
        <Field label="ຮອບການຈ່າຍ">
          <select
            name="billingCycle"
            defaultValue={initial.billingCycle}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          >
            <option value="MONTHLY">ລາຍເດືອນ</option>
            <option value="QUARTERLY">ລາຍໄຕມາດ</option>
            <option value="YEARLY">ລາຍປີ</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ວັນເລີ່ມ">
          <input
            type="date"
            name="startDate"
            defaultValue={initial.startDate}
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
        <Field label="ວັນຕໍ່ໃໝ່ຄັ້ງຕໍ່ໄປ">
          <input
            type="date"
            name="nextRenewalDate"
            defaultValue={initial.nextRenewalDate}
            required
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-[13px] cursor-pointer">
        <input
          type="checkbox"
          name="autoRenew"
          defaultChecked={initial.autoRenew}
          className="w-4 h-4"
        />
        <span>ຕໍ່ໃໝ່ອັດຕະໂນມັດ (Auto-renew)</span>
      </label>

      <Field label="ໝາຍເຫດ (ບໍ່ບັງຄັບ)">
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
          {pending
            ? "ກຳລັງ..."
            : mode === "create"
              ? "ສ້າງ"
              : "ບັນທຶກການແກ້ໄຂ"}
        </button>
        {mode === "edit" && id && (
          <>
            {status === "ACTIVE" ? (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("ຍົກເລີກ subscription ນີ້?")) return;
                  await cancelSubscription(id);
                }}
                className="border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded text-[13px] font-medium"
              >
                ຍົກເລີກ
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await reactivateSubscription(id);
                }}
                className="border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded text-[13px] font-medium"
              >
                Reactivate
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!confirm("ລົບຖາວອນ? ປະຫວັດການຈ່າຍຍັງເຫຼືອໃນ Ledger")) return;
                await deleteSubscription(id);
                router.push("/manage/subscriptions");
              }}
              className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-[13px] font-medium"
            >
              ລົບ
            </button>
          </>
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
