import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { TrialBanner } from "@/components/trial-banner";
import { getFeatures } from "@/lib/features";
import { masterPrisma } from "@/lib/master-prisma";
import { getLocale } from "@/lib/i18n/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, features, locale] = await Promise.all([
    requireUser(),
    getFeatures(),
    getLocale(),
  ]);
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { status: true, trialEndsAt: true, plan: true },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {tenant && (
        <TrialBanner
          info={{
            status: tenant.status,
            trialEndsAt: tenant.trialEndsAt,
            plan: tenant.plan,
          }}
        />
      )}
      <TopBar
        user={{ name: session.name, role: session.role }}
        features={features}
        locale={locale}
      />
      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-x-auto">
        {children}
      </main>
    </div>
  );
}
