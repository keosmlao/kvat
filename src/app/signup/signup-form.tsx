"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "./actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signupAction,
    undefined,
  );

  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-3">
      <Field label="ຊື່ຮ້ານ *" error={fe.shopName?.[0]}>
        <input name="shopName" required className={inputCls} />
      </Field>

      <Field label="ຊື່ເຈົ້າຂອງ *" error={fe.ownerName?.[0]}>
        <input name="ownerName" required className={inputCls} />
      </Field>

      <Field label="Email *" error={fe.email?.[0]}>
        <input name="email" type="email" required className={inputCls} />
      </Field>

      <Field
        label="ໂທ *"
        error={fe.phone?.[0]}
        hint="ໃຊ້ສຳລັບຕິດຕໍ່ກັບທີມ"
      >
        <input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          className={inputCls}
        />
      </Field>

      <Field
        label="ລະຫັດຜ່ານ *"
        error={fe.password?.[0]}
        hint="ຢ່າງໜ້ອຍ 8 ຕົວ"
      >
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className={inputCls}
        />
      </Field>

      <Field label="ເລກປະຈຳຕົວເສຍພາສີ" error={fe.taxId?.[0]}>
        <input name="taxId" className={inputCls} />
      </Field>

      {state?.error && !state.fieldErrors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-[12px]">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#b91c1c] text-white py-2 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 disabled:cursor-not-allowed transition tracking-wide mt-2"
      >
        {pending ? "ກຳລັງສ້າງບັນຊີ..." : "ສະໝັກ ແລະ ເລີ່ມໃຊ້ 30 ວັນຟຣີ"}
      </button>

      <p className="text-[11px] text-gray-500 text-center mt-2">
        ການລົງທະບຽນ = ຍອມຮັບເງື່ອນໄຂການໃຊ້ງານ. ບັນຊີຈະທົດລອງ 30 ວັນ ກ່ອນຕ້ອງ
        approve ໂດຍທີມ.
      </p>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#b91c1c] focus:ring-2 focus:ring-[#b91c1c]/15 transition";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-gray-600 mb-1">
        {label}
        {hint && (
          <span className="ml-1 text-[11px] font-normal text-gray-400">
            — {hint}
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
