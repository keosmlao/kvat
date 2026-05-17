"use client";

import { useTransition } from "react";
import {
  createCreditNote,
  resetToDraft,
  postInvoice,
} from "../payment-actions";
import { t, type Locale } from "@/lib/i18n/messages";

export function CreditNoteButton({ id, locale = "lo" }: { id: string; locale?: Locale }) {
  const tia = (k: string) => t(locale, "invoiceActions", k);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(tia("creditNoteConfirm"))) return;
        start(async () => {
          try {
            await createCreditNote(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : tia("creditNoteFailed"));
          }
        });
      }}
      disabled={pending}
      className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition disabled:opacity-50"
    >
      {pending ? "..." : tia("creditNoteBtn")}
    </button>
  );
}

export function ResetToDraftButton({ id, locale = "lo" }: { id: string; locale?: Locale }) {
  const tia = (k: string) => t(locale, "invoiceActions", k);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(tia("resetDraftConfirm"))) return;
        start(async () => {
          try {
            await resetToDraft(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : tia("resetDraftFailed"));
          }
        });
      }}
      disabled={pending}
      className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition disabled:opacity-50"
    >
      {pending ? "..." : tia("resetDraftBtn")}
    </button>
  );
}

export function PostInvoiceButton({ id, locale = "lo" }: { id: string; locale?: Locale }) {
  const tia = (k: string) => t(locale, "invoiceActions", k);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(tia("postConfirm"))) return;
        start(async () => {
          try {
            await postInvoice(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : tia("resetDraftFailed"));
          }
        });
      }}
      disabled={pending}
      className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-odoo-hover transition disabled:opacity-50"
    >
      {pending ? "..." : tia("postBtn")}
    </button>
  );
}
