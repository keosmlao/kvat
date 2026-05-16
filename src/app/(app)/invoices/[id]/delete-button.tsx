"use client";

import { useTransition } from "react";
import { deleteInvoice } from "../actions";

export function DeleteInvoiceButton({
  id,
  variant = "detail",
}: {
  id: string;
  variant?: "detail" | "row";
}) {
  const [pending, start] = useTransition();
  const onClick = () => {
    if (
      !confirm(
        "ຕ້ອງການລົບບິນນີ້ບໍ່? ຖ້າຍັງເປັນສະຖານະ ‘ອອກແລ້ວ’ ສິນຄ້າຈະຖືກຄືນເຂົ້າຄັງ.",
      )
    )
      return;
    start(async () => {
      try {
        await deleteInvoice(id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
      }
    });
  };

  if (variant === "row") {
    return (
      <button
        onClick={onClick}
        disabled={pending}
        className="text-red-600 hover:text-red-800 text-[12px] disabled:opacity-50"
      >
        ລົບ
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="border border-red-300 text-red-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-red-50 transition disabled:opacity-50"
    >
      {pending ? "ກຳລັງລົບ..." : "ລົບບິນ"}
    </button>
  );
}
