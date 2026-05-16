"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";

export type AdminState =
  | { error?: string; success?: string }
  | undefined;

const createSchema = z.object({
  email: z.email("ຮູບແບບ email ບໍ່ຖືກຕ້ອງ"),
  name: z.string().min(1, "ຕ້ອງມີຊື່"),
  password: z.string().min(8, "≥ 8 ຕົວ"),
});

export async function createAdmin(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireManagement();
  const parsed = createSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "ກວດຂໍ້ມູນ" };

  const exists = await masterPrisma.managementUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) return { error: "Email ນີ້ມີຢູ່ແລ້ວ" };

  await masterPrisma.managementUser.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: await bcrypt.hash(parsed.data.password, 10),
    },
  });

  revalidatePath("/manage/admins");
  return { success: "✓ ສ້າງສຳເລັດ" };
}

export async function deleteAdmin(id: string): Promise<void> {
  const session = await requireManagement();
  if (session.managementUserId === id) {
    throw new Error("ບໍ່ສາມາດລົບບັນຊີຕົນເອງ");
  }
  // Don't allow deleting the last management user — system unusable otherwise.
  const total = await masterPrisma.managementUser.count();
  if (total <= 1) {
    throw new Error("ບໍ່ສາມາດລົບ — ຕ້ອງມີຢ່າງໜ້ອຍ 1 admin");
  }
  await masterPrisma.managementUser.delete({ where: { id } });
  revalidatePath("/manage/admins");
}
