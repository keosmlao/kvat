import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFeatures } from "@/lib/features";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  const features = await getFeatures();
  if (!features.pos) redirect("/invoices");

  const [products, customers, categories, setting] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);

  return (
    <PosClient
      products={products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        priceLak: p.priceLak,
        stock: p.stock,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        categoryName: p.category?.name ?? null,
      }))}
      customers={customers.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      defaultVatRate={setting?.vatRate ?? 0.1}
    />
  );
}
