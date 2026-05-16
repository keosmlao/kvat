import { masterPrisma } from "@/lib/master-prisma";
import { BillingConfigForm } from "./form";

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
    <div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-1">
        ກຳນົດບໍລິສັດ
      </h1>
      <p className="text-[12px] text-gray-500 mb-5">
        ຂໍ້ມູນບໍລິສັດ SMLAO (ປະກົດໃນ PDF) + ການກຳນົດສິນຄ້າ default ສຳລັບແຕ່ລະ plan
      </p>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-3xl">
        <BillingConfigForm initial={initial} products={products} />
      </div>
    </div>
  );
}
