import { prisma } from "@/lib/prisma";
import { ConfigClient } from "./config-client";

export default async function ProductConfigurationPage() {
  const [units, categories, types, warehouses] = await Promise.all([
    prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.productType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  return (
    <ConfigClient
      units={units.map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        active: u.active,
        productCount: u._count.products,
      }))}
      categories={categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description ?? "",
        active: c.active,
        productCount: c._count.products,
      }))}
      types={types.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        trackStock: t.trackStock,
        active: t.active,
        productCount: t._count.products,
      }))}
      warehouses={warehouses.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        address: w.address ?? "",
        active: w.active,
        productCount: w._count.products,
      }))}
    />
  );
}
