"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { masterPrisma } from "@/lib/master-prisma";
import { createSession, requireUser } from "@/lib/session";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1, "ຕ້ອງມີຊື່"),
  email: z.email("ຮູບແບບ email ບໍ່ຖືກຕ້ອງ"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export type ProfileState =
  | {
      error?: string;
      ok?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export async function updateProfile(
  _prev: ProfileState,
  fd: FormData,
): Promise<ProfileState> {
  const session = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "ກະລຸນາກວດຂໍ້ມູນ",
    };
  }

  const v = parsed.data;
  const newEmail = v.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, password: true },
  });
  if (!user) return { error: "ບໍ່ພົບບັນຊີ" };

  // Password change requires current-password verification.
  let newHashed: string | undefined;
  if (v.newPassword && v.newPassword.length > 0) {
    if (v.newPassword.length < 6) {
      return {
        fieldErrors: { newPassword: ["ລະຫັດໃໝ່ຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ"] },
        error: "ກະລຸນາກວດຂໍ້ມູນ",
      };
    }
    if (!v.currentPassword) {
      return {
        fieldErrors: { currentPassword: ["ຕ້ອງປ້ອນລະຫັດປະຈຸບັນ"] },
        error: "ກະລຸນາກວດຂໍ້ມູນ",
      };
    }
    const ok = await bcrypt.compare(v.currentPassword, user.password);
    if (!ok) {
      return {
        fieldErrors: { currentPassword: ["ລະຫັດປະຈຸບັນບໍ່ຖືກຕ້ອງ"] },
        error: "ກະລຸນາກວດຂໍ້ມູນ",
      };
    }
    newHashed = await bcrypt.hash(v.newPassword, 10);
  }

  if (user.email.toLowerCase() !== newEmail) {
    const taken = await masterPrisma.tenantUserEmail.findUnique({
      where: { email: newEmail },
    });
    if (taken) {
      return {
        fieldErrors: { email: ["Email ນີ້ມີຄົນໃຊ້ແລ້ວ"] },
        error: "ກະລຸນາກວດຂໍ້ມູນ",
      };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: v.name,
      email: newEmail,
      ...(newHashed ? { password: newHashed } : {}),
    },
    select: { id: true },
  });

  if (user.email.toLowerCase() !== newEmail) {
    await masterPrisma.tenantUserEmail.delete({
      where: { email: user.email.toLowerCase() },
    });
    await masterPrisma.tenantUserEmail.create({
      data: { email: newEmail, tenantId: session.tenantId },
    });
  }

  // Refresh the cookie so the top-bar shows the new name/email immediately.
  await createSession({ ...session, name: v.name, email: newEmail });

  const changes: string[] = [];
  if (user.name !== v.name) changes.push(`ຊື່: ${user.name} → ${v.name}`);
  if (user.email.toLowerCase() !== newEmail) {
    changes.push(`email: ${user.email} → ${newEmail}`);
  }
  if (newHashed) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "PASSWORD_CHANGE",
      recordType: "User",
      recordId: session.userId,
      summary: "ປ່ຽນລະຫັດຜ່ານຂອງຕົນເອງ",
    });
  }
  if (changes.length > 0) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "UPDATE",
      recordType: "User",
      recordId: session.userId,
      summary: `ແກ້ໄຂໂປຣໄຟລ໌ຂອງຕົນເອງ (${changes.join(", ")})`,
    });
  }

  return { ok: "ບັນທຶກແລ້ວ" };
}
