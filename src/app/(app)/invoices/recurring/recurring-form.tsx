"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/combobox";
import { formatMoney, type Currency, CURRENCIES } from "@/lib/format";
import {
  createRecurring,
  updateRecurring,
  deleteRecurring,
  toggleRecurringActive,
  runRecurringNow,
  type RecState,
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

type Cycle = "MONTHLY" | "QUARTERLY" | "YEARLY";
type VatMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
type PaymentMethod = "CASH" | "TRANSFER";

export type RecurringInitial = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  customerId: string;
  cycle: Cycle;
  startDate: string;            // YYYY-MM-DD
  nextRunDate: string;          // YYYY-MM-DD
  endDate: string;              // YYYY-MM-DD or ""
  currency: Currency;
  exchangeRate: number;
  vatMode: VatMode;
  vatRate: number;
  discount: number;
  paymentMethod: PaymentMethod;
  note: string;
  items: {
    kind?: LineKind;
    productId?: string | null;
    label?: string;
    quantity: number;
    priceLak: number;
    discount: number;
    taxRate?: number;
  }[];
};

export function RecurringForm({
  customers,
  products,
  defaultVatRate,
  initial,
  locale,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  defaultVatRate: number;
  initial?: RecurringInitial;
  locale: Locale;
}) {
  const tr = (k: string) => t(locale, "recurringForm", k);
  const tf = (k: string) => t(locale, "invoiceForm", k);
  const tc = (k: string) => t(locale, "common", k);
  const router = useRouter();
  const boundAction = initial
    ? updateRecurring.bind(null, initial.id)
    : (createRecurring as (
        prev: RecState,
        fd: FormData,
      ) => Promise<RecState>);
  const [state, formAction, pending] = useActionState<RecState, FormData>(
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextMonthStr = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [name, setName] = useState(initial?.name ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [cycle, setCycle] = useState<Cycle>(initial?.cycle ?? "MONTHLY");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayStr);
  const [nextRunDate, setNextRunDate] = useState(
    initial?.nextRunDate ?? nextMonthStr,
  );
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [currency, setCurrency] = useState<Currency>(
    initial?.currency ?? "LAK",
  );
  const [exchangeRate, setExchangeRate] = useState(initial?.exchangeRate ?? 1);
  const [vatMode, setVatMode] = useState<VatMode>(
    initial?.vatMode ?? "EXCLUSIVE",
  );
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? defaultVatRate);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "CASH",
  );
  const [activeTab, setActiveTab] = useState<"lines" | "schedule" | "other">(
    "lines",
  );
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

  return (
    <form action={formAction} className="odoo relative">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(itemsForServer)}
      />

      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/invoices/recurring" className="hover:underline">
          {tr("breadcrumb")}
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isEdit ? initial?.code ?? tf("editing") : tf("headingNew")}
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
            {pending ? tc("saving") : isEdit ? tc("save") : tf("confirm")}
          </button>
          {isEdit && initial && (
            <>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(tr("runConfirm"))) return;
                  const r = await runRecurringNow(initial.id);
                  if (r.ok) {
                    alert(`${tr("runSuccess")} ${r.invoiceNumber}`);
                    router.push(`/invoices/${r.invoiceId}`);
                  } else {
                    alert(`✗ ${r.error}`);
                  }
                }}
                className="text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded text-[13px] font-medium"
              >
                ▶ Run now
              </button>
              <button
                type="button"
                onClick={async () => {
                  await toggleRecurringActive(initial.id);
                  router.refresh();
                }}
                className="text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
              >
                {active ? "⏸ Pause" : "▶ Resume"}
              </button>
            </>
          )}
          <span className="mx-1 text-gray-300">|</span>
          {isEdit && initial && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm(tr("deleteConfirm"))) return;
                await deleteRecurring(initial.id);
              }}
              className="text-red-700 hover:bg-red-50 px-2.5 py-1 rounded text-[13px]"
            >
              {tr("delete")}
            </button>
          )}
          {!isEdit && (
            <button
              type="button"
              onClick={() => router.push("/invoices/recurring")}
              className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
            >
              {tc("cancel")}
            </button>
          )}
        </div>
        <StatusBar active={active} />
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-8 pt-6 pb-2">
          <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            {isEdit ? tr("tagEdit") : tr("tagNew")}
          </div>
          {/* Editable name as the page title */}
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={tr("namePh")}
            className="w-full text-[28px] leading-tight font-light text-gray-900 mb-1 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-odoo focus:outline-none focus:ring-0 px-0 py-0"
          />
          <div className="text-[12px] text-gray-500 mb-6 font-mono">
            {isEdit ? initial?.code : "RC-####"}
          </div>

          {/* Header 2-col */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 mb-4">
            <div>
              <Field label={tf("customer")} required emphasis>
                <Combobox
                  name="customerId"
                  required
                  defaultValue={initial?.customerId ?? ""}
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
              <Field label={tr("cycle")} emphasis>
                <select
                  name="cycle"
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value as Cycle)}
                  className="o-input"
                >
                  <option value="MONTHLY">{tr("monthly")}</option>
                  <option value="QUARTERLY">{tr("quarterly")}</option>
                  <option value="YEARLY">{tr("yearly")}</option>
                </select>
              </Field>
              <Field label={tf("payment")}>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={paymentMethod === "CASH"}
                      onChange={() => setPaymentMethod("CASH")}
                      className="accent-odoo"
                    />
                    <span className="text-[13px]">💵 {tf("cash")}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="TRANSFER"
                      checked={paymentMethod === "TRANSFER"}
                      onChange={() => setPaymentMethod("TRANSFER")}
                      className="accent-odoo"
                    />
                    <span className="text-[13px]">🏦 {tf("transfer")}</span>
                  </label>
                </div>
              </Field>
              <Field label="Active">
                <label className="inline-flex items-center gap-2 cursor-pointer text-[13px]">
                  <input
                    type="checkbox"
                    name="active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 accent-odoo"
                  />
                  <span>
                    {tr("autoIssue")}
                  </span>
                </label>
              </Field>
            </div>
            <div>
              <Field label={tr("startDate")}>
                <input
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="o-input"
                />
              </Field>
              <Field label={tr("nextRunDate")} required emphasis>
                <input
                  type="date"
                  name="nextRunDate"
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                  required
                  className="o-input"
                />
              </Field>
              <Field label={tr("endDate")}>
                <input
                  type="date"
                  name="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="o-input"
                  placeholder={tr("optional")}
                />
              </Field>
              <Field label={tf("currency")}>
                <div className="flex gap-2 w-full items-center">
                  <select
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
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
                {tr("tabItems")}
              </TabBtn>
              <TabBtn
                active={activeTab === "schedule"}
                onClick={() => setActiveTab("schedule")}
              >
                {tr("tabSchedule")}
              </TabBtn>
              <TabBtn
                active={activeTab === "other"}
                onClick={() => setActiveTab("other")}
              >
                {tr("tabNote")}
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
                              placeholder={tf("sectionPh")}
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
                              placeholder={tf("notePh")}
                              className="o-cell italic text-gray-600 w-full"
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <RowDelete onClick={() => removeLine(idx)} />
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
                            disabled={vatMode === "EXEMPT"}
                            className="o-cell text-right tabular-nums"
                            title={`${(line.taxRate * 100).toFixed(0)}%`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-gray-800">
                          {formatMoney(lineTotal)}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <RowDelete onClick={() => removeLine(idx)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

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
                      {tr("totalPerCycle")}
                    </span>
                    <span className="font-semibold text-[18px] text-gray-900 tabular-nums">
                      {formatMoney(total)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 italic">
                    {tr("perCycleHint")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule tab */}
          {activeTab === "schedule" && (
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-16">
              <div className="text-[13px] text-gray-600 space-y-2">
                <p>
                  <strong>{tr("cycleLabel")}:</strong>{" "}
                  {cycle === "MONTHLY"
                    ? tr("cycleMonthly")
                    : cycle === "QUARTERLY"
                      ? tr("cycleQuarterly")
                      : tr("cycleYearly")}
                </p>
                <p>
                  <strong>{tr("nextLabel")}:</strong>{" "}
                  {nextRunDate || tr("notSet")}
                </p>
                {endDate && (
                  <p>
                    <strong>{tr("endLabel")}:</strong> {endDate}
                  </p>
                )}
                {!active && (
                  <p className="text-amber-700">
                    ⚠ {tr("disabledHint")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Other info tab */}
          {activeTab === "other" && (
            <div className="pt-4">
              <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                {tr("tabNote")}
              </label>
              <textarea
                name="note"
                rows={4}
                defaultValue={initial?.note ?? ""}
                className="o-input w-full resize-none"
                placeholder={tr("noteForTemplate")}
              />
            </div>
          )}

          {state?.error && (
            <div className="mt-4 mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="mt-4 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-sm">
              {state.success}
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

function StatusBar({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-0">
      <span
        className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
          !active ? "bg-odoo text-white" : "text-gray-400"
        }`}
      >
        Paused
      </span>
      <span className="text-gray-300 text-xs">›</span>
      <span
        className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
          active ? "bg-odoo text-white" : "text-gray-400"
        }`}
      >
        Active
      </span>
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
