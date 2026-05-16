"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

const customerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  provinceId: z.string().optional(),
  districtId: z.string().optional(),
  villageId: z.string().optional(),
});

function locationData(d: z.infer<typeof customerSchema>) {
  return {
    provinceId: d.provinceId || null,
    districtId: d.districtId || null,
    villageId: d.villageId || null,
  };
}

export type CustomerFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

async function readImage(
  fd: FormData,
  fieldName: string,
  existingUrl?: string | null,
): Promise<string | null> {
  const file = fd.get(fieldName) as File | null;
  const remove = fd.get(`${fieldName}Remove`) === "true";
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

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const imageUrl = await readImage(formData, "image", null);
    await prisma.customer.create({ data: { ...parsed.data, imageUrl, ...locationData(parsed.data) } });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "ບໍ່ສາມາດສ້າງລູກຄ້າໄດ້ (ລະຫັດອາດຊໍ້າ)",
    };
  }
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    const imageUrl = await readImage(formData, "image", existing?.imageUrl);
    await prisma.customer.update({
      where: { id },
      data: { ...parsed.data, imageUrl, ...locationData(parsed.data) },
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "ບໍ່ສາມາດແກ້ໄຂລູກຄ້າໄດ້",
    };
  }
  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomer(id: string) {
  await requireUser();
  try {
    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    await prisma.customer.delete({ where: { id } });
    if (existing?.imageUrl) await deleteUploadedImage(existing.imageUrl);
  } catch {
    /* foreign key prevents delete */
  }
  revalidatePath("/customers");
}
