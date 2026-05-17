"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { t } from "@/lib/i18n/messages";
import {
  createBillingQuote,
  deleteBillingQuote,
  updateBillingQuote,
  type QuoteState,
} from "./actions";
import { BillingQuoteStatus } from "@/generated/master/enums";

const tm = (k: string) => t("lo", "manage", k);

export type CustomerOption = {
  id: string;
  code: string;
  name: string;
  type: "TENANT" | "EXTERNAL";
};

export type ProductOption = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceLak: number;
};

type VatMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
type LineKind = "product" | "section" | "note";
type Line = {
  kind: LineKind;
  productId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

type Initial = {
  number?: string;
  customerId: string;
  title: string;
  currency: "LAK" | "USD" | "THB";
  vatMode: VatMode;
  vatRate: number;
  discount: number;
  validUntil: string;
  notes: string;
    items: Line[];
};

const STATUS_STEPS: BillingQuoteStatus[] = [
  BillingQuoteStatus.DRAFT,
  BillingQuoteStatus.SENT,
  BillingQuoteStatus.ACCEPTED,
];

const STATUS_LABEL: Record<BillingQuoteStatus, string> = {
  DRAFT: tm("qStatusDraft"),
  SENT: tm("qStatusSent"),
  ACCEPTED: tm("qStatusAccepted"),
  REJECTED: tm("qStatusRejected"),
  CANCELLED: tm("qStatusCancelled"),
};

function money(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export function BillingQuoteForm({
  mode,
  id,
  status,
  customers,
  products,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  status?: BillingQuoteStatus;
  customers: CustomerOption[];
  products: ProductOption[];
  initial: Initial;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const action =
    mode === "create"
      ? (createBillingQuote as (
          prev: QuoteState,
          fd: FormData,
        ) => Promise<QuoteState>)
      : updateBillingQuote.bind(null, id!);
  const [state, formAction, pending] = useActionState<QuoteState, FormData>(
    action,
    undefined,
  );

  const [lines, setLines] = useState<Line[]>(
    initial.items.length > 0
      ? initial.items.map((line) => ({
          ...line,
          kind: line.kind ?? "product",
          taxRate: line.taxRate ?? initial.vatRate,
        }))
      : [
          {
            kind: "product",
            productId: "",
            description: "",
            unit: tm("qDefaultUnit"),
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            taxRate: initial.vatRate,
          },
        ],
  );
  const [currency, setCurrency] = useState(initial.currency);
  const [vatMode, setVatMode] = useState<VatMode>(initial.vatMode);
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const [discount, setDiscount] = useState(initial.discount);
  const [tab, setTab] = useState<"lines" | "other">("lines");

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const subtotal = lines.reduce(
    (sum, line) =>
      line.kind !== "product"
        ? sum
        : sum + Math.max(0, line.quantity * line.unitPrice - line.discount),
    0,
  );
  const afterDiscount = Math.max(0, subtotal - discount);
  const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;
  const vatAmount =
    vatMode === "EXEMPT"
      ? 0
      : lines.reduce((sum, line) => {
          if (line.kind !== "product") return sum;
          const base =
            Math.max(0, line.quantity * line.unitPrice - line.discount) *
            discountRatio;
          const tax =
            vatMode === "INCLUSIVE"
              ? (base * line.taxRate) / (1 + line.taxRate)
              : base * line.taxRate;
          return sum + tax;
        }, 0);
  const total = vatMode === "EXCLUSIVE" ? afterDiscount + vatAmount : afterDiscount;

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addLine(kind: LineKind = "product") {
    setLines((current) => [
      ...current,
      {
        kind,
        productId: "",
        description: "",
        unit: kind === "product" ? tm("qDefaultUnit") : "",
        quantity: kind === "product" ? 1 : 0,
        unitPrice: 0,
        discount: 0,
        taxRate: kind === "product" ? vatRate : 0,
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  function selectProduct(index: number, productId: string) {
    const product = productMap.get(productId);
    if (!product) return updateLine(index, { productId });
    updateLine(index, {
      productId,
      description: product.name,
      unit: product.unit,
      unitPrice: product.priceLak,
    });
  }

  return (
    <form action={formAction} className="odoo text-gray-800">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="vatMode" value={vatMode} />
      <input type="hidden" name="vatRate" value={vatRate} />
      <input type="hidden" name="discount" value={discount} />

      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/manage/quotes" className="hover:underline">
          {tm("qBreadcrumb")}
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isEdit ? initial.number ?? tm("qEditWord") : tm("qNewWord")}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="submit"
            disabled={pending || lines.length === 0}
            className="bg-[#875a7b] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#74486a] disabled:opacity-50"
          >
            {pending ? tm("saving") : isEdit ? tm("save") : tm("subCreate")}
          </button>
          {isEdit && id && status !== BillingQuoteStatus.ACCEPTED && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(tm("qDeleteConfirm"))) return;
                await deleteBillingQuote(id);
              }}
              className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
            >
              {tm("delete")}
            </button>
          )}
          {!isEdit && (
            <button
              type="button"
              onClick={() => router.push("/manage/quotes")}
              className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
            >
              {tm("cancel")}
            </button>
          )}
        </div>
        <StatusBar current={status ?? BillingQuoteStatus.DRAFT} />
      </div>

      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-8 pt-6 pb-2">
          <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            {isEdit ? tm("qHeaderTitle") : tm("qHeaderDraft")}
          </div>
          <h1 className="text-[28px] leading-tight font-light text-gray-900 mb-6">
            {isEdit ? (
              initial.number
            ) : (
              <>
                QT/<span className="text-gray-400">####</span>
              </>
            )}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 mb-4">
            <div>
              <Field label={tm("qCustomer")} required emphasis>
                <Combobox
                  name="customerId"
                  required
                  defaultValue={initial.customerId}
                  placeholder={tm("qPickCustomer")}
                  emptyText={tm("qNoCustomer")}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    badge: c.code,
                    meta: c.type === "TENANT" ? tm("qTenantLabel") : tm("qExternalLabel"),
                    search: `${c.code} ${c.name}`,
                  }))}
                />
              </Field>
              <Field label={tm("qTitle")}>
                <input
                  name="title"
                  required
                  defaultValue={initial.title}
                  className="o-input"
                  placeholder={tm("qTitlePh")}
                />
              </Field>
              <Field label={tm("qExpires")}>
                <input
                  type="date"
                  name="validUntil"
                  defaultValue={initial.validUntil}
                  className="o-input"
                />
              </Field>
            </div>
            <div>
              <Field label={tm("subCurrency")}>
                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value as Initial["currency"])
                  }
                  className="o-input"
                >
                  <option value="LAK">LAK</option>
                  <option value="USD">USD</option>
                  <option value="THB">THB</option>
                </select>
              </Field>
              <Field label={tm("qVatType")}>
                <select
                  value={vatMode}
                  onChange={(e) => setVatMode(e.target.value as VatMode)}
                  className="o-input"
                >
                  <option value="EXCLUSIVE">{tm("qVatExclusive")}</option>
                  <option value="INCLUSIVE">{tm("qVatInclusive")}</option>
                  <option value="EXEMPT">{tm("qVatExempt")}</option>
                </select>
              </Field>
              {vatMode !== "EXEMPT" && (
                <Field label={tm("qVatLabel")}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={vatRate}
                      onChange={(e) => setVatRate(+e.target.value)}
                      className="o-input w-24"
                    />
                    <span className="text-[12px] text-gray-500">
                      {(vatRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </Field>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 mt-2">
            <div className="flex gap-1 text-[13px]">
              <Tab active={tab === "lines"} onClick={() => setTab("lines")}>
                {tm("qTabLines")}
              </Tab>
              <Tab active={tab === "other"} onClick={() => setTab("other")}>
                {tm("qTabOther")}
              </Tab>
            </div>
          </div>

          {tab === "lines" && (
            <div className="pt-2">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="px-2 py-2 text-left font-medium">{tm("qColProduct")}</th>
                    <th className="px-2 py-2 text-left font-medium">
                      {tm("qColDescription")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tm("qColQty")}
                    </th>
                    <th className="px-2 py-2 text-left font-medium w-16">
                      {tm("qColUnit")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-28">
                      {tm("qColPrice")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tm("qColDiscount")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tm("qColVat")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-32">
                      {tm("qColTotal")}
                    </th>
                    <th className="w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    if (line.kind === "section" || line.kind === "note") {
                      return (
                        <tr
                          key={index}
                          className={
                            line.kind === "section"
                              ? "border-b border-gray-100 bg-gray-50/50 group"
                              : "border-b border-gray-100 group"
                          }
                        >
                          <td colSpan={8} className="px-2 py-1.5">
                            <input
                              value={line.description}
                              onChange={(e) =>
                                updateLine(index, {
                                  description: e.target.value,
                                })
                              }
                              className={`o-cell w-full ${
                                line.kind === "section"
                                  ? "font-semibold text-gray-800 uppercase tracking-wide"
                                  : "italic text-gray-600"
                              }`}
                              placeholder={
                                line.kind === "section"
                                  ? tm("qSectionPh")
                                  : tm("qNotePh")
                              }
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              className="text-gray-300 hover:text-red-600"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    const lineTotal = Math.max(
                      0,
                      line.quantity * line.unitPrice - line.discount,
                    );
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50/60"
                      >
                        <td className="px-2 py-1.5">
                          <Combobox
                            value={line.productId}
                            onChange={(value) => selectProduct(index, value)}
                            placeholder={tm("qPickProduct")}
                            emptyText={tm("qNoProductFound")}
                            triggerClassName="px-2 py-1 border border-transparent rounded text-[13px] hover:bg-white hover:border-gray-200 focus:outline-none focus:bg-white focus:border-[#875a7b]"
                            options={products.map((p) => ({
                              value: p.id,
                              label: p.name,
                              badge: p.code,
                              meta: `${money(p.priceLak)} / ${p.unit}`,
                              search: `${p.code} ${p.name}`,
                            }))}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={line.description}
                            onChange={(e) =>
                              updateLine(index, { description: e.target.value })
                            }
                            className="o-cell"
                            placeholder={tm("qDescPh")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(index, { quantity: +e.target.value })
                            }
                            className="o-cell text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={line.unit}
                            onChange={(e) =>
                              updateLine(index, { unit: e.target.value })
                            }
                            className="o-cell text-[12px] text-gray-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(index, { unitPrice: +e.target.value })
                            }
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
                              updateLine(index, { discount: +e.target.value })
                            }
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
                              updateLine(index, { taxRate: +e.target.value })
                            }
                            className="o-cell text-right tabular-nums"
                            disabled={vatMode === "EXEMPT"}
                            title={`${(line.taxRate * 100).toFixed(0)}%`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {money(lineTotal)}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="text-gray-300 hover:text-red-600"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex gap-5 mt-2 ml-2 text-[13px]">
                <button
                  type="button"
                  onClick={() => addLine("product")}
                  className="text-[#875a7b] hover:text-[#74486a] font-medium"
                >
                  {tm("qAddLine")}
                </button>
                <button
                  type="button"
                  onClick={() => addLine("section")}
                  className="text-[#875a7b] hover:text-[#74486a]"
                >
                  {tm("qAddSection")}
                </button>
                <button
                  type="button"
                  onClick={() => addLine("note")}
                  className="text-[#875a7b] hover:text-[#74486a]"
                >
                  {tm("qAddNote")}
                </button>
              </div>

              <div className="mt-6 flex justify-end pb-4">
                <div className="w-full md:w-[340px] text-[13px]">
                  <Sum label={tm("qSumSubtotal")} value={money(subtotal)} />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">{tm("qSumDiscount")}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(+e.target.value)}
                      className="o-cell w-28 text-right tabular-nums"
                    />
                  </div>
                  {vatMode === "EXEMPT" ? (
                    <Sum label={tm("qVatLabel")} value={tm("qSumVatExempt")} muted />
                  ) : (
                    <Sum
                      label={tm("qSumVatPerLine")}
                      value={money(vatAmount)}
                    />
                  )}
                  <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center">
                    <span className="font-semibold">{tm("qSumGrandTotal")}</span>
                    <span className="font-semibold text-[18px] tabular-nums">
                      {money(total)} {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "other" && (
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-16">
              <Field label={tm("qStatusLabel")}>
                <input
                  className="o-input"
                  value={STATUS_LABEL[status ?? BillingQuoteStatus.DRAFT]}
                  disabled
                  readOnly
                />
              </Field>
              <Field label={tm("qDocLabel")}>
                <input className="o-input" value={tm("qHeaderTitle")} disabled readOnly />
              </Field>
            </div>
          )}

          <div className="border-t border-gray-100 mt-4 pt-4 pb-6">
            <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
              {tm("qNotesLabel")}
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={initial.notes}
              className="o-input w-full resize-none"
              placeholder={tm("qNotesPh")}
            />
          </div>

          {state?.error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-sm">
              {state.success}
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 bg-gray-50/50 px-8 py-3 rounded-b-md text-[13px] text-gray-500">
          {tm("qFooter")}
        </div>
      </div>

      <style>{`
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
          border-bottom-color: #875a7b;
          background: #fff;
          box-shadow: 0 1px 0 0 #875a7b;
        }
        .o-input:disabled { color: #9ca3af; cursor: not-allowed; }
        .o-cell {
          width: 100%;
          padding: 0.25rem 0.35rem;
          border: 1px solid transparent;
          border-radius: 2px;
          font-size: 13px;
          background: transparent;
        }
        .o-cell:hover { background: #fff; border-color: #e5e7eb; }
        .o-cell:focus {
          outline: none;
          background: #fff;
          border-color: #875a7b;
          box-shadow: 0 0 0 2px rgba(135, 90, 123, 0.12);
        }
      `}</style>
    </form>
  );
}

function StatusBar({ current }: { current: BillingQuoteStatus }) {
  return (
    <div className="flex items-center text-[12px]">
      {STATUS_STEPS.map((step, index) => {
        const active = current === step;
        const done =
          STATUS_STEPS.indexOf(current) > index ||
          current === BillingQuoteStatus.ACCEPTED;
        return (
          <div
            key={step}
            className={`px-3 py-1 border-y border-r first:border-l first:rounded-l last:rounded-r ${
              active
                ? "bg-[#875a7b] text-white border-[#875a7b]"
                : done
                  ? "bg-[#875a7b]/10 text-[#875a7b] border-[#875a7b]/20"
                  : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            {STATUS_LABEL[step]}
          </div>
        );
      })}
      {(current === BillingQuoteStatus.REJECTED ||
        current === BillingQuoteStatus.CANCELLED) && (
        <div className="ml-2 px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700">
          {STATUS_LABEL[current]}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  required,
  emphasis,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-center min-h-[34px]">
      <label
        className={`text-[12px] ${emphasis ? "font-medium text-gray-700" : "text-gray-500"}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

function Tab({
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
      className={`px-3 py-2 border-b-2 -mb-px ${
        active
          ? "border-[#875a7b] text-[#875a7b] font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function Sum({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center py-1 ${muted ? "text-gray-500 italic" : ""}`}
    >
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
