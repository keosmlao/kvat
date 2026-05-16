"use client";

import { useTransition } from "react";
import {
  createCreditNote,
  resetToDraft,
  postInvoice,
} from "../payment-actions";

export function CreditNoteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (
          !confirm(
            "ສ້າງໃບລົດໜີ້ (Credit Note) ຈາກບິນນີ້? ສິນຄ້າຈະຖືກຄືນເຂົ້າຄັງ.",
          )
        )
          return;
        start(async () => {
          try {
            await createCreditNote(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ");
          }
        });
      }}
      disabled={pending}
      className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition disabled:opacity-50"
    >
      {pending ? "..." : "ໃບລົດໜີ້"}
    </button>
  );
}

export function ResetToDraftButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("ປ່ຽນບິນກັບເປັນຮ່າງ? ສິນຄ້າຈະຖືກຄືນເຂົ້າຄັງຊົ່ວຄາວ."))
          return;
        start(async () => {
          try {
            await resetToDraft(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
          }
        });
      }}
      disabled={pending}
      className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition disabled:opacity-50"
    >
      {pending ? "..." : "ກັບເປັນຮ່າງ"}
    </button>
  );
}

export function PostInvoiceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm("ປະກາດບິນ? ສິນຄ້າຈະຖືກຫັກອອກຈາກຄັງ.")) return;
        start(async () => {
          try {
            await postInvoice(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
          }
        });
      }}
      disabled={pending}
      className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] transition disabled:opacity-50"
    >
      {pending ? "..." : "ປະກາດບິນ"}
    </button>
  );
}
