import Link from "next/link";
import { masterPrisma } from "@/lib/master-prisma";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage() {
  // Only show tenants that don't already have a customer row.
  const linkedTenantIds = await masterPrisma.billingCustomer.findMany({
    where: { tenantId: { not: null } },
    select: { tenantId: true },
  });
  const linkedIds = new Set(
    linkedTenantIds.map((r) => r.tenantId).filter(Boolean) as string[],
  );
  const tenants = await masterPrisma.tenant.findMany({
    where: { isTemplate: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/manage/billing/customers"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Customers
        </Link>
      </div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-5">
        ເພີ່ມລູກຄ້າ
      </h1>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-2xl">
        <CustomerForm
          mode="create"
          tenants={tenants
            .filter((t) => !linkedIds.has(t.id))
            .map((t) => ({ id: t.id, label: `${t.name} (/t/${t.slug})` }))}
          initial={{
            name: "",
            type: "EXTERNAL",
            tenantId: "",
            taxId: "",
            phone: "",
            email: "",
            address: "",
            contactName: "",
            notes: "",
          }}
        />
      </div>
    </div>
  );
}
