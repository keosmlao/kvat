"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const provinceSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

const districtSchema = provinceSchema.extend({
  provinceId: z.string().min(1),
});

const villageSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  districtId: z.string().min(1),
  active: z.coerce.boolean().default(true),
});

export type AddrState = { error?: string; success?: boolean } | undefined;

// Province
export async function createProvince(_p: AddrState, fd: FormData): Promise<AddrState> {
  await requireAdmin();
  const parsed = provinceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.province.create({
      data: { ...parsed.data, nameEn: parsed.data.nameEn || null },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/addresses");
  return { success: true };
}
export async function updateProvince(id: string, fd: FormData) {
  await requireAdmin();
  const parsed = provinceSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.province.update({
    where: { id },
    data: { ...parsed.data, nameEn: parsed.data.nameEn || null },
  });
  revalidatePath("/addresses");
}
export async function deleteProvince(id: string) {
  await requireAdmin();
  const c = await prisma.customer.count({ where: { provinceId: id } });
  if (c > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${c} ລູກຄ້າຢູ່ແຂວງນີ້`);
  const d = await prisma.district.count({ where: { provinceId: id } });
  if (d > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${d} ເມືອງຢູ່ແຂວງນີ້`);
  await prisma.province.delete({ where: { id } });
  revalidatePath("/addresses");
}

// District
export async function createDistrict(_p: AddrState, fd: FormData): Promise<AddrState> {
  await requireAdmin();
  const parsed = districtSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.district.create({
      data: { ...parsed.data, nameEn: parsed.data.nameEn || null },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/addresses");
  return { success: true };
}
export async function updateDistrict(id: string, fd: FormData) {
  await requireAdmin();
  const parsed = districtSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.district.update({
    where: { id },
    data: { ...parsed.data, nameEn: parsed.data.nameEn || null },
  });
  revalidatePath("/addresses");
}
export async function deleteDistrict(id: string) {
  await requireAdmin();
  const c = await prisma.customer.count({ where: { districtId: id } });
  if (c > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${c} ລູກຄ້າຢູ່ເມືອງນີ້`);
  const v = await prisma.village.count({ where: { districtId: id } });
  if (v > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${v} ບ້ານຢູ່ເມືອງນີ້`);
  await prisma.district.delete({ where: { id } });
  revalidatePath("/addresses");
}

// Village
export async function createVillage(_p: AddrState, fd: FormData): Promise<AddrState> {
  await requireAdmin();
  const parsed = villageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  try {
    await prisma.village.create({
      data: {
        ...parsed.data,
        code: parsed.data.code || null,
        nameEn: parsed.data.nameEn || null,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
  revalidatePath("/addresses");
  return { success: true };
}
export async function updateVillage(id: string, fd: FormData) {
  await requireAdmin();
  const parsed = villageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error("ຂໍ້ມູນບໍ່ຖືກຕ້ອງ");
  await prisma.village.update({
    where: { id },
    data: {
      ...parsed.data,
      code: parsed.data.code || null,
      nameEn: parsed.data.nameEn || null,
    },
  });
  revalidatePath("/addresses");
}
export async function deleteVillage(id: string) {
  await requireAdmin();
  const c = await prisma.customer.count({ where: { villageId: id } });
  if (c > 0) throw new Error(`ບໍ່ສາມາດລົບ — ມີ ${c} ລູກຄ້າຢູ່ບ້ານນີ້`);
  await prisma.village.delete({ where: { id } });
  revalidatePath("/addresses");
}
