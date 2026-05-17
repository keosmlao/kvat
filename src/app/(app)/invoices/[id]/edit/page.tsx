import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceForm, type InvoiceInitial } from "../../new/invoice-form";
import { updateInvoice, type InvoiceFormState } from "../../actions";
import type { Currency } from "@/lib/format";
import { getLocale } from "@/lib/i18n/server";

export default async function EditInvoicePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const [invoice, products, customers, settings, locale] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { id: "default" } }),
    getLocale(),
  ]);

  if (!invoice) notFound();
  if (invoice.status === "CANCELLED") {
    return (
      <div className="bg-white border border-gray-200 rounded p-6 text-center">
        <p className="text-gray-600 text-sm">
          ບໍ່ສາມາດແກ້ໄຂບິນທີ່ຍົກເລີກແລ້ວ
        </p>
        <a
          href={`/invoices/${id}`}
          className="text-odoo hover:underline text-sm mt-2 inline-block"
        >
          ← ກັບໄປເບິ່ງບິນ
        </a>
      </div>
    );
  }

  const action = async (prev: InvoiceFormState, fd: FormData) => {
    "use server";
    return updateInvoice(id, prev, fd);
  };

  const initial: InvoiceInitial = {
    id: invoice.id,
    number: invoice.number,
    customerId: invoice.customerId,
    date: invoice.date.toISOString().slice(0, 10),
    dueDate: invoice.dueDate
      ? invoice.dueDate.toISOString().slice(0, 10)
      : invoice.date.toISOString().slice(0, 10),
    paymentTermId: invoice.paymentTermId,
    currency: invoice.currency as Currency,
    exchangeRate: invoice.exchangeRate,
    discount: invoice.discount,
    vatRate: invoice.vatRate,
    vatMode: invoice.vatMode as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT",
    paymentMethod: invoice.paymentMethod as "CASH" | "TRANSFER",
    paymentRef: invoice.paymentRef ?? "",
    note: invoice.note ?? "",
    items: invoice.items.map((it) => ({
      kind:
        it.lineType === "SECTION"
          ? "section"
          : it.lineType === "NOTE"
            ? "note"
            : "product",
      productId: it.productId ?? "",
      label: it.productName,
      unit: it.unit,
      quantity: it.quantity,
      priceLak: it.priceLak,
      discount: it.discount,
      taxRate: it.taxRate,
    })),
  };

  return (
    <InvoiceForm
      action={action}
      locale={locale}
      products={products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        priceLak: p.priceLak,
        stock: p.stock,
      }))}
      customers={customers.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      }))}
      defaultVatRate={settings?.vatRate ?? 0.1}
      initial={initial}
    />
  );
}
