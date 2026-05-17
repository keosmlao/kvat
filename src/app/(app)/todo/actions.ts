"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { recordActivity } from "@/lib/activity";

const stageSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

const taskSchema = z.object({
  title: z.string().trim().min(1, "ຕ້ອງໃສ່ຫົວຂໍ້").max(200),
  description: z.string().trim().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(2).default(0),
});

function parseOptionalDate(value: string | undefined) {
  if (!value) return null;
  return new Date(`${value}T23:59:59`);
}

export async function createTodoTask(formData: FormData) {
  const session = await requireUser();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignedToId: String(formData.get("assignedToId") ?? "").trim(),
    dueDate: String(formData.get("dueDate") ?? "").trim(),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return;

  const task = await prisma.todoTask.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      assignedToId: parsed.data.assignedToId || session.userId,
      dueDate: parseOptionalDate(parsed.data.dueDate),
      priority: parsed.data.priority,
      createdById: session.userId,
    },
    select: { id: true, title: true },
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "CREATE",
    recordType: "TodoTask",
    recordId: task.id,
    summary: `ສ້າງ todo ${task.title}`,
  });

  revalidatePath("/todo");
}

export async function updateTodoTask(id: string, formData: FormData) {
  const session = await requireUser();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignedToId: String(formData.get("assignedToId") ?? "").trim(),
    dueDate: String(formData.get("dueDate") ?? "").trim(),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return;

  const task = await prisma.todoTask.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      assignedToId: parsed.data.assignedToId || null,
      dueDate: parseOptionalDate(parsed.data.dueDate),
      priority: parsed.data.priority,
    },
    select: { id: true, title: true },
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "UPDATE",
    recordType: "TodoTask",
    recordId: task.id,
    summary: `ແກ້ໄຂ todo ${task.title}`,
  });

  revalidatePath("/todo");
}

export async function moveTodoTask(id: string, formData: FormData) {
  const session = await requireUser();
  const parsed = stageSchema.safeParse(formData.get("stage"));
  if (!parsed.success) return;

  const task = await prisma.todoTask.update({
    where: { id },
    data: {
      stage: parsed.data,
      doneAt: parsed.data === "DONE" ? new Date() : null,
    },
    select: { id: true, title: true, stage: true },
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "UPDATE",
    recordType: "TodoTask",
    recordId: task.id,
    summary: `ຍ້າຍ todo ${task.title} → ${task.stage}`,
  });

  revalidatePath("/todo");
}

export async function deleteTodoTask(id: string) {
  const session = await requireUser();
  const task = await prisma.todoTask.delete({
    where: { id },
    select: { id: true, title: true },
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "DELETE",
    recordType: "TodoTask",
    recordId: task.id,
    summary: `ລົບ todo ${task.title}`,
  });

  revalidatePath("/todo");
}
