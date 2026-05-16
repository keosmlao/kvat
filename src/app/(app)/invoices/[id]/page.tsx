import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney, type Currency } from "@/lib/format";
import { CancelInvoiceButton } from "./cancel-button";
import { DeleteInvoiceButton } from "./delete-button";
import { Chatter } from "@/components/chatter";
import { getChatterData } from "@/lib/chatter";
import { getFeatures } from "@/lib/features";
import { isEtaxConfigured } from "@/lib/etax";
import { EtaxPanel } from "./etax-panel";
import {
  CreditNoteButton,
  ResetToDraftButton,
  PostInvoiceButton,
} from "./credit-note-button";

export default async function InvoiceDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        items: true,
        reversed: { select: { id: true, number: true } },
        reversals: { select: { id: true, number: true } },
      },
    }),
    prisma.setting.findUnique({ where: { id: "default" } }),
  ]);

  if (!invoice) notFound();

  // Smart button counts
  const [customerInvoiceCount, customerCreditCount] = await Promise.all([
    prisma.invoice.count({
      where: {
        customerId: invoice.customerId,
        isCreditNote: false,
        NOT: { id: invoice.id },
      },
    }),
    prisma.invoice.count({
      where: { customerId: invoice.customerId, isCreditNote: true },
    }),
  ]);

  const features = await getFeatures();
  const chatter = features.chatter
    ? await getChatterData("invoice", id)
    : null;

  const currency = invoice.currency as Currency;
  const inCurrency = (lakAmount: number) =>
    currency === "LAK" ? lakAmount : lakAmount / invoice.exchangeRate;

  const status = invoice.status;
  const isCreditNote = invoice.isCreditNote;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2 no-print">
        <Link href="/invoices" className="hover:underline">
          ບິນອາກອນລູກຄ້າ
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">{invoice.number}</span>
        {isCreditNote && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 border border-orange-200 font-medium uppercase tracking-wider">
            ໃບລົດໜີ້
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex items-center justify-between no-print">
        <div className="flex items-center gap-1.5 flex-wrap">
          {status === "DRAFT" && <PostInvoiceButton id={invoice.id} />}
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={`${
              status === "DRAFT"
                ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                : "bg-[#b91c1c] text-white hover:bg-[#991b1b]"
            } px-3 py-1 rounded text-[13px] font-medium transition tracking-wide inline-flex items-center gap-1.5`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            PDF
          </a>
          {status === "ISSUED" && !isCreditNote && (
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
            >
              ແກ້ໄຂ
            </Link>
          )}
          {status === "ISSUED" && !isCreditNote && (
            <ResetToDraftButton id={invoice.id} />
          )}
          {status === "ISSUED" && !isCreditNote && features.creditNotes && (
            <CreditNoteButton id={invoice.id} />
          )}
          {status === "ISSUED" && <CancelInvoiceButton id={invoice.id} />}
          <DeleteInvoiceButton id={invoice.id} />
          <span className="mx-1 text-gray-300">|</span>
          <Link
            href="/invoices"
            className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
          >
            ກັບໄປ
          </Link>
        </div>
        <StatusBar current={status} isCreditNote={isCreditNote} />
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm print:shadow-none print:border-0 print:rounded-none print:border-x-0 print:border-b-0">
        <div className="px-8 md:px-12 pt-8 pb-8">
          {/* Reversal references */}
          {invoice.reversed && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded p-2.5 text-[13px] no-print">
              ໃບລົດໜີ້ນີ້ກ່ຽວກັບບິນ:{" "}
              <Link
                href={`/invoices/${invoice.reversed.id}`}
                className="font-mono text-[#b91c1c] hover:underline"
              >
                {invoice.reversed.number}
              </Link>
            </div>
          )}
          {invoice.reversals.length > 0 && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded p-2.5 text-[13px] no-print">
              ມີໃບລົດໜີ້:{" "}
              {invoice.reversals.map((r, i) => (
                <span key={r.id}>
                  <Link
                    href={`/invoices/${r.id}`}
                    className="font-mono text-[#b91c1c] hover:underline"
                  >
                    {r.number}
                  </Link>
                  {i < invoice.reversals.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}

          {/* Smart buttons (Odoo-style) */}
          <div className="flex justify-end gap-2 mb-4 no-print flex-wrap">
            <button type="button" className="o-smart-btn" title="ໃບລົດໜີ້ທີ່ກ່ຽວ">
              <span className="o-smart-icon">↩</span>
              <div className="leading-tight">
                <div className="o-smart-value">{invoice.reversals.length}</div>
                <div className="o-smart-label">ໃບລົດໜີ້</div>
              </div>
            </button>
            <a
              href={`/customers/${invoice.customerId}/edit`}
              className="o-smart-btn"
              title={`ບິນອື່ນຂອງລູກຄ້າ ${invoice.customer.name}`}
            >
              <span className="o-smart-icon">📋</span>
              <div className="leading-tight">
                <div className="o-smart-value">{customerInvoiceCount}</div>
                <div className="o-smart-label">ບິນອື່ນ</div>
              </div>
            </a>
            {customerCreditCount > 0 && (
              <button
                type="button"
                className="o-smart-btn"
                title="ໃບລົດໜີ້ຂອງລູກຄ້ານີ້"
              >
                <span className="o-smart-icon">📑</span>
                <div className="leading-tight">
                  <div className="o-smart-value">{customerCreditCount}</div>
                  <div className="o-smart-label">ລົດໜີ້ລູກຄ້າ</div>
                </div>
              </button>
            )}
          </div>

          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
            <div>
              <h1 className="text-[22px] font-semibold text-gray-900">
                {settings?.shopName ?? "ຮ້ານຄ້າ"}
              </h1>
              {settings?.shopNameEn && (
                <p className="text-[13px] text-gray-600">
                  {settings.shopNameEn}
                </p>
              )}
              <div className="text-[12px] text-gray-600 mt-2 space-y-0.5">
                {settings?.address && <div>{settings.address}</div>}
                {settings?.phone && <div>ໂທ: {settings.phone}</div>}
                {settings?.taxId && (
                  <div>ເລກອາກອນ: {settings.taxId}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
                {isCreditNote ? "ໃບລົດໜີ້" : "ໃບບິນອາກອນ"}
              </div>
              <h2 className="text-[28px] leading-tight font-light text-gray-900">
                {invoice.number}
              </h2>
              <p className="text-[12px] text-gray-500 mt-1">
                {isCreditNote ? "CREDIT NOTE" : "TAX INVOICE"}
              </p>
            </div>
          </div>

          {/* Customer + meta */}
          <div className="grid grid-cols-2 gap-x-12 mb-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ລູກຄ້າ
              </div>
              <div className="font-semibold text-gray-900">
                {invoice.customer.name}
              </div>
              {invoice.customer.taxId && (
                <div className="text-[12px] text-gray-600">
                  ເລກອາກອນ: {invoice.customer.taxId}
                </div>
              )}
              {invoice.customer.address && (
                <div className="text-[12px] text-gray-600">
                  {invoice.customer.address}
                </div>
              )}
              {invoice.customer.phone && (
                <div className="text-[12px] text-gray-600">
                  ໂທ: {invoice.customer.phone}
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ຂໍ້ມູນບິນ
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-y-0.5 text-[13px]">
                <div className="text-gray-500">ວັນທີ:</div>
                <div className="text-gray-800">
                  {formatDateTime(invoice.date)}
                </div>
                {invoice.dueDate && (
                  <>
                    <div className="text-gray-500">ຄົບກຳນົດ:</div>
                    <div className="text-gray-800">
                      {formatDateTime(invoice.dueDate)}
                    </div>
                  </>
                )}
                <div className="text-gray-500">ສະກຸນເງິນ:</div>
                <div className="text-gray-800">{invoice.currency}</div>
                {invoice.currency !== "LAK" && (
                  <>
                    <div className="text-gray-500">ອັດຕາແລກ:</div>
                    <div className="text-gray-800">
                      {invoice.exchangeRate.toLocaleString()} ກີບ/
                      {invoice.currency}
                    </div>
                  </>
                )}
                <div className="text-gray-500">ການຊຳລະ:</div>
                <div className="text-gray-800">
                  {invoice.paymentMethod === "TRANSFER" ? (
                    <>
                      🏦 ໂອນ
                      {invoice.paymentRef && (
                        <span className="text-gray-500 text-[12px] ml-1">
                          ({invoice.paymentRef})
                        </span>
                      )}
                    </>
                  ) : (
                    "💵 ເງິນສົດ"
                  )}
                </div>
                <div className="text-gray-500">ຜູ້ອອກ:</div>
                <div className="text-gray-800">{invoice.user.name}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-[13px] border-t border-b border-gray-200 mb-6">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="text-left py-2 w-10">#</th>
                <th className="text-left py-2">ສິນຄ້າ</th>
                <th className="text-right py-2 w-24">ຈຳນວນ</th>
                <th className="text-right py-2 w-32">ລາຄາ</th>
                <th className="text-right py-2 w-32">ລວມ</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr
                  key={it.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-2 text-gray-500">{i + 1}</td>
                  <td className="py-2">
                    <div className="font-medium text-gray-800">
                      {it.productName}
                    </div>
                    {it.discount > 0 && (
                      <div className="text-[11px] text-gray-500">
                        ສ່ວນຫຼຸດ: {formatMoney(it.discount)}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(inCurrency(it.priceLak), currency)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {formatMoney(inCurrency(it.total), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-[340px] text-[13px]">
              <SumRow
                label={
                  invoice.vatMode === "INCLUSIVE"
                    ? "ມູນຄ່າ (ລວມ VAT)"
                    : "ມູນຄ່າກ່ອນພາສີ"
                }
                value={formatMoney(inCurrency(invoice.subtotal), currency)}
              />
              {invoice.discount > 0 && (
                <SumRow
                  label="ສ່ວນຫຼຸດ"
                  value={`- ${formatMoney(inCurrency(invoice.discount), currency)}`}
                />
              )}
              {invoice.vatMode === "EXEMPT" ? (
                <div className="flex justify-between items-center py-1 text-gray-500 italic">
                  <span>VAT</span>
                  <span>ຍົກເວັ້ນ</span>
                </div>
              ) : (
                <SumRow
                  label={`VAT ${(invoice.vatRate * 100).toFixed(0)}%${
                    invoice.vatMode === "INCLUSIVE" ? " (ລວມໃນ)" : ""
                  }`}
                  value={formatMoney(inCurrency(invoice.vatAmount), currency)}
                />
              )}
              <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  ມູນຄ່າທັງໝົດ
                </span>
                <span className="font-semibold text-[18px] text-gray-900 tabular-nums">
                  {formatMoney(inCurrency(invoice.total), currency)}
                </span>
              </div>
            </div>
          </div>

          {/* eTax — only when configured and status=ISSUED (not credit-noted? CN can be submitted too) */}
          {isEtaxConfigured() && status === "ISSUED" && (
            <EtaxPanel
              invoiceId={invoice.id}
              initial={{
                serialNum: invoice.etaxSerialNum,
                invoiceNumber: invoice.etaxInvoiceNumber,
                issueTime: invoice.etaxIssueTime,
                checkCode: invoice.etaxCheckCode,
                qrUrl: invoice.etaxQrUrl,
                status: invoice.etaxStatus,
                statusReason: invoice.etaxStatusReason,
                submittedAt: invoice.etaxSubmittedAt,
                lastCheckedAt: invoice.etaxLastCheckedAt,
                errorCode: invoice.etaxErrorCode,
                errorMsg: invoice.etaxErrorMsg,
              }}
            />
          )}

          {/* Note */}
          {invoice.note && (
            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ໝາຍເຫດ
              </div>
              <div className="text-[13px] text-gray-700">{invoice.note}</div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-12 pt-8">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 text-[13px] text-gray-600">
                ລາຍເຊັນຜູ້ຮັບ
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 text-[13px] text-gray-600">
                ລາຍເຊັນຜູ້ອອກ
              </div>
            </div>
          </div>
        </div>

        {chatter && (
          <div className="no-print">
            <Chatter
              recordType="invoice"
              recordId={id}
              revalidate={`/invoices/${id}`}
              messages={chatter.messages}
              activities={chatter.activities}
              followers={chatter.followers}
              users={chatter.users}
              isFollowing={chatter.isFollowing}
              currentUserId={chatter.currentUserId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums text-gray-800">{value}</span>
    </div>
  );
}

function StatusBar({
  current,
  isCreditNote,
}: {
  current: string;
  isCreditNote: boolean;
}) {
  if (isCreditNote) {
    return (
      <span className="px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium bg-orange-500 text-white">
        ໃບລົດໜີ້
      </span>
    );
  }
  const steps = [
    { key: "DRAFT", label: "ຮ່າງ" },
    { key: "ISSUED", label: "ອອກບິນ" },
    { key: "CANCELLED", label: "ຍົກເລີກ", danger: true },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const active = s.key === current;
        return (
          <div key={s.key} className="flex items-center">
            <span
              className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
                active
                  ? s.danger
                    ? "bg-red-700 text-white"
                    : "bg-[#b91c1c] text-white"
                  : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-gray-300 text-xs">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
