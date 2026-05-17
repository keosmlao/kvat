"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  generateInvoiceFromRecurring,
  nextRecurringCode,
} from "@/lib/recurring";

export type RecState = { error?: string; success?: string } | undefined;

const itemSchema = z.object({
  kind: z.enum(["product", "section", "note"]).default("product"),
  productId: z.string().optional(),
  label: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  priceLak: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(1).optional(),
});

const schema = z.object({
  name: z.string().min(1, "ໃສ່ຊື່").max(200),
  customerId: z.string().min(1, "ເລືອກລູກຄ້າ"),
  cycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.string().min(1),
  nextRunDate: z.string().min(1),
  endDate: z.string().optional(),
  currency: z.enum(["LAK", "USD", "THB"]),
  exchangeRate: z.coerce.number().min(0).default(1),
  vatMode: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT"]),
  vatRate: z.coerce.number().min(0).max(1),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  note: z.string().optional(),
  active: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

function parseItems(formData: FormData) {
  const raw = String(formData.get("items") ?? "[]");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => itemSchema.safeParse(r))
      .filter((p) => p.success)
      .map((p) => (p as { success: true; data: z.infer<typeof itemSchema> }).data);
  } catch {
    return [];
  }
}

async function fetchProductSnapshot(items: ReturnType<typeof parseItems>) {
  const productLines = items.filter((i) => i.kind === "product" && i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productLines.map((i) => i.productId!) } },
    select: { id: true, name: true, unit: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((it) => {
    if (it.kind !== "product") {
      return {
        lineType: it.kind === "section" ? "SECTION" : "NOTE",
        productId: null,
        productName: it.label?.trim() || (it.kind === "section" ? "Section" : "Note"),
        unit: "",
        quantity: 0,
        priceLak: 0,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
      };
    }
    if (!it.productId) throw new Error("Product not found");
    const p = byId.get(it.productId);
    if (!p) throw new Error("Product not found");
    return {
      lineType: "PRODUCT",
      productId: it.productId,
      productName: p.name,
      unit: p.unit,
      quantity: it.quantity,
      priceLak: it.priceLak,
      discount: it.discount,
      taxRate: it.taxRate ?? 0.1,
      taxAmount: 0,
    };
  });
}

export async function createRecurring(
  _prev: RecState,
  formData: FormData,
): Promise<RecState> {
  await requireUser();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    customerId: String(formData.get("customerId") ?? ""),
    cycle: String(formData.get("cycle") ?? "MONTHLY"),
    startDate: String(formData.get("startDate") ?? ""),
    nextRunDate: String(formData.get("nextRunDate") ?? ""),
    endDate: String(formData.get("endDate") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    exchangeRate: String(formData.get("exchangeRate") ?? "1"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    discount: String(formData.get("discount") ?? "0"),
    paymentMethod: String(formData.get("paymentMethod") ?? "CASH"),
    note: String(formData.get("note") ?? "").trim(),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  const itemsWithSnapshot = await fetchProductSnapshot(items);

  const code = await nextRecurringCode();
  const created = await prisma.recurringInvoice.create({
    data: {
      code,
      name: parsed.data.name,
      customerId: parsed.data.customerId,
      cycle: parsed.data.cycle,
      startDate: new Date(parsed.data.startDate),
      nextRunDate: new Date(parsed.data.nextRunDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      currency: parsed.data.currency,
      exchangeRate: parsed.data.exchangeRate,
      vatMode: parsed.data.vatMode,
      vatRate: parsed.data.vatRate,
      discount: parsed.data.discount,
      paymentMethod: parsed.data.paymentMethod,
      note: parsed.data.note || null,
      active: parsed.data.active,
      items: { create: itemsWithSnapshot },
    },
  });

  revalidatePath("/invoices/recurring");
  redirect(`/invoices/recurring/${created.id}`);
}

export async function updateRecurring(
  id: string,
  _prev: RecState,
  formData: FormData,
): Promise<RecState> {
  await requireUser();
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    customerId: String(formData.get("customerId") ?? ""),
    cycle: String(formData.get("cycle") ?? "MONTHLY"),
    startDate: String(formData.get("startDate") ?? ""),
    nextRunDate: String(formData.get("nextRunDate") ?? ""),
    endDate: String(formData.get("endDate") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    exchangeRate: String(formData.get("exchangeRate") ?? "1"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    discount: String(formData.get("discount") ?? "0"),
    paymentMethod: String(formData.get("paymentMethod") ?? "CASH"),
    note: String(formData.get("note") ?? "").trim(),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  const itemsWithSnapshot = await fetchProductSnapshot(items);

  await prisma.$transaction([
    prisma.recurringInvoiceItem.deleteMany({ where: { recurringId: id } }),
    prisma.recurringInvoice.update({
      where: { id },
      data: {
        name: parsed.data.name,
        customerId: parsed.data.customerId,
        cycle: parsed.data.cycle,
        startDate: new Date(parsed.data.startDate),
        nextRunDate: new Date(parsed.data.nextRunDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        currency: parsed.data.currency,
        exchangeRate: parsed.data.exchangeRate,
        vatMode: parsed.data.vatMode,
        vatRate: parsed.data.vatRate,
        discount: parsed.data.discount,
        paymentMethod: parsed.data.paymentMethod,
        note: parsed.data.note || null,
        active: parsed.data.active,
        items: { create: itemsWithSnapshot },
      },
    }),
  ]);

  revalidatePath("/invoices/recurring");
  revalidatePath(`/invoices/recurring/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

export async function toggleRecurringActive(id: string): Promise<void> {
  await requireUser();
  const cur = await prisma.recurringInvoice.findUnique({ where: { id } });
  if (!cur) return;
  await prisma.recurringInvoice.update({
    where: { id },
    data: { active: !cur.active },
  });
  revalidatePath("/invoices/recurring");
  revalidatePath(`/invoices/recurring/${id}`);
}

export async function deleteRecurring(id: string): Promise<void> {
  await requireUser();
  await prisma.recurringInvoice.delete({ where: { id } });
  revalidatePath("/invoices/recurring");
  redirect("/invoices/recurring");
}

export type RunResult =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; error: string };

export async function runRecurringNow(id: string): Promise<RunResult> {
  const session = await requireUser();
  return generateInvoiceFromRecurring(id, session.userId);
}

/**
 * Batch: generate invoices for every active template whose nextRunDate has
 * passed. Returns counts so the UI can show a summary toast.
 */
export async function runAllDueRecurring(): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const session = await requireUser();
  const due = await prisma.recurringInvoice.findMany({
    where: {
      active: true,
      nextRunDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    select: { id: true, code: true, name: true },
  });

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const t of due) {
    const r = await generateInvoiceFromRecurring(t.id, session.userId);
    if (r.ok) generated++;
    else {
      failed++;
      errors.push(`${t.code} ${t.name}: ${r.error}`);
    }
  }

  revalidatePath("/invoices");
  revalidatePath("/invoices/recurring");
  return { generated, failed, errors };
}
