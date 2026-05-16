"use server";

import { redirect } from "next/navigation";
import {
  authenticateManagement,
  createManagementSession,
} from "@/lib/management-session";

export type LoginState = { error?: string } | undefined;

export async function managementLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "ກະລຸນາປ້ອນ email ແລະ ລະຫັດຜ່ານ" };
  }
  const user = await authenticateManagement(email, password);
  if (!user) {
    return { error: "Email ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" };
  }
  await createManagementSession({
    managementUserId: user.id,
    email: user.email,
    name: user.name,
  });
  redirect("/manage/tenants");
}
