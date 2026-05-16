"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { nextProductCode } from "@/lib/billing-codes";

export type ProdState = { error?: string; success?: string } | undefined;

const schema = z.object({
  name: z.string().min(1, "ໃສ່ຊື່").max(200),
  kind: z.enum(["PRODUCT", "SERVICE"]),
  description: z.string().optional(),
  unit: z.string().min(1).max(40),
  priceLak: z.coerce.number().min(0),
  active: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export async function createProduct(
  _prev: ProdState,
  formData: FormData,
): Promise<ProdState> {
  await requireManagement();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "SERVICE"),
    description: String(formData.get("description") ?? "").trim(),
    unit: String(formData.get("unit") ?? "ໜ່ວຍ").trim(),
    priceLak: String(formData.get("priceLak") ?? "0"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  const code = await nextProductCode();
  const created = await masterPrisma.billingProduct.create({
    data: {
      code,
      name: parsed.data.name,
      kind: parsed.data.kind,
      description: parsed.data.description || null,
      unit: parsed.data.unit,
      priceLak: parsed.data.priceLak,
      active: parsed.data.active,
    },
  });
  revalidatePath("/manage/billing/products");
  redirect(`/manage/billing/products/${created.id}`);
}

export async function updateProduct(
  id: string,
  _prev: ProdState,
  formData: FormData,
): Promise<ProdState> {
  await requireManagement();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? "SERVICE"),
    description: String(formData.get("description") ?? "").trim(),
    unit: String(formData.get("unit") ?? "ໜ່ວຍ").trim(),
    priceLak: String(formData.get("priceLak") ?? "0"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  await masterPrisma.billingProduct.update({
    where: { id },
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      description: parsed.data.description || null,
      unit: parsed.data.unit,
      priceLak: parsed.data.priceLak,
      active: parsed.data.active,
    },
  });
  revalidatePath("/manage/billing/products");
  revalidatePath(`/manage/billing/products/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function deleteProduct(id: string): Promise<void> {
  await requireManagement();
  // Items remain (productId becomes null via SetNull). Safe even when used.
  await masterPrisma.billingProduct.delete({ where: { id } });
  revalidatePath("/manage/billing/products");
  redirect("/manage/billing/products");
}
