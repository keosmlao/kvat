"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession } from "@/lib/session";
import { masterPrisma } from "@/lib/master-prisma";
import { headers } from "next/headers";

export type LoginState = {
  error?: string;
} | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "ກະລຸນາປ້ອນ email ແລະ ລະຫັດຜ່ານ" };
  }

  const result = await authenticate(email, password);
  if (!result.ok) {
    const msg =
      result.reason === "suspended"
        ? "ບັນຊີຖືກໂມດສຫຼືຖືກຍົກເລີກ — ຕິດຕໍ່ admin"
        : "Email ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ";
    return { error: msg };
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
  void masterPrisma.loginLog
    .create({
      data: {
        tenantId: result.tenant.id,
        userEmail: result.user.email,
        ipAddress:
          h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          h.get("x-real-ip") ??
          null,
        userAgent: h.get("user-agent") ?? null,
      },
    })
    .catch(() => {});

  redirect("/dashboard");
}
