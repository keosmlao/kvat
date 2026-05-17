import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { BillingInvoiceForm } from "../invoice-form";
import { OdooListPage } from "@/components/odoo/sheet";

export default async function NewBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const sp = await searchParams;

  const [customers, products] = await Promise.all([
    masterPrisma.billingCustomer.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
    masterPrisma.billingProduct.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, unit: true, priceLak: true },
    }),
  ]);

  return (
    <OdooListPage
      title="ສ້າງໃບເກັບເງິນໃໝ່"
      subtitle="ໃບເກັບເງິນຄ່າບໍລິການ — ມີ line items + VAT"
    >
      <>
      <div className="mb-3">
        <Link
          href="/manage/billing"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Billing
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded p-5">
        <BillingInvoiceForm
          mode="create"
          customers={customers}
          products={products}
          initial={{
            customerId: sp.customerId ?? "",
            description: `ໃບເກັບເງິນ ປະຈຳວັນທີ ${new Date().toISOString().slice(0, 10)}`,
            currency: "LAK",
            vatMode: "EXCLUSIVE",
            vatRate: 0.1,
            invoiceDiscount: 0,
            dueDate: "",
            notes: "",
            items: [],
          }}
        />
      </div>
      </>
    </OdooListPage>
  );
}
