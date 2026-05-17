import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { EntryForm } from "../entry-form";
import { OdooListPage } from "@/components/odoo/sheet";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const defaultType =
    sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : "EXPENSE";

  const categories = await masterPrisma.ledgerCategory.findMany({
    where: { archived: false },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });

  return (
    <OdooListPage title={`ເພີ່ມ${defaultType === "INCOME" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"}`}>
      <>
      <div className="mb-3">
        <Link
          href="/manage/ledger"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Ledger
        </Link>
      </div>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-2xl">
        <EntryForm
          mode="create"
          categories={categories}
          initial={{
            type: defaultType,
            categoryId: "",
            description: "",
            vendor: "",
            amount: 0,
            currency: "LAK",
            date: new Date().toISOString().slice(0, 10),
            paymentMethod: "CASH",
            paymentRef: "",
            notes: "",
          }}
        />
      </div>
      </>
    </OdooListPage>
  );
}
