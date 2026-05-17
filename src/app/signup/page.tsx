import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "./signup-form";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const locale = await getLocale();
  const ta = (k: string) => t(locale, "auth", k);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-odoo items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">
            {ta("signupPageTitle")}
          </h1>
          <p className="text-gray-500 mt-0.5 text-[13px]">
            {ta("signupPageSub")}
          </p>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <SignupForm locale={locale} />
        </div>

        <p className="text-center text-[12px] text-gray-500 mt-4">
          {ta("haveAccount")}{" "}
          <Link
            href="/login"
            className="text-odoo hover:underline font-medium"
          >
            {ta("loginHere")}
          </Link>
        </p>
      </div>
    </div>
  );
}
