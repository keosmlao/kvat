"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generatePaymentNumber } from "@/lib/payment-number";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("ຈຳນວນເງິນຕ້ອງເປັນບວກ"),
  method: z.enum(["CASH", "BANK", "TRANSFER", "OTHER"]).default("CASH"),
  date: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export type PaymentFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; success?: boolean }
  | undefined;

async function recomputeInvoicePaymentStatus(invoiceId: string) {
  const [invoice, payments] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { total: true },
    }),
    prisma.payment.findMany({
      where: { invoiceId },
      select: { amount: true },
    }),
  ]);
  if (!invoice) return;
  const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
  const paymentStatus =
    paidAmount <= 0
      ? "UNPAID"
      : paidAmount >= invoice.total - 0.01
        ? "PAID"
        : "PARTIAL";
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount, paymentStatus },
  });
}

export async function registerPayment(
  invoiceId: string,
  _prev: PaymentFormState,
  fd: FormData,
): Promise<PaymentFormState> {
  const session = await requireUser();
  const parsed = paymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      error: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ",
    };
  }
  const v = parsed.data;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true, paidAmount: true, status: true },
  });
  if (!invoice) return { error: "ບໍ່ພົບບິນ" };
  if (invoice.status === "CANCELLED")
    return { error: "ບໍ່ສາມາດຮັບເງິນຈາກບິນທີ່ຍົກເລີກ" };

  const remaining = invoice.total - invoice.paidAmount;
  if (v.amount > remaining + 0.01)
    return {
      error: `ຈຳນວນເງິນເກີນທີ່ຄ້າງ (ຄ້າງ: ${remaining.toLocaleString()})`,
    };

  const number = await generatePaymentNumber();
  await prisma.payment.create({
    data: {
      number,
      invoiceId,
      amount: v.amount,
      method: v.method,
      date: v.date ? new Date(v.date) : new Date(),
      reference: v.reference || null,
      note: v.note || null,
      userId: session.userId,
    },
  });

  await recomputeInvoicePaymentStatus(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  return { success: true };
}

export async function deletePayment(id: string) {
  await requireUser();
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { invoiceId: true },
  });
  if (!payment) return;
  await prisma.payment.delete({ where: { id } });
  await recomputeInvoicePaymentStatus(payment.invoiceId);
  revalidatePath(`/invoices/${payment.invoiceId}`);
  revalidatePath("/invoices");
}

/** Move invoice from ISSUED back to DRAFT (admin-like correction). */
export async function resetToDraft(id: string) {
  await requireUser();
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, payments: true },
  });
  if (!inv) return;
  if (inv.payments.length > 0) {
    throw new Error("ບໍ່ສາມາດປ່ຽນເປັນຮ່າງ — ມີການຮັບເງິນແລ້ວ. ກະລຸນາລົບການຊຳລະກ່ອນ");
  }
  if (inv.status !== "ISSUED") return;

  await prisma.$transaction(async (tx) => {
    // restore stock
    for (const it of inv.items) {
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
          note: "ປ່ຽນບິນກັບເປັນຮ່າງ",
        },
      });
    }
    await tx.invoice.update({
      where: { id },
      data: { status: "DRAFT" },
    });
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

/** Repost a DRAFT invoice back to ISSUED (re-applies stock). */
export async function postInvoice(id: string) {
  await requireUser();
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!inv) return;
  if (inv.status !== "DRAFT") return;

  await prisma.$transaction(async (tx) => {
    for (const it of inv.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          type: "OUT",
          quantity: it.quantity,
          reference: inv.number,
          note: "ປະກາດບິນ (ຈາກຮ່າງ)",
        },
      });
    }
    await tx.invoice.update({
      where: { id },
      data: { status: "ISSUED" },
    });
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

/** Create a credit note (refund/return) from an existing invoice. */
export async function createCreditNote(originalId: string) {
  const session = await requireUser();
  const original = await prisma.invoice.findUnique({
    where: { id: originalId },
    include: { items: true },
  });
  if (!original) throw new Error("ບໍ່ພົບບິນ");
  if (original.isCreditNote)
    throw new Error("ບໍ່ສາມາດສ້າງໃບລົດໜີ້ຈາກໃບລົດໜີ້");
  if (original.status !== "ISSUED")
    throw new Error("ສ້າງໃບລົດໜີ້ໄດ້ສະເພາະບິນທີ່ອອກແລ້ວ");

  const number = await generatePaymentNumber("CN"); // CN-YYYYMM-NNNN
  const credit = await prisma.$transaction(async (tx) => {
    const cn = await tx.invoice.create({
      data: {
        number,
        date: new Date(),
        customerId: original.customerId,
        userId: session.userId,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        subtotal: original.subtotal,
        discount: original.discount,
        vatRate: original.vatRate,
        vatMode: original.vatMode,
        vatAmount: original.vatAmount,
        total: original.total,
        status: "ISSUED",
        isCreditNote: true,
        reversedId: original.id,
        note: `ໃບລົດໜີ້ຂອງ ${original.number}`,
        items: {
          create: original.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            unit: it.unit,
            quantity: it.quantity,
            priceLak: it.priceLak,
            discount: it.discount,
            total: it.total,
          })),
        },
      },
    });
    // Return items to stock
    for (const it of original.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          type: "IN",
          quantity: it.quantity,
          reference: cn.number,
          note: `ໃບລົດໜີ້ ${cn.number}`,
        },
      });
    }
    return cn;
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${originalId}`);
  redirect(`/invoices/${credit.id}`);
}
