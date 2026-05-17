import { prisma } from "@/lib/prisma";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";
import { getLocale } from "@/lib/i18n/server";

export default async function NewCustomerPage() {
  const [provinces, districts, villages, locale] = await Promise.all([
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
    getLocale(),
  ]);

  return (
    <CustomerForm
      action={createCustomer}
      locale={locale}
      provinces={provinces}
      districts={districts}
      villages={villages}
    />
  );
}
