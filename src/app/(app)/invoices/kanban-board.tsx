"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { postInvoice, resetToDraft } from "./payment-actions";
import { cancelInvoice } from "./actions";

export type KanbanCard = {
  id: string;
  number: string;
  date: string;
  customerName: string;
  total: number;
  currency: string;
  status: "DRAFT" | "ISSUED" | "CANCELLED";
  isCreditNote: boolean;
  hasReversal: boolean;
  paymentMethod: string;
};

const COLUMNS: { key: "DRAFT" | "ISSUED" | "CANCELLED"; label: string; color: string }[] = [
  { key: "DRAFT", label: "ຮ່າງ", color: "bg-gray-100 text-gray-700" },
  { key: "ISSUED", label: "ອອກແລ້ວ", color: "bg-emerald-50 text-emerald-700" },
  { key: "CANCELLED", label: "ຍົກເລີກ", color: "bg-red-50 text-red-700" },
];

function formatMoney(n: number) {
  return Math.round(n).toLocaleString("en-US") + " ກີບ";
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("lo-LA", {
    month: "short",
    day: "numeric",
  });
}

export function KanbanBoard({ cards }: { cards: KanbanCard[] }) {
  const [pending, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverCol(col);
  };

  const onDrop = async (
    e: React.DragEvent,
    targetStatus: "DRAFT" | "ISSUED" | "CANCELLED",
  ) => {
    e.preventDefault();
    setOverCol(null);
    if (!dragId) return;
    const card = cards.find((c) => c.id === dragId);
    setDragId(null);
    if (!card || card.status === targetStatus) return;

    // Validate transitions
    const from = card.status;
    const to = targetStatus;

    let confirmMsg = "";
    let action: (() => Promise<void>) | null = null;

    if (from === "DRAFT" && to === "ISSUED") {
      confirmMsg = "ປະກາດບິນ? ຈະຫັກສິນຄ້າອອກຈາກຄັງ.";
      action = async () => {
        await postInvoice(card.id);
      };
    } else if (from === "ISSUED" && to === "DRAFT") {
      confirmMsg = "ກັບເປັນຮ່າງ? ສິນຄ້າຈະຄືນເຂົ້າຄັງ.";
      action = async () => {
        await resetToDraft(card.id);
      };
    } else if (from === "ISSUED" && to === "CANCELLED") {
      confirmMsg = "ຍົກເລີກບິນ? ສິນຄ້າຈະຄືນເຂົ້າຄັງ.";
      action = async () => {
        await cancelInvoice(card.id);
      };
    } else {
      alert(`ບໍ່ສາມາດປ່ຽນຈາກ ${from} → ${to}`);
      return;
    }

    if (!confirm(confirmMsg)) return;
    start(async () => {
      try {
        await action!();
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };

  return (
    <div className="px-4 md:px-6 py-4 overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-w-[800px]">
        {COLUMNS.map((col) => {
          const cardsInCol = cards.filter(
            (c) => c.status === col.key && !c.isCreditNote,
          );
          const colTotal = cardsInCol.reduce((s, c) => s + c.total, 0);
          const isOver = overCol === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => onDrop(e, col.key)}
              className={`bg-gray-50 border-2 rounded p-2 min-h-[300px] transition ${
                isOver
                  ? "border-[#b91c1c] bg-[#b91c1c]/5"
                  : "border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${col.color}`}
                  >
                    {col.label}
                  </span>
                  <span className="text-[12px] text-gray-500 tabular-nums">
                    {cardsInCol.length}
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 tabular-nums">
                  {formatMoney(colTotal)}
                </span>
              </div>
              <div className="space-y-2">
                {cardsInCol.length === 0 && (
                  <div className="text-center py-8 text-[12px] text-gray-400 italic">
                    ລາກບິນມາທີ່ນີ້
                  </div>
                )}
                {cardsInCol.map((card) => (
                  <div
                    key={card.id}
                    draggable={!pending}
                    onDragStart={(e) => onDragStart(e, card.id)}
                    className={`border rounded p-2.5 transition cursor-grab active:cursor-grabbing ${
                      card.hasReversal
                        ? "bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100/60"
                        : "bg-white border-gray-200 hover:border-[#b91c1c] hover:shadow-sm"
                    } ${dragId === card.id ? "opacity-50" : ""} ${
                      pending ? "opacity-60 pointer-events-none" : ""
                    }`}
                    title={
                      card.hasReversal
                        ? "ບິນນີ້ຖືກລົດໜີ້"
                        : undefined
                    }
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <Link
                        href={`/invoices/${card.id}`}
                        className={`font-mono text-[12px] hover:text-[#b91c1c] ${
                          card.hasReversal
                            ? "text-red-700 line-through decoration-red-400/60"
                            : "text-gray-800"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {card.number}
                      </Link>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(card.date)}
                      </span>
                    </div>
                    {card.hasReversal && (
                      <div className="mb-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 border border-red-200 font-medium uppercase tracking-wider">
                          ຖືກລົດໜີ້
                        </span>
                      </div>
                    )}
                    <div
                      className={`text-[13px] truncate mb-1 ${
                        card.hasReversal
                          ? "text-red-700 line-through decoration-red-400/60"
                          : "text-gray-700"
                      }`}
                    >
                      {card.customerName}
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-[11px] text-gray-500">
                        {card.paymentMethod === "TRANSFER"
                          ? "🏦 ໂອນ"
                          : "💵 ສົດ"}
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          card.hasReversal
                            ? "text-red-700 line-through decoration-red-400/60"
                            : "text-gray-900"
                        }`}
                      >
                        {formatMoney(card.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Credit notes section (read-only, not draggable) */}
      {cards.filter((c) => c.isCreditNote).length > 0 && (
        <div className="mt-4 bg-white border border-orange-200 rounded p-3">
          <h3 className="text-[12px] uppercase tracking-wider text-orange-700 font-semibold mb-2">
            ໃບລົດໜີ້
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {cards
              .filter((c) => c.isCreditNote)
              .map((card) => (
                <Link
                  key={card.id}
                  href={`/invoices/${card.id}`}
                  className="bg-orange-50 border border-orange-200 rounded p-2 hover:bg-orange-100 transition"
                >
                  <div className="font-mono text-[11px] text-orange-800">
                    {card.number}
                  </div>
                  <div className="text-[12px] text-gray-700 truncate">
                    {card.customerName}
                  </div>
                  <div className="text-right text-[12px] text-orange-700 font-semibold tabular-nums">
                    - {formatMoney(card.total)}
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[11px] text-gray-500 italic px-1">
        💡 ລາກບິນລະຫວ່າງຄໍລໍາເພື່ອປ່ຽນສະຖານະ
      </div>
    </div>
  );
}
