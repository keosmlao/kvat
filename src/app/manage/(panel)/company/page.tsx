import { masterPrisma } from "@/lib/master-prisma";
import { BillingConfigForm } from "./form";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

export default async function CompanySettingsPage() {
  const [cfg, products] = await Promise.all([
    masterPrisma.billingConfig.findUnique({ where: { id: 1 } }),
    masterPrisma.billingProduct.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, unit: true, priceLak: true },
    }),
  ]);
  const initial = {
    invoicePrefix: cfg?.invoicePrefix ?? "BIL-",
    yearlyProductId: cfg?.yearlyProductId ?? "",
    lifetimeProductId: cfg?.lifetimeProductId ?? "",
    sellerName: cfg?.sellerName ?? "",
    sellerNameEn: cfg?.sellerNameEn ?? "",
    sellerTaxId: cfg?.sellerTaxId ?? "",
    sellerAddress: cfg?.sellerAddress ?? "",
    sellerPhone: cfg?.sellerPhone ?? "",
    sellerBankAccount: cfg?.sellerBankAccount ?? "",
    sellerBankName: cfg?.sellerBankName ?? "",
    sellerBankAccountName: cfg?.sellerBankAccountName ?? "",
  };

  return (
    <OdooListPage
      title={tm("companyTitle")}
      subtitle={tm("companySubtitle")}
    >
      <div className="bg-white border border-gray-200 rounded p-5 max-w-3xl">
        <BillingConfigForm initial={initial} products={products} />
      </div>
    </OdooListPage>
  );
}
