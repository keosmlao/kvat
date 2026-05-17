import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { BillingStatus } from "@/generated/master/client";
import { MarkPaidForm } from "./actions-ui";
import { BillingInvoiceForm } from "../invoice-form";
import { OdooListPage } from "@/components/odoo/sheet";
import { ManagementChatter } from "@/components/management-chatter";
import { getManagementChatterData } from "@/lib/management-chatter";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const STATUS_LABEL: Record<BillingStatus, { label: string; cls: string }> = {
  UNPAID: {
    label: tm("bilStUnpaid"),
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PAID: {
    label: tm("bilStPaid"),
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: tm("bilStCancelled"),
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function fmt(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? tm("reportsKipSuffix") : currency)
  );
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
  return tm("invPerLineLabel");
}

export default async function BillingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [inv, customers, products] = await Promise.all([
    masterPrisma.billingInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sn: "asc" } },
      },
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
  if (!inv) notFound();

  const chatter = await getManagementChatterData("BillingInvoice", id);
  const st = STATUS_LABEL[inv.status];
  const vatLabel = vatRateLabel(inv.items, inv.vatRate);

  return (
    <OdooListPage
      title={inv.number}
      subtitle={`${st.label} · ${tm("invIssuedOn")} ${DATE_FMT.format(inv.issueDate)} · ${tm("invTotalPrefix")} ${fmt(inv.amount, inv.currency)}`}
      actions={
        <a
          href={`/api/billing/${inv.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
        >
          {tm("invDownloadPdf")}
        </a>
      }
    >
      <>
      <div className="mb-3">
        <Link
          href="/manage/billing"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          {tm("invBackLink")}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title={tm("invCardCustomer")}>
          <Row label="Code">
            <span className="font-mono">{inv.customer.code}</span>
          </Row>
          <Row label={tm("invName")}>{inv.customer.name}</Row>
          <Row label={tm("invType")}>
            {inv.customer.type === "TENANT" ? tm("custSaasTenant") : tm("custExternal")}
          </Row>
          {inv.customer.contactName && (
            <Row label={tm("invContact")}>{inv.customer.contactName}</Row>
          )}
          {inv.customer.email && <Row label="Email">{inv.customer.email}</Row>}
          {inv.customer.phone && <Row label={tm("invPhone")}>{inv.customer.phone}</Row>}
          {inv.customer.taxId && <Row label="TIN">{inv.customer.taxId}</Row>}
          <div className="pt-2">
            <Link
              href={`/manage/billing/customers/${inv.customer.id}`}
              className="text-[12px] text-slate-700 hover:underline"
            >
              {tm("invViewCustomer")}
            </Link>
          </div>
        </Card>

        <Card title={tm("invCardSummary")}>
          <Row label={tm("invSubject")}>{inv.description}</Row>
          <Row label={tm("invCurrency")}>{inv.currency}</Row>
          {inv.dueDate && (
            <Row label={tm("invDueDate")}>{DATE_FMT.format(inv.dueDate)}</Row>
          )}
          <Row label="VAT">
            {inv.vatMode === "EXEMPT"
              ? tm("invVatExempt")
              : `${vatLabel} (${inv.vatMode})`}
          </Row>
          <Row label={tm("invCreatedAt")}>{DATETIME_FMT.format(inv.createdAt)}</Row>
        </Card>

        {inv.status === "PAID" && (
          <Card title={tm("invCardPayment")} className="md:col-span-2">
            <Row label={tm("invPayMethod")}>
              {inv.paymentMethod === "CASH" ? tm("ledCash") : tm("ledTransfer")}
            </Row>
            {inv.paymentRef && <Row label="Ref">{inv.paymentRef}</Row>}
            {inv.paidAt && (
              <Row label={tm("invPaidOn")}>{DATETIME_FMT.format(inv.paidAt)}</Row>
            )}
          </Card>
        )}

        {inv.status === "UNPAID" && (
          <Card title={tm("invCardRecordPay")} className="md:col-span-2">
            <MarkPaidForm id={inv.id} />
          </Card>
        )}
      </div>

      {/* Items preview */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden mb-4">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-[12px] uppercase tracking-widest text-gray-500 font-medium">
          {tm("invLines")} ({inv.items.length})
        </div>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left py-1.5 px-3">#</th>
              <th className="text-left py-1.5 px-3">{tm("invColDesc")}</th>
              <th className="text-left py-1.5 px-3">{tm("invColUnit")}</th>
              <th className="text-right py-1.5 px-3">{tm("invColQty")}</th>
              <th className="text-right py-1.5 px-3">{tm("invColPrice")}</th>
              <th className="text-right py-1.5 px-3">{tm("invColDiscount")}</th>
              <th className="text-right py-1.5 px-3">VAT</th>
              <th className="text-right py-1.5 px-3">{tm("invColTotal")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inv.items.map((it) =>
              it.lineType === "SECTION" || it.lineType === "NOTE" ? (
                <tr
                  key={it.id}
                  className={
                    it.lineType === "SECTION"
                      ? "bg-gray-50 font-medium text-gray-800"
                      : "text-gray-500 italic"
                  }
                >
                  <td className="py-1.5 px-3 text-gray-500">{it.sn}</td>
                  <td className="py-1.5 px-3" colSpan={7}>
                    {it.description}
                  </td>
                </tr>
              ) : (
                <tr key={it.id}>
                  <td className="py-1.5 px-3 text-gray-500">{it.sn}</td>
                  <td className="py-1.5 px-3 text-gray-800">{it.description}</td>
                  <td className="py-1.5 px-3 text-gray-600">{it.unit}</td>
                  <td className="py-1.5 px-3 text-right">
                    {it.quantity.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {it.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-gray-500">
                    {it.discount > 0 ? it.discount.toLocaleString() : "—"}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-gray-500">
                    {inv.vatMode === "EXEMPT"
                      ? "—"
                      : `${(it.taxRate * 100).toFixed(0)}% (${it.taxAmount.toLocaleString()})`}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-medium">
                    {it.total.toLocaleString()}
                  </td>
                </tr>
              ),
            )}
            <tr className="border-t-2 border-gray-300">
              <td colSpan={7} className="py-1.5 px-3 text-right text-gray-600">
                {tm("invSubtotal")}
              </td>
              <td className="py-1.5 px-3 text-right font-mono">
                {inv.subtotal.toLocaleString()}
              </td>
            </tr>
            {inv.discount > 0 && (
              <tr>
                <td colSpan={7} className="py-1 px-3 text-right text-gray-600">
                  {tm("invSumDiscount")}
                </td>
                <td className="py-1 px-3 text-right font-mono">
                  − {inv.discount.toLocaleString()}
                </td>
              </tr>
            )}
            {inv.vatMode !== "EXEMPT" && (
              <tr>
                <td colSpan={7} className="py-1 px-3 text-right text-gray-600">
                  VAT {vatLabel}
                  {inv.vatMode === "INCLUSIVE" ? tm("invInclusiveSuf") : ""}
                </td>
                <td className="py-1 px-3 text-right font-mono">
                  {inv.vatAmount.toLocaleString()}
                </td>
              </tr>
            )}
            <tr className="bg-red-50">
              <td colSpan={7} className="py-2 px-3 text-right font-medium">
                {tm("invGrandTotal")}
              </td>
              <td className="py-2 px-3 text-right font-mono font-medium text-red-700 text-[15px]">
                {inv.amount.toLocaleString()} {inv.currency}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {inv.notes && (
        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-2">
            {tm("invNotes")}
          </h3>
          <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
            {inv.notes}
          </p>
        </div>
      )}

      {inv.status !== "PAID" && (
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-4">
            {tm("invEditTitle")}
          </h3>
          <BillingInvoiceForm
            mode="edit"
            id={inv.id}
            status={inv.status}
            customers={customers}
            products={products}
            initial={{
              customerId: inv.customerId,
              description: inv.description,
              currency: inv.currency as "LAK" | "USD" | "THB",
              vatMode: inv.vatMode as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT",
              vatRate: inv.vatRate,
              invoiceDiscount: inv.discount,
              dueDate: inv.dueDate
                ? inv.dueDate.toISOString().slice(0, 10)
                : "",
              notes: inv.notes ?? "",
              items: inv.items.map((it) => ({
                kind:
                  it.lineType === "SECTION"
                    ? "section"
                    : it.lineType === "NOTE"
                      ? "note"
                      : "product",
                productId: it.productId ?? "",
                description: it.description,
                unit: it.unit,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discount: it.discount,
                taxRate: it.taxRate,
              })),
            }}
          />
        </div>
      )}
      <div className="mt-4 bg-white border border-gray-200 rounded overflow-hidden">
        <ManagementChatter
          recordType="BillingInvoice"
          recordId={id}
          revalidate={`/manage/billing/${id}`}
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
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded p-4 ${className}`}
    >
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
