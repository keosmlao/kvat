"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession } from "@/lib/session";
import { masterPrisma } from "@/lib/master-prisma";
import { recordActivity } from "@/lib/activity";
import { headers } from "next/headers";

export type LoginState = {
  error?: string;
  // Echo the email back on failure so the user doesn't have to retype it.
  // Password is never echoed.
  email?: string;
} | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "ກະລຸນາປ້ອນ email ແລະ ລະຫັດຜ່ານ", email };
  }

  const result = await authenticate(email, password);
  if (!result.ok) {
    const msg =
      result.reason === "suspended"
        ? "ບັນຊີຖືກໂມດສຫຼືຖືກຍົກເລີກ — ຕິດຕໍ່ admin"
        : "Email ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ";
    return { error: msg, email };
  }

  await createSession({
    userId: result.user.id,
    role: result.user.role,
    name: result.user.name,
    email: result.user.email,
    tenantId: result.tenant.id,
    slug: result.tenant.slug,
    dbName: result.tenant.dbName,
  });

  // Fire-and-forget login log. Don't block redirect on it.
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent") ?? null;
  void masterPrisma.loginLog
    .create({
      data: {
        tenantId: result.tenant.id,
        userEmail: result.user.email,
        ipAddress: ip,
        userAgent,
      },
    })
    .catch(() => {});
  void recordActivity({
    dbName: result.tenant.dbName,
    userId: result.user.id,
    action: "LOGIN",
    summary: `ເຂົ້າສູ່ລະບົບ`,
    meta: { ip, userAgent },
  });

  redirect("/dashboard");
}
