"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveTenant,
  suspendTenant,
  reactivateTenant,
  cancelTenant,
  deleteTenantHard,
  updateNotes,
  type ActionState,
} from "./actions";
import type { TenantStatus } from "@/generated/master/client";

export function ApproveForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    approveTenant.bind(null, id),
    undefined,
  );
  return (
    <form action={action} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          name="plan"
          defaultValue="YEARLY"
          className="px-2 py-1 border border-gray-300 rounded text-[13px]"
        >
          <option value="YEARLY">ລາຍປີ (1 ປີ)</option>
          <option value="LIFETIME">ຕະຫຼອດຊີບ</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງ..." : "Approve"}
        </button>
      </div>
      {state?.error && (
        <p className="text-[12px] text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-[12px] text-emerald-700">{state.success}</p>
      )}
    </form>
  );
}

export function StatusActions({
  id,
  status,
  canHardDelete,
}: {
  id: string;
  status: TenantStatus;
  canHardDelete: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const onSuspend = () => {
    if (!confirm("ໂມດສ tenant ນີ້? ບໍ່ສາມາດເຂົ້າໃຊ້ໄດ້ຈົນກວ່າຈະ reactivate")) return;
    start(() => suspendTenant(id));
  };
  const onReactivate = () => {
    start(() => reactivateTenant(id));
  };
  const onCancel = () => {
    if (!confirm("ຍົກເລີກ tenant ນີ້? ປະຕິບັດການນີ້ບໍ່ສາມາດກັບໄດ້")) return;
    start(() => cancelTenant(id));
  };

  return (
    <div className="flex gap-2">
      {status !== "SUSPENDED" && status !== "CANCELLED" && (
        <button
          type="button"
          onClick={onSuspend}
          disabled={pending}
          className="border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          ໂມດສ
        </button>
      )}
      {status === "SUSPENDED" && (
        <button
          type="button"
          onClick={onReactivate}
          disabled={pending}
          className="border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
      {status !== "CANCELLED" && (
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          ຍົກເລີກ
        </button>
      )}
      {canHardDelete && (
        <button
          type="button"
          onClick={() => {
            if (
              !confirm(
                "⚠ ລົບ tenant + drop DB ຖາວອນ — ບໍ່ສາມາດກັບໄດ້. ສືບຕໍ່?",
              )
            )
              return;
            start(async () => {
              const r = await deleteTenantHard(id);
              if (!r.ok) {
                alert(`ລົບບໍ່ໄດ້: ${r.error}`);
                return;
              }
              router.push("/manage/tenants");
            });
          }}
          disabled={pending}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງ..." : "ລົບ + drop DB"}
        </button>
      )}
    </div>
  );
}

export function NotesForm({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateNotes.bind(null, id),
    undefined,
  );
  return (
    <form action={action} className="space-y-2">
      <textarea
        name="notes"
        defaultValue={initialNotes}
        rows={4}
        placeholder="ບັນທຶກພາຍໃນ ສຳລັບ team management…"
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-slate-700"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ notes"}
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
