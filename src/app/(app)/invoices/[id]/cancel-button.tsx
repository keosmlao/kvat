"use client";

import { useTransition } from "react";
import { cancelInvoice } from "../actions";

export function CancelInvoiceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("ຕ້ອງການຍົກເລີກບິນນີ້ບໍ່? ສິນຄ້າຈະຖືກຄືນເຂົ້າຄັງ.")) return;
        start(() => cancelInvoice(id));
      }}
      disabled={pending}
      className="border border-red-300 text-red-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-red-50 transition disabled:opacity-50"
    >
      {pending ? "ກຳລັງຍົກເລີກ..." : "ຍົກເລີກບິນ"}
    </button>
  );
}
