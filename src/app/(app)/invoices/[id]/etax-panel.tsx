"use client";

import { useState, useTransition } from "react";
import {
  submitInvoiceToEtax,
  pollEtaxStatus,
  cancelEtaxInvoice,
  previewEtaxPayload,
  type SubmitResult,
} from "../etax-actions";

export type EtaxState = {
  serialNum: string | null;
  invoiceNumber: string | null;
  issueTime: string | null;
  checkCode: string | null;
  qrUrl: string | null;
  status: string | null;
  statusReason: string | null;
  submittedAt: Date | string | null;
  lastCheckedAt: Date | string | null;
  errorCode: string | null;
  errorMsg: string | null;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  "0": {
    label: "ລໍຖ້າຢືນຢັນ",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "1": {
    label: "ຢືນຢັນແລ້ວ",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "3": {
    label: "ບໍ່ຜ່ານ",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  "6": {
    label: "ຍົກເລີກແລ້ວ",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

// Pin formatting to Asia/Vientiane so server (UTC) and client (browser TZ)
// produce identical strings — otherwise React reports a hydration mismatch.
const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTime(d: Date | string | null) {
  if (!d) return "—";
  return TIME_FMT.format(new Date(d));
}

export function EtaxPanel({
  invoiceId,
  initial,
}: {
  invoiceId: string;
  initial: EtaxState;
}) {
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; msg: string; requestId?: string } | null
  >(null);
  const [payloadPreview, setPayloadPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hasSubmitted = !!initial.invoiceNumber;
  const status = initial.status;
  const statusInfo = status ? STATUS_LABEL[status] : null;

  const onSubmit = () => {
    setFeedback(null);
    start(async () => {
      const r: SubmitResult = await submitInvoiceToEtax(invoiceId);
      if (r.ok) {
        setFeedback({
          kind: "ok",
          msg: `✓ ສົ່ງສຳເລັດ — ${r.invoiceNumber}`,
          requestId: r.requestId,
        });
      } else {
        setFeedback({
          kind: "err",
          msg: r.error,
          requestId: r.requestId,
        });
      }
    });
  };

  const onPoll = () => {
    setFeedback(null);
    start(async () => {
      const r = await pollEtaxStatus(invoiceId);
      if (r.ok) {
        const label = STATUS_LABEL[r.status]?.label ?? r.status;
        setFeedback({
          kind: "ok",
          msg: `✓ ສະຖານະ: ${label}`,
          requestId: r.requestId,
        });
      } else {
        setFeedback({
          kind: "err",
          msg: r.error,
          requestId: r.requestId,
        });
      }
    });
  };

  const onCancel = () => {
    if (!confirm("ຍົກເລີກບິນທີ່ eTax? (ໃຊ້ໄດ້ສະເພາະບິນທີ່ສະຖານະ Invalid)"))
      return;
    setFeedback(null);
    start(async () => {
      const r = await cancelEtaxInvoice(invoiceId);
      if (r.ok) {
        setFeedback({
          kind: "ok",
          msg: "✓ ຍົກເລີກສຳເລັດ",
          requestId: r.requestId,
        });
      } else {
        setFeedback({
          kind: "err",
          msg: r.error ?? "ບໍ່ສຳເລັດ",
          requestId: r.requestId,
        });
      }
    });
  };

  return (
    <div className="border-t border-gray-200 mt-4 pt-4 mb-6 no-print">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
            ໃບອາກອນເອເລັກໂຕຣນິກ (eTax)
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            ສົ່ງເຂົ້າລະບົບກົມສ່ວຍສາ
          </p>
        </div>
        <div className="flex gap-1.5">
          {!hasSubmitted && (
            <>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setPayloadPreview(null);
                  start(async () => {
                    const r = await previewEtaxPayload(invoiceId);
                    if (r.ok) {
                      setPayloadPreview(JSON.stringify(r.payload, null, 2));
                    } else {
                      setFeedback({ kind: "err", msg: r.error ?? "ບໍ່ສຳເລັດ" });
                    }
                  });
                }}
                disabled={pending}
                className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 disabled:opacity-50"
                title="ເບິ່ງ JSON ທີ່ຈະສົ່ງ — ບໍ່ໄດ້ສົ່ງຈິງ"
              >
                ເບິ່ງ payload
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={pending}
                className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
              >
                {pending ? "ກຳລັງສົ່ງ..." : "ສົ່ງເຂົ້າ eTax"}
              </button>
            </>
          )}
          {hasSubmitted && (
            <>
              <button
                type="button"
                onClick={onPoll}
                disabled={pending}
                className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {pending ? "..." : "ກວດສະຖານະ"}
              </button>
              {status === "3" && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={pending}
                  className="border border-red-300 text-red-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  ຍົກເລີກໃນ eTax
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status grid */}
      {hasSubmitted ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1.5 text-[13px]">
            <Row label="ເລກບິນ eTax">
              <span className="font-mono">{initial.invoiceNumber}</span>
            </Row>
            <Row label="ສະຖານະ">
              {statusInfo ? (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.cls}`}
                >
                  {statusInfo.label}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
              {initial.statusReason && (
                <span className="ml-2 text-[11px] text-red-600">
                  {initial.statusReason}
                </span>
              )}
            </Row>
            <Row label="ວັນທີອອກ">
              <span className="font-mono">{initial.issueTime || "—"}</span>
            </Row>
            <Row label="Check Code">
              <span className="font-mono">{initial.checkCode || "—"}</span>
            </Row>
            <Row label="serialNum">
              <span className="font-mono text-[11px] text-gray-500">
                {initial.serialNum || "—"}
              </span>
            </Row>
            <Row label="ສົ່ງເມື່ອ">
              <span className="text-[12px] text-gray-600">
                {formatTime(initial.submittedAt)}
              </span>
            </Row>
            {initial.lastCheckedAt && (
              <Row label="ກວດຄັ້ງລ້າສຸດ">
                <span className="text-[12px] text-gray-600">
                  {formatTime(initial.lastCheckedAt)}
                </span>
              </Row>
            )}
          </div>

          {initial.qrUrl && (
            <div className="bg-white border border-gray-200 rounded p-3 flex flex-col items-center gap-1">
              {/* QR rendered server-side from url via google charts (no extra dep) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(initial.qrUrl)}`}
                alt="QR Code"
                className="w-32 h-32"
              />
              <a
                href={initial.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#b91c1c] hover:underline"
              >
                ເປີດ URL
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 text-[12px] text-gray-500 italic text-center">
          ບິນນີ້ຍັງບໍ່ໄດ້ສົ່ງເຂົ້າ eTax — ກົດ "ສົ່ງເຂົ້າ eTax" ເພື່ອອອກ
          ໃບອາກອນເອເລັກໂຕຣນິກ
        </div>
      )}

      {initial.errorCode && initial.errorMsg && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 text-[12px] text-red-700">
          <div className="font-medium">⚠ ການສົ່ງລ້າສຸດຜິດພາດ:</div>
          <div>{initial.errorMsg}</div>
          <div className="text-[11px] font-mono mt-0.5">
            code: {initial.errorCode}
          </div>
        </div>
      )}

      {payloadPreview && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] uppercase tracking-wider text-gray-500">
              JSON payload
            </span>
            <button
              type="button"
              onClick={() => setPayloadPreview(null)}
              className="text-[11px] text-gray-500 hover:text-gray-800"
            >
              ປິດ
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 text-[11px] p-3 rounded overflow-auto max-h-96 font-mono">
            {payloadPreview}
          </pre>
        </div>
      )}

      {feedback && (
        <div
          className={`mt-2 rounded p-2 text-[12px] ${
            feedback.kind === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <div>{feedback.msg}</div>
          {feedback.requestId && (
            <div className="text-[10px] mt-0.5 font-mono text-gray-500">
              requestId: {feedback.requestId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
      <span className="text-[11px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}
