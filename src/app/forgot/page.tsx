import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-[#b91c1c] items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">ລືມລະຫັດຜ່ານ</h1>
          <p className="text-gray-500 mt-0.5 text-[13px]">
            ປ້ອນ email — ລະບົບຈະສົ່ງລິ້ງຣີເຊັດໃຫ້
          </p>
        </div>
        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <ForgotForm />
        </div>
        <p className="text-center text-[12px] text-gray-600 mt-4">
          <Link href="/login" className="text-[#b91c1c] hover:underline">
            ← ກັບໄປເຂົ້າສູ່ລະບົບ
          </Link>
        </p>
      </div>
    </div>
  );
}
