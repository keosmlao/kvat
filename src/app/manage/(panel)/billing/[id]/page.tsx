import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { BillingStatus } from "@/generated/master/client";
import { MarkPaidForm } from "./actions-ui";
import { BillingInvoiceForm } from "../invoice-form";

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
    label: "ຍັງບໍ່ຈ່າຍ",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PAID: {
    label: "ຈ່າຍແລ້ວ",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "ຍົກເລີກ",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function fmt(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? "ກີບ" : currency)
  );
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

  const st = STATUS_LABEL[inv.status];

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/manage/billing"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Billing
        </Link>
      </div>

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-gray-900 font-mono">
            {inv.number}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.cls}`}
            >
              {st.label}
            </span>
            <span className="text-[12px] text-gray-500">
              ອອກວັນທີ {DATE_FMT.format(inv.issueDate)}
            </span>
            <span className="text-[12px] text-gray-500">
              · ລວມ {fmt(inv.amount, inv.currency)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/billing/${inv.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-[13px] font-medium hover:bg-gray-50"
          >
            📄 ດາວໂຫລດ PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card title="ລູກຄ້າ">
          <Row label="Code">
            <span className="font-mono">{inv.customer.code}</span>
          </Row>
          <Row label="ຊື່">{inv.customer.name}</Row>
          <Row label="ປະເພດ">
            {inv.customer.type === "TENANT" ? "SaaS Tenant" : "ລູກຄ້າພາຍນອກ"}
          </Row>
          {inv.customer.contactName && (
            <Row label="ຜູ້ຮັບຜິດຊອບ">{inv.customer.contactName}</Row>
          )}
          {inv.customer.email && <Row label="Email">{inv.customer.email}</Row>}
          {inv.customer.phone && <Row label="ໂທ">{inv.customer.phone}</Row>}
          {inv.customer.taxId && <Row label="TIN">{inv.customer.taxId}</Row>}
          <div className="pt-2">
            <Link
              href={`/manage/billing/customers/${inv.customer.id}`}
              className="text-[12px] text-slate-700 hover:underline"
            >
              ເບິ່ງລູກຄ້າ →
            </Link>
          </div>
        </Card>

        <Card title="ສະຫຼຸບ">
          <Row label="ຫົວເລື່ອງ">{inv.description}</Row>
          <Row label="ສະກຸນເງິນ">{inv.currency}</Row>
          {inv.dueDate && (
            <Row label="ກຳນົດຈ່າຍ">{DATE_FMT.format(inv.dueDate)}</Row>
          )}
          <Row label="VAT">
            {inv.vatMode === "EXEMPT"
              ? "ຍົກເວັ້ນ"
              : `${(inv.vatRate * 100).toFixed(0)}% (${inv.vatMode})`}
          </Row>
          <Row label="ສ້າງເມື່ອ">{DATETIME_FMT.format(inv.createdAt)}</Row>
        </Card>

        {inv.status === "PAID" && (
          <Card title="ການຈ່າຍ" className="md:col-span-2">
            <Row label="ວິທີຈ່າຍ">
              {inv.paymentMethod === "CASH" ? "ເງິນສົດ" : "ໂອນ"}
            </Row>
            {inv.paymentRef && <Row label="Ref">{inv.paymentRef}</Row>}
            {inv.paidAt && (
              <Row label="ຈ່າຍວັນທີ">{DATETIME_FMT.format(inv.paidAt)}</Row>
            )}
          </Card>
        )}

        {inv.status === "UNPAID" && (
          <Card title="ບັນທຶກການຈ່າຍ" className="md:col-span-2">
            <MarkPaidForm id={inv.id} />
          </Card>
        )}
      </div>

      {/* Items preview */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden mb-4">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-[12px] uppercase tracking-widest text-gray-500 font-medium">
          ລາຍການ ({inv.items.length})
        </div>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase text-gray-500 bg-gray-50">
            <tr>
              <th className="text-left py-1.5 px-3">#</th>
              <th className="text-left py-1.5 px-3">ລາຍລະອຽດ</th>
              <th className="text-left py-1.5 px-3">ຫົວໜ່ວຍ</th>
              <th className="text-right py-1.5 px-3">ຈໍານວນ</th>
              <th className="text-right py-1.5 px-3">ລາຄາ</th>
              <th className="text-right py-1.5 px-3">ສ່ວນຫຼຸດ</th>
              <th className="text-right py-1.5 px-3">ລວມ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inv.items.map((it) => (
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
                <td className="py-1.5 px-3 text-right font-mono font-medium">
                  {it.total.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300">
              <td colSpan={6} className="py-1.5 px-3 text-right text-gray-600">
                ລວມຍ່ອຍ
              </td>
              <td className="py-1.5 px-3 text-right font-mono">
                {inv.subtotal.toLocaleString()}
              </td>
            </tr>
            {inv.discount > 0 && (
              <tr>
                <td colSpan={6} className="py-1 px-3 text-right text-gray-600">
                  ສ່ວນຫຼຸດ
                </td>
                <td className="py-1 px-3 text-right font-mono">
                  − {inv.discount.toLocaleString()}
                </td>
              </tr>
            )}
            {inv.vatMode !== "EXEMPT" && (
              <tr>
                <td colSpan={6} className="py-1 px-3 text-right text-gray-600">
                  VAT {(inv.vatRate * 100).toFixed(0)}%
                  {inv.vatMode === "INCLUSIVE" ? " (ລວມໃນ)" : ""}
                </td>
                <td className="py-1 px-3 text-right font-mono">
                  {inv.vatAmount.toLocaleString()}
                </td>
              </tr>
            )}
            <tr className="bg-red-50">
              <td colSpan={6} className="py-2 px-3 text-right font-medium">
                ລວມທັງໝົດ
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
            ໝາຍເຫດ
          </h3>
          <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
            {inv.notes}
          </p>
        </div>
      )}

      {inv.status !== "PAID" && (
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-4">
            ແກ້ໄຂໃບເກັບເງິນ
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
                productId: it.productId ?? "",
                description: it.description,
                unit: it.unit,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discount: it.discount,
              })),
            }}
          />
        </div>
      )}
    </div>
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
