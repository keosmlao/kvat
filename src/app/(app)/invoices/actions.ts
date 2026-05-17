"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { isEtaxConfigured } from "@/lib/etax";
import { pollEtaxStatus, submitInvoiceToEtax } from "./etax-actions";
import { recordActivity } from "@/lib/activity";

const itemSchema = z.object({
  kind: z.enum(["product", "section", "note"]).default("product"),
  productId: z.string().optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  priceLak: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(1).optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "ກະລຸນາເລືອກລູກຄ້າ"),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTermId: z.string().optional(),
  currency: z.enum(["LAK", "USD", "THB"]).default("LAK"),
  exchangeRate: z.coerce.number().positive().default(1),
  discount: z.coerce.number().min(0).default(0),
  vatRate: z.coerce.number().min(0).max(1).default(0.1),
  vatMode: z.enum(["EXCLUSIVE", "INCLUSIVE", "EXEMPT"]).default("EXCLUSIVE"),
  paymentMethod: z.enum(["CASH", "TRANSFER"]).default("CASH"),
  paymentRef: z.string().optional(),
  note: z.string().optional(),
  items: z.array(itemSchema).min(1, "ຕ້ອງມີຢ່າງໜ້ອຍ 1 ລາຍການ"),
});


export type InvoiceFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
      invoiceId?: string;
      invoiceNumber?: string;
      detailUrl?: string;
      pdfUrl?: string;
    }
  | undefined;

type ParseResult =
  | { ok: true; data: z.infer<typeof invoiceSchema> }
  | { ok: false; state: InvoiceFormState };

const ETAX_APPROVED = "1";
const ETAX_TERMINAL_FAILURES = new Set(["3", "6"]);

type InvoiceLineCreate = {
  lineType: "PRODUCT" | "SECTION" | "NOTE";
  productId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  priceLak: number;
  discount: number;
  total: number;
  taxRate: number;
  taxAmount: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function applyLineTaxes(
  items: InvoiceLineCreate[],
  subtotal: number,
  discount: number,
  vatMode: "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT",
) {
  const afterDiscount = Math.max(0, subtotal - discount);
  const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;
  let vatAmount = 0;

  for (const item of items) {
    if (item.lineType !== "PRODUCT" || vatMode === "EXEMPT") {
      item.taxAmount = 0;
      continue;
    }
    const base = item.total * discountRatio;
    item.taxAmount =
      vatMode === "INCLUSIVE"
        ? round2((base * item.taxRate) / (1 + item.taxRate))
        : round2(base * item.taxRate);
    vatAmount += item.taxAmount;
  }

  vatAmount = round2(vatAmount);
  return {
    afterDiscount,
    vatAmount,
    total: vatMode === "EXCLUSIVE" ? afterDiscount + vatAmount : afterDiscount,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEtaxApproval(invoiceId: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const status = await pollEtaxStatus(invoiceId);
    if (!status.ok) return;
    if (status.status === ETAX_APPROVED) return;
    if (ETAX_TERMINAL_FAILURES.has(status.status)) return;
    await sleep(2_000);
  }
}

function isUniqueInvoiceNumberError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("number")
  );
}

function parseForm(formData: FormData): ParseResult {
  const itemsJson = String(formData.get("items") ?? "[]");
  let items: unknown;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { ok: false, state: { error: "ຂໍ້ມູນລາຍການບໍ່ຖືກຕ້ອງ" } };
  }

  const parsed = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    date: formData.get("date"),
    dueDate: formData.get("dueDate"),
    paymentTermId: formData.get("paymentTermId"),
    currency: formData.get("currency"),
    exchangeRate: formData.get("exchangeRate"),
    discount: formData.get("discount"),
    vatRate: formData.get("vatRate"),
    vatMode: formData.get("vatMode"),
    paymentMethod: formData.get("paymentMethod"),
    paymentRef: formData.get("paymentRef"),
    note: formData.get("note"),
    items,
  });

  if (!parsed.success) {
    return {
      ok: false,
      state: {
        error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ",
        fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
          string,
          string[]
        >,
      },
    };
  }

  return { ok: true, data: parsed.data };
}

export async function createInvoice(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const session = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  const settings = await prisma.setting.findUnique({ where: { id: "default" } });
  const prefix = settings?.invoicePrefix ?? "INV";

  const productLines = data.items.filter((i) => i.kind === "product");
  const products = await prisma.product.findMany({
    where: { id: { in: productLines.flatMap((i) => (i.productId ? [i.productId] : [])) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const itemsToCreate: InvoiceLineCreate[] = data.items.map((it) => {
    if (it.kind !== "product") {
      return {
        lineType: it.kind === "section" ? "SECTION" : "NOTE",
        productId: null,
        productName: it.label?.trim() || (it.kind === "section" ? "Section" : "Note"),
        unit: "",
        quantity: 0,
        priceLak: 0,
        discount: 0,
        total: 0,
        taxRate: 0,
        taxAmount: 0,
      };
    }
    if (!it.productId) throw new Error("Product not found");
    const product = productMap.get(it.productId);
    if (!product) throw new Error("Product not found");
    const lineTotal = it.quantity * it.priceLak - it.discount;
    subtotal += lineTotal;
    return {
      lineType: "PRODUCT",
      productId: it.productId,
      productName: product.name,
      unit: it.unit?.trim() || product.unit,
      quantity: it.quantity,
      priceLak: it.priceLak,
      discount: it.discount,
      total: lineTotal,
      taxRate: it.taxRate ?? data.vatRate,
      taxAmount: 0,
    };
  });

  const { vatAmount, total } = applyLineTaxes(
    itemsToCreate,
    subtotal,
    data.discount,
    data.vatMode,
  );

  let invoice:
    | {
        id: string;
        number: string;
      }
    | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      invoice = await prisma.$transaction(async (tx) => {
        const number = await generateInvoiceNumber(prefix, tx);

        const created = await tx.invoice.create({
          data: {
            number,
            date: data.date ? new Date(data.date) : new Date(),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            paymentTermId: data.paymentTermId || null,
            customerId: data.customerId,
            userId: session.userId,
            currency: data.currency,
            exchangeRate: data.exchangeRate,
            subtotal,
            discount: data.discount,
            vatRate: data.vatRate,
            vatMode: data.vatMode,
            vatAmount,
            total,
            paymentMethod: data.paymentMethod,
            paymentRef: data.paymentRef || null,
            note: data.note,
            items: { create: itemsToCreate },
          },
        });

        for (const it of productLines) {
          if (!it.productId) continue;
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              type: "OUT",
              quantity: it.quantity,
              reference: created.number,
              note: "ຂາຍຕາມບິນ",
            },
          });
        }

        return created;
      });
      break;
    } catch (error) {
      if (!isUniqueInvoiceNumberError(error) || attempt === 4) {
        throw error;
      }
    }
  }

  if (!invoice) {
    return { error: "ບໍ່ສາມາດສ້າງເລກບິນໃໝ່ໄດ້ ກະລຸນາລອງອີກຄັ້ງ" };
  }

  // Auto-submit to eTax if enabled (best-effort; failures are stored on the
  // invoice and surfaced in the detail page so the user can retry).
  if (isEtaxConfigured()) {
    const setting = await prisma.setting.findUnique({
      where: { id: "default" },
      select: { etaxAutoSubmit: true },
    });
    if (setting?.etaxAutoSubmit) {
      try {
        const submitted = await submitInvoiceToEtax(invoice.id);
        if (submitted.ok) {
          await waitForEtaxApproval(invoice.id);
        }
      } catch {
        // Swallow — error is already persisted on the invoice row.
      }
    }
  }

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "ISSUE",
    recordType: "Invoice",
    recordId: invoice.id,
    summary: `ອອກບິນ ${invoice.number} (${total.toLocaleString()} ${data.currency})`,
  });

  revalidatePath("/invoices");
  revalidatePath("/products");
  return {
    success: true,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    detailUrl: `/invoices/${invoice.id}`,
    pdfUrl: `/api/invoices/${invoice.id}/pdf`,
  };
}

export async function updateInvoice(
  id: string,
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;
  const data = parsed.data;

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) return { error: "ບໍ່ພົບບິນ" };
  if (existing.status === "CANCELLED")
    return { error: "ບໍ່ສາມາດແກ້ໄຂບິນທີ່ຍົກເລີກແລ້ວ" };

  const products = await prisma.product.findMany({
    where: { id: { in: data.items.flatMap((i) => (i.kind === "product" && i.productId ? [i.productId] : [])) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const productLines = data.items.filter((i) => i.kind === "product");

  let subtotal = 0;
  const itemsToCreate: InvoiceLineCreate[] = data.items.map((it) => {
    if (it.kind !== "product") {
      return {
        lineType: it.kind === "section" ? "SECTION" : "NOTE",
        productId: null,
        productName: it.label?.trim() || (it.kind === "section" ? "Section" : "Note"),
        unit: "",
        quantity: 0,
        priceLak: 0,
        discount: 0,
        total: 0,
        taxRate: 0,
        taxAmount: 0,
      };
    }
    if (!it.productId) throw new Error("Product not found");
    const product = productMap.get(it.productId);
    if (!product) throw new Error("Product not found");
    const lineTotal = it.quantity * it.priceLak - it.discount;
    subtotal += lineTotal;
    return {
      lineType: "PRODUCT",
      productId: it.productId,
      productName: product.name,
      unit: it.unit?.trim() || product.unit,
      quantity: it.quantity,
      priceLak: it.priceLak,
      discount: it.discount,
      total: lineTotal,
      taxRate: it.taxRate ?? data.vatRate,
      taxAmount: 0,
    };
  });

  const { vatAmount, total } = applyLineTaxes(
    itemsToCreate,
    subtotal,
    data.discount,
    data.vatMode,
  );

  try {
    await prisma.$transaction(async (tx) => {
      // Restore stock from previous items (was ISSUED → stock was decremented)
      for (const it of existing.items) {
        if (it.lineType !== "PRODUCT" || !it.productId) continue;
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "IN",
            quantity: it.quantity,
            reference: existing.number,
            note: "ແກ້ໄຂບິນ (ຄືນສິນຄ້າເກົ່າ)",
          },
        });
      }

      // Delete old items, write new ones, update header
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
        where: { id },
        data: {
          date: data.date ? new Date(data.date) : existing.date,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          paymentTermId: data.paymentTermId || null,
          customerId: data.customerId,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          subtotal,
          discount: data.discount,
          vatRate: data.vatRate,
          vatMode: data.vatMode,
          vatAmount,
          total,
          note: data.note,
          items: { create: itemsToCreate },
        },
      });

      // Apply new stock decrements
      for (const it of productLines) {
        if (!it.productId) continue;
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "OUT",
            quantity: it.quantity,
            reference: existing.number,
            note: "ແກ້ໄຂບິນ (ຫັກສິນຄ້າໃໝ່)",
          },
        });
      }
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ",
    };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/products");
  redirect(`/invoices/${id}`);
}

export async function cancelInvoice(id: string) {
  const session = await requireUser();
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!inv || inv.status === "CANCELLED") return;

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    for (const it of inv.items) {
      if (it.lineType !== "PRODUCT" || !it.productId) continue;
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          type: "IN",
          quantity: it.quantity,
          reference: inv.number,
          note: "ຍົກເລີກບິນ",
        },
      });
    }
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "CANCEL",
    recordType: "Invoice",
    recordId: id,
    summary: `ຍົກເລີກບິນ ${inv.number}`,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/products");
}

export async function deleteInvoice(id: string) {
  const session = await requireUser();
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!inv) return;

  await prisma.$transaction(async (tx) => {
    // If still ISSUED, restore stock before deleting
      if (inv.status === "ISSUED") {
        for (const it of inv.items) {
          if (it.lineType !== "PRODUCT" || !it.productId) continue;
          await tx.product.update({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "IN",
            quantity: it.quantity,
            reference: inv.number,
            note: "ລົບບິນ (ຄືນສິນຄ້າ)",
          },
        });
      }
    }
    // Items cascade-delete via schema
    await tx.invoice.delete({ where: { id } });
  });

  void recordActivity({
    dbName: session.dbName,
    userId: session.userId,
    action: "DELETE",
    recordType: "Invoice",
    recordId: id,
    summary: `ລົບບິນ ${inv.number}`,
  });

  revalidatePath("/invoices");
  revalidatePath("/products");
  redirect("/invoices");
}
