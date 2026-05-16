"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

const productSchema = z.object({
  code: z.string().min(1, "ຕ້ອງມີລະຫັດສິນຄ້າ"),
  name: z.string().min(1, "ຕ້ອງມີຊື່ສິນຄ້າ"),
  description: z.string().optional(),
  unit: z.string().min(1).default("ອັນ"),
  unitId: z.string().optional(),
  categoryId: z.string().optional(),
  typeId: z.string().optional(),
  warehouseId: z.string().optional(),
  costingMethod: z.enum(["STANDARD", "AVERAGE", "FIFO"]).default("STANDARD"),
  priceLak: z.coerce.number().min(0),
  costLak: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().default(0),
  minStock: z.coerce.number().default(0),
  active: z.coerce.boolean().default(true),
});

export type ProductFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

async function resolveProductData(data: z.infer<typeof productSchema>) {
  // If unitId is set, fetch its name and use as the snapshot 'unit' field
  let unit = data.unit;
  if (data.unitId) {
    const u = await prisma.unit.findUnique({ where: { id: data.unitId } });
    if (u) unit = u.name;
  }
  return {
    code: data.code,
    name: data.name,
    description: data.description,
    unit,
    unitId: data.unitId || null,
    categoryId: data.categoryId || null,
    typeId: data.typeId || null,
    warehouseId: data.warehouseId || null,
    costingMethod: data.costingMethod,
    priceLak: data.priceLak,
    costLak: data.costLak,
    stock: data.stock,
    minStock: data.minStock,
    active: data.active,
  };
}

async function readImageFromForm(
  formData: FormData,
  fieldName: string,
  existingUrl?: string | null,
): Promise<string | null> {
  const file = formData.get(fieldName) as File | null;
  const remove = formData.get(`${fieldName}Remove`) === "true";

  if (file && typeof file !== "string" && file.size > 0) {
    const newUrl = await saveUploadedImage(file);
    if (newUrl && existingUrl) await deleteUploadedImage(existingUrl);
    return newUrl;
  }
  if (remove) {
    if (existingUrl) await deleteUploadedImage(existingUrl);
    return null;
  }
  return existingUrl ?? null;
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireUser();
  const data = Object.fromEntries(formData);
  data.active = formData.get("active") === "on" ? "true" : "false";
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const imageUrl = await readImageFromForm(formData, "image", null);
    const resolved = await resolveProductData(parsed.data);
    await prisma.product.create({ data: { ...resolved, imageUrl } });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "ບໍ່ສາມາດສ້າງສິນຄ້າໄດ້ (ລະຫັດອາດຊໍ້າ)",
    };
  }
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireUser();
  const data = Object.fromEntries(formData);
  data.active = formData.get("active") === "on" ? "true" : "false";
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    const imageUrl = await readImageFromForm(
      formData,
      "image",
      existing?.imageUrl,
    );
    const resolved = await resolveProductData(parsed.data);
    await prisma.product.update({
      where: { id },
      data: { ...resolved, imageUrl },
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "ບໍ່ສາມາດແກ້ໄຂສິນຄ້າໄດ້",
    };
  }
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: string) {
  await requireUser();
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    await prisma.product.update({ where: { id }, data: { active: false } });
  }
  revalidatePath("/products");
}

export async function adjustStock(
  productId: string,
  quantity: number,
  type: "IN" | "OUT" | "ADJUST",
  note?: string,
) {
  await requireUser();
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;

  let newStock = product.stock;
  if (type === "IN") newStock += quantity;
  else if (type === "OUT") newStock -= quantity;
  else newStock = quantity;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: { productId, quantity, type, note },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    }),
  ]);
  revalidatePath("/products");
}
