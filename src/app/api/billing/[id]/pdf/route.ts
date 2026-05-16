import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { renderBillingPdf } from "@/lib/billing-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireManagement();
  const { id } = await params;
  const [invoice, cfg] = await Promise.all([
    masterPrisma.billingInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sn: "asc" } },
      },
    }),
    masterPrisma.billingConfig.findUnique({ where: { id: 1 } }),
  ]);
  if (!invoice) notFound();

  const buffer = await renderBillingPdf({
    invoice: {
      number: invoice.number,
      description: invoice.description,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      vatMode: invoice.vatMode,
      vatRate: invoice.vatRate,
      vatAmount: invoice.vatAmount,
      amount: invoice.amount,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      paymentRef: invoice.paymentRef,
      status: invoice.status,
      notes: invoice.notes,
      items: invoice.items.map((it) => ({
        sn: it.sn,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        total: it.total,
      })),
    },
    customer: {
      name: invoice.customer.name,
      contactName: invoice.customer.contactName,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
      taxId: invoice.customer.taxId,
      address: invoice.customer.address,
    },
    seller: {
      name: cfg?.sellerName ?? "SMLAO",
      nameEn: cfg?.sellerNameEn ?? null,
      taxId: cfg?.sellerTaxId ?? null,
      address: cfg?.sellerAddress ?? null,
      phone: cfg?.sellerPhone ?? null,
      bankAccountName: cfg?.sellerBankAccountName ?? null,
      bankAccount: cfg?.sellerBankAccount ?? null,
      bankName: cfg?.sellerBankName ?? null,
    },
  });

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
