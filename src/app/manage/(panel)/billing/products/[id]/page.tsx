import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { ProductForm } from "../product-form";
import { OdooListPage } from "@/components/odoo/sheet";
import { ManagementChatter } from "@/components/management-chatter";
import { getManagementChatterData } from "@/lib/management-chatter";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, chatter] = await Promise.all([
    masterPrisma.billingProduct.findUnique({
      where: { id },
    }),
    getManagementChatterData("BillingProduct", id),
  ]);
  if (!product) notFound();

  return (
    <OdooListPage title={product.name} subtitle={product.code}>
      <>
      <div className="mb-3">
        <Link
          href="/manage/billing/products"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Products
        </Link>
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
      <div className="mt-4 bg-white border border-gray-200 rounded overflow-hidden">
        <ManagementChatter
          recordType="BillingProduct"
          recordId={id}
          revalidate={`/manage/billing/products/${id}`}
          messages={chatter.messages}
          followers={chatter.followers}
          activities={chatter.activities}
          users={chatter.users}
          isFollowing={chatter.isFollowing}
          currentUserId={chatter.currentUserId}
        />
      </div>
      </>
    </OdooListPage>
  );
}
