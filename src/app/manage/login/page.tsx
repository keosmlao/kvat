import { redirect } from "next/navigation";
import { getManagementSession } from "@/lib/management-session";
import { ManagementLoginForm } from "./login-form";

export default async function ManagementLoginPage() {
  const session = await getManagementSession();
  if (session) redirect("/manage/tenants");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-200 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-slate-900 items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">
            SMLAO Management
          </h1>
          <p className="text-gray-500 mt-0.5 text-[13px]">
            ສຳລັບຜູ້ດູແລລະບົບ SaaS
          </p>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <h2 className="text-[15px] font-medium text-gray-800 mb-4">
            ເຂົ້າ Management Portal
          </h2>
          <ManagementLoginForm />
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} SMLAO
        </p>
      </div>
    </div>
  );
}
