"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";
import { recordActivity } from "@/lib/activity";

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
  const session = await requireUser();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  let created: { id: string; code: string; name: string } | null = null;
  try {
    const imageUrl = await readImage(formData, "image", null);
    created = await prisma.customer.create({
      data: { ...parsed.data, imageUrl, ...locationData(parsed.data) },
      select: { id: true, code: true, name: true },
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "ບໍ່ສາມາດສ້າງລູກຄ້າໄດ້ (ລະຫັດອາດຊໍ້າ)",
    };
  }
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "CREATE",
    recordType: "Customer",
    recordId: created.id,
    summary: `ສ້າງລູກຄ້າ ${created.name} (${created.code})`,
  });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const session = await requireUser();
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
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "UPDATE",
    recordType: "Customer",
    recordId: id,
    summary: `ແກ້ໄຂລູກຄ້າ ${parsed.data.name} (${parsed.data.code})`,
  });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomer(id: string) {
  const session = await requireUser();
  let removed: { code: string; name: string } | null = null;
  try {
    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { code: true, name: true, imageUrl: true },
    });
    if (!existing) return;
    removed = { code: existing.code, name: existing.name };
    await prisma.customer.delete({ where: { id } });
    if (existing.imageUrl) await deleteUploadedImage(existing.imageUrl);
  } catch {
    /* foreign key prevents delete */
    return;
  }
  if (removed) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "DELETE",
      recordType: "Customer",
      recordId: id,
      summary: `ລົບລູກຄ້າ ${removed.name} (${removed.code})`,
    });
  }
  revalidatePath("/customers");
}
