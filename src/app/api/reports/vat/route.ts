import { requireUser } from "@/lib/session";
import { vatReportByMonth } from "@/lib/vat-report";

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const year =
    parseInt(url.searchParams.get("year") ?? "", 10) || new Date().getFullYear();

  const rows = await vatReportByMonth(year);

  const headers = [
    "Month",
    "Invoices",
    "TaxableBase_LAK",
    "ExemptBase_LAK",
    "VAT_LAK",
    "Total_LAK",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.ym,
        String(r.invoiceCount),
        String(r.taxableBase),
        String(r.exemptBase),
        String(r.vatCollected),
        String(r.total),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  // BOM prefix so Excel opens UTF-8 cleanly.
  const body = "﻿" + lines.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vat-report-${year}.csv"`,
    },
  });
}
