import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ProfileForm } from "./profile-form";
import { getLocale } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const session = await requireUser();
  const [user, locale] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    getLocale(),
  ]);
  if (!user) notFound();

  return (
    <ProfileForm
      locale={locale}
      initial={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      }}
    />
  );
}
