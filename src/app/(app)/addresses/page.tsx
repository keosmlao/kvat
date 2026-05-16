import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { AddressClient } from "./address-client";

export default async function AddressesPage() {
  await requireAdmin();
  const [provinces, districts, villages] = await Promise.all([
    prisma.province.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { districts: true, customers: true } },
      },
    }),
    prisma.district.findMany({
      orderBy: { name: "asc" },
      include: {
        province: { select: { id: true, name: true } },
        _count: { select: { villages: true, customers: true } },
      },
    }),
    prisma.village.findMany({
      orderBy: { name: "asc" },
      include: {
        district: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
        _count: { select: { customers: true } },
      },
    }),
  ]);

  return (
    <AddressClient
      provinces={provinces.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        nameEn: p.nameEn ?? "",
        active: p.active,
        districtCount: p._count.districts,
        customerCount: p._count.customers,
      }))}
      districts={districts.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        nameEn: d.nameEn ?? "",
        provinceId: d.provinceId,
        provinceName: d.province.name,
        active: d.active,
        villageCount: d._count.villages,
        customerCount: d._count.customers,
      }))}
      villages={villages.map((v) => ({
        id: v.id,
        code: v.code ?? "",
        name: v.name,
        nameEn: v.nameEn ?? "",
        districtId: v.districtId,
        districtName: v.district.name,
        provinceId: v.district.province.id,
        provinceName: v.district.province.name,
        active: v.active,
        customerCount: v._count.customers,
      }))}
    />
  );
}
