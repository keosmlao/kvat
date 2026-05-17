import Link from "next/link";
import { t, type Locale } from "@/lib/i18n/messages";

// Shown for the first 7 days after a tenant signs up, only on /dashboard.
// Helps new owners discover the setup steps without a tour overlay.
export function OnboardingBanner({
  tenantCreatedAt,
  ownerName,
  locale = "lo",
}: {
  tenantCreatedAt: Date;
  ownerName: string;
  locale?: Locale;
}) {
  const tb = (k: string) => t(locale, "onboarding", k);
  const nowMs = new Date().getTime();
  const days = Math.floor(
    (nowMs - tenantCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days >= 7) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">👋</div>
        <div className="flex-1">
          <h3 className="text-[14px] font-medium text-gray-900">
            {tb("welcome")}, {ownerName}!
          </h3>
          <p className="text-[12px] text-gray-600 mt-1">
            {tb("intro")}
          </p>
          <ol className="text-[12px] text-gray-700 mt-2 space-y-1 list-decimal list-inside">
            <li>
              <Link
                href="/settings"
                className="text-odoo hover:underline"
              >
                {tb("step1Link")}
              </Link>{" "}
              — {tb("step1Hint")}
            </li>
            <li>
              <Link
                href="/settings?section=etax"
                className="text-odoo hover:underline"
              >
                {tb("step2Link")}
              </Link>{" "}
              — {tb("step2Hint")}
            </li>
            <li>
              <Link
                href="/products/new"
                className="text-odoo hover:underline"
              >
                {tb("step3Products")}
              </Link>{" "}
              {tb("step3Join")}{" "}
              <Link
                href="/customers/new"
                className="text-odoo hover:underline"
              >
                {tb("step3Customers")}
              </Link>
            </li>
            <li>
              <Link
                href="/invoices/new"
                className="text-odoo hover:underline"
              >
                {tb("step4Link")}
              </Link>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
