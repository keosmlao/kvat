"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { TenantPlan, TenantStatus } from "@/generated/master/client";

export type ActionState = { error?: string; success?: string } | undefined;

const approveSchema = z.object({
  plan: z.enum(["YEARLY", "LIFETIME"]),
});

export async function approveTenant(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const mgmt = await requireManagement();
  const parsed = approveSchema.safeParse({ plan: formData.get("plan") });
  if (!parsed.success) return { error: "ກະລຸນາເລືອກ plan" };
  const plan = parsed.data.plan;

  const now = new Date();
  const paidUntil =
    plan === "LIFETIME"
      ? null
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  try {
    await masterPrisma.tenant.update({
      where: { id },
      data: {
        plan: plan as TenantPlan,
        status: TenantStatus.ACTIVE,
        approvedAt: now,
        approvedBy: mgmt.managementUserId,
        paidUntil,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ບໍ່ສຳເລັດ" };
  }

  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
  return { success: "✓ Approve ສຳເລັດ" };
}

export async function suspendTenant(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.tenant.update({
    where: { id },
    data: { status: TenantStatus.SUSPENDED },
  });
  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
}

export async function reactivateTenant(id: string): Promise<void> {
  await requireManagement();
  // Reactivate: TRIAL if not yet approved, ACTIVE if previously approved.
  const t = await masterPrisma.tenant.findUnique({
    where: { id },
    select: { approvedAt: true, trialEndsAt: true },
  });
  if (!t) return;
  const status =
    t.approvedAt !== null ? TenantStatus.ACTIVE : TenantStatus.TRIAL;
  await masterPrisma.tenant.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
}

export async function cancelTenant(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.tenant.update({
    where: { id },
    data: { status: TenantStatus.CANCELLED },
  });
  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
}

// Destructive: drops the tenant's physical DB and removes the master row.
// Template tenants (kvat) are protected — the operator must demote first.
export async function deleteTenantHard(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireManagement();
  const tenant = await masterPrisma.tenant.findUnique({ where: { id } });
  if (!tenant) return { ok: false, error: "ບໍ່ພົບ tenant" };
  if (tenant.isTemplate) {
    return { ok: false, error: "template tenant ປ້ອງກັນບໍ່ໃຫ້ລົບ" };
  }
  const { dropTenantDatabase } = await import("@/lib/provision");
  try {
    await dropTenantDatabase(tenant.dbName);
  } catch (e) {
    return { ok: false, error: `drop DB ບໍ່ໄດ້: ${errMsg(e)}` };
  }
  await masterPrisma.tenant.delete({ where: { id } });
  revalidatePath("/manage/tenants");
  return { ok: true };
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

const notesSchema = z.object({ notes: z.string().max(2000) });

export async function updateNotes(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireManagement();
  const parsed = notesSchema.safeParse({
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) return { error: "Notes ຍາວເກີນໄປ" };
  await masterPrisma.tenant.update({
    where: { id },
    data: { notes: parsed.data.notes || null },
  });
  revalidatePath(`/manage/tenants/${id}`);
  return { success: "✓ ບັນທຶກແລ້ວ" };
}
