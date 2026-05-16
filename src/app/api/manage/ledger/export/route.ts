import { masterPrisma } from "@/lib/master-prisma";
import { requireManagement } from "@/lib/management-session";
import { LedgerType } from "@/generated/master/client";

function csvEscape(v: string): string {
  // RFC 4180 — wrap in quotes if value contains comma, quote, newline.
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

const ISO = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: Request) {
  await requireManagement();
  const url = new URL(req.url);
  const sp = url.searchParams;

  const typeStr = sp.get("type");
  const typeFilter =
    typeStr === "INCOME" || typeStr === "EXPENSE"
      ? (typeStr as LedgerType)
      : undefined;
  const categoryId = sp.get("categoryId") || undefined;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const fromDate = fromStr ? new Date(fromStr) : undefined;
  const toDate = toStr ? new Date(toStr + "T23:59:59") : undefined;
  const query = sp.get("q")?.trim() || undefined;

  const where = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query, mode: "insensitive" as const } },
            { vendor: { contains: query, mode: "insensitive" as const } },
            { notes: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const entries = await masterPrisma.ledgerEntry.findMany({
    where,
    include: {
      category: { select: { name: true } },
      subscription: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const headers = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Vendor",
    "Amount",
    "Currency",
    "PaymentMethod",
    "PaymentRef",
    "Subscription",
    "Notes",
  ];

  const lines = [headers.join(",")];
  for (const e of entries) {
    lines.push(
      [
        ISO(e.date),
        e.type,
        e.category?.name ?? "",
        e.description,
        e.vendor ?? "",
        String(e.amount),
        e.currency,
        e.paymentMethod ?? "",
        e.paymentRef ?? "",
        e.subscription?.name ?? "",
        e.notes ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  // Prepend BOM so Excel opens UTF-8 Lao text correctly.
  const body = "﻿" + lines.join("\r\n");
  const filename = `ledger-${ISO(new Date())}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
