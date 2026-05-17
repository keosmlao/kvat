"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  markQuotationSent,
  acceptQuotation,
  rejectQuotation,
  convertToInvoice,
} from "../actions";
import type { QuotationStatus } from "@/generated/prisma/client";

export function WorkflowButtons({
  id,
  status,
  invoiceId,
  invoiceNumber,
}: {
  id: string;
  status: QuotationStatus;
  invoiceId: string | null;
  invoiceNumber: string | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  // Already converted → just link to the invoice.
  if (status === "CONVERTED" && invoiceId) {
    return (
      <Link
        href={`/invoices/${invoiceId}`}
        className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium"
      >
        ✓ ບິນແລ້ວ: {invoiceNumber} →
      </Link>
    );
  }

  return (
    <>
      {status === "DRAFT" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              await markQuotationSent(id);
              router.refresh();
            });
          }}
          className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          📤 ໝາຍວ່າສົ່ງແລ້ວ
        </button>
      )}
      {(status === "DRAFT" || status === "SENT") && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              start(async () => {
                await acceptQuotation(id);
                router.refresh();
              });
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
          >
            ✓ ຍອມຮັບ
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("ປະຕິເສດໃບສະເໜີລາຄານີ້?")) return;
              start(async () => {
                await rejectQuotation(id);
                router.refresh();
              });
            }}
            className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
          >
            ✗ ປະຕິເສດ
          </button>
        </>
      )}
      {(status === "ACCEPTED" || status === "SENT") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("ສ້າງບິນຈາກໃບສະເໜີລາຄານີ້?")) return;
            start(async () => {
              const r = await convertToInvoice(id);
              if (r.ok) {
                router.push(`/invoices/${r.invoiceId}`);
              } else {
                alert(`✗ ${r.error}`);
              }
            });
          }}
          className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          ⇒ ສ້າງເປັນບິນ
        </button>
      )}
    </>
  );
}
