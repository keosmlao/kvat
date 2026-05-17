import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QuotationForm } from "../quotation-form";
import { getLocale } from "@/lib/i18n/server";

export default async function NewQuotationPage() {
  await requireUser();
  const [customers, products, settings, locale] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, unit: true, priceLak: true },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
    getLocale(),
  ]);

  return (
    <QuotationForm
      customers={customers}
      products={products}
      defaultVatRate={settings?.vatRate ?? 0.1}
      locale={locale}
    />
  );
}
