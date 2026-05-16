"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { masterPrisma } from "@/lib/master-prisma";
import { TenantPlan } from "@/generated/master/client";

export type UpgradeState =
  | { error?: string; success?: string }
  | undefined;

const schema = z.object({
  plan: z.enum(["YEARLY", "LIFETIME"]),
  reason: z.string().max(500).optional(),
});

export async function requestUpgrade(
  _prev: UpgradeState,
  formData: FormData,
): Promise<UpgradeState> {
  const session = await requireUser();
  const parsed = schema.safeParse({
    plan: formData.get("plan"),
    reason: String(formData.get("reason") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: "ກະລຸນາເລືອກ plan" };

  // One pending request at a time per tenant. If there's already a PENDING
  // request, update it instead of creating a duplicate.
  const existing = await masterPrisma.approvalRequest.findFirst({
    where: { tenantId: session.tenantId, status: "PENDING" },
  });
  if (existing) {
    await masterPrisma.approvalRequest.update({
      where: { id: existing.id },
      data: {
        requestedPlan: parsed.data.plan as TenantPlan,
        reason: parsed.data.reason ?? null,
      },
    });
  } else {
    await masterPrisma.approvalRequest.create({
      data: {
        tenantId: session.tenantId,
        requestedPlan: parsed.data.plan as TenantPlan,
        reason: parsed.data.reason ?? null,
      },
    });
  }

  revalidatePath("/settings");
  return { success: "✓ ສົ່ງຄຳຂໍແລ້ວ — ທີມຈະຕິດຕໍ່ກັບໄປ" };
}
