import "server-only";
import { masterPrisma } from "./master-prisma";

// Allocate a new sequential BillingInvoice number using the configured
// prefix + current year + 4-digit running serial. Idempotent per call —
// callers MUST persist the returned number immediately.
export async function nextBillingInvoiceNumber(): Promise<string> {
  const cfg = await masterPrisma.billingConfig.findUnique({ where: { id: 1 } });
  const prefix = cfg?.invoicePrefix ?? "BIL-";
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}${year}-`;

  const latest = await masterPrisma.billingInvoice.findFirst({
    where: { number: { startsWith: yearPrefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  let next = 1;
  if (latest) {
    const tail = latest.number.slice(yearPrefix.length);
    const parsed = parseInt(tail, 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }
  return `${yearPrefix}${String(next).padStart(4, "0")}`;
}

export async function nextBillingQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `QT-${year}-`;

  const latest = await masterPrisma.billingQuote.findFirst({
    where: { number: { startsWith: yearPrefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  let next = 1;
  if (latest) {
    const tail = latest.number.slice(yearPrefix.length);
    const parsed = parseInt(tail, 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }
  return `${yearPrefix}${String(next).padStart(4, "0")}`;
}

export type PlanProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  priceLak: number;
};

/**
 * Look up the BillingProduct linked to a given plan in BillingConfig. Returns
 * null for TRIAL (no charge) or when the admin hasn't picked a product yet.
 */
export async function planProduct(
  plan: "TRIAL" | "YEARLY" | "LIFETIME",
): Promise<PlanProduct | null> {
  if (plan === "TRIAL") return null;
  const cfg = await masterPrisma.billingConfig.findUnique({
    where: { id: 1 },
    include: { yearlyProduct: true, lifetimeProduct: true },
  });
  if (!cfg) return null;
  const p = plan === "YEARLY" ? cfg.yearlyProduct : cfg.lifetimeProduct;
  if (!p) return null;
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    priceLak: p.priceLak,
  };
}
