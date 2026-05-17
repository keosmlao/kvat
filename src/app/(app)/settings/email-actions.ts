"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import {
  sendTestEmail,
  sendInvoiceEmail,
  sendQuotationEmail,
} from "@/lib/email";

export type EmailState = { error?: string; success?: string } | undefined;

const smtpSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromName: z.string().optional(),
  smtpFromEmail: z
    .string()
    .email("From Email ບໍ່ຖືກຕ້ອງ")
    .optional()
    .or(z.literal("")),
  smtpSecure: z.preprocess(
    (v) => v === "on" || v === "true",
    z.boolean(),
  ),
});

export async function saveSmtpConfig(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  await requireAdmin();
  const parsed = smtpSchema.safeParse({
    smtpHost: String(formData.get("smtpHost") ?? "").trim(),
    smtpPort: String(formData.get("smtpPort") ?? "587"),
    smtpUser: String(formData.get("smtpUser") ?? "").trim(),
    smtpPassword: String(formData.get("smtpPassword") ?? ""),
    smtpFromName: String(formData.get("smtpFromName") ?? "").trim(),
    smtpFromEmail: String(formData.get("smtpFromEmail") ?? "").trim(),
    smtpSecure: formData.get("smtpSecure"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  // Preserve old password when user leaves the field empty (we never show it).
  const updates: Record<string, unknown> = {
    smtpHost: parsed.data.smtpHost || null,
    smtpPort: parsed.data.smtpPort ?? null,
    smtpUser: parsed.data.smtpUser || null,
    smtpFromName: parsed.data.smtpFromName || null,
    smtpFromEmail: parsed.data.smtpFromEmail || null,
    smtpSecure: parsed.data.smtpSecure,
  };
  if (parsed.data.smtpPassword) {
    updates.smtpPassword = parsed.data.smtpPassword;
  }

  await prisma.setting.update({
    where: { id: "default" },
    data: updates,
  });
  revalidatePath("/settings");
  return { success: "✓ ບັນທຶກ SMTP ສຳເລັດ" };
}

export async function testSmtp(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const session = await requireAdmin();
  const to = String(formData.get("to") ?? "").trim();
  if (!to) return { error: "ໃສ່ email ປາຍທາງ" };
  const r = await sendTestEmail(to, session.userId);
  if (!r.ok) return { error: r.error };
  return { success: `✓ ສົ່ງ test email ໄປ ${to} ສຳເລັດ` };
}

export type SendInvoiceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendInvoiceByEmail(
  invoiceId: string,
  reminder = false,
): Promise<SendInvoiceResult> {
  const session = await requireUser();
  const r = await sendInvoiceEmail(invoiceId, {
    reminder,
    userId: session.userId,
  });
  return r;
}

export async function sendQuotationByEmail(
  quotationId: string,
): Promise<SendInvoiceResult> {
  const session = await requireUser();
  return sendQuotationEmail(quotationId, { userId: session.userId });
}
