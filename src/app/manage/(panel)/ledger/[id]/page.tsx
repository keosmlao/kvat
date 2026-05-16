import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { EntryForm } from "../entry-form";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entry, categories] = await Promise.all([
    masterPrisma.ledgerEntry.findUnique({ where: { id } }),
    masterPrisma.ledgerCategory.findMany({
      where: { archived: false },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
  ]);
  if (!entry) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/manage/ledger"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Ledger
        </Link>
      </div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-5">
        ແກ້ໄຂລາຍການ
      </h1>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-2xl">
        <EntryForm
          mode="edit"
          id={entry.id}
          categories={categories}
          initial={{
            type: entry.type,
            categoryId: entry.categoryId ?? "",
            description: entry.description,
            vendor: entry.vendor ?? "",
            amount: entry.amount,
            currency: entry.currency,
            date: entry.date.toISOString().slice(0, 10),
            paymentMethod: entry.paymentMethod ?? "",
            paymentRef: entry.paymentRef ?? "",
            notes: entry.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
