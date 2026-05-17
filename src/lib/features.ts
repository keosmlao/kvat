import "server-only";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export type Features = {
  pos: boolean;
  creditNotes: boolean;
  chatter: boolean;
  reports: boolean;
  dashboard: boolean;
  todo: boolean;
};

export async function getFeatures(): Promise<Features> {
  let setting;
  try {
    setting = await prisma.setting.findUnique({
      where: { id: "default" },
      select: {
        enablePos: true,
        enableCreditNotes: true,
        enableChatter: true,
        enableReports: true,
        enableDashboard: true,
        enableTodo: true,
      },
    });
  } catch (e) {
    // Session references a tenant DB that no longer exists (switched master
    // DBs in dev, tenant hard-deleted, etc.). Cookie writes aren't allowed
    // from Server Components, so just redirect — /api/auth/clear handles the
    // cookie wipe in a Route Handler context.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P1003") {
      redirect("/api/auth/clear?returnTo=/login");
    }
    throw e;
  }
  return {
    pos: setting?.enablePos ?? false,
    creditNotes: setting?.enableCreditNotes ?? true,
    chatter: setting?.enableChatter ?? true,
    reports: setting?.enableReports ?? true,
    dashboard: setting?.enableDashboard ?? true,
    todo: setting?.enableTodo ?? true,
  };
}
