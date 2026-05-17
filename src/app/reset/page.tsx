import { ResetForm } from "./reset-form";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

type SP = Promise<{ token?: string }>;

export default async function ResetPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";
  const locale = await getLocale();
  const ta = (k: string) => t(locale, "auth", k);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-rose-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-xl bg-odoo items-center justify-center mb-3 shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-[20px] font-medium text-gray-900">
            {ta("resetPageTitle")}
          </h1>
        </div>
        <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
          {token ? (
            <ResetForm token={token} locale={locale} />
          ) : (
            <p className="text-[13px] text-red-600">
              {ta("noToken")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
