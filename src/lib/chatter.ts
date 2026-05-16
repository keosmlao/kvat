"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type RecordRef = { recordType: string; recordId: string };

const messageSchema = z.object({
  body: z.string().min(1, "ຂໍ້ຄວາມບໍ່ສາມາດຫວ່າງເປົ່າ"),
  kind: z.enum(["COMMENT", "NOTE"]),
  recordType: z.string().min(1),
  recordId: z.string().min(1),
  revalidate: z.string().optional(),
});

export type ChatterState =
  | { error?: string; success?: boolean }
  | undefined;

export async function postMessage(
  _prev: ChatterState,
  fd: FormData,
): Promise<ChatterState> {
  const session = await requireUser();
  const parsed = messageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  const v = parsed.data;

  await prisma.message.create({
    data: {
      body: v.body,
      kind: v.kind,
      recordType: v.recordType,
      recordId: v.recordId,
      authorId: session.userId,
    },
  });

  // Auto-follow when commenting
  await prisma.follower.upsert({
    where: {
      userId_recordType_recordId: {
        userId: session.userId,
        recordType: v.recordType,
        recordId: v.recordId,
      },
    },
    create: {
      userId: session.userId,
      recordType: v.recordType,
      recordId: v.recordId,
    },
    update: {},
  });

  if (v.revalidate) revalidatePath(v.revalidate);
  return { success: true };
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

export async function createActivity(
  _prev: ChatterState,
  fd: FormData,
): Promise<ChatterState> {
  const session = await requireUser();
  const parsed = activitySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }
  const v = parsed.data;

  await prisma.activity.create({
    data: {
      summary: v.summary,
      note: v.note || null,
      dueDate: new Date(v.dueDate),
      assignedToId: v.assignedToId,
      createdById: session.userId,
      recordType: v.recordType,
      recordId: v.recordId,
    },
  });

  if (v.revalidate) revalidatePath(v.revalidate);
  return { success: true };
}

export async function toggleActivityDone(
  id: string,
  done: boolean,
  revalidate?: string,
) {
  await requireUser();
  await prisma.activity.update({
    where: { id },
    data: { done, doneAt: done ? new Date() : null },
  });
  if (revalidate) revalidatePath(revalidate);
}

export async function deleteActivity(id: string, revalidate?: string) {
  await requireUser();
  await prisma.activity.delete({ where: { id } });
  if (revalidate) revalidatePath(revalidate);
}

export async function toggleFollow(
  recordType: string,
  recordId: string,
  revalidate?: string,
) {
  const session = await requireUser();
  const existing = await prisma.follower.findUnique({
    where: {
      userId_recordType_recordId: {
        userId: session.userId,
        recordType,
        recordId,
      },
    },
  });
  if (existing) {
    await prisma.follower.delete({ where: { id: existing.id } });
  } else {
    await prisma.follower.create({
      data: { userId: session.userId, recordType, recordId },
    });
  }
  if (revalidate) revalidatePath(revalidate);
}

export async function getChatterData(recordType: string, recordId: string) {
  const session = await requireUser();
  const [messages, activities, followers, users] = await Promise.all([
    prisma.message.findMany({
      where: { recordType, recordId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    prisma.activity.findMany({
      where: { recordType, recordId },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.follower.findMany({
      where: { recordType, recordId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const isFollowing = followers.some((f) => f.userId === session.userId);

  return { messages, activities, followers, users, isFollowing, currentUserId: session.userId };
}
