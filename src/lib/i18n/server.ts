import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { type Locale, isLocale } from "./messages";

/**
 * Resolve the current user's preferred locale from the tenant DB. Defaults
 * to "lo" when not signed in or column missing. Safe to call in any server
 * component — never throws.
 */
export async function getLocale(): Promise<Locale> {
  try {
    const session = await getSession();
    if (!session) return "lo";
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { locale: true },
    });
    return user && isLocale(user.locale) ? user.locale : "lo";
  } catch {
    return "lo";
  }
}
