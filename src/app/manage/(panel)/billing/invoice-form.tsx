"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { t } from "@/lib/i18n/messages";
import {
  createBillingInvoice,
  updateBillingInvoice,
  cancelBillingInvoice,
  deleteBillingInvoice,
  type BillingState,
} from "./actions";

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

type LineKind = "product" | "section" | "note";
type Line = {
  kind: LineKind;
  productId: string;
  label: string;          // free-text description (also used for section/note text)
  unit: string;
  quantity: number;
  priceLak: number;
  discount: number;
  taxRate: number;
};

type VatMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
type Initial = {
  number?: string;          // shown in heading on edit; placeholder on create
  customerId: string;
  description: string;
  currency: "LAK" | "USD" | "THB";
  vatMode: VatMode;
  vatRate: number;
  invoiceDiscount: number;
  dueDate: string;
  notes: string;
  items: {
    kind?: LineKind;
    productId?: string | null;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate?: number;
  }[];
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n);
}

export function BillingInvoiceForm({
  mode,
  id,
  status,
  customers,
  products,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  status?: "UNPAID" | "PAID" | "CANCELLED";
  customers: CustomerOption[];
  products: ProductOption[];
  initial: Initial;
}) {
  const router = useRouter();
  const boundAction =
    mode === "create"
      ? (createBillingInvoice as (
          prev: BillingState,
          fd: FormData,
        ) => Promise<BillingState>)
      : updateBillingInvoice.bind(null, id!);
  const [state, formAction, pending] = useActionState<BillingState, FormData>(
    boundAction,
    undefined,
  );

  const [lines, setLines] = useState<Line[]>(
    initial.items.length > 0
      ? initial.items.map((it) => ({
          kind: it.kind ?? "product",
          productId: it.productId ?? "",
          label: it.description,
          unit: it.unit,
          quantity: it.quantity,
          priceLak: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate ?? initial.vatRate,
        }))
      : [],
  );
  const [discount, setDiscount] = useState(initial.invoiceDiscount);
  const [vatRate, setVatRate] = useState(initial.vatRate);
  const [vatMode, setVatMode] = useState<VatMode>(initial.vatMode);
  const [currency, setCurrency] = useState(initial.currency);
  const [activeTab, setActiveTab] = useState<"lines" | "other">("lines");
  const isEdit = mode === "edit";

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const productLines = lines.filter((l) => l.kind === "product");
  const subtotal = productLines.reduce(
    (s, l) => s + Math.max(0, l.quantity * l.priceLak - l.discount),
    0,
  );
  const afterDiscount = Math.max(0, subtotal - discount);
  const discountRatio = subtotal > 0 ? afterDiscount / subtotal : 0;
  const vatAmount =
    vatMode === "EXEMPT"
      ? 0
      : productLines.reduce((sum, line) => {
          const base =
            Math.max(0, line.quantity * line.priceLak - line.discount) *
            discountRatio;
          const tax =
            vatMode === "INCLUSIVE"
              ? (base * line.taxRate) / (1 + line.taxRate)
              : base * line.taxRate;
          return sum + tax;
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
        unit: tm("qDefaultUnit"),
        quantity: 1,
        priceLak: 0,
        discount: 0,
        taxRate: vatRate,
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
    updateLine(idx, {
      productId,
      label: p.name,
      unit: p.unit,
      priceLak: p.priceLak,
    });
  }

  const itemsForServer = lines.map((l) => ({
    kind: l.kind,
    productId: l.kind === "product" ? l.productId : "",
    description: l.label,
    unit: l.unit,
    quantity: l.quantity,
    unitPrice: l.priceLak,
    discount: l.discount,
    taxRate: l.kind === "product" ? l.taxRate : 0,
  }));

  return (
    <form action={formAction} className="odoo">
      <input type="hidden" name="items" value={JSON.stringify(itemsForServer)} />
      <input type="hidden" name="invoiceDiscount" value={discount} />
      <input type="hidden" name="vatMode" value={vatMode} />
      <input type="hidden" name="vatRate" value={vatRate} />
      <input type="hidden" name="currency" value={currency} />

      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/manage/billing" className="hover:underline">
          {tm("bilBreadcrumb")}
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isEdit ? initial.number ?? tm("bilEditWord") : tm("bilNewWord")}
        </span>
      </div>

      {/* Action / status bar */}
      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="submit"
            disabled={pending || productLines.length === 0}
            className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-odoo-hover disabled:opacity-50 transition tracking-wide"
          >
            {pending ? tm("bilSaving") : isEdit ? tm("bilSave") : tm("bilConfirmBtn")}
          </button>
          {isEdit && id ? (
            <>
              <a
                href={`/api/billing/${id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="text-odoo hover:bg-odoo/8 px-2.5 py-1 rounded text-[13px] font-medium"
                title={tm("bilPdfPreviewTitle")}
              >
                {tm("bilPdfPreview")}
              </a>
              <button
                type="button"
                onClick={() => {
                  const win = window.open(
                    `/api/billing/${id}/pdf`,
                    "_blank",
                  );
                  if (!win) alert(tm("bilAllowPopup"));
                }}
                className="text-odoo hover:bg-odoo/8 px-2.5 py-1 rounded text-[13px] font-medium"
              >
                {tm("bilPrint")}
              </button>
            </>
          ) : (
            <span className="text-gray-400 text-[12px] italic px-1.5">
              {tm("bilSaveFirst")}
            </span>
          )}
          <span className="mx-1 text-gray-300">|</span>
          {isEdit && id && status === "UNPAID" && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(tm("bilCancelConfirm"))) return;
                await cancelBillingInvoice(id);
                router.refresh();
              }}
              className="text-amber-700 hover:bg-amber-50 px-2.5 py-1 rounded text-[13px]"
            >
              {tm("bilCancelBtn")}
            </button>
          )}
          {isEdit && id && status !== "PAID" && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(tm("bilDeleteConfirm"))) return;
                await deleteBillingInvoice(id);
              }}
              className="text-red-700 hover:bg-red-50 px-2.5 py-1 rounded text-[13px]"
            >
              {tm("bilDeleteBtn")}
            </button>
          )}
          {!isEdit && (
            <button
              type="button"
              onClick={() => router.push("/manage/billing")}
              className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
            >
              {tm("bilCancel")}
            </button>
          )}
        </div>
        <StatusBar
          current={
            status === "PAID" ? "paid" : isEdit ? "posted" : "draft"
          }
        />
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-8 pt-6 pb-2">
          <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            {isEdit ? tm("bilHeaderTitle") : tm("bilHeaderDraft")}
          </div>
          <h1 className="text-[28px] leading-tight font-light text-gray-900 mb-6">
            {isEdit ? (
              initial.number
            ) : (
              <>
                BIL/<span className="text-gray-400">####</span>
              </>
            )}
          </h1>

          {/* Header 2-col */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 mb-4">
            <div>
              <Field label={tm("bilCustomer")} required emphasis>
                <Combobox
                  name="customerId"
                  required
                  defaultValue={initial.customerId}
                  placeholder={tm("bilPickCustomer")}
                  emptyText={tm("bilNoCustomer")}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    badge: c.code,
                    meta: c.type === "TENANT" ? tm("bilTenantLabel") : tm("bilExternalLabel"),
                    search: `${c.code} ${c.name}`,
                  }))}
                />
              </Field>
              <Field label={tm("bilSubject")}>
                <input
                  className="o-input"
                  name="description"
                  defaultValue={initial.description}
                  placeholder={tm("bilSubjectPh")}
                  required
                />
              </Field>
              <Field label={tm("bilDueDate")}>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={initial.dueDate}
                  className="o-input"
                />
              </Field>
            </div>
            <div>
              <Field label={tm("bilCurrency")}>
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
              <Field label={tm("bilVatType")}>
                <select
                  value={vatMode}
                  onChange={(e) => setVatMode(e.target.value as VatMode)}
                  className="o-input"
                >
                  <option value="EXCLUSIVE">{tm("bilVatExclusive")}</option>
                  <option value="INCLUSIVE">{tm("bilVatInclusive")}</option>
                  <option value="EXEMPT">{tm("bilVatExempt")}</option>
                </select>
              </Field>
              {vatMode !== "EXEMPT" && (
                <Field label={tm("bilVatRate")}>
                  <div className="flex items-center gap-2 w-full">
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

          {/* Notebook tabs */}
          <div className="border-b border-gray-200 mt-2">
            <div className="flex gap-1 text-[13px]">
              <TabBtn
                active={activeTab === "lines"}
                onClick={() => setActiveTab("lines")}
              >
                {tm("bilTabLines")}
              </TabBtn>
              <TabBtn
                active={activeTab === "other"}
                onClick={() => setActiveTab("other")}
              >
                {tm("bilTabOther")}
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
                    <th className="px-2 py-2 text-left font-medium">{tm("bilColProduct")}</th>
                    <th className="px-2 py-2 text-left font-medium">
                      {tm("bilColDescription")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tm("bilColQty")}
                    </th>
                    <th className="px-2 py-2 text-left font-medium w-16">
                      {tm("bilColUnit")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-28">
                      {tm("bilColPrice")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      {tm("bilColDiscount")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-20">
                      VAT
                    </th>
                    <th className="px-2 py-2 text-right font-medium w-32">
                      {tm("bilColAmount")}
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
                              placeholder={tm("bilSectionPh")}
                              className="o-cell font-semibold text-gray-800 uppercase tracking-wide w-full"
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <RowDelete onClick={() => removeLine(idx)} />
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
                              placeholder={tm("bilNotePh")}
                              className="o-cell italic text-gray-600 w-full"
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <RowDelete onClick={() => removeLine(idx)} />
                          </td>
                        </tr>
                      );
                    }
                    const lineTotal = Math.max(
                      0,
                      line.quantity * line.priceLak - line.discount,
                    );
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
                            placeholder={tm("bilPickProduct")}
                            emptyText={tm("bilNoProduct")}
                            triggerClassName="px-2 py-1 border border-transparent rounded text-[13px] hover:bg-white hover:border-gray-200 focus:outline-none focus:bg-white focus:border-odoo"
                            options={products.map((p) => ({
                              value: p.id,
                              label: p.name,
                              badge: p.code,
                              meta: `${fmtMoney(p.priceLak)} / ${p.unit}`,
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
                            placeholder={tm("bilDescPh")}
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
                            className="o-cell text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={line.unit}
                            onChange={(e) =>
                              updateLine(idx, { unit: e.target.value })
                            }
                            className="o-cell text-[12px] text-gray-500"
                          />
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
                            className="o-cell text-right tabular-nums"
                            disabled={vatMode === "EXEMPT"}
                            title={`${(line.taxRate * 100).toFixed(0)}%`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-gray-800">
                          {fmtMoney(lineTotal)}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <RowDelete onClick={() => removeLine(idx)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Add row links */}
              <div className="flex gap-5 mt-1 pl-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => addLine("product")}
                  className="text-odoo hover:text-odoo-hover font-medium"
                >
                  {tm("bilAddLine")}
                </button>
                <button
                  type="button"
                  onClick={() => addLine("section")}
                  className="text-odoo hover:text-odoo-hover"
                >
                  {tm("bilAddSection")}
                </button>
                <button
                  type="button"
                  onClick={() => addLine("note")}
                  className="text-odoo hover:text-odoo-hover"
                >
                  {tm("bilAddNote")}
                </button>
              </div>

              {/* Totals widget bottom-right */}
              <div className="mt-6 flex justify-end pb-4">
                <div className="w-full md:w-[340px] text-[13px]">
                  <SumRow
                    label={
                      vatMode === "INCLUSIVE"
                        ? tm("bilSubtotalInc")
                        : tm("bilSubtotalEx")
                    }
                    value={fmtMoney(subtotal)}
                  />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">{tm("bilInvoiceDisc")}</span>
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
                    <div className="flex justify-between items-center py-1 text-gray-500 italic">
                      <span>VAT</span>
                      <span>{tm("bilVatExemptShort")}</span>
                    </div>
                  ) : (
                    <SumRow
                      label={`${tm("bilVatPerLine")}${
                        vatMode === "INCLUSIVE" ? tm("bilInclusiveSuf") : ""
                      }`}
                      value={fmtMoney(vatAmount)}
                    />
                  )}
                  <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      {tm("bilGrandTotal")}
                    </span>
                    <span className="font-semibold text-[18px] text-gray-900 tabular-nums">
                      {fmtMoney(total)} {currency}
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
                <Field label={tm("bilJournal")}>
                  <input
                    className="o-input"
                    defaultValue={tm("bilJournalDefault")}
                    disabled
                  />
                </Field>
                <Field label={tm("bilStatus")}>
                  <input
                    className="o-input"
                    defaultValue={
                      status === "PAID"
                        ? tm("bilStPaid")
                        : status === "CANCELLED"
                          ? tm("bilStCancelled")
                          : tm("bilStUnpaid")
                    }
                    disabled
                  />
                </Field>
              </div>
              <div>
                <Field label={tm("bilCreatedAt")}>
                  <input
                    className="o-input"
                    defaultValue={isEdit ? "—" : tm("bilNotSaved")}
                    disabled
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-gray-100 mt-4 pt-4 pb-6">
            <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
              {tm("bilNotesHdr")}
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={initial.notes}
              className="o-input w-full resize-none"
              placeholder={tm("bilNotesPh")}
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
          <span>{tm("bilFooter")}</span>
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

function StatusBar({ current }: { current: "draft" | "posted" | "paid" }) {
  const steps: { key: "draft" | "posted" | "paid"; label: string }[] = [
    { key: "draft", label: tm("bilStepDraft") },
    { key: "posted", label: tm("bilStepPosted") },
    { key: "paid", label: tm("bilStepPaid") },
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
      title={tm("bilRemoveRow")}
    >
      ×
    </button>
  );
}
