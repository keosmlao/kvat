"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import {
  SubscriptionStatus,
  LedgerType,
} from "@/generated/master/client";
import { advanceByCycle, type BillingCycle } from "@/lib/ledger";

export type SubState = { error?: string; success?: string } | undefined;

const subSchema = z.object({
  name: z.string().min(1, "ໃສ່ຊື່").max(120),
  vendor: z.string().min(1, "ໃສ່ vendor").max(120),
  categoryId: z.string().optional(),
  amount: z.coerce.number().min(0),
  currency: z.enum(["LAK", "USD", "THB"]).default("LAK"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.string().min(1, "ໃສ່ວັນເລີ່ມ"),
  nextRenewalDate: z.string().min(1, "ໃສ່ວັນຕໍ່ໃໝ່ຄັ້ງຕໍ່ໄປ"),
  autoRenew: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  notes: z.string().optional(),
});

export async function createSubscription(
  _prev: SubState,
  formData: FormData,
): Promise<SubState> {
  await requireManagement();
  const parsed = subSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "LAK"),
    billingCycle: String(formData.get("billingCycle") ?? "MONTHLY"),
    startDate: String(formData.get("startDate") ?? ""),
    nextRenewalDate: String(formData.get("nextRenewalDate") ?? ""),
    autoRenew: formData.get("autoRenew"),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const created = await masterPrisma.subscription.create({
    data: {
      name: parsed.data.name,
      vendor: parsed.data.vendor,
      categoryId: parsed.data.categoryId || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      billingCycle: parsed.data.billingCycle,
      startDate: new Date(parsed.data.startDate),
      nextRenewalDate: new Date(parsed.data.nextRenewalDate),
      autoRenew: parsed.data.autoRenew,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/manage/subscriptions");
  redirect(`/manage/subscriptions/${created.id}`);
}

export async function updateSubscription(
  id: string,
  _prev: SubState,
  formData: FormData,
): Promise<SubState> {
  await requireManagement();
  const parsed = subSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "LAK"),
    billingCycle: String(formData.get("billingCycle") ?? "MONTHLY"),
    startDate: String(formData.get("startDate") ?? ""),
    nextRenewalDate: String(formData.get("nextRenewalDate") ?? ""),
    autoRenew: formData.get("autoRenew"),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  await masterPrisma.subscription.update({
    where: { id },
    data: {
      name: parsed.data.name,
      vendor: parsed.data.vendor,
      categoryId: parsed.data.categoryId || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      billingCycle: parsed.data.billingCycle,
      startDate: new Date(parsed.data.startDate),
      nextRenewalDate: new Date(parsed.data.nextRenewalDate),
      autoRenew: parsed.data.autoRenew,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/manage/subscriptions");
  revalidatePath(`/manage/subscriptions/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function cancelSubscription(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.subscription.update({
    where: { id },
    data: { status: SubscriptionStatus.CANCELLED, autoRenew: false },
  });
  revalidatePath("/manage/subscriptions");
  revalidatePath(`/manage/subscriptions/${id}`);
}

export async function reactivateSubscription(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.subscription.update({
    where: { id },
    data: { status: SubscriptionStatus.ACTIVE },
  });
  revalidatePath("/manage/subscriptions");
  revalidatePath(`/manage/subscriptions/${id}`);
}

export async function deleteSubscription(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.subscription.delete({ where: { id } });
  revalidatePath("/manage/subscriptions");
  redirect("/manage/subscriptions");
}

const paymentSchema = z.object({
  paidAt: z.string().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  paymentRef: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
});

/**
 * Record a payment for a subscription:
 *  1. Create a LedgerEntry (type=EXPENSE) linked back to the subscription
 *  2. Roll subscription.nextRenewalDate forward by one billing cycle
 * Both run in a transaction so the renewal date never advances without a
 * matching ledger row (or vice versa).
 */
export async function recordSubscriptionPayment(
  id: string,
  _prev: SubState,
  formData: FormData,
): Promise<SubState> {
  const mgmt = await requireManagement();
  const parsed = paymentSchema.safeParse({
    paidAt: String(formData.get("paidAt") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "CASH"),
    paymentRef: String(formData.get("paymentRef") ?? "").trim(),
    amount: String(formData.get("amount") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const sub = await masterPrisma.subscription.findUnique({ where: { id } });
  if (!sub) return { error: "ບໍ່ພົບ subscription" };

  const amount =
    parsed.data.amount !== undefined && parsed.data.amount > 0
      ? parsed.data.amount
      : sub.amount;
  const paidAt = new Date(parsed.data.paidAt);

  await masterPrisma.$transaction([
    masterPrisma.ledgerEntry.create({
      data: {
        type: LedgerType.EXPENSE,
        categoryId: sub.categoryId,
        description: `${sub.name} (${sub.vendor})`,
        vendor: sub.vendor,
        amount,
        currency: sub.currency,
        date: paidAt,
        paymentMethod: parsed.data.paymentMethod,
        paymentRef: parsed.data.paymentRef || null,
        subscriptionId: sub.id,
        createdBy: mgmt.managementUserId,
      },
    }),
    masterPrisma.subscription.update({
      where: { id },
      data: {
        nextRenewalDate: advanceByCycle(
          sub.nextRenewalDate,
          sub.billingCycle as BillingCycle,
        ),
      },
    }),
  ]);

  revalidatePath("/manage/subscriptions");
  revalidatePath(`/manage/subscriptions/${id}`);
  revalidatePath("/manage/ledger");
  return { success: "✓ ບັນທຶກການຈ່າຍ + ກຳນົດຕໍ່ໃໝ່ໃໝ່ແລ້ວ" };
}
