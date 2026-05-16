"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

// `z.coerce.boolean()` is unsafe with form data — Boolean("false") === true.
// This helper accepts only the strings "true"/"on"/"1" as truthy.
const boolish = z
  .preprocess(
    (v) => v === true || v === "true" || v === "on" || v === "1",
    z.boolean(),
  )
  .default(false);

const settingSchema = z.object({
  shopName: z.string().min(1, "ຕ້ອງມີຊື່ຮ້ານ"),
  shopNameEn: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("ຮູບແບບ email ບໍ່ຖືກຕ້ອງ")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().optional(), // legacy hidden input — actual upload handled separately
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountName: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseDate: z.string().optional(),
  vatRate: z.coerce.number().min(0).max(1),
  defaultCurrency: z.enum(["LAK", "USD", "THB"]),
  invoicePrefix: z.string().min(1, "ຕ້ອງມີ prefix ເລກບິນ"),
  enablePos: boolish,
  enableCreditNotes: boolish,
  enableChatter: boolish,
  enableReports: boolish,
  enableDashboard: boolish,
  etaxAutoSubmit: boolish,
});

export type SettingFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

export async function saveSettings(
  _prev: SettingFormState,
  formData: FormData,
): Promise<SettingFormState> {
  await requireAdmin();

  const data = Object.fromEntries(formData);
  const parsed = settingSchema.safeParse(data);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "ກະລຸນາກວດຂໍ້ມູນ",
    };
  }

  const v = parsed.data;
  try {
    const existing = await prisma.setting.findUnique({
      where: { id: "default" },
      select: { logoUrl: true },
    });

    // Handle logo upload
    let logoUrl: string | null = existing?.logoUrl ?? null;
    const file = formData.get("logo") as File | null;
    const remove = formData.get("logoRemove") === "true";
    if (file && typeof file !== "string" && file.size > 0) {
      logoUrl = await saveUploadedImage(file);
      if (existing?.logoUrl) await deleteUploadedImage(existing.logoUrl);
    } else if (remove) {
      if (existing?.logoUrl) await deleteUploadedImage(existing.logoUrl);
      logoUrl = null;
    }

    await prisma.setting.upsert({
      where: { id: "default" },
      update: {
        shopName: v.shopName,
        shopNameEn: v.shopNameEn || null,
        taxId: v.taxId || null,
        address: v.address || null,
        phone: v.phone || null,
        email: v.email || null,
        logoUrl,
        bankName: v.bankName || null,
        bankAccount: v.bankAccount || null,
        bankAccountName: v.bankAccountName || null,
        licenseNumber: v.licenseNumber || null,
        licenseDate: v.licenseDate || null,
        vatRate: v.vatRate,
        defaultCurrency: v.defaultCurrency,
        invoicePrefix: v.invoicePrefix,
        enablePos: v.enablePos,
        enableCreditNotes: v.enableCreditNotes,
        enableChatter: v.enableChatter,
        enableReports: v.enableReports,
        enableDashboard: v.enableDashboard,
        etaxAutoSubmit: v.etaxAutoSubmit,
      },
      create: {
        id: "default",
        shopName: v.shopName,
        shopNameEn: v.shopNameEn || null,
        taxId: v.taxId || null,
        address: v.address || null,
        phone: v.phone || null,
        email: v.email || null,
        logoUrl,
        bankName: v.bankName || null,
        bankAccount: v.bankAccount || null,
        bankAccountName: v.bankAccountName || null,
        licenseNumber: v.licenseNumber || null,
        licenseDate: v.licenseDate || null,
        vatRate: v.vatRate,
        defaultCurrency: v.defaultCurrency,
        invoicePrefix: v.invoicePrefix,
        enablePos: v.enablePos,
        enableCreditNotes: v.enableCreditNotes,
        enableChatter: v.enableChatter,
        enableReports: v.enableReports,
        enableDashboard: v.enableDashboard,
        etaxAutoSubmit: v.etaxAutoSubmit,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ" };
  }

  // Revalidate the root layout so topbar (which reads features) refreshes too
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { success: true };
}
