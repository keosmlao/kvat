import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { SubForm } from "../sub-form";
import { OdooListPage } from "@/components/odoo/sheet";

export default async function NewSubscriptionPage() {
  const categories = await masterPrisma.ledgerCategory.findMany({
    where: { type: "EXPENSE", archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const today = new Date().toISOString().slice(0, 10);
  // Default next renewal 1 month out — admin tweaks as needed.
  const oneMonth = new Date();
  oneMonth.setMonth(oneMonth.getMonth() + 1);

  return (
    <OdooListPage title="ເພີ່ມສັນຍາ / Subscription">
      <>
      <div className="mb-3">
        <Link
          href="/manage/subscriptions"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Subscriptions
        </Link>
      </div>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-2xl">
        <SubForm
          mode="create"
          categories={categories}
          initial={{
            name: "",
            vendor: "",
            categoryId: "",
            amount: 0,
            currency: "LAK",
            billingCycle: "MONTHLY",
            startDate: today,
            nextRenewalDate: oneMonth.toISOString().slice(0, 10),
            autoRenew: true,
            notes: "",
          }}
        />
      </div>
      </>
    </OdooListPage>
  );
}
