import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { QuotationForm } from "../quotation-form";
import { getLocale } from "@/lib/i18n/server";
import { WorkflowButtons } from "./workflow-buttons";
import { SendEmailButton } from "@/components/send-email-button";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const [q, customers, products, settings, locale] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, code: true, name: true, email: true } },
        items: true,
        user: { select: { name: true } },
        invoice: { select: { id: true, number: true } },
      },
    }),
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
  if (!q) notFound();

  const readOnly = q.status === "CONVERTED";
  const isExpired =
    q.validUntil !== null &&
    q.validUntil < new Date() &&
    (q.status === "DRAFT" || q.status === "SENT");

  return (
    <>
      {/* Workflow strip — sits ABOVE the Odoo form so the form keeps its
          standard breadcrumb + action bar + sheet untouched. */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SendEmailButton
            kind="quotation"
            quotationId={q.id}
            customerEmail={q.customer.email}
          />
          <WorkflowButtons
            id={q.id}
            status={q.status}
            invoiceId={q.invoice?.id ?? null}
            invoiceNumber={q.invoice?.number ?? null}
          />
        </div>
        {isExpired && (
          <div className="text-[12px] text-amber-700">
            ⚠ ໝົດອາຍຸວັນທີ {DATE_FMT.format(q.validUntil!)} ແລ້ວ
          </div>
        )}
      </div>

      {/* Status timeline — quick visual of where we are in the workflow */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          <Stage label="ສ້າງ" date={q.createdAt} active />
          <Stage label="ສົ່ງ" date={q.sentAt} active={Boolean(q.sentAt)} />
          <Stage
            label={
              q.status === "REJECTED"
                ? "ປະຕິເສດ"
                : q.status === "ACCEPTED" || q.status === "CONVERTED"
                  ? "ຍອມຮັບ"
                  : "ຍອມຮັບ/ປະຕິເສດ"
            }
            date={q.decidedAt}
            active={Boolean(q.decidedAt)}
            danger={q.status === "REJECTED"}
          />
          <Stage
            label="ກາຍເປັນບິນ"
            date={q.status === "CONVERTED" ? q.updatedAt : null}
            active={q.status === "CONVERTED"}
            link={
              q.invoice
                ? { href: `/invoices/${q.invoice.id}`, label: q.invoice.number }
                : null
            }
          />
        </div>
      </div>

      {/* Odoo invoice-style form */}
      <QuotationForm
        customers={customers}
        products={products}
        defaultVatRate={settings?.vatRate ?? 0.1}
        readOnly={readOnly}
        locale={locale}
        initial={{
          id: q.id,
          number: q.number,
          status: q.status,
          customerId: q.customerId,
          reference: q.reference ?? "",
          validUntil: q.validUntil
            ? q.validUntil.toISOString().slice(0, 10)
            : "",
          date: q.date.toISOString().slice(0, 10),
          currency: q.currency as "LAK" | "USD" | "THB",
          exchangeRate: q.exchangeRate,
          vatMode: q.vatMode as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT",
          vatRate: q.vatRate,
          discount: q.discount,
          note: q.note ?? "",
          items: q.items.map((it) => ({
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
        }}
      />
    </>
  );
}

function Stage({
  label,
  date,
  active,
  danger,
  link,
}: {
  label: string;
  date: Date | null | undefined;
  active?: boolean;
  danger?: boolean;
  link?: { href: string; label: string } | null;
}) {
  return (
    <div
      className={`p-3 rounded border ${
        active
          ? danger
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-wider ${active ? (danger ? "text-red-700" : "text-emerald-700") : "text-gray-500"}`}
      >
        {label}
      </div>
      <div className="text-[12px] text-gray-700 mt-0.5">
        {date ? DATETIME_FMT.format(date) : "—"}
      </div>
      {link && (
        <Link
          href={link.href}
          className="text-[11px] text-odoo hover:underline mt-0.5 inline-block font-mono"
        >
          {link.label} →
        </Link>
      )}
    </div>
  );
}
