"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const unitSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  active: z.coerce.boolean().default(true),
});

const categorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

const typeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  trackStock: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true),
});

const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

export type ConfigState =
  | { error?: string; success?: boolean }
  | undefined;

// ──────────── Units ────────────
export async function createUnit(_prev: ConfigState, fd: FormData): Promise<ConfigState> {
  await requireUser();
  const parsed = unitSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.unit.create({ data: parsed.data });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/products/configuration");
  return { success: true };
}

export async function updateUnit(id: string, fd: FormData) {
  await requireUser();
  const parsed = unitSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.unit.update({ where: { id }, data: parsed.data });
  revalidatePath("/products/configuration");
}

export async function deleteUnit(id: string) {
  await requireUser();
  const count = await prisma.product.count({ where: { unitId: id } });
  if (count > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${count} ສິນຄ້າໃຊ້ໜ່ວຍນີ້`);
  await prisma.unit.delete({ where: { id } });
  revalidatePath("/products/configuration");
}

// ──────────── Categories ────────────
export async function createCategory(_prev: ConfigState, fd: FormData): Promise<ConfigState> {
  await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.category.create({
      data: { ...parsed.data, description: parsed.data.description || null },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/products/configuration");
  return { success: true };
}

export async function updateCategory(id: string, fd: FormData) {
  await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.category.update({
    where: { id },
    data: { ...parsed.data, description: parsed.data.description || null },
  });
  revalidatePath("/products/configuration");
}

export async function deleteCategory(id: string) {
  await requireUser();
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${count} ສິນຄ້າຢູ່ໝວດນີ້`);
  await prisma.category.delete({ where: { id } });
  revalidatePath("/products/configuration");
}

// ──────────── Product Types ────────────
export async function createType(_prev: ConfigState, fd: FormData): Promise<ConfigState> {
  await requireUser();
  const parsed = typeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.productType.create({ data: parsed.data });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/products/configuration");
  return { success: true };
}

export async function updateType(id: string, fd: FormData) {
  await requireUser();
  const parsed = typeSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.productType.update({ where: { id }, data: parsed.data });
  revalidatePath("/products/configuration");
}

export async function deleteType(id: string) {
  await requireUser();
  const count = await prisma.product.count({ where: { typeId: id } });
  if (count > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${count} ສິນຄ້າເປັນປະເພດນີ້`);
  await prisma.productType.delete({ where: { id } });
  revalidatePath("/products/configuration");
}

// ──────────── Warehouses ────────────
export async function createWarehouse(_prev: ConfigState, fd: FormData): Promise<ConfigState> {
  await requireUser();
  const parsed = warehouseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.warehouse.create({
      data: { ...parsed.data, address: parsed.data.address || null },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/products/configuration");
  return { success: true };
}

export async function updateWarehouse(id: string, fd: FormData) {
  await requireUser();
  const parsed = warehouseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.warehouse.update({
    where: { id },
    data: { ...parsed.data, address: parsed.data.address || null },
  });
  revalidatePath("/products/configuration");
}

export async function deleteWarehouse(id: string) {
  await requireUser();
  const count = await prisma.product.count({ where: { warehouseId: id } });
  if (count > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${count} ສິນຄ້າຢູ່ສາງນີ້`);
  await prisma.warehouse.delete({ where: { id } });
  revalidatePath("/products/configuration");
}
