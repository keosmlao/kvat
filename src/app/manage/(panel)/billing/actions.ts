"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { nextBillingInvoiceNumber } from "@/lib/billing";
import { BillingStatus } from "@/generated/master/client";

export type BillingState = { error?: string; success?: string } | undefined;

// ───────────────────────── Item math ─────────────────────────

const itemInputSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().max(40).optional(),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
});

type ItemInput = z.infer<typeof itemInputSchema>;

type Totals = {
  items: (ItemInput & { total: number; sn: number })[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  amount: number;
};

function computeTotals(args: {
  items: ItemInput[];
  vatMode: "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
  vatRate: number;
  invoiceDiscount: number;
}): Totals {
  const items = args.items.map((it, i) => {
    const lineDiscount = it.discount ?? 0;
    const total = Math.max(0, it.quantity * it.unitPrice - lineDiscount);
    return {
      ...it,
      discount: lineDiscount,
      unit: it.unit ?? "ໜ່ວຍ",
      sn: i + 1,
      total,
    };
  });

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const afterDiscount = Math.max(0, subtotal - args.invoiceDiscount);

  let vatAmount = 0;
  let grandTotal = afterDiscount;
  if (args.vatMode === "EXEMPT") {
    vatAmount = 0;
    grandTotal = afterDiscount;
  } else if (args.vatMode === "EXCLUSIVE") {
    vatAmount = Math.round(afterDiscount * args.vatRate * 100) / 100;
    grandTotal = afterDiscount + vatAmount;
  } else {
    vatAmount =
      Math.round((afterDiscount * args.vatRate / (1 + args.vatRate)) * 100) /
      100;
    grandTotal = afterDiscount;
  }

  return {
    items,
    subtotal,
    discount: args.invoiceDiscount,
    vatAmount,
    amount: grandTotal,
  };
}

/**
 * FormData carries items as a single JSON-encoded "items" field, matching
 * the tenant invoice form pattern. Drops rows where description is empty.
 */
function parseItems(formData: FormData): ItemInput[] {
  const raw = String(formData.get("items") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: ItemInput[] = [];
  for (const r of parsed) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const description = String(o.description ?? "").trim();
    if (!description) continue;
    out.push({
      productId:
        typeof o.productId === "string" && o.productId.trim()
          ? o.productId.trim()
          : undefined,
      description,
      unit: String(o.unit ?? "ໜ່ວຍ").trim() || "ໜ່ວຍ",
      quantity: Number(o.quantity ?? 1) || 0,
      unitPrice: Number(o.unitPrice ?? 0) || 0,
      discount: Number(o.discount ?? 0) || 0,
    });
  }
  return out;
}

// ───────────────────────── Invoice CRUD ─────────────────────────

const invoiceSchema = z.object({
  customerId: z.string().min(1, "ເລືອກລູກຄ້າ"),
  description: z.string().min(1, "ໃສ່ຫົວເລື່ອງ").max(500),
  currency: z.enum(["LAK", "USD", "THB"]),
  vatMode: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT"]),
  vatRate: z.coerce.number().min(0).max(1),
  invoiceDiscount: z.coerce.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createBillingInvoice(
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  const mgmt = await requireManagement();
  const parsed = invoiceSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    invoiceDiscount: String(formData.get("invoiceDiscount") ?? "0"),
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };
  for (const it of items) {
    if (!itemInputSchema.safeParse(it).success) {
      return { error: "ຂໍ້ມູນລາຍການບໍ່ຖືກຕ້ອງ" };
    }
  }

  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    invoiceDiscount: parsed.data.invoiceDiscount,
  });

  const number = await nextBillingInvoiceNumber();
  const created = await masterPrisma.billingInvoice.create({
    data: {
      number,
      customerId: parsed.data.customerId,
      description: parsed.data.description,
      currency: parsed.data.currency,
      vatMode: parsed.data.vatMode,
      vatRate: parsed.data.vatRate,
      subtotal: totals.subtotal,
      discount: totals.discount,
      vatAmount: totals.vatAmount,
      amount: totals.amount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes || null,
      createdBy: mgmt.managementUserId,
      items: {
        create: totals.items.map((it) => ({
          sn: it.sn,
          productId: it.productId ?? null,
          description: it.description,
          unit: it.unit ?? "ໜ່ວຍ",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount ?? 0,
          total: it.total,
        })),
      },
    },
  });

  revalidatePath("/manage/billing");
  redirect(`/manage/billing/${created.id}`);
}

export async function updateBillingInvoice(
  id: string,
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  await requireManagement();
  const parsed = invoiceSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    currency: String(formData.get("currency") ?? "LAK"),
    vatMode: String(formData.get("vatMode") ?? "EXCLUSIVE"),
    vatRate: String(formData.get("vatRate") ?? "0.1"),
    invoiceDiscount: String(formData.get("invoiceDiscount") ?? "0"),
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const items = parseItems(formData);
  if (items.length === 0) return { error: "ຕ້ອງມີລາຍການຢ່າງໜ້ອຍ 1 ແຖວ" };

  const totals = computeTotals({
    items,
    vatMode: parsed.data.vatMode,
    vatRate: parsed.data.vatRate,
    invoiceDiscount: parsed.data.invoiceDiscount,
  });

  // Replace items wholesale — simpler than reconciling diffs.
  await masterPrisma.$transaction([
    masterPrisma.billingInvoiceItem.deleteMany({ where: { invoiceId: id } }),
    masterPrisma.billingInvoice.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        description: parsed.data.description,
        currency: parsed.data.currency,
        vatMode: parsed.data.vatMode,
        vatRate: parsed.data.vatRate,
        subtotal: totals.subtotal,
        discount: totals.discount,
        vatAmount: totals.vatAmount,
        amount: totals.amount,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        notes: parsed.data.notes || null,
        items: {
          create: totals.items.map((it) => ({
            sn: it.sn,
            productId: it.productId ?? null,
            description: it.description,
            unit: it.unit ?? "ໜ່ວຍ",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount ?? 0,
            total: it.total,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/manage/billing");
  revalidatePath(`/manage/billing/${id}`);
  return { success: "✓ ບັນທຶກ" };
}

// ───────────────────────── Status actions ─────────────────────────

const markPaidSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  paymentRef: z.string().optional(),
  paidAt: z.string().optional(),
});

export async function markBillingPaid(
  id: string,
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  await requireManagement();
  const parsed = markPaidSchema.safeParse({
    paymentMethod: String(formData.get("paymentMethod") ?? "CASH"),
    paymentRef: String(formData.get("paymentRef") ?? "").trim(),
    paidAt: String(formData.get("paidAt") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  await masterPrisma.billingInvoice.update({
    where: { id },
    data: {
      status: BillingStatus.PAID,
      paymentMethod: parsed.data.paymentMethod,
      paymentRef: parsed.data.paymentRef || null,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
    },
  });

  revalidatePath("/manage/billing");
  revalidatePath(`/manage/billing/${id}`);
  return { success: "✓ ບັນທຶກການຈ່າຍແລ້ວ" };
}

export async function cancelBillingInvoice(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.billingInvoice.update({
    where: { id },
    data: { status: BillingStatus.CANCELLED },
  });
  revalidatePath("/manage/billing");
  revalidatePath(`/manage/billing/${id}`);
}

export async function deleteBillingInvoice(id: string): Promise<void> {
  await requireManagement();
  await masterPrisma.billingInvoice.delete({ where: { id } });
  revalidatePath("/manage/billing");
  redirect("/manage/billing");
}

// ───────────────────────── BillingConfig (unchanged) ─────────────────────────

const configSchema = z.object({
  invoicePrefix: z.string().min(1).max(20),
  yearlyProductId: z.string().optional(),
  lifetimeProductId: z.string().optional(),
  sellerName: z.string().min(1).max(200),
  sellerNameEn: z.string().optional(),
  sellerTaxId: z.string().optional(),
  sellerAddress: z.string().optional(),
  sellerPhone: z.string().optional(),
  sellerBankAccount: z.string().optional(),
  sellerBankName: z.string().optional(),
  sellerBankAccountName: z.string().optional(),
});

export async function saveBillingConfig(
  _prev: BillingState,
  formData: FormData,
): Promise<BillingState> {
  await requireManagement();
  const parsed = configSchema.safeParse({
    invoicePrefix: String(formData.get("invoicePrefix") ?? "BIL-").trim(),
    yearlyProductId: String(formData.get("yearlyProductId") ?? "").trim(),
    lifetimeProductId: String(formData.get("lifetimeProductId") ?? "").trim(),
    sellerName: String(formData.get("sellerName") ?? "").trim(),
    sellerNameEn: String(formData.get("sellerNameEn") ?? "").trim(),
    sellerTaxId: String(formData.get("sellerTaxId") ?? "").trim(),
    sellerAddress: String(formData.get("sellerAddress") ?? "").trim(),
    sellerPhone: String(formData.get("sellerPhone") ?? "").trim(),
    sellerBankAccount: String(formData.get("sellerBankAccount") ?? "").trim(),
    sellerBankName: String(formData.get("sellerBankName") ?? "").trim(),
    sellerBankAccountName: String(
      formData.get("sellerBankAccountName") ?? "",
    ).trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ" };
  }

  const data = {
    invoicePrefix: parsed.data.invoicePrefix,
    yearlyProductId: parsed.data.yearlyProductId || null,
    lifetimeProductId: parsed.data.lifetimeProductId || null,
    sellerName: parsed.data.sellerName,
    sellerNameEn: parsed.data.sellerNameEn || null,
    sellerTaxId: parsed.data.sellerTaxId || null,
    sellerAddress: parsed.data.sellerAddress || null,
    sellerPhone: parsed.data.sellerPhone || null,
    sellerBankAccount: parsed.data.sellerBankAccount || null,
    sellerBankName: parsed.data.sellerBankName || null,
    sellerBankAccountName: parsed.data.sellerBankAccountName || null,
  };
  await masterPrisma.billingConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  revalidatePath("/manage/company");
  return { success: "✓ ບັນທຶກສຳເລັດ" };
}
