"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { LedgerType } from "@/generated/master/client";

export type LedgerState = { error?: string; success?: string } | undefined;

// ───────────────────────── Categories ─────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, "ໃສ່ຊື່ປະເພດ").max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export async function createCategory(
  _prev: LedgerState,
  formData: FormData,
): Promise<LedgerState> {
  await requireManagement();
  const parsed = categorySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "EXPENSE"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  try {
    await masterPrisma.ledgerCategory.create({
      data: { name: parsed.data.name, type: parsed.data.type as LedgerType },
    });
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message.includes("Unique")
          ? "ປະເພດນີ້ມີຢູ່ແລ້ວ"
          : "ບໍ່ສຳເລັດ",
    };
  }
  revalidatePath("/manage/ledger/categories");
  return { success: "✓ ເພີ່ມສຳເລັດ" };
}

export async function toggleCategoryArchived(id: string): Promise<void> {
  await requireManagement();
  const cur = await masterPrisma.ledgerCategory.findUnique({ where: { id } });
  if (!cur) return;
  await masterPrisma.ledgerCategory.update({
    where: { id },
    data: { archived: !cur.archived },
  });
  revalidatePath("/manage/ledger/categories");
}

export async function renameCategory(
  id: string,
  _prev: LedgerState,
  formData: FormData,
): Promise<LedgerState> {
  await requireManagement();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length === 0) return { error: "ໃສ່ຊື່ໃໝ່" };
  try {
    await masterPrisma.ledgerCategory.update({ where: { id }, data: { name } });
  } catch {
    return { error: "ບໍ່ສຳເລັດ — ຊື່ອາດຊໍ້າກັບປະເພດອື່ນ" };
  }
  revalidatePath("/manage/ledger/categories");
  return { success: "✓ ບັນທຶກ" };
}

// ───────────────────────── Entries ─────────────────────────

const entrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().optional(),
  description: z.string().min(1, "ໃສ່ລາຍລະອຽດ").max(500),
  vendor: z.string().optional(),
  amount: z.coerce.number().min(0),
  currency: z.enum(["LAK", "USD", "THB"]).default("LAK"),
  date: z.string().min(1, "ໃສ່ວັນທີ"),
  paymentMethod: z.string().optional(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
});

export async function createEntry(
  _prev: LedgerState,
  formData: FormData,
): Promise<LedgerState> {
  const mgmt = await requireManagement();
  const parsed = entrySchema.safeParse({
    type: String(formData.get("type") ?? "EXPENSE"),
    categoryId: String(formData.get("categoryId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "LAK"),
    date: String(formData.get("date") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    paymentRef: String(formData.get("paymentRef") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  await masterPrisma.ledgerEntry.create({
    data: {
      type: parsed.data.type as LedgerType,
      categoryId: parsed.data.categoryId || null,
      description: parsed.data.description,
      vendor: parsed.data.vendor || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      date: new Date(parsed.data.date),
      paymentMethod: parsed.data.paymentMethod || null,
      paymentRef: parsed.data.paymentRef || null,
      notes: parsed.data.notes || null,
      createdBy: mgmt.managementUserId,
    },
  });
  revalidatePath("/manage/ledger");
  redirect("/manage/ledger");
}

export async function updateEntry(
  id: string,
  _prev: LedgerState,
  formData: FormData,
): Promise<LedgerState> {
  await requireManagement();
  const parsed = entrySchema.safeParse({
    type: String(formData.get("type") ?? "EXPENSE"),
    categoryId: String(formData.get("categoryId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "LAK"),
    date: String(formData.get("date") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    paymentRef: String(formData.get("paymentRef") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  await masterPrisma.ledgerEntry.update({
    where: { id },
    data: {
      type: parsed.data.type as LedgerType,
      categoryId: parsed.data.categoryId || null,
      description: parsed.data.description,
      vendor: parsed.data.vendor || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      date: new Date(parsed.data.date),
      paymentMethod: parsed.data.paymentMethod || null,
      paymentRef: parsed.data.paymentRef || null,
      notes: parsed.data.notes || null,
    },
  });
  revalidatePath("/manage/ledger");
  revalidatePath(`/manage/ledger/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function deleteEntry(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.ledgerEntry.delete({ where: { id } });
  revalidatePath("/manage/ledger");
  redirect("/manage/ledger");
}
