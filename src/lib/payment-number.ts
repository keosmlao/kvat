import "server-only";
import { prisma } from "./prisma";

export async function generatePaymentNumber(
  prefix: string = "PAY",
): Promise<string> {
  const now = new Date();
  const yyyymm =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0");
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (prefix === "CN") {
    // Credit note — generated from invoice table with isCreditNote=true
    const count = await prisma.invoice.count({
      where: { isCreditNote: true, date: { gte: startOfMonth } },
    });
    const seq = (count + 1).toString().padStart(4, "0");
    return `CN-${yyyymm}-${seq}`;
  }

  const count = await prisma.payment.count({
    where: { date: { gte: startOfMonth } },
  });
  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}-${yyyymm}-${seq}`;
}
