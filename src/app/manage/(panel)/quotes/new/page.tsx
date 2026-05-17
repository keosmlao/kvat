import Link from "next/link";
import { OdooListPage } from "@/components/odoo/sheet";
import { masterPrisma } from "@/lib/master-prisma";
import { BillingQuoteForm } from "../quote-form";

export default async function NewQuotePage({
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
      title="ສ້າງໃບສະເໜີລາຄາ"
      subtitle="Quotation ແບບ Odoo ສຳລັບສິນຄ້າ ແລະ ບໍລິການ"
    >
      <>
        <div className="mb-3">
          <Link
            href="/manage/quotes"
            className="text-[12px] text-gray-500 hover:text-gray-800"
          >
            ← ໃບສະເໜີລາຄາ
          </Link>
        </div>
        <BillingQuoteForm
          mode="create"
          customers={customers}
          products={products}
          initial={{
            customerId: sp.customerId ?? "",
            title: `ໃບສະເໜີລາຄາ ປະຈຳວັນທີ ${new Date().toISOString().slice(0, 10)}`,
            currency: "LAK",
            vatMode: "EXCLUSIVE",
            vatRate: 0.1,
            discount: 0,
            validUntil: "",
            notes: "",
            items: [],
          }}
        />
      </>
    </OdooListPage>
  );
}
