import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "./invoice-form";
import { createInvoice } from "../actions";

export default async function NewInvoicePage() {
  const [products, customers, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);

  return (
    <InvoiceForm
      action={createInvoice}
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
    />
  );
}
