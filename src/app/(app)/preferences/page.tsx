import Link from "next/link";
import { requireUser } from "@/lib/session";
import { masterPrisma } from "@/lib/master-prisma";
import { prisma } from "@/lib/prisma";
import {
  OdooLayout,
  OdooHeading,
  SecondaryButton,
} from "@/components/odoo/sheet";
import { getLocale } from "@/lib/i18n/server";
import { t, isLocale } from "@/lib/i18n/messages";
import { LocalePicker } from "./locale-picker";

export default async function PreferencesPage() {
  const session = await requireUser();
  const [tenant, locale] = await Promise.all([
    masterPrisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true, slug: true, plan: true },
    }),
    getLocale(),
  ]);
  // Tolerate missing User.locale column (migration may be pending).
  let currentLocale = locale;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { locale: true },
    });
    if (user && isLocale(user.locale)) currentLocale = user.locale;
  } catch {
    /* fall back to resolved locale (lo) */
  }
  const tr = (k: string) => t(locale, "preferences", k);
  const tn = (k: string) => t(locale, "nav", k);

  return (
    <OdooLayout
      breadcrumb={[
        { href: "/dashboard", label: tn("dashboard") },
        { href: "/preferences", label: tn("preferences") },
      ]}
      actions={
        <>
          <SecondaryButton href="/profile">→ {tr("profileLink")}</SecondaryButton>
          {session.role === "ADMIN" && (
            <SecondaryButton href="/settings">
              → {tr("systemSettings")}
            </SecondaryButton>
          )}
        </>
      }
    >
      <OdooHeading tag={tr("tag")} title={tr("title")} />

      <div className="px-8 pb-6 space-y-2">
        <PreferenceRow
          label={tr("language")}
          description={tr("languageHint")}
          value={<LocalePicker current={currentLocale} />}
        />
        <PreferenceRow
          label={tr("timezone")}
          description="ເວລາສຳລັບການບັນທຶກວັນທີ"
          value={<span>Asia/Vientiane (UTC+7)</span>}
        />
        <PreferenceRow
          label={tr("dateFormat")}
          value={<span className="font-mono">dd/mm/yyyy</span>}
        />
        <PreferenceRow
          label={tr("moneyFormat")}
          value={<span>LAK · USD · THB</span>}
        />
        <PreferenceRow
          label={tr("account")}
          value={
            <span>
              {session.name}
              <span className="text-[11px] text-gray-400 ml-2">
                {session.email}
              </span>
            </span>
          }
        />
        <PreferenceRow
          label={tr("role")}
          value={<span>{session.role === "ADMIN" ? tn("admin") : tn("staff")}</span>}
        />
        <PreferenceRow
          label={tr("company")}
          value={
            <span>
              {tenant?.name ?? session.slug}
              <span className="text-[11px] text-gray-400 ml-2 uppercase">
                {tenant?.plan ?? ""}
              </span>
            </span>
          }
        />
        <PreferenceRow
          label={tr("tenant")}
          value={<span className="font-mono text-gray-500">{session.slug}</span>}
        />
      </div>

      <div className="px-8 pb-6 pt-4 border-t border-gray-100 mt-4">
        <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">
          {tr("notifications")}
        </h3>
        <p className="text-[12px] text-gray-500">
          {tr("notificationsHint")}{" "}
          <Link href="/settings" className="text-odoo hover:underline">
            {tr("systemSettings")}
          </Link>{" "}
          ({tr("adminOnly")})
        </p>
      </div>

      <div className="px-8 pb-6">
        <p className="text-[11px] text-gray-400">
          {tr("goToProfile")}{" "}
          <Link href="/profile" className="text-odoo hover:underline">
            {tr("profileLink")}
          </Link>
          .
        </p>
      </div>
    </OdooLayout>
  );
}

function PreferenceRow({
  label,
  description,
  value,
}: {
  label: string;
  description?: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-3 items-center rounded border border-gray-200 bg-white px-4 py-3">
      <div>
        <div className="text-[13px] font-medium text-gray-800">{label}</div>
        {description && (
          <div className="text-[12px] text-gray-500 mt-0.5">{description}</div>
        )}
      </div>
      <div className="text-[13px] text-gray-600 md:text-right">{value}</div>
    </div>
  );
}
