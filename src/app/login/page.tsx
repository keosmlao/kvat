import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

type SP = Promise<{ reset?: string; from?: string }>;

// Only follow `?from=` if it looks like an in-app path. Open-redirect guard.
function safeRedirectTarget(from: string | undefined): string {
  if (!from) return "/dashboard";
  if (!from.startsWith("/")) return "/dashboard";
  if (from.startsWith("//")) return "/dashboard";
  return from;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (session) redirect(safeRedirectTarget(sp.from));
  const resetOk = sp.reset === "ok";
  const locale = await getLocale();
  const ta = (k: string) => t(locale, "auth", k);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-odoo items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">SMLAO</h1>
          <p className="text-gray-500 mt-0.5 text-[13px]">
            {ta("tagline")}
          </p>
        </div>

        {resetOk && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-[12px]">
            {ta("resetOk")}
          </div>
        )}

        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          <h2 className="text-[15px] font-medium text-gray-800 mb-4">
            {ta("login")}
          </h2>
          <LoginForm locale={locale} />
          <p className="text-right mt-3">
            <Link
              href="/forgot"
              className="text-[12px] text-gray-500 hover:text-odoo hover:underline"
            >
              {ta("forgotPassword")}
            </Link>
          </p>
        </div>

        <p className="text-center text-[12px] text-gray-600 mt-4">
          {ta("noAccount")}{" "}
          <Link
            href="/signup"
            className="text-odoo hover:underline font-medium"
          >
            {ta("signupTrial")}
          </Link>
        </p>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          © {new Date().getFullYear()} SMLAO
        </p>
      </div>
    </div>
  );
}
