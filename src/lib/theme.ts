import "server-only";
import { prisma } from "./prisma";
import { getSession } from "./session";

export type Theme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Resolve the current user's preferred theme from the tenant DB. Defaults to
 * "light" when not signed in or the column is missing. Never throws.
 */
export async function getTheme(): Promise<Theme> {
  try {
    const session = await getSession();
    if (!session) return "light";
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { theme: true },
    });
    return user && isTheme(user.theme) ? user.theme : "light";
  } catch {
    return "light";
  }
}
