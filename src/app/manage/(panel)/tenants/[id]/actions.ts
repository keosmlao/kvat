"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { masterPrisma } from "@/lib/master-prisma";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireManagement } from "@/lib/management-session";
import { TenantPlan, TenantStatus } from "@/generated/master/client";
import { nextBillingInvoiceNumber, planProduct } from "@/lib/billing";
import { ensureCustomerForTenant } from "@/lib/billing-codes";
import { recordAudit } from "@/lib/audit";

export type ActionState = { error?: string; success?: string } | undefined;

const approveSchema = z.object({
  plan: z.enum(["YEARLY", "LIFETIME"]),
  // Optional explicit product override. When empty, falls back to whichever
  // product admin pinned for this plan in BillingConfig.
  productId: z.string().optional(),
});

export async function approveTenant(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const mgmt = await requireManagement();
  const parsed = approveSchema.safeParse({
    plan: formData.get("plan"),
    productId: String(formData.get("productId") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: "ກະລຸນາເລືອກ plan" };
  const plan = parsed.data.plan;
  const overrideProductId = parsed.data.productId;

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

  // Auto-issue a BillingInvoice. Use the explicitly chosen product when the
  // admin overrode it on the form; otherwise fall back to the BillingConfig
  // default for this plan. No product → skip (admin can issue manually).
  const product = overrideProductId
    ? await (async () => {
        const p = await masterPrisma.billingProduct.findUnique({
          where: { id: overrideProductId },
        });
        return p
          ? {
              id: p.id,
              code: p.code,
              name: p.name,
              unit: p.unit,
              priceLak: p.priceLak,
            }
          : null;
      })()
    : await planProduct(plan);
  if (product && product.priceLak > 0) {
    try {
      const customer = await ensureCustomerForTenant(id);
      const number = await nextBillingInvoiceNumber();
      const vatMode = "EXCLUSIVE";
      const vatRate = 0.1;
      const subtotal = product.priceLak;
      const vatAmount = Math.round(product.priceLak * vatRate * 100) / 100;
      const grandTotal = subtotal + vatAmount;
      await masterPrisma.billingInvoice.create({
        data: {
          number,
          customerId: customer.id,
          description: product.name,
          subtotal,
          discount: 0,
          vatMode,
          vatRate,
          vatAmount,
          amount: grandTotal,
          currency: "LAK",
          createdBy: mgmt.managementUserId,
          items: {
            create: [
              {
                sn: 1,
                productId: product.id,
                description: product.name,
                unit: product.unit,
                quantity: 1,
                unitPrice: product.priceLak,
                discount: 0,
                taxRate: vatRate,
                taxAmount: vatAmount,
                total: product.priceLak,
              },
            ],
          },
        },
      });
      revalidatePath("/manage/billing");
    } catch {
      // Non-blocking — approval already succeeded. Operator can issue invoice manually.
    }
  }

  const tenantRow = await masterPrisma.tenant.findUnique({
    where: { id },
    select: { name: true },
  });
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "tenant.approve",
    entityType: "Tenant",
    entityId: id,
    entityLabel: tenantRow?.name ?? id,
    metadata: { plan, overrideProductId: overrideProductId ?? null },
  });

  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
  return { success: "✓ Approve ສຳເລັດ" };
}

export async function suspendTenant(id: string): Promise<void> {
  const mgmt = await requireManagement();
  const t = await masterPrisma.tenant.update({
    where: { id },
    data: { status: TenantStatus.SUSPENDED },
    select: { name: true },
  });
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "tenant.suspend",
    entityType: "Tenant",
    entityId: id,
    entityLabel: t.name,
  });
  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
}

export async function reactivateTenant(id: string): Promise<void> {
  const mgmt = await requireManagement();
  // Reactivate: TRIAL if not yet approved, ACTIVE if previously approved.
  const t = await masterPrisma.tenant.findUnique({
    where: { id },
    select: { approvedAt: true, trialEndsAt: true, name: true },
  });
  if (!t) return;
  const status =
    t.approvedAt !== null ? TenantStatus.ACTIVE : TenantStatus.TRIAL;
  await masterPrisma.tenant.update({
    where: { id },
    data: { status },
  });
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "tenant.reactivate",
    entityType: "Tenant",
    entityId: id,
    entityLabel: t.name,
    metadata: { newStatus: status },
  });
  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
}

export async function cancelTenant(id: string): Promise<void> {
  const mgmt = await requireManagement();
  const t = await masterPrisma.tenant.update({
    where: { id },
    data: { status: TenantStatus.CANCELLED },
    select: { name: true },
  });
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "tenant.cancel",
    entityType: "Tenant",
    entityId: id,
    entityLabel: t.name,
  });
  revalidatePath("/manage/tenants");
  revalidatePath(`/manage/tenants/${id}`);
}

// Destructive: drops the tenant's physical DB and removes the master row.
// Template tenants (kvat) are protected — the operator must demote first.
export async function deleteTenantHard(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const mgmt = await requireManagement();
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
  await recordAudit({
    actorId: mgmt.managementUserId,
    actorEmail: mgmt.email,
    action: "tenant.delete",
    entityType: "Tenant",
    entityId: id,
    entityLabel: tenant.name,
    metadata: { dbName: tenant.dbName },
  });
  revalidatePath("/manage/tenants");
  return { ok: true };
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

const resetPasswordSchema = z.object({
  email: z.string().email("ອີເມວບໍ່ຖືກຕ້ອງ"),
  password: z.string().min(8, "ລະຫັດຜ່ານ ≥ 8 ຕົວ"),
});

export async function resetTenantUserPassword(
  tenantId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireManagement();
  const parsed = resetPasswordSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { dbName: true },
  });
  if (!tenant) return { error: "ບໍ່ພົບ tenant" };

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const tenantDb = getTenantPrisma(tenant.dbName);
  const updated = await tenantDb.user.updateMany({
    where: { email: parsed.data.email },
    data: { password: hashed },
  });
  if (updated.count === 0) {
    return { error: "ບໍ່ພົບບັນຊີ user ນີ້ໃນ tenant" };
  }

  // Invalidate any pending self-service reset tokens for this email — admin
  // override should close prior outstanding links.
  await masterPrisma.passwordResetToken.deleteMany({
    where: { email: parsed.data.email, usedAt: null },
  });

  return { success: `✓ ປ່ຽນລະຫັດໃຫ້ ${parsed.data.email} ສຳເລັດ` };
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
