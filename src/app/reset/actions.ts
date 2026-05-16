"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { masterPrisma } from "@/lib/master-prisma";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export type ResetState =
  | { error?: string; success?: string }
  | undefined;

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8, "ລະຫັດຜ່ານ ≥ 8 ຕົວ"),
});

export async function performPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  const { token, password } = parsed.data;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await masterPrisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return { error: "ລິ້ງໝົດອາຍຸ ຫຼື ໃຊ້ແລ້ວ — ກະລຸນາຮ້ອງຂໍໃໝ່" };
  }
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: record.tenantId },
    select: { dbName: true },
  });
  if (!tenant) return { error: "ບໍ່ພົບ tenant" };

  const hashed = await bcrypt.hash(password, 10);
  const tenantDb = getTenantPrisma(tenant.dbName);
  // Update inside the tenant DB; if no User matches (rare race), bail safely.
  const updated = await tenantDb.user.updateMany({
    where: { email: record.email },
    data: { password: hashed },
  });
  if (updated.count === 0) {
    return { error: "ບໍ່ພົບບັນຊີ" };
  }

  // Mark the token used + invalidate every other pending token for this email
  // (defence in depth — one reset closes any prior leaked link).
  await masterPrisma.$transaction([
    masterPrisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    masterPrisma.passwordResetToken.deleteMany({
      where: {
        email: record.email,
        usedAt: null,
        id: { not: record.id },
      },
    }),
  ]);

  redirect("/login?reset=ok");
}
