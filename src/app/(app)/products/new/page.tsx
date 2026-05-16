import { prisma } from "@/lib/prisma";
import { ProductForm } from "../product-form";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const [units, categories, types, warehouses] = await Promise.all([
    prisma.unit.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.productType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ProductForm
      action={createProduct}
      units={units.map((u) => ({ id: u.id, code: u.code, name: u.name }))}
      categories={categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      }))}
      types={types.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
      warehouses={warehouses.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
      }))}
    />
  );
}
