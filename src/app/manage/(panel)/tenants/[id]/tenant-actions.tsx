"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveTenant,
  suspendTenant,
  reactivateTenant,
  cancelTenant,
  deleteTenantHard,
  updateNotes,
  resetTenantUserPassword,
  type ActionState,
} from "./actions";
import type { TenantStatus } from "@/generated/master/client";

export type PlanDefaults = {
  yearly?: { id: string; code: string; name: string; priceLak: number } | null;
  lifetime?: { id: string; code: string; name: string; priceLak: number } | null;
};

export type ProductOption = {
  id: string;
  code: string;
  name: string;
  priceLak: number;
  unit: string;
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export function ApproveForm({
  id,
  defaults,
  products,
}: {
  id: string;
  defaults: PlanDefaults;
  products: ProductOption[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    approveTenant.bind(null, id),
    undefined,
  );
  const [plan, setPlan] = useState<"YEARLY" | "LIFETIME">("YEARLY");
  const [productId, setProductId] = useState<string>("");

  const planDefault =
    plan === "YEARLY" ? defaults.yearly ?? null : defaults.lifetime ?? null;
  const effective =
    productId
      ? products.find((p) => p.id === productId)
      : planDefault
        ? {
            id: planDefault.id,
            code: planDefault.code,
            name: planDefault.name,
            priceLak: planDefault.priceLak,
            unit: "",
          }
        : null;

  return (
    <form action={action} className="space-y-3">
      {/* Two-channel selector: pick plan (drives paidUntil), then optionally
          override which product gets billed. */}
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
          Plan (ໄລຍະຈ່າຍ)
        </label>
        <div className="flex gap-2">
          {(["YEARLY", "LIFETIME"] as const).map((p) => (
            <label
              key={p}
              className={`flex-1 cursor-pointer border rounded px-3 py-1.5 text-center text-[13px] transition ${
                plan === p
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={p}
                checked={plan === p}
                onChange={() => setPlan(p)}
                className="sr-only"
              />
              {p === "YEARLY" ? "ລາຍປີ (1 ປີ)" : "ຕະຫຼອດຊີບ"}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-medium">
          ສິນຄ້າ/ບໍລິການ (ໃບເກັບເງິນອັດຕະໂນມັດ)
        </label>
        <select
          name="productId"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
        >
          <option value="">
            — ໃຊ້ default ຂອງ plan {plan}
            {planDefault
              ? ` (${planDefault.name} — ${fmtMoney(planDefault.priceLak)} ກີບ)`
              : " (ຍັງບໍ່ໄດ້ກຳນົດ)"}
            —
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name} — {fmtMoney(p.priceLak)} ກີບ / {p.unit}
            </option>
          ))}
        </select>
        {!effective && (
          <p className="text-[11px] text-amber-700">
            ⚠ ບໍ່ມີ product — ຈະ approve ໄດ້ ແຕ່ບໍ່ສ້າງ invoice ອັດຕະໂນມັດ
          </p>
        )}
        {effective && (
          <p className="text-[11px] text-emerald-700">
            ✓ ຈະອອກໃບເກັບເງິນ: {fmtMoney(effective.priceLak)} ກີບ (
            {effective.name})
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງ..." : "✓ Approve"}
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

export function ResetPasswordForm({
  id,
  users,
}: {
  id: string;
  users: { email: string; name: string; role: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    resetTenantUserPassword.bind(null, id),
    undefined,
  );
  if (users.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 italic">
        ບໍ່ມີ user ໃນ tenant ນີ້
      </p>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <div className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-gray-500">
          ເລືອກ user
        </label>
        <select
          name="email"
          defaultValue={users[0].email}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px]"
        >
          {users.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name} ({u.email}) — {u.role}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] uppercase tracking-wider text-gray-500">
          ລະຫັດໃໝ່ (≥ 8 ຕົວ)
        </label>
        <input
          type="text"
          name="password"
          autoComplete="off"
          minLength={8}
          required
          placeholder="ລະຫັດໃໝ່"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] font-mono"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (!confirm("ຢືນຢັນປ່ຽນລະຫັດໃຫ້ user ນີ້?")) {
              e.preventDefault();
            }
          }}
          className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {pending ? "ກຳລັງ..." : "ປ່ຽນລະຫັດ"}
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
