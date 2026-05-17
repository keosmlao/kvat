"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recordActivity } from "@/lib/activity";
import { isLocale } from "@/lib/i18n/messages";

export type LocaleState =
  | { ok?: string; error?: string }
  | undefined;

export async function updateLocale(
  _prev: LocaleState,
  fd: FormData,
): Promise<LocaleState> {
  const session = await requireUser();
  const locale = String(fd.get("locale") ?? "");
  if (!isLocale(locale)) return { error: "Invalid locale" };

  let previous: string | undefined;
  try {
    const current = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { locale: true },
    });
    previous = current?.locale;
    if (previous === locale) return { ok: "ບໍ່ປ່ຽນ" };

    await prisma.user.update({
      where: { id: session.userId },
      data: { locale },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Error && /does not exist/i.test(e.message)) {
      return {
        error:
          "⚠ ຍັງບໍ່ໄດ້ migrate ຖານຂໍ້ມູນ — admin ຕ້ອງ run scripts/add-user-locale.ts ກ່ອນ",
      };
    }
    throw e;
  }

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "UPDATE",
    recordType: "User",
    recordId: session.userId,
    summary: `ປ່ຽນພາສາ: ${previous ?? "?"} → ${locale}`,
  });

  // Re-render every page so the new locale takes effect immediately.
  revalidatePath("/", "layout");
  return { ok: "ບັນທຶກແລ້ວ" };
}
