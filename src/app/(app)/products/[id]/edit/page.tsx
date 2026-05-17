import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../../product-form";
import { updateProduct, type ProductFormState } from "../../actions";
import { Chatter } from "@/components/chatter";
import { getChatterData } from "@/lib/chatter";
import { getLocale } from "@/lib/i18n/server";

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [product, units, categories, types, warehouses, chatter, locale] =
    await Promise.all([
      prisma.product.findUnique({ where: { id } }),
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
      getChatterData("product", id),
      getLocale(),
    ]);
  if (!product) notFound();

  const action = async (prev: ProductFormState, fd: FormData) => {
    "use server";
    return updateProduct(id, prev, fd);
  };

  return (
    <ProductForm
      action={action}
      locale={locale}
      initial={product}
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
      chatter={
        <Chatter
          recordType="product"
          recordId={id}
          revalidate={`/products/${id}/edit`}
          messages={chatter.messages}
          activities={chatter.activities}
          followers={chatter.followers}
          users={chatter.users}
          isFollowing={chatter.isFollowing}
          currentUserId={chatter.currentUserId}
          locale={locale}
        />
      }
    />
  );
}
