"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { formatMoney, type Currency, CURRENCIES } from "@/lib/format";
import {
  createQuotation,
  updateQuotation,
  deleteQuotation,
  type QState,
} from "./actions";
import { t, type Locale } from "@/lib/i18n/messages";

export type CustomerOption = { id: string; code: string; name: string };
export type ProductOption = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceLak: number;
};

type LineKind = "product" | "section" | "note";
type Line = {
  kind: LineKind;
  productId: string;
  label: string;
  quantity: number;
  priceLak: number;
  discount: number;
  taxRate: number;
};

type VatMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";

type QuotationStep = "draft" | "sent" | "accepted" | "converted";

export type QuotationInitial = {
  id: string;
  number: string;
  status?:
    | "DRAFT"
    | "SENT"
    | "ACCEPTED"
    | "REJECTED"
    | "EXPIRED"
    | "CONVERTED";
  customerId: string;
  reference: string;
  validUntil: string;          // YYYY-MM-DD
  date: string;                 // YYYY-MM-DD
  currency: Currency;
  exchangeRate: number;
  discount: number;
  vatRate: number;
  vatMode: VatMode;
  note: string;
  items: {
    kind?: LineKind;
    productId?: string | null;
    label?: string;
    unit?: string;
    quantity: number;
    priceLak: number;
    discount: number;
    taxRate?: number;
  }[];
};

export function QuotationForm({
  customers,
  products,
  defaultVatRate,
  readOnly,
  initial,
  locale,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  defaultVatRate: number;
  readOnly?: boolean;
  initial?: QuotationInitial;
  locale: Locale;
}) {
  const tq = (k: string) => t(locale, "quotationForm", k);
  const tf = (k: string) => t(locale, "invoiceForm", k);
  const tc = (k: string) => t(locale, "common", k);
  const router = useRouter();
  const boundAction = initial
    ? updateQuotation.bind(null, initial.id)
    : (createQuotation as (
        prev: QState,
        fd: FormData,
      ) => Promise<QState>);
  const [state, formAction, pending] = useActionState<QState, FormData>(
    boundAction,
    undefined,
  );

  const [lines, setLines] = useState<Line[]>(
    initial
      ? initial.items.map((it) => ({
          kind: it.kind ?? "product",
          productId: it.productId ?? "",
          label: it.label ?? "",
          quantity: it.quantity,
          priceLak: it.priceLak,
          discount: it.discount,
          taxRate: it.taxRate ?? initial.vatRate,
        }))
      : [],
  );
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? defaultVatRate);
  const [vatMode, setVatMode] = useState<VatMode>(
    initial?.vatMode ?? "EXCLUSIVE",
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const [quotationDate, setQuotationDate] = useState(
    initial?.date?.slice(0, 10) ?? todayStr,
  );
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [currency, setCurrency] = useState<Currency>(
    initial?.currency ?? "LAK",
  );
  const [exchangeRate, setExchangeRate] = useState(initial?.exchangeRate ?? 1);
  const [activeTab, setActiveTab] = useState<"lines" | "other">("lines");
  const isEdit = !!initial;

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const productLines = lines.filter((l) => l.kind === "product");
  const subtotal = productLines.reduce(
    (s, l) => s + l.quantity * l.priceLak - l.discount,
    0,
  );
  const afterDiscount = Math.max(0, subtotal - discount);
  const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;
  const vatAmount =
    vatMode === "EXEMPT"
      ? 0
      : productLines.reduce((sum, line) => {
          const base =
            (line.quantity * line.priceLak - line.discount) * discountRatio;
          const lineTax =
            vatMode === "INCLUSIVE"
              ? (base * line.taxRate) / (1 + line.taxRate)
              : base * line.taxRate;
          return sum + lineTax;
        }, 0);
  const total =
    vatMode === "EXCLUSIVE" ? afterDiscount + vatAmount : afterDiscount;

  function addLine(kind: LineKind = "product") {
    setLines((ls) => [
      ...ls,
      {
        kind,
        productId: "",
        label: "",
        quantity: 1,
        priceLak: 0,
        discount: 0,
        taxRate: kind === "product" ? vatRate : 0,
      },
    ]);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((ls) => ls.filter((_, i) => i !== idx));
  }

  function selectProduct(idx: number, productId: string) {
    const p = productMap.get(productId);
    if (!p) return updateLine(idx, { productId });
    updateLine(idx, { productId, priceLak: p.priceLak, label: p.name });
  }

  const itemsForServer = lines.map((l) => ({
    kind: l.kind,
    productId: l.kind === "product" ? l.productId : "",
    label: l.label,
    quantity: l.quantity,
    priceLak: l.priceLak,
    discount: l.discount,
    taxRate: l.kind === "product" ? l.taxRate : 0,
  }));

  // Map enum status to the 4-step bar position. REJECTED/EXPIRED become a
  // side chip beside the bar rather than a fifth step (keeps the rhythm).
  const step: QuotationStep = (() => {
    switch (initial?.status) {
      case "SENT":
        return "sent";
      case "ACCEPTED":
        return "accepted";
      case "CONVERTED":
        return "converted";
      default:
        return "draft";
    }
  })();
  const sideChip =
    initial?.status === "REJECTED"
      ? { label: tq("rejected"), cls: "bg-red-50 text-red-700 border-red-200" }
      : initial?.status === "EXPIRED"
        ? {
            label: tq("expired"),
            cls: "bg-amber-50 text-amber-700 border-amber-200",
          }
        : null;

  return (
    <form action={formAction} className="odoo relative">
      <input type="hidden" name="items" value={JSON.stringify(itemsForServer)} />

      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/quotations" className="hover:underline">
          {tq("breadcrumb")}
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isEdit ? initial?.number ?? tf("editing") : tf("headingNew")}
        </span>
      </div>

      {/* Action / status bar */}
      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!readOnly && (
            <button
              type="submit"
              disabled={pending || productLines.length === 0}
              className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-odoo-hover disabled:opacity-50 transition tracking-wide"
            >
              {pending
                ? tc("saving")
                : isEdit
                  ? tc("save")
                  : tf("confirm")}
            </button>
          )}
          {isEdit && initial ? (
            <>
              <a
                href={`/api/quotations/${initial.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="text-odoo hover:bg-odoo/8 px-2.5 py-1 rounded text-[13px] font-medium"
                title={tf("previewTooltip")}
              >
                {tf("preview")}
              </a>
              <button
                type="button"
                onClick={() => {
                  const win = window.open(
                    `/api/quotations/${initial.id}/pdf`,
                    "_blank",
                  );
                  if (!win) alert(tf("popupBlocked"));
                }}
                className="text-odoo hover:bg-odoo/8 px-2.5 py-1 rounded text-[13px] font-medium"
              >
                {tf("print")}
              </button>
            </>
          ) : (
            <span className="text-gray-400 text-[12px] italic px-1.5">
              {tf("saveFirst")}
            </span>
          )}
          <span className="mx-1 text-gray-300">|</span>
          {isEdit && initial && !readOnly && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(tq("deleteConfirm"))) return;
                await deleteQuotation(initial.id);
              }}
              className="text-red-700 hover:bg-red-50 px-2.5 py-1 rounded text-[13px]"
            >
              {tq("delete")}
            </button>
          )}
          {!isEdit && (
            <button
              type="button"
              onClick={() => router.push("/quotations")}
              className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
            >
              {tc("cancel")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sideChip && (
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-medium border ${sideChip.cls}`}
            >
              {sideChip.label}
            </span>
          )}
          <StatusBar current={step} locale={locale} />
        </div>
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-8 pt-6 pb-2">
          <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            {isEdit ? tq("tagPosted") : tq("tagDraft")}
          </div>
          <h1 className="text-[28px] leading-tight font-light text-gray-900 mb-6">
            {isEdit ? (
              initial?.number
            ) : (
              <>
                QT/<span className="text-gray-400">####</span>
              </>
            )}
          </h1>

          {/* Header 2-col */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 mb-4">
            <div>
              <Field label={tf("customer")} required emphasis>
                <Combobox
                  name="customerId"
                  required
                  defaultValue={initial?.customerId ?? ""}
                  disabled={readOnly}
                  placeholder={tf("pickCustomer")}
                  emptyText={tf("noCustomer")}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    badge: c.code,
                    search: `${c.code} ${c.name}`,
                  }))}
                />
              </Field>
              <Field label={tf("shippingAddress")}>
                <input
                  className="o-input"
                  placeholder={tf("sameAsCustomer")}
                  disabled
                />
              </Field>
              <Field label={tf("reference")}>
                <input
                  name="reference"
                  defaultValue={initial?.reference ?? ""}
                  disabled={readOnly}
                  className="o-input"
                  placeholder={tq("referencePh")}
                />
              </Field>
            </div>
            <div>
              <Field label={tq("quotationDate")}>
                <input
                  type="date"
                  name="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  disabled={readOnly}
                  className="o-input"
                />
              </Field>
              <Field label={tq("validUntil")}>
                <input
                  type="date"
                  name="validUntil"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={readOnly}
                  className="o-input"
                />
              </Field>
              <Field label={tf("currency")}>
                <div className="flex gap-2 w-full items-center">
                  <select
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    disabled={readOnly}
                    className="o-input flex-1"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {currency !== "LAK" ? (
                    <input
                      type="number"
                      step="0.0001"
                      name="exchangeRate"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(+e.target.value)}
                      disabled={readOnly}
                      placeholder={tf("exchangeRate")}
                      className="o-input w-28"
                    />
                  ) : (
                    <input type="hidden" name="exchangeRate" value="1" />
                  )}
                </div>
              </Field>
              <Field label={tf("vatType")}>
                <select
                  name="vatMode"
                  value={vatMode}
                  onChange={(e) => setVatMode(e.target.value as VatMode)}
                  disabled={readOnly}
                  className="o-input"
                >
                  <option value="EXCLUSIVE">{tf("vatExclusive")}</option>
                  <option value="INCLUSIVE">{tf("vatInclusive")}</option>
                  <option value="EXEMPT">{tf("vatExempt")}</option>
                </select>
              </Field>
              {vatMode !== "EXEMPT" && (
                <Field label={tf("vatRate")}>
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      name="vatRate"
                      value={vatRate}
                      onChange={(e) => setVatRate(+e.target.value)}
                      disabled={readOnly}
                      className="o-input w-24"
                    />
                    <span className="text-[12px] text-gray-500">
                      {(vatRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </Field>
              )}
              {vatMode === "EXEMPT" && (
                <input type="hidden" name="vatRate" value="0" />
              )}
            </div>
          </div>

          {/* Notebook tabs */}
          <div className="border-b border-gray-200 mt-2">
            <div className="flex gap-1 text-[13px]">
              <TabBtn
                active={activeTab === "lines"}
                onClick={() => setActiveTab("lines")}
              >
                {tq("linesTab")}
              </TabBtn>
              <TabBtn
                active={activeTab === "other"}
                onClick={() => setActiveTab("other")}
              >
                {tf("tabOther")}
              </TabBtn>
            </div>
          </div>

          {/* Lines tab */}
          {activeTab === "lines" && (
            <div className="pt-2">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="px-1 py-2 text-left font-medium w-8"></th>
                    <th className="px-2 py-2 text-left font-medium">{tf("colProduct")}</th>
                    <th className="px-2 py-2 text-left font-medium">
                      {tf("colDescription")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tf("colQuantity")}
                    </th>
                    <th className="px-2 py-2 text-left font-medium w-14">
                      {tf("colUnit")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-28">
                      {tf("colPrice")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tf("colDiscount")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      VAT
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-32">
                      {tf("colSubtotal")}
                    </th>
                    <th className="px-1 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    if (line.kind === "section") {
                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 group bg-gray-50/40"
                        >
                          <td className="px-1 py-1.5 text-gray-300 cursor-grab text-center">
                            ⋮⋮
                          </td>
                          <td colSpan={8} className="px-2 py-1.5">
                            <input
                              value={line.label}
                              onChange={(e) =>
                                updateLine(idx, { label: e.target.value })
                              }
                              disabled={readOnly}
                              placeholder={tf("sectionPh")}
                              className="o-cell font-semibold text-gray-800 uppercase tracking-wide w-full"
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            {!readOnly && (
                              <RowDelete onClick={() => removeLine(idx)} />
                            )}
                          </td>
                        </tr>
                      );
                    }
                    if (line.kind === "note") {
                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 group"
                        >
                          <td className="px-1 py-1.5 text-gray-300 cursor-grab text-center">
                            ⋮⋮
                          </td>
                          <td colSpan={8} className="px-2 py-1.5">
                            <input
                              value={line.label}
                              onChange={(e) =>
                                updateLine(idx, { label: e.target.value })
                              }
                              disabled={readOnly}
                              placeholder={tf("notePh")}
                              className="o-cell italic text-gray-600 w-full"
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            {!readOnly && (
                              <RowDelete onClick={() => removeLine(idx)} />
                            )}
                          </td>
                        </tr>
                      );
                    }
                    const lineTotal =
                      line.quantity * line.priceLak - line.discount;
                    const product = productMap.get(line.productId);
                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 hover:bg-gray-50/60 group"
                      >
                        <td className="px-1 py-1.5 text-gray-300 cursor-grab text-center">
                          ⋮⋮
                        </td>
                        <td className="px-2 py-1.5">
                          <Combobox
                            value={line.productId}
                            onChange={(v) => selectProduct(idx, v)}
                            disabled={readOnly}
                            placeholder={tf("pickProduct")}
                            emptyText={tf("noProduct")}
                            triggerClassName="px-2 py-1 border border-transparent rounded text-[13px] hover:bg-white hover:border-gray-200 focus:outline-none focus:bg-white focus:border-odoo"
                            options={products.map((p) => ({
                              value: p.id,
                              label: p.name,
                              badge: p.code,
                              meta: `${p.priceLak.toLocaleString()} / ${p.unit}`,
                              search: `${p.code} ${p.name}`,
                            }))}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={line.label}
                            onChange={(e) =>
                              updateLine(idx, { label: e.target.value })
                            }
                            disabled={readOnly}
                            placeholder={tf("descriptionPh")}
                            className="o-cell text-gray-600"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(idx, { quantity: +e.target.value })
                            }
                            disabled={readOnly}
                            className="o-cell text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-[12px] text-gray-500">
                          {product?.unit ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.priceLak}
                            onChange={(e) =>
                              updateLine(idx, { priceLak: +e.target.value })
                            }
                            disabled={readOnly}
                            className="o-cell text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.discount}
                            onChange={(e) =>
                              updateLine(idx, { discount: +e.target.value })
                            }
                            disabled={readOnly}
                            className="o-cell text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={line.taxRate}
                            onChange={(e) =>
                              updateLine(idx, { taxRate: +e.target.value })
                            }
                            disabled={readOnly || vatMode === "EXEMPT"}
                            className="o-cell text-right tabular-nums"
                            title={`${(line.taxRate * 100).toFixed(0)}%`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-gray-800">
                          {formatMoney(lineTotal)}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {!readOnly && (
                            <RowDelete onClick={() => removeLine(idx)} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Add row links */}
              {!readOnly && (
                <div className="flex gap-5 mt-1 pl-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => addLine("product")}
                    className="text-odoo hover:text-odoo-hover font-medium"
                  >
                    {tf("addLine")}
                  </button>
                  <button
                    type="button"
                    onClick={() => addLine("section")}
                    className="text-odoo hover:text-odoo-hover"
                  >
                    {tf("addSection")}
                  </button>
                  <button
                    type="button"
                    onClick={() => addLine("note")}
                    className="text-odoo hover:text-odoo-hover"
                  >
                    {tf("addNote")}
                  </button>
                </div>
              )}

              {/* Totals widget bottom-right */}
              <div className="mt-6 flex justify-end pb-4">
                <div className="w-full md:w-[340px] text-[13px]">
                  <SumRow
                    label={
                      vatMode === "INCLUSIVE"
                        ? tf("subtotalInclVat")
                        : tf("subtotalExclVat")
                    }
                    value={formatMoney(subtotal)}
                  />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">{tf("invoiceDiscount")}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="discount"
                      value={discount}
                      onChange={(e) => setDiscount(+e.target.value)}
                      disabled={readOnly}
                      className="o-cell w-28 text-right tabular-nums"
                    />
                  </div>
                  {vatMode === "EXEMPT" ? (
                    <div className="flex justify-between items-center py-1 text-gray-500 italic">
                      <span>VAT</span>
                      <span>{tf("vatExemptShort")}</span>
                    </div>
                  ) : (
                    <SumRow
                      label={`VAT ${
                        vatMode === "INCLUSIVE" ? `(${tf("vatInclusiveShort")})` : ""
                      }`.trim()}
                      value={formatMoney(vatAmount)}
                    />
                  )}
                  <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      {tf("grandTotal")}
                    </span>
                    <span className="font-semibold text-[18px] text-gray-900 tabular-nums">
                      {formatMoney(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other info tab */}
          {activeTab === "other" && (
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-16">
              <div>
                <Field label={tf("paymentTerm")}>
                  <input className="o-input" placeholder="..." />
                </Field>
                <Field label={tf("salesPerson")}>
                  <input className="o-input" placeholder="..." />
                </Field>
              </div>
              <div>
                <Field label={tf("journal")}>
                  <input
                    className="o-input"
                    defaultValue={tq("journalDefault")}
                    disabled
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="border-t border-gray-100 mt-4 pt-4 pb-6">
            <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
              {tf("termsTab")}
            </label>
            <textarea
              name="note"
              rows={3}
              defaultValue={initial?.note ?? ""}
              disabled={readOnly}
              className="o-input w-full resize-none"
              placeholder={tf("termsPlaceholder")}
            />
          </div>

          {state?.error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {state.error}
            </div>
          )}
        </div>

        {/* Chatter placeholder */}
        <div className="border-t border-gray-200 bg-gray-50/50 px-8 py-3 rounded-b-md flex gap-4 text-[13px] text-gray-500">
          <button
            type="button"
            className="hover:text-odoo flex items-center gap-1"
          >
            <span>✉</span> {tf("chatMessage")}
          </button>
          <button
            type="button"
            className="hover:text-odoo flex items-center gap-1"
          >
            <span>📝</span> {tf("chatNote")}
          </button>
          <button
            type="button"
            className="hover:text-odoo flex items-center gap-1"
          >
            <span>👥</span> {tf("chatFollow")}
          </button>
        </div>
      </div>

      <style>{`
        .odoo { color: #1f2937; }
        .o-input {
          width: 100%;
          padding: 0.3rem 0.4rem;
          border: 1px solid transparent;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0;
          font-size: 13px;
          background: transparent;
          color: #1f2937;
          transition: all 0.12s;
        }
        .o-input:hover:not(:disabled) { border-bottom-color: #9ca3af; }
        .o-input:focus {
          outline: none;
          border-color: transparent;
          border-bottom-color: var(--odoo-primary);
          background: #fff;
          box-shadow: 0 1px 0 0 var(--odoo-primary);
        }
        .o-input:disabled { color: #9ca3af; cursor: not-allowed; }
        .o-cell {
          width: 100%;
          padding: 0.25rem 0.35rem;
          border: 1px solid transparent;
          border-radius: 2px;
          font-size: 13px;
          background: transparent;
          transition: all 0.1s;
        }
        .o-cell:hover { background: #fff; border-color: #e5e7eb; }
        .o-cell:focus {
          outline: none;
          background: #fff;
          border-color: var(--odoo-primary);
          box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.14);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  emphasis,
  children,
}: {
  label: string;
  required?: boolean;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-0.5">
      <label
        className={`text-[13px] ${emphasis ? "text-gray-700 font-medium" : "text-gray-500"}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div>{children}</div>
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
  locale,
}: {
  current: QuotationStep;
  locale: Locale;
}) {
  const tq = (k: string) => t(locale, "quotationForm", k);
  const steps: { key: QuotationStep; label: string }[] = [
    { key: "draft", label: tq("stepDraft") },
    { key: "sent", label: tq("stepSent") },
    { key: "accepted", label: tq("stepAccepted") },
    { key: "converted", label: tq("stepConverted") },
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
                  ? "bg-odoo text-white"
                  : "text-gray-400 hover:text-gray-600"
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

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 border-b-2 -mb-px transition ${
        active
          ? "border-odoo text-odoo font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function RowDelete({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition text-lg leading-none"
      title="ລົບແຖວ"
    >
      ×
    </button>
  );
}
