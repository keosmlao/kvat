"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BillingQuoteStatus } from "@/generated/master/enums";
import { t } from "@/lib/i18n/messages";
import {
  convertBillingQuoteToInvoice,
  setBillingQuoteStatus,
} from "../actions";

const tm = (k: string) => t("lo", "manage", k);

export function ManageQuoteWorkflowActions({
  id,
  status,
}: {
  id: string;
  status: BillingQuoteStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(next: BillingQuoteStatus) {
    startTransition(async () => {
      await setBillingQuoteStatus(id, next);
      router.refresh();
    });
  }

  function convertToInvoice() {
    startTransition(async () => {
      if (!confirm(tm("qConvertConfirm"))) return;
      const result = await convertBillingQuoteToInvoice(id);
      if (result.ok) {
        router.push(`/manage/billing/${result.invoiceId}`);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === BillingQuoteStatus.DRAFT && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus(BillingQuoteStatus.SENT)}
          className="bg-[#875a7b] text-white px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#74486a] disabled:opacity-50"
        >
          {tm("qSendToCust")}
        </button>
      )}
      {status === BillingQuoteStatus.SENT && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus(BillingQuoteStatus.ACCEPTED)}
            className="bg-[#875a7b] text-white px-3 py-1.5 rounded text-[13px] font-medium hover:bg-[#74486a] disabled:opacity-50"
          >
            {tm("qAcceptBtn")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus(BillingQuoteStatus.REJECTED)}
            className="text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-[13px] disabled:opacity-50"
          >
            {tm("qRejectBtn")}
          </button>
        </>
      )}
      {(status === BillingQuoteStatus.SENT ||
        status === BillingQuoteStatus.ACCEPTED) && (
        <button
          type="button"
          disabled={pending}
          onClick={convertToInvoice}
          className="border border-[#875a7b] text-[#875a7b] hover:bg-[#875a7b]/10 px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
        >
          {tm("qConvertBtn")}
        </button>
      )}
    </div>
  );
}
