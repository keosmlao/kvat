import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await masterPrisma.billingProduct.findUnique({
    where: { id },
  });
  if (!product) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/manage/billing/products"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Products
        </Link>
      </div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-1">
        {product.name}
      </h1>
      <div className="text-[12px] text-gray-500 mb-5 font-mono">
        {product.code}
      </div>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-2xl">
        <ProductForm
          mode="edit"
          id={product.id}
          initial={{
            name: product.name,
            kind: product.kind,
            description: product.description ?? "",
            unit: product.unit,
            priceLak: product.priceLak,
            active: product.active,
          }}
        />
      </div>
    </div>
  );
}
