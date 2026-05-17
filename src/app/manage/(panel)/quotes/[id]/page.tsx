import Link from "next/link";
import { notFound } from "next/navigation";
import { BillingQuoteStatus } from "@/generated/master/client";
import { OdooListPage } from "@/components/odoo/sheet";
import { masterPrisma } from "@/lib/master-prisma";
import { BillingQuoteForm } from "../quote-form";
import { ManageQuoteWorkflowActions } from "./workflow-actions";
import { ManagementChatter } from "@/components/management-chatter";
import { getManagementChatterData } from "@/lib/management-chatter";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const STATUS_LABEL: Record<BillingQuoteStatus, string> = {
  DRAFT: tm("qStatusDraft"),
  SENT: tm("qStatusSent"),
  ACCEPTED: tm("qStatusAccepted"),
  REJECTED: tm("qStatusRejected"),
  CANCELLED: tm("qStatusCancelled"),
};

function fmt(n: number, currency: string) {
  return `${new Intl.NumberFormat("lo-LA", {
    maximumFractionDigits: 0,
  }).format(n)} ${currency === "LAK" ? tm("reportsKipSuffix") : currency}`;
}

function vatRateLabel(
  items: { lineType: string; taxRate: number | null }[],
  fallbackRate: number,
) {
  const rates = Array.from(
    new Set(
      items
        .filter((item) => item.lineType === "PRODUCT")
        .map((item) => item.taxRate ?? fallbackRate),
    ),
  );
  if (rates.length === 0) return `${(fallbackRate * 100).toFixed(0)}%`;
  if (rates.length === 1) return `${(rates[0] * 100).toFixed(0)}%`;
  return tm("qVatPerItem");
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, customers, products] = await Promise.all([
    masterPrisma.billingQuote.findUnique({
      where: { id },
      include: { customer: true, items: { orderBy: { sn: "asc" } } },
    }),
    masterPrisma.billingCustomer.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    }),
    masterPrisma.billingProduct.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, unit: true, priceLak: true },
    }),
  ]);

  if (!quote) notFound();

  const chatter = await getManagementChatterData("BillingQuote", id);
  const vatLabel = vatRateLabel(quote.items, quote.vatRate);

  return (
    <OdooListPage
      title={quote.number}
      subtitle={`${STATUS_LABEL[quote.status]} · ${tm("qDateLabel")} ${DATE_FMT.format(
        quote.issueDate,
      )} · ${tm("qTotalLabel")} ${fmt(quote.amount, quote.currency)}`}
      actions={
        <ManageQuoteWorkflowActions id={quote.id} status={quote.status} />
      }
    >
      <>
        <div className="mb-3">
          <Link
            href="/manage/quotes"
            className="text-[12px] text-gray-500 hover:text-gray-800"
          >
            {tm("qBackLink")}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card title={tm("qCardCustomer")}>
            <Row label={tm("qRowCode")}>
              <span className="font-mono">{quote.customer.code}</span>
            </Row>
            <Row label={tm("qRowName")}>{quote.customer.name}</Row>
            <Row label={tm("qRowType")}>
              {quote.customer.type === "TENANT" ? tm("qRowSaasTenant") : tm("qRowExternal")}
            </Row>
            {quote.customer.phone && <Row label={tm("qRowPhone")}>{quote.customer.phone}</Row>}
            {quote.customer.email && <Row label={tm("qRowEmail")}>{quote.customer.email}</Row>}
          </Card>
          <Card title={tm("qCardSummary")}>
            <Row label={tm("qRowTitle")}>{quote.title}</Row>
            <Row label={tm("qRowCurrency")}>{quote.currency}</Row>
            <Row label={tm("qRowStatus")}>{STATUS_LABEL[quote.status]}</Row>
            {quote.validUntil && (
              <Row label={tm("qRowExpires")}>{DATE_FMT.format(quote.validUntil)}</Row>
            )}
          </Card>
        </div>

        <div className="bg-white border border-gray-200 rounded overflow-hidden mb-4">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-[12px] uppercase tracking-widest text-gray-500 font-medium">
            {tm("qDetailLines")} ({quote.items.length})
          </div>
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase text-gray-500 bg-gray-50">
              <tr>
                <th className="text-left py-1.5 px-3">#</th>
                <th className="text-left py-1.5 px-3">{tm("qColDescription")}</th>
                <th className="text-left py-1.5 px-3">{tm("qColUnit")}</th>
                <th className="text-right py-1.5 px-3">{tm("qColQty")}</th>
                <th className="text-right py-1.5 px-3">{tm("qColPrice")}</th>
                <th className="text-right py-1.5 px-3">{tm("qColDiscount")}</th>
                <th className="text-right py-1.5 px-3">{tm("qColVat")}</th>
                <th className="text-right py-1.5 px-3">{tm("qColTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quote.items.map((item) =>
                item.lineType === "SECTION" || item.lineType === "NOTE" ? (
                  <tr
                    key={item.id}
                    className={
                      item.lineType === "SECTION"
                        ? "bg-gray-50 font-medium text-gray-800"
                        : "text-gray-500 italic"
                    }
                  >
                    <td className="py-1.5 px-3 text-gray-500">{item.sn}</td>
                    <td className="py-1.5 px-3" colSpan={7}>
                      {item.description}
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    <td className="py-1.5 px-3 text-gray-500">{item.sn}</td>
                    <td className="py-1.5 px-3 text-gray-800">
                      {item.description}
                    </td>
                    <td className="py-1.5 px-3 text-gray-600">{item.unit}</td>
                    <td className="py-1.5 px-3 text-right">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono">
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-gray-500">
                      {item.discount > 0 ? item.discount.toLocaleString() : "—"}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-gray-500">
                      {quote.vatMode === "EXEMPT"
                        ? "—"
                        : `${(item.taxRate * 100).toFixed(0)}% (${item.taxAmount.toLocaleString()})`}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-medium">
                      {item.total.toLocaleString()}
                    </td>
                  </tr>
                ),
              )}
              <tr className="border-t-2 border-gray-300">
                <td colSpan={7} className="py-1.5 px-3 text-right text-gray-600">
                  {tm("qSubtotal")}
                </td>
                <td className="py-1.5 px-3 text-right font-mono">
                  {quote.subtotal.toLocaleString()}
                </td>
              </tr>
              {quote.discount > 0 && (
                <tr>
                  <td colSpan={7} className="py-1 px-3 text-right text-gray-600">
                    {tm("qSumDiscount")}
                  </td>
                  <td className="py-1 px-3 text-right font-mono">
                    - {quote.discount.toLocaleString()}
                  </td>
                </tr>
              )}
              {quote.vatMode !== "EXEMPT" && (
                <tr>
                  <td colSpan={7} className="py-1 px-3 text-right text-gray-600">
                    VAT {vatLabel}
                    {quote.vatMode === "INCLUSIVE" ? tm("qInclusiveSuffix") : ""}
                  </td>
                  <td className="py-1 px-3 text-right font-mono">
                    {quote.vatAmount.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="bg-odoo/10">
                <td colSpan={7} className="py-2 px-3 text-right font-medium">
                  {tm("qSumGrandTotal")}
                </td>
                <td className="py-2 px-3 text-right font-mono font-medium text-odoo text-[15px]">
                  {quote.amount.toLocaleString()} {quote.currency}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {quote.notes && (
          <div className="bg-white border border-gray-200 rounded p-4 mb-4">
            <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-2">
              {tm("qNotesHeader")}
            </h3>
            <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
              {quote.notes}
            </p>
          </div>
        )}

        {quote.status !== BillingQuoteStatus.ACCEPTED && (
          <BillingQuoteForm
            mode="edit"
            id={quote.id}
            status={quote.status}
            customers={customers}
            products={products}
            initial={{
              number: quote.number,
              customerId: quote.customerId,
              title: quote.title,
              currency: quote.currency as "LAK" | "USD" | "THB",
              vatMode: quote.vatMode as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT",
              vatRate: quote.vatRate,
              discount: quote.discount,
              validUntil: quote.validUntil
                ? quote.validUntil.toISOString().slice(0, 10)
                : "",
              notes: quote.notes ?? "",
              items: quote.items.map((item) => ({
                kind:
                  item.lineType === "SECTION"
                    ? "section"
                    : item.lineType === "NOTE"
                      ? "note"
                      : "product",
                productId: item.productId ?? "",
                description: item.description,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                taxRate: item.taxRate,
              })),
            }}
          />
        )}
        <div className="mt-4 bg-white border border-gray-200 rounded overflow-hidden">
          <ManagementChatter
            recordType="BillingQuote"
            recordId={id}
            revalidate={`/manage/quotes/${id}`}
            messages={chatter.messages}
            followers={chatter.followers}
            activities={chatter.activities}
            users={chatter.users}
            isFollowing={chatter.isFollowing}
            currentUserId={chatter.currentUserId}
          />
        </div>
      </>
    </OdooListPage>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
        {title}
      </h3>
      <div className="space-y-1.5 text-[13px]">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <span className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="text-gray-800">{children}</span>
    </div>
  );
}
