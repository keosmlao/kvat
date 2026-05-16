import "server-only";
import { prisma } from "./prisma";

export async function generateInvoiceNumber(prefix: string): Promise<string> {
  const now = new Date();
  const yyyymm =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0");
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await prisma.invoice.count({
    where: { date: { gte: startOfMonth } },
  });
  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}-${yyyymm}-${seq}`;
}
