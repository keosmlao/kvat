// Add Quotation + QuotationItem tables to every tenant DB + the kvat template.
// Idempotent — uses IF NOT EXISTS / DO blocks.
//
//   npm run migrate:quotations
//
// After: npm run dump:tenant-schema

import "dotenv/config";
import { Client } from "pg";
import { PrismaClient as MasterClient } from "../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

const masterUrl = process.env.MASTER_DATABASE_URL;
if (!masterUrl) throw new Error("MASTER_DATABASE_URL is not set");

const masterPrisma = new MasterClient({
  adapter: new PrismaPg({ connectionString: masterUrl }),
});

function tenantUrl(dbName: string): string {
  const host = process.env.TENANT_DB_HOST ?? "localhost";
  const port = process.env.TENANT_DB_PORT ?? "5432";
  const user = process.env.TENANT_DB_USER;
  const password = process.env.TENANT_DB_PASSWORD ?? "";
  if (!user) throw new Error("TENANT_DB_USER is not set");
  const auth = password ? `${user}:${encodeURIComponent(password)}` : user;
  return `postgresql://${auth}@${host}:${port}/${dbName}`;
}

const STATEMENTS = [
  // Enum
  `DO $$ BEGIN
     CREATE TYPE "QuotationStatus" AS ENUM
       ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,

  // Quotation table
  `CREATE TABLE IF NOT EXISTS "Quotation" (
     "id" TEXT PRIMARY KEY,
     "number" TEXT NOT NULL UNIQUE,
     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "validUntil" TIMESTAMP(3),
     "customerId" TEXT NOT NULL,
     "userId" TEXT NOT NULL,
     "reference" TEXT,
     "currency" TEXT NOT NULL DEFAULT 'LAK',
     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
     "subtotal" DOUBLE PRECISION NOT NULL,
     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
     "vatMode" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
     "vatAmount" DOUBLE PRECISION NOT NULL,
     "total" DOUBLE PRECISION NOT NULL,
     "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
     "note" TEXT,
     "sentAt" TIMESTAMP(3),
     "decidedAt" TIMESTAMP(3),
     "invoiceId" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL,
     CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId")
       REFERENCES "Customer"("id") ON DELETE RESTRICT,
     CONSTRAINT "Quotation_userId_fkey" FOREIGN KEY ("userId")
       REFERENCES "User"("id"),
     CONSTRAINT "Quotation_invoiceId_fkey" FOREIGN KEY ("invoiceId")
       REFERENCES "Invoice"("id") ON DELETE SET NULL
   )`,

  `CREATE INDEX IF NOT EXISTS "Quotation_date_idx" ON "Quotation"("date")`,
  `CREATE INDEX IF NOT EXISTS "Quotation_customerId_idx" ON "Quotation"("customerId")`,
  `CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status")`,

  // QuotationItem
  `CREATE TABLE IF NOT EXISTS "QuotationItem" (
     "id" TEXT PRIMARY KEY,
     "quotationId" TEXT NOT NULL,
     "productId" TEXT NOT NULL,
     "productName" TEXT NOT NULL,
     "unit" TEXT NOT NULL,
     "quantity" DOUBLE PRECISION NOT NULL,
     "priceLak" DOUBLE PRECISION NOT NULL,
     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
     "total" DOUBLE PRECISION NOT NULL,
     CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId")
       REFERENCES "Quotation"("id") ON DELETE CASCADE,
     CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId")
       REFERENCES "Product"("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "QuotationItem_quotationId_idx"
     ON "QuotationItem"("quotationId")`,
];

async function alterDb(dbName: string): Promise<void> {
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    for (const sql of STATEMENTS) await client.query(sql);
    console.log(`  ✓ ${dbName}`);
  } catch (e) {
    console.error(`  ✗ ${dbName}: ${e instanceof Error ? e.message : e}`);
    throw e;
  } finally {
    await client.end();
  }
}

async function main() {
  const tenants = await masterPrisma.tenant.findMany({
    select: { dbName: true },
  });
  const dbNames = new Set(tenants.map((t) => t.dbName));
  dbNames.add(process.env.KVAT_DB ?? "kvat");

  console.log(`Adding Quotation tables to ${dbNames.size} database(s):`);
  for (const db of dbNames) {
    await alterDb(db);
  }
  console.log("\n✓ Done. Next: npm run dump:tenant-schema");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
