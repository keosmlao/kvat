"use client";

import { useActionState, useMemo, useState } from "react";
import type { InvoiceFormState } from "../actions";
import { formatMoney, type Currency, CURRENCIES } from "@/lib/format";
import { Combobox } from "@/components/combobox";

type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceLak: number;
  stock: number;
};
type Customer = { id: string; code: string; name: string };

type LineKind = "product" | "section" | "note";
type Line = {
  kind: LineKind;
  productId: string;
  label: string;
  quantity: number;
  priceLak: number;
  discount: number;
};

type Action = (
  prev: InvoiceFormState,
  fd: FormData,
) => Promise<InvoiceFormState>;

export type VatMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";
export type PaymentMethod = "CASH" | "TRANSFER";

export type InvoiceInitial = {
  id: string;
  number: string;
  customerId: string;
  date: string;
  dueDate: string;
  paymentTermId: string | null;
  currency: Currency;
  exchangeRate: number;
  discount: number;
  vatRate: number;
  vatMode: VatMode;
  paymentMethod: PaymentMethod;
  paymentRef: string;
  note: string;
  items: {
    productId: string;
    quantity: number;
    priceLak: number;
    discount: number;
  }[];
};


export function InvoiceForm({
  action,
  products,
  customers,
  defaultVatRate,
  initial,
}: {
  action: Action;
  products: Product[];
  customers: Customer[];
  defaultVatRate: number;
  initial?: InvoiceInitial;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(
    action,
    undefined,
  );

  const [lines, setLines] = useState<Line[]>(
    initial
      ? initial.items.map((it) => ({
          kind: "product" as const,
          productId: it.productId,
          label: "",
          quantity: it.quantity,
          priceLak: it.priceLak,
          discount: it.discount,
        }))
      : [],
  );
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? defaultVatRate);
  const [vatMode, setVatMode] = useState<VatMode>(
    initial?.vatMode ?? "EXCLUSIVE",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "CASH",
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const [invoiceDate, setInvoiceDate] = useState(
    initial?.date?.slice(0, 10) ?? todayStr,
  );
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
  const vatAmount =
    vatMode === "EXEMPT"
      ? 0
      : vatMode === "INCLUSIVE"
        ? (afterDiscount * vatRate) / (1 + vatRate)
        : afterDiscount * vatRate;
  const total =
    vatMode === "EXCLUSIVE" ? afterDiscount + vatAmount : afterDiscount;

  function addLine(kind: LineKind = "product") {
    setLines((ls) => [
      ...ls,
      { kind, productId: "", label: "", quantity: 1, priceLak: 0, discount: 0 },
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

  // Server only needs the product lines
  const itemsForServer = productLines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    priceLak: l.priceLak,
    discount: l.discount,
  }));

  return (
    <form action={formAction} className="odoo">
      <input type="hidden" name="items" value={JSON.stringify(itemsForServer)} />

      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <a href="/invoices" className="hover:underline">
          ບິນອາກອນລູກຄ້າ
        </a>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isEdit ? initial?.number ?? "ແກ້ໄຂ" : "ໃໝ່"}
        </span>
      </div>

      {/* Action / status bar */}
      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            disabled={pending || productLines.length === 0}
            className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 transition tracking-wide"
          >
            {pending
              ? "ກຳລັງບັນທຶກ..."
              : isEdit
                ? "ບັນທຶກ"
                : "ຢືນຢັນ"}
          </button>
          {isEdit && initial ? (
            <>
              <a
                href={`/api/invoices/${initial.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="text-[#b91c1c] hover:bg-[#b91c1c]/8 px-2.5 py-1 rounded text-[13px] font-medium"
                title="ເປີດ PDF ໃນແທັບໃໝ່"
              >
                ສະແດງຕົວຢ່າງ
              </a>
              <button
                type="button"
                onClick={() => {
                  const win = window.open(
                    `/api/invoices/${initial.id}/pdf`,
                    "_blank",
                  );
                  // browser PDF viewer lets user print with Ctrl/Cmd+P
                  if (!win) alert("ກະລຸນາອະນຸຍາດ popup ເພື່ອພິມ");
                }}
                className="text-[#b91c1c] hover:bg-[#b91c1c]/8 px-2.5 py-1 rounded text-[13px] font-medium"
              >
                ພິມ
              </button>
            </>
          ) : (
            <span className="text-gray-400 text-[12px] italic px-1.5">
              ບັນທຶກກ່ອນຈຶ່ງສະແດງຕົວຢ່າງ/ພິມໄດ້
            </span>
          )}
          <span className="mx-1 text-gray-300">|</span>
          <button
            type="reset"
            onClick={() => setLines([])}
            className="text-gray-600 hover:bg-gray-100 px-2.5 py-1 rounded text-[13px]"
          >
            ຍົກເລີກ
          </button>
        </div>
        {/* Statusbar */}
        <StatusBar current={isEdit ? "posted" : "draft"} />
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-8 pt-6 pb-2">
          <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            {isEdit ? "ບິນອາກອນ" : "ບິນຮ່າງ"}
          </div>
          <h1 className="text-[28px] leading-tight font-light text-gray-900 mb-6">
            {isEdit ? (
              initial?.number
            ) : (
              <>
                INV/<span className="text-gray-400">####</span>
              </>
            )}
          </h1>

          {/* Header 2-col */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 mb-4">
            <div>
              <Field label="ລູກຄ້າ" required emphasis>
                <Combobox
                  name="customerId"
                  required
                  defaultValue={initial?.customerId ?? ""}
                  placeholder="ເລືອກລູກຄ້າ..."
                  emptyText="ບໍ່ພົບລູກຄ້າ"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    badge: c.code,
                    search: `${c.code} ${c.name}`,
                  }))}
                />
              </Field>
              <Field label="ທີ່ຢູ່ສົ່ງເຄື່ອງ">
                <input
                  className="o-input"
                  placeholder="ຄືກັນກັບລູກຄ້າ"
                  disabled
                />
              </Field>
              <Field label="ການອ້າງອີງ">
                <input className="o-input" placeholder="..." />
              </Field>
            </div>
            <div>
              <Field label="ວັນທີອອກບິນ">
                <input
                  type="date"
                  name="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="o-input"
                />
              </Field>
              <Field label="ສະກຸນເງິນ">
                <div className="flex gap-2 w-full items-center">
                  <select
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="o-input flex-1"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {currency !== "LAK" ? (
                    <input
                      type="number"
                      step="0.0001"
                      name="exchangeRate"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(+e.target.value)}
                      placeholder="ອັດຕາແລກ"
                      className="o-input w-28"
                    />
                  ) : (
                    <input type="hidden" name="exchangeRate" value="1" />
                  )}
                </div>
              </Field>
              <Field label="ປະເພດ VAT">
                <select
                  name="vatMode"
                  value={vatMode}
                  onChange={(e) => setVatMode(e.target.value as VatMode)}
                  className="o-input"
                >
                  <option value="EXCLUSIVE">ແຍກນອກ (Tax Exclusive)</option>
                  <option value="INCLUSIVE">ລວມໃນ (Tax Inclusive)</option>
                  <option value="EXEMPT">ຍົກເວັ້ນ (Tax Exempt)</option>
                </select>
              </Field>
              {vatMode !== "EXEMPT" && (
                <Field label="VAT (ອັດຕາ)">
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
              <Field label="ການຊຳລະ">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={paymentMethod === "CASH"}
                      onChange={() => setPaymentMethod("CASH")}
                      className="accent-[#b91c1c]"
                    />
                    <span className="text-[13px]">💵 ເງິນສົດ</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="TRANSFER"
                      checked={paymentMethod === "TRANSFER"}
                      onChange={() => setPaymentMethod("TRANSFER")}
                      className="accent-[#b91c1c]"
                    />
                    <span className="text-[13px]">🏦 ໂອນ</span>
                  </label>
                </div>
              </Field>
              {paymentMethod === "TRANSFER" && (
                <Field label="ເລກອ້າງອີງ">
                  <input
                    name="paymentRef"
                    defaultValue={initial?.paymentRef ?? ""}
                    placeholder="ເລກ slip / transaction ID"
                    className="o-input"
                  />
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
                ລາຍການບິນ
              </TabBtn>
              <TabBtn
                active={activeTab === "other"}
                onClick={() => setActiveTab("other")}
              >
                ຂໍ້ມູນອື່ນ
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
                    <th className="px-2 py-2 text-left font-medium">ສິນຄ້າ</th>
                    <th className="px-2 py-2 text-left font-medium">ລາຍລະອຽດ</th>
                    <th className="px-2 py-2 text-right font-medium w-20">ຈຳນວນ</th>
                    <th className="px-2 py-2 text-left font-medium w-14">ໜ່ວຍ</th>
                    <th className="px-2 py-2 text-right font-medium w-28">ລາຄາ</th>
                    <th className="px-2 py-2 text-right font-medium w-20">ສ່ວນຫຼຸດ</th>
                    <th className="px-2 py-2 text-right font-medium w-32">ມູນຄ່າ</th>
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
                          <td colSpan={7} className="px-2 py-1.5">
                            <input
                              value={line.label}
                              onChange={(e) =>
                                updateLine(idx, { label: e.target.value })
                              }
                              placeholder="ຫົວຂໍ້..."
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
                          <td colSpan={7} className="px-2 py-1.5">
                            <input
                              value={line.label}
                              onChange={(e) =>
                                updateLine(idx, { label: e.target.value })
                              }
                              placeholder="ໝາຍເຫດ..."
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
                            placeholder="ເລືອກສິນຄ້າ..."
                            emptyText="ບໍ່ພົບສິນຄ້າ"
                            triggerClassName="px-2 py-1 border border-transparent rounded text-[13px] hover:bg-white hover:border-gray-200 focus:outline-none focus:bg-white focus:border-[#b91c1c]"
                            options={products.map((p) => ({
                              value: p.id,
                              label: p.name,
                              badge: p.code,
                              meta: `${p.stock} ${p.unit}`,
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
                            placeholder="ລາຍລະອຽດ..."
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

              {/* Add row links */}
              <div className="flex gap-5 mt-1 pl-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => addLine("product")}
                  className="text-[#b91c1c] hover:text-[#991b1b] font-medium"
                >
                  ເພີ່ມລາຍການ
                </button>
                <button
                  type="button"
                  onClick={() => addLine("section")}
                  className="text-[#b91c1c] hover:text-[#991b1b]"
                >
                  ເພີ່ມຫົວຂໍ້
                </button>
                <button
                  type="button"
                  onClick={() => addLine("note")}
                  className="text-[#b91c1c] hover:text-[#991b1b]"
                >
                  ເພີ່ມໝາຍເຫດ
                </button>
              </div>

              {/* Totals widget bottom-right */}
              <div className="mt-6 flex justify-end pb-4">
                <div className="w-full md:w-[340px] text-[13px]">
                  <SumRow
                    label={
                      vatMode === "INCLUSIVE"
                        ? "ມູນຄ່າ (ລວມ VAT)"
                        : "ມູນຄ່າກ່ອນພາສີ"
                    }
                    value={formatMoney(subtotal)}
                  />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">ສ່ວນຫຼຸດທ້າຍບິນ</span>
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
                      <span>ຍົກເວັ້ນ</span>
                    </div>
                  ) : (
                    <SumRow
                      label={`VAT ${(vatRate * 100).toFixed(0)}%${
                        vatMode === "INCLUSIVE" ? " (ລວມໃນ)" : ""
                      }`}
                      value={formatMoney(vatAmount)}
                    />
                  )}
                  <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      ມູນຄ່າທັງໝົດ
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
                <Field label="ເງື່ອນໄຂການຊຳລະ">
                  <input className="o-input" placeholder="..." />
                </Field>
                <Field label="ພະນັກງານຂາຍ">
                  <input className="o-input" placeholder="..." />
                </Field>
              </div>
              <div>
                <Field label="ບັນຊີລາຍວັນ">
                  <input className="o-input" defaultValue="ບິນຂາຍ" disabled />
                </Field>
              </div>
            </div>
          )}

          {/* Terms */}
          <div className="border-t border-gray-100 mt-4 pt-4 pb-6">
            <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
              ເງື່ອນໄຂ ແລະ ໝາຍເຫດ
            </label>
            <textarea
              name="note"
              rows={3}
              defaultValue={initial?.note ?? ""}
              className="o-input w-full resize-none"
              placeholder="ກະລຸນາຊຳລະພາຍໃນວັນທີຄົບກຳນົດ..."
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
            className="hover:text-[#b91c1c] flex items-center gap-1"
          >
            <span>✉</span> ສົ່ງຂໍ້ຄວາມ
          </button>
          <button
            type="button"
            className="hover:text-[#b91c1c] flex items-center gap-1"
          >
            <span>📝</span> ບັນທຶກ
          </button>
          <button
            type="button"
            className="hover:text-[#b91c1c] flex items-center gap-1"
          >
            <span>👥</span> ຕິດຕາມ
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
          border-bottom-color: #b91c1c;
          background: #fff;
          box-shadow: 0 1px 0 0 #b91c1c;
        }
        .o-input:disabled { color: #9ca3af; cursor: not-allowed; }
        .o-input-lg { font-size: 14px; font-weight: 500; }
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
          border-color: #b91c1c;
          box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
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
  const steps: { key: typeof current; label: string }[] = [
    { key: "draft", label: "ຮ່າງ" },
    { key: "posted", label: "ອອກບິນ" },
    { key: "paid", label: "ຊຳລະແລ້ວ" },
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
                  ? "bg-[#b91c1c] text-white"
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
          ? "border-[#b91c1c] text-[#b91c1c] font-medium"
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
