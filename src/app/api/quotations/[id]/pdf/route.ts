import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { renderQuotationPdf } from "@/lib/quotation-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const [q, setting] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);
  if (!q) notFound();

  const buffer = await renderQuotationPdf({
    quotation: {
      number: q.number,
      date: q.date,
      validUntil: q.validUntil,
      reference: q.reference,
      subtotal: q.subtotal,
      discount: q.discount,
      vatMode: q.vatMode,
      vatRate: q.vatRate,
      vatAmount: q.vatAmount,
      total: q.total,
      currency: q.currency,
      note: q.note,
      items: q.items.map((it, i) => ({
        sn: i + 1,
        lineType: it.lineType,
        productName: it.productName,
        unit: it.unit,
        quantity: it.quantity,
        priceLak: it.priceLak,
        discount: it.discount,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        total: it.total,
      })),
    },
    customer: {
      name: q.customer.name,
      taxId: q.customer.taxId,
      phone: q.customer.phone,
      email: q.customer.email,
      address: q.customer.address,
    },
    seller: {
      name: setting?.shopName ?? "SMLAO",
      nameEn: setting?.shopNameEn ?? null,
      taxId: setting?.taxId ?? null,
      address: setting?.address ?? null,
      phone: setting?.phone ?? null,
      bankAccountName: setting?.bankAccountName ?? null,
      bankAccount: setting?.bankAccount ?? null,
      bankName: setting?.bankName ?? null,
      licenseNumber: setting?.licenseNumber ?? null,
      licenseDate: setting?.licenseDate ?? null,
    },
  });

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${q.number}.pdf"`,
    },
  });
}
