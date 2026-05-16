import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export async function generateInvoiceNumber(
  prefix: string,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const client = tx ?? prisma;
  const now = new Date();
  const yyyymm =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0");
  const stem = `${prefix}-${yyyymm}-`;

  if (tx) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${stem})::bigint)`;
  }

  const latest = await client.invoice.findFirst({
    where: { number: { startsWith: stem } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const latestSeq = latest?.number
    ? Number.parseInt(latest.number.slice(stem.length), 10)
    : 0;
  const nextSeq = Number.isFinite(latestSeq) ? latestSeq + 1 : 1;
  return `${stem}${nextSeq.toString().padStart(4, "0")}`;
}
