import { prisma } from "@/lib/prisma";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const [provinces, districts, villages] = await Promise.all([
    prisma.province.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.district.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, provinceId: true },
    }),
    prisma.village.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, districtId: true },
    }),
  ]);

  return (
    <CustomerForm
      action={createCustomer}
      provinces={provinces}
      districts={districts}
      villages={villages}
    />
  );
}
