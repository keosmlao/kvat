import "server-only";
import { masterPrisma } from "./master-prisma";

// Allocate next sequential code for a billing entity. Pattern: `<prefix><####>`,
// where #### is the highest existing serial + 1, zero-padded. Idempotent per
// call — caller must persist immediately or two parallel callers could collide.

async function nextSequentialCode(
  prefix: string,
  existing: { code: string }[],
): Promise<string> {
  let max = 0;
  for (const row of existing) {
    if (!row.code.startsWith(prefix)) continue;
    const tail = row.code.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function nextCustomerCode(): Promise<string> {
  const all = await masterPrisma.billingCustomer.findMany({
    select: { code: true },
  });
  return nextSequentialCode("C", all);
}

export async function nextProductCode(): Promise<string> {
  const all = await masterPrisma.billingProduct.findMany({
    select: { code: true },
  });
  return nextSequentialCode("P", all);
}

/**
 * Ensure a BillingCustomer exists for the given tenant. Returns the customer
 * row, creating one (type=TENANT) if not yet present. Safe to call on every
 * tenant approval / auto-billing event.
 */
export async function ensureCustomerForTenant(tenantId: string) {
  const existing = await masterPrisma.billingCustomer.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;

  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      email: true,
      phone: true,
      ownerName: true,
    },
  });
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  const code = await nextCustomerCode();
  return masterPrisma.billingCustomer.create({
    data: {
      code,
      name: tenant.name,
      type: "TENANT",
      tenantId,
      email: tenant.email,
      phone: tenant.phone,
      contactName: tenant.ownerName,
    },
  });
}
