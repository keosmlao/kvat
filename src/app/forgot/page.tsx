import Link from "next/link";
import { ForgotForm } from "./forgot-form";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

export default async function ForgotPage() {
  const locale = await getLocale();
  const ta = (k: string) => t(locale, "auth", k);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-odoo items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">{ta("forgotTitle")}</h1>
          <p className="text-gray-500 mt-0.5 text-[13px]">
            {ta("forgotPageSub")}
          </p>
        </div>
        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <ForgotForm locale={locale} />
        </div>
        <p className="text-center text-[12px] text-gray-600 mt-4">
          <Link href="/login" className="text-odoo hover:underline">
            {ta("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
