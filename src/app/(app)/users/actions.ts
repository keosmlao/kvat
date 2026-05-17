"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { masterPrisma } from "@/lib/master-prisma";
import { recordActivity } from "@/lib/activity";

const createSchema = z.object({
  email: z.email("ຮູບແບບ email ບໍ່ຖືກຕ້ອງ"),
  name: z.string().min(1, "ຕ້ອງມີຊື່"),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().min(6, "ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ"),
});

const updateSchema = z.object({
  email: z.email("ຮູບແບບ email ບໍ່ຖືກຕ້ອງ"),
  name: z.string().min(1, "ຕ້ອງມີຊື່"),
  role: z.enum(["ADMIN", "STAFF"]),
  password: z.string().optional(),
});

export type UserFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function createUser(
  _prev: UserFormState,
  fd: FormData,
): Promise<UserFormState> {
  const session = await requireAdmin();
  const data = Object.fromEntries(fd);
  const parsed = createSchema.safeParse(data);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "ກະລຸນາກວດຂໍ້ມູນ",
    };
  }
  const v = parsed.data;
  const email = v.email.toLowerCase();

  // Email must be globally unique across tenants — otherwise login routing
  // is ambiguous. Block if mapping already exists anywhere.
  const taken = await masterPrisma.tenantUserEmail.findUnique({
    where: { email },
  });
  if (taken) return { error: "Email ນີ້ມີຢູ່ແລ້ວໃນລະບົບ" };

  const existsLocal = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existsLocal) return { error: "Email ນີ້ມີຢູ່ແລ້ວ" };

  const hashed = await bcrypt.hash(v.password, 10);
  const created = await prisma.user.create({
    data: { email, name: v.name, role: v.role, password: hashed },
    select: { id: true },
  });
  // Write the master mapping so this user can log in via /login.
  await masterPrisma.tenantUserEmail.create({
    data: { email, tenantId: session.tenantId },
  });
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "CREATE",
    recordType: "User",
    recordId: created.id,
    summary: `ສ້າງຜູ້ໃຊ້ ${v.name} (${email}) ${v.role === "ADMIN" ? "ຜູ້ດູແລ" : "ພະນັກງານ"}`,
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(
  id: string,
  _prev: UserFormState,
  fd: FormData,
): Promise<UserFormState> {
  const session = await requireAdmin();
  const data = Object.fromEntries(fd);
  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "ກະລຸນາກວດຂໍ້ມູນ",
    };
  }
  const v = parsed.data;
  const newEmail = v.email.toLowerCase();

  if (v.password && v.password.length > 0 && v.password.length < 6) {
    return {
      fieldErrors: { password: ["ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວ"] },
      error: "ກະລຸນາກວດຂໍ້ມູນ",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!existing) return { error: "ບໍ່ພົບຜູ້ໃຊ້" };

  // If email is being changed, ensure the new one isn't taken globally.
  if (existing.email.toLowerCase() !== newEmail) {
    const taken = await masterPrisma.tenantUserEmail.findUnique({
      where: { email: newEmail },
    });
    if (taken) return { error: "Email ໃໝ່ມີຄົນໃຊ້ແລ້ວ" };
  }

  const update: {
    email: string;
    name: string;
    role: "ADMIN" | "STAFF";
    password?: string;
  } = { email: newEmail, name: v.name, role: v.role };
  if (v.password) {
    update.password = await bcrypt.hash(v.password, 10);
  }

  await prisma.user.update({
    where: { id },
    data: update,
    select: { id: true },
  });

  // Rotate the master mapping if the email changed.
  if (existing.email.toLowerCase() !== newEmail) {
    await masterPrisma.tenantUserEmail.delete({
      where: { email: existing.email.toLowerCase() },
    });
    await masterPrisma.tenantUserEmail.create({
      data: { email: newEmail, tenantId: session.tenantId },
    });
  }

  const changes: string[] = [];
  if (existing.name !== v.name) changes.push(`ຊື່: ${existing.name} → ${v.name}`);
  if (existing.email.toLowerCase() !== newEmail) {
    changes.push(`email: ${existing.email} → ${newEmail}`);
  }
  if (existing.role !== v.role) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "ROLE_CHANGE",
      recordType: "User",
      recordId: id,
      summary: `ປ່ຽນບົດບາດ ${existing.name}: ${existing.role} → ${v.role}`,
      meta: { from: existing.role, to: v.role },
    });
  }
  if (v.password) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "PASSWORD_CHANGE",
      recordType: "User",
      recordId: id,
      summary: `ປ່ຽນລະຫັດຜ່ານໃຫ້ ${existing.name}`,
    });
  }
  if (changes.length > 0) {
    void recordActivity({
      dbName: session.dbName,
      userId: session.userId,
      action: "UPDATE",
      recordType: "User",
      recordId: id,
      summary: `ແກ້ໄຂຜູ້ໃຊ້ ${existing.name} (${changes.join(", ")})`,
    });
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();
  if (session.userId === id) {
    throw new Error("ບໍ່ສາມາດລົບບັນຊີຕົນເອງ");
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true, name: true },
  });
  if (!target) return;
  const invoices = await prisma.invoice.count({ where: { userId: id } });
  if (invoices > 0) {
    throw new Error("ບໍ່ສາມາດລົບ — ຜູ້ໃຊ້ນີ້ມີບິນທີ່ອອກແລ້ວ");
  }
  await prisma.user.delete({ where: { id } });
  await masterPrisma.tenantUserEmail
    .delete({ where: { email: target.email.toLowerCase() } })
    .catch(() => {});
  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "DELETE",
    recordType: "User",
    recordId: id,
    summary: `ລົບຜູ້ໃຊ້ ${target.name} (${target.email})`,
  });
}
