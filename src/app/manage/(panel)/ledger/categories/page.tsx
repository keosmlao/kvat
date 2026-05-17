import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { CategoryManager } from "./manager";
import { OdooListPage } from "@/components/odoo/sheet";

export default async function CategoriesPage() {
  const categories = await masterPrisma.ledgerCategory.findMany({
    orderBy: [{ type: "asc" }, { archived: "asc" }, { name: "asc" }],
    include: { _count: { select: { entries: true } } },
  });

  return (
    <OdooListPage
      title="ໝວດລາຍຮັບ/ລາຍຈ່າຍ"
      subtitle="ຈັດການລາຍຊື່ໝວດ — ໝວດທີ່ archive ຍັງສະແດງໃນລາຍການເກົ່າແຕ່ບໍ່ປະກົດຕອນສ້າງໃໝ່"
    >
      <>
      <div className="mb-3">
        <Link
          href="/manage/ledger"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Ledger
        </Link>
      </div>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          archived: c.archived,
          entryCount: c._count.entries,
        }))}
      />
      </>
    </OdooListPage>
  );
}
