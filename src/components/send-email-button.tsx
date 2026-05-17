"use client";

import { useTransition } from "react";
import {
  sendInvoiceByEmail,
  sendQuotationByEmail,
} from "@/app/(app)/settings/email-actions";

type Props = {
  customerEmail: string | null;
} & (
  | { kind: "invoice"; invoiceId: string; reminder?: boolean }
  | { kind: "quotation"; quotationId: string }
);

export function SendEmailButton(props: Props) {
  const [pending, start] = useTransition();
  const disabled = !props.customerEmail;

  const label = (() => {
    if (props.kind === "invoice") {
      return props.reminder ? "🔔 ສົ່ງເຕືອນຈ່າຍ" : "📧 ສົ່ງ Email";
    }
    return "📧 ສົ່ງ Email";
  })();

  const colour =
    props.kind === "invoice" && props.reminder
      ? "border-amber-300 text-amber-700 hover:bg-amber-50"
      : "border-gray-300 text-gray-700 hover:bg-gray-50";

  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={disabled ? "ລູກຄ້າບໍ່ມີ email" : undefined}
      onClick={() => {
        if (!props.customerEmail) return;
        if (
          !confirm(
            `ສົ່ງ email ໄປ ${props.customerEmail}?`,
          )
        )
          return;
        start(async () => {
          const r =
            props.kind === "invoice"
              ? await sendInvoiceByEmail(
                  props.invoiceId,
                  props.reminder ?? false,
                )
              : await sendQuotationByEmail(props.quotationId);
          if (r.ok) {
            alert("✓ ສົ່ງສຳເລັດ");
          } else {
            alert(`✗ ${r.error}`);
          }
        });
      }}
      className={`border px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50 ${colour}`}
    >
      {pending ? "ກຳລັງສົ່ງ..." : label}
    </button>
  );
}
