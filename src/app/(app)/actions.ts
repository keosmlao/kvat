"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/session";
import { recordActivity } from "@/lib/activity";

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "LOGOUT",
      summary: "ອອກຈາກລະບົບ",
    });
  }
  await destroySession();
  redirect("/login");
}
