"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";

export type ManagementChatterState =
  | { error?: string; success?: boolean }
  | undefined;

const messageSchema = z.object({
  body: z.string().min(1),
  kind: z.enum(["COMMENT", "NOTE"]),
  recordType: z.string().min(1),
  recordId: z.string().min(1),
  revalidate: z.string().optional(),
});

export async function postManagementMessage(
  _prev: ManagementChatterState,
  fd: FormData,
): Promise<ManagementChatterState> {
  const session = await requireManagement();
  const parsed = messageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ຄວາມບໍ່ຖືກຕ້ອງ" };
  const v = parsed.data;

  await masterPrisma.managementMessage.create({
    data: {
      body: v.body,
      kind: v.kind,
      recordType: v.recordType,
      recordId: v.recordId,
      authorId: session.managementUserId,
    },
  });

  await masterPrisma.managementFollower.upsert({
    where: {
      userId_recordType_recordId: {
        userId: session.managementUserId,
        recordType: v.recordType,
        recordId: v.recordId,
      },
    },
    create: {
      userId: session.managementUserId,
      recordType: v.recordType,
      recordId: v.recordId,
    },
    update: {},
  });

  if (v.revalidate) revalidatePath(v.revalidate);
  return { success: true };
}

export async function toggleManagementFollow(
  recordType: string,
  recordId: string,
  revalidate?: string,
) {
  const session = await requireManagement();
  const existing = await masterPrisma.managementFollower.findUnique({
    where: {
      userId_recordType_recordId: {
        userId: session.managementUserId,
        recordType,
        recordId,
      },
    },
  });
  if (existing) {
    await masterPrisma.managementFollower.delete({ where: { id: existing.id } });
  } else {
    await masterPrisma.managementFollower.create({
      data: {
        userId: session.managementUserId,
        recordType,
        recordId,
      },
    });
  }
  if (revalidate) revalidatePath(revalidate);
}

const activitySchema = z.object({
  summary: z.string().min(1, "ຕ້ອງມີຫົວຂໍ້"),
  note: z.string().optional(),
  dueDate: z.string().min(1, "ຕ້ອງມີວັນທີ"),
  assignedToId: z.string().min(1, "ຕ້ອງເລືອກຜູ້ຮັບຜິດຊອບ"),
  recordType: z.string().min(1),
  recordId: z.string().min(1),
  revalidate: z.string().optional(),
});

export async function createManagementActivity(
  _prev: ManagementChatterState,
  fd: FormData,
): Promise<ManagementChatterState> {
  const session = await requireManagement();
  const parsed = activitySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  const v = parsed.data;

  await masterPrisma.managementActivity.create({
    data: {
      summary: v.summary,
      note: v.note || null,
      dueDate: new Date(v.dueDate),
      assignedToId: v.assignedToId,
      createdById: session.managementUserId,
      recordType: v.recordType,
      recordId: v.recordId,
    },
  });

  if (v.revalidate) revalidatePath(v.revalidate);
  return { success: true };
}

export async function toggleManagementActivityDone(
  id: string,
  done: boolean,
  revalidate?: string,
) {
  await requireManagement();
  await masterPrisma.managementActivity.update({
    where: { id },
    data: { done, doneAt: done ? new Date() : null },
  });
  if (revalidate) revalidatePath(revalidate);
}

export async function deleteManagementActivity(id: string, revalidate?: string) {
  await requireManagement();
  await masterPrisma.managementActivity.delete({ where: { id } });
  if (revalidate) revalidatePath(revalidate);
}

export async function getManagementChatterData(
  recordType: string,
  recordId: string,
) {
  const session = await requireManagement();
  const [messages, followers, activities, users] = await Promise.all([
    masterPrisma.managementMessage.findMany({
      where: { recordType, recordId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    masterPrisma.managementFollower.findMany({
      where: { recordType, recordId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    masterPrisma.managementActivity.findMany({
      where: { recordType, recordId },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    masterPrisma.managementUser.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return {
    messages,
    followers,
    activities,
    users,
    isFollowing: followers.some((f) => f.userId === session.managementUserId),
    currentUserId: session.managementUserId,
  };
}
