import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { CategoryManager } from "./manager";

export default async function CategoriesPage() {
  const categories = await masterPrisma.ledgerCategory.findMany({
    orderBy: [{ type: "asc" }, { archived: "asc" }, { name: "asc" }],
    include: { _count: { select: { entries: true } } },
  });

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
      <h1 className="text-[22px] font-medium text-gray-900 mb-1">
        ໝວດລາຍຮັບ/ລາຍຈ່າຍ
      </h1>
      <p className="text-[12px] text-gray-500 mb-5">
        ຈັດການລາຍຊື່ໝວດ — ໝວດທີ່ archive ຍັງສະແດງໃນລາຍການເກົ່າແຕ່ບໍ່ປະກົດຕອນສ້າງໃໝ່
      </p>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          archived: c.archived,
          entryCount: c._count.entries,
        }))}
      />
    </div>
  );
}
