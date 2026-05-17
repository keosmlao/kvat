"use client";

import { useMemo, useState, useTransition } from "react";
import { createInvoice } from "../invoices/actions";

type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceLak: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
};
type Customer = { id: string; code: string; name: string };
type Category = { id: string; name: string };

type CartItem = {
  productId: string;
  name: string;
  unit: string;
  priceLak: number;
  quantity: number;
};

function formatMoney(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function PosClient({
  products,
  customers,
  categories,
  defaultVatRate,
}: {
  products: Product[];
  customers: Customer[];
  categories: Category[];
  defaultVatRate: number;
}) {
  const [pending, start] = useTransition();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (activeCat && p.categoryId !== activeCat) return false;
      if (q && !`${p.code} ${p.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeCat]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          priceLak: p.priceLak,
          quantity: 1,
        },
      ];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.productId === productId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const subtotal = cart.reduce((s, c) => s + c.priceLak * c.quantity, 0);
  const vatAmount = subtotal * defaultVatRate;
  const total = subtotal + vatAmount;

  const checkout = () => {
    setError(null);
    if (cart.length === 0) {
      setError("ກະຣຸນາເພີ່ມສິນຄ້າ");
      return;
    }
    if (!customerId) {
      setError("ກະຣຸນາເລືອກລູກຄ້າ");
      return;
    }
    if (paymentMethod === "TRANSFER" && !paymentRef.trim()) {
      setError("ໂອນຕ້ອງມີເລກອ້າງອີງ");
      return;
    }

    start(async () => {
      const fd = new FormData();
      fd.set("customerId", customerId);
      fd.set("date", new Date().toISOString().slice(0, 10));
      fd.set("currency", "LAK");
      fd.set("exchangeRate", "1");
      fd.set("discount", "0");
      fd.set("vatRate", String(defaultVatRate));
      fd.set("vatMode", "EXCLUSIVE");
      fd.set("paymentMethod", paymentMethod);
      fd.set("paymentRef", paymentRef);
      fd.set("note", "");
      fd.set(
        "items",
        JSON.stringify(
          cart.map((c) => ({
            kind: "product",
            productId: c.productId,
            quantity: c.quantity,
            priceLak: c.priceLak,
            discount: 0,
            taxRate: defaultVatRate,
          })),
        ),
      );

      try {
        const result = await createInvoice(undefined, fd);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setCart([]);
        setPaymentRef("");
        if (result?.pdfUrl) window.open(result.pdfUrl, "_blank", "noopener");
        if (result?.detailUrl) window.location.href = result.detailUrl;
      } catch (e) {
        // NEXT_REDIRECT is internal; not a real error
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("NEXT_REDIRECT")) return;
        setError(msg);
      }
    });
  };

  const cardLayout = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2";

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 flex flex-col md:flex-row h-[calc(100vh-44px)]">
      {/* Left: products */}
      <div className="flex-1 min-w-0 bg-gray-50 p-3 overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 pb-2 z-10">
          <div className="flex gap-2 mb-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາສິນຄ້າ..."
              className="flex-1 px-3 py-2 text-[14px] border border-gray-300 rounded focus:outline-none focus:border-odoo"
              autoFocus
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCat(null)}
              className={`px-3 py-1.5 rounded text-[13px] whitespace-nowrap ${
                !activeCat
                  ? "bg-odoo text-white"
                  : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              ທັງໝົດ ({products.length})
            </button>
            {categories.map((c) => {
              const count = products.filter((p) => p.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCat(c.id)}
                  className={`px-3 py-1.5 rounded text-[13px] whitespace-nowrap ${
                    activeCat === c.id
                      ? "bg-odoo text-white"
                      : "bg-white border border-gray-200 text-gray-700"
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">ບໍ່ພົບສິນຄ້າ</div>
        ) : (
          <div className={cardLayout}>
            {filtered.map((p) => {
              const lowStock = p.stock <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={lowStock}
                  className="bg-white border border-gray-200 rounded p-2 hover:border-odoo hover:shadow-md transition text-left disabled:opacity-50 disabled:cursor-not-allowed flex flex-col"
                >
                  <div className="aspect-square bg-gray-50 rounded mb-2 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-light text-odoo/30">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-gray-500">
                    {p.code}
                  </div>
                  <div className="text-[13px] font-medium text-gray-800 line-clamp-2 mb-1">
                    {p.name}
                  </div>
                  <div className="flex justify-between items-baseline mt-auto">
                    <span className="text-[14px] font-semibold tabular-nums text-gray-900">
                      {formatMoney(p.priceLak)}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        p.stock <= 5 ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {p.stock} {p.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: cart */}
      <div className="md:w-[380px] bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col">
        {/* Customer */}
        <div className="p-3 border-b border-gray-200">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">
            ລູກຄ້າ
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-2 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-odoo"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-[13px]">
              ກົດສິນຄ້າເພື່ອເພີ່ມເຂົ້າຕະກ້າ
            </div>
          ) : (
            <div className="space-y-1.5">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="bg-gray-50 border border-gray-200 rounded p-2"
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-800 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-gray-500 tabular-nums">
                        {formatMoney(item.priceLak)} × {item.quantity} {item.unit}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-gray-300 hover:text-red-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeQty(item.productId, -1)}
                        className="w-7 h-7 rounded bg-white border border-gray-300 hover:bg-gray-50 text-lg leading-none flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-[14px] font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.productId, 1)}
                        className="w-7 h-7 rounded bg-white border border-gray-300 hover:bg-gray-50 text-lg leading-none flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[14px] font-semibold tabular-nums text-gray-900">
                      {formatMoney(item.priceLak * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Payment */}
        <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="space-y-0.5 text-[13px]">
            <div className="flex justify-between text-gray-600">
              <span>ມູນຄ່າກ່ອນ VAT</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT {(defaultVatRate * 100).toFixed(0)}%</span>
              <span className="tabular-nums">{formatMoney(vatAmount)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-gray-300 mt-1">
              <span className="font-semibold text-gray-900">ລວມ</span>
              <span className="text-[20px] font-bold tabular-nums text-gray-900">
                {formatMoney(total)} ກີບ
              </span>
            </div>
          </div>

          {/* Payment method buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`py-2 rounded text-[14px] font-medium transition ${
                paymentMethod === "CASH"
                  ? "bg-odoo text-white"
                  : "bg-white border border-gray-300 text-gray-700"
              }`}
            >
              💵 ເງິນສົດ
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("TRANSFER")}
              className={`py-2 rounded text-[14px] font-medium transition ${
                paymentMethod === "TRANSFER"
                  ? "bg-odoo text-white"
                  : "bg-white border border-gray-300 text-gray-700"
              }`}
            >
              🏦 ໂອນ
            </button>
          </div>
          {paymentMethod === "TRANSFER" && (
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="ເລກ slip / transaction ID"
              className="w-full px-2 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-odoo"
            />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded text-[12px]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setError(null);
              }}
              disabled={pending || cart.length === 0}
              className="py-2.5 rounded bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              ລ້າງຕະກ້າ
            </button>
            <button
              type="button"
              onClick={checkout}
              disabled={pending || cart.length === 0}
              className="py-2.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition tracking-wide"
            >
              {pending ? "ກຳລັງ..." : "ຊຳລະ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
