"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { invalidateEtaxCredsCache } from "@/lib/etax";

export type EtaxConfigState = { error?: string; success?: string } | undefined;

const schema = z.object({
  gateway: z.string().url("Gateway URL ບໍ່ຖືກຕ້ອງ").or(z.literal("")),
  env: z.enum(["dev", "prod"]),
  username: z.string().max(120),
  secret: z.string().max(500),
});

export async function saveEtaxConfig(
  _prev: EtaxConfigState,
  formData: FormData,
): Promise<EtaxConfigState> {
  const mgmt = await requireManagement();
  const parsed = schema.safeParse({
    gateway: String(formData.get("gateway") ?? "").trim(),
    env: String(formData.get("env") ?? "dev"),
    username: String(formData.get("username") ?? "").trim(),
    secret: String(formData.get("secret") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const data = {
    ...parsed.data,
    updatedBy: mgmt.managementUserId,
  };
  await masterPrisma.etaxConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  // Force every cached read to fetch the fresh row.
  invalidateEtaxCredsCache();
  revalidatePath("/manage/etax-config");
  return { success: "✓ ບັນທຶກສຳເລັດ" };
}
