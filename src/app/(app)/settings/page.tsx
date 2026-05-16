import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { masterPrisma } from "@/lib/master-prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await requireAdmin();

  const [setting, userCount, tenant, pendingRequest] = await Promise.all([
    prisma.setting.findUnique({ where: { id: "default" } }),
    prisma.user.count(),
    masterPrisma.tenant.findUnique({ where: { id: session.tenantId } }),
    masterPrisma.approvalRequest.findFirst({
      where: { tenantId: session.tenantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <SettingsForm
      initial={{
        shopName: setting?.shopName ?? "ຮ້ານຄ້າ",
        shopNameEn: setting?.shopNameEn ?? "",
        taxId: setting?.taxId ?? "",
        address: setting?.address ?? "",
        phone: setting?.phone ?? "",
        email: setting?.email ?? "",
        logoUrl: setting?.logoUrl ?? "",
        vatRate: setting?.vatRate ?? 0.1,
        defaultCurrency: setting?.defaultCurrency ?? "LAK",
        invoicePrefix: setting?.invoicePrefix ?? "INV",
        enablePos: setting?.enablePos ?? false,
        enableCreditNotes: setting?.enableCreditNotes ?? true,
        enableChatter: setting?.enableChatter ?? true,
        enableReports: setting?.enableReports ?? true,
        enableDashboard: setting?.enableDashboard ?? true,
        etaxAutoSubmit: setting?.etaxAutoSubmit ?? false,
        etaxEnv: setting?.etaxEnv ?? "",
        etaxUsername: setting?.etaxUsername ?? "",
        etaxSecret: setting?.etaxSecret ?? "",
        etaxIssueCode: setting?.etaxIssueCode ?? "",
      }}
      userCount={userCount}
      tenantInfo={{
        slug: session.slug,
        dbName: session.dbName,
        plan: tenant?.plan ?? "TRIAL",
        status: tenant?.status ?? "TRIAL",
        trialEndsAt: tenant?.trialEndsAt?.toISOString() ?? null,
        paidUntil: tenant?.paidUntil?.toISOString() ?? null,
        hasPendingRequest: pendingRequest !== null,
      }}
    />
  );
}
