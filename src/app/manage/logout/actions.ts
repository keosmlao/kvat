"use server";

import { redirect } from "next/navigation";
import { destroyManagementSession } from "@/lib/management-session";

export async function logoutAction() {
  await destroyManagementSession();
  redirect("/manage/login");
}
