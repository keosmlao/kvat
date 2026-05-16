// Backfill: for each existing BillingInvoice that has no items, create a
// single line item from its description/amount so the new PDF + UI can
// render it consistently. Idempotent — skips invoices that already have items.
//
//   npm run backfill:billing-items

import "dotenv/config";
import { PrismaClient as MasterClient } from "../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.MASTER_DATABASE_URL;
if (!url) throw new Error("MASTER_DATABASE_URL is not set");

const prisma = new MasterClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const invoices = await prisma.billingInvoice.findMany({
    include: { items: { select: { id: true }, take: 1 } },
  });

  let touched = 0;
  for (const inv of invoices) {
    if (inv.items.length > 0) continue; // already migrated
    // Default to EXEMPT VAT on backfilled rows so we don't retroactively add
    // tax to invoices that were issued for the raw amount. Admin can edit.
    await prisma.$transaction([
      prisma.billingInvoiceItem.create({
        data: {
          invoiceId: inv.id,
          sn: 1,
          description: inv.description,
          unit: "ໜ່ວຍ",
          quantity: 1,
          unitPrice: inv.amount,
          discount: 0,
          total: inv.amount,
        },
      }),
      prisma.billingInvoice.update({
        where: { id: inv.id },
        data: {
          subtotal: inv.amount,
          vatMode: "EXEMPT",
          vatRate: 0,
          vatAmount: 0,
          // amount unchanged — already correct grand total
        },
      }),
    ]);
    touched++;
    console.log(`  ✓ ${inv.number}`);
  }

  console.log(`\n✓ Backfilled ${touched} invoice(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
