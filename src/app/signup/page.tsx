import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-[#b91c1c] items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">
            ສ້າງບັນຊີ SMLAO
          </h1>
          <p className="text-gray-500 mt-0.5 text-[13px]">
            ທົດລອງຟຣີ 30 ວັນ — ບໍ່ຕ້ອງໃສ່ບັດເຄຣດິດ
          </p>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <SignupForm />
        </div>

        <p className="text-center text-[12px] text-gray-500 mt-4">
          ມີບັນຊີຢູ່ແລ້ວ?{" "}
          <Link
            href="/login"
            className="text-[#b91c1c] hover:underline font-medium"
          >
            ເຂົ້າສູ່ລະບົບ
          </Link>
        </p>
      </div>
    </div>
  );
}
