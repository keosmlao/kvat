"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { nextCustomerCode } from "@/lib/billing-codes";
import { BillingCustomerType } from "@/generated/master/client";

export type CustState = { error?: string; success?: string } | undefined;

const schema = z.object({
  name: z.string().min(1, "ໃສ່ຊື່ລູກຄ້າ").max(200),
  type: z.enum(["TENANT", "EXTERNAL"]).default("EXTERNAL"),
  tenantId: z.string().optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email ບໍ່ຖືກຕ້ອງ").optional().or(z.literal("")),
  address: z.string().optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
});

export async function createCustomer(
  _prev: CustState,
  formData: FormData,
): Promise<CustState> {
  await requireManagement();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "EXTERNAL"),
    tenantId: String(formData.get("tenantId") ?? "").trim(),
    taxId: String(formData.get("taxId") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const code = await nextCustomerCode();
  try {
    const created = await masterPrisma.billingCustomer.create({
      data: {
        code,
        name: parsed.data.name,
        type: parsed.data.type as BillingCustomerType,
        tenantId: parsed.data.tenantId || null,
        taxId: parsed.data.taxId || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        contactName: parsed.data.contactName || null,
        notes: parsed.data.notes || null,
      },
    });
    revalidatePath("/manage/billing/customers");
    redirect(`/manage/billing/customers/${created.id}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { error: "tenant ນີ້ມີລູກຄ້າຢູ່ແລ້ວ" };
    }
    throw e;
  }
}

export async function updateCustomer(
  id: string,
  _prev: CustState,
  formData: FormData,
): Promise<CustState> {
  await requireManagement();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "EXTERNAL"),
    tenantId: String(formData.get("tenantId") ?? "").trim(),
    taxId: String(formData.get("taxId") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  await masterPrisma.billingCustomer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type as BillingCustomerType,
      tenantId: parsed.data.tenantId || null,
      taxId: parsed.data.taxId || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      contactName: parsed.data.contactName || null,
      notes: parsed.data.notes || null,
    },
  });
  revalidatePath("/manage/billing/customers");
  revalidatePath(`/manage/billing/customers/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function deleteCustomer(id: string): Promise<void> {
  await requireManagement();
  const cust = await masterPrisma.billingCustomer.findUnique({
    where: { id },
    include: { _count: { select: { invoices: true } } },
  });
  if (!cust) return;
  if (cust._count.invoices > 0) {
    throw new Error(`ມີ ${cust._count.invoices} ໃບເກັບເງິນ — ບໍ່ສາມາດລົບ`);
  }
  await masterPrisma.billingCustomer.delete({ where: { id } });
  revalidatePath("/manage/billing/customers");
  redirect("/manage/billing/customers");
}
