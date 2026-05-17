// Add RecurringInvoice + RecurringInvoiceItem tables + Invoice.recurringId
// column to every tenant DB + the kvat template. Idempotent — uses IF NOT
// EXISTS / CREATE IF NOT EXISTS so safe to re-run.
//
//   npm run migrate:recurring-invoices
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

// One statement per query so each can succeed/fail independently and the
// IF NOT EXISTS guards behave as expected.
const STATEMENTS = [
  // Enum (Postgres has no IF NOT EXISTS for CREATE TYPE — wrap in DO block)
  `DO $$ BEGIN
     CREATE TYPE "RecurringCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$`,

  // RecurringInvoice table
  `CREATE TABLE IF NOT EXISTS "RecurringInvoice" (
     "id" TEXT PRIMARY KEY,
     "code" TEXT NOT NULL UNIQUE,
     "name" TEXT NOT NULL,
     "customerId" TEXT NOT NULL,
     "active" BOOLEAN NOT NULL DEFAULT true,
     "cycle" "RecurringCycle" NOT NULL DEFAULT 'MONTHLY',
     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "nextRunDate" TIMESTAMP(3) NOT NULL,
     "endDate" TIMESTAMP(3),
     "currency" TEXT NOT NULL DEFAULT 'LAK',
     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
     "vatMode" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
     "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
     "note" TEXT,
     "lastRunAt" TIMESTAMP(3),
     "generatedCount" INTEGER NOT NULL DEFAULT 0,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL,
     CONSTRAINT "RecurringInvoice_customerId_fkey" FOREIGN KEY ("customerId")
       REFERENCES "Customer"("id") ON DELETE RESTRICT
   )`,

  `CREATE INDEX IF NOT EXISTS "RecurringInvoice_active_nextRunDate_idx"
     ON "RecurringInvoice"("active", "nextRunDate")`,
  `CREATE INDEX IF NOT EXISTS "RecurringInvoice_customerId_idx"
     ON "RecurringInvoice"("customerId")`,

  // RecurringInvoiceItem
  `CREATE TABLE IF NOT EXISTS "RecurringInvoiceItem" (
     "id" TEXT PRIMARY KEY,
     "recurringId" TEXT NOT NULL,
     "productId" TEXT NOT NULL,
     "productName" TEXT NOT NULL,
     "unit" TEXT NOT NULL,
     "quantity" DOUBLE PRECISION NOT NULL,
     "priceLak" DOUBLE PRECISION NOT NULL,
     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
     CONSTRAINT "RecurringInvoiceItem_recurringId_fkey"
       FOREIGN KEY ("recurringId") REFERENCES "RecurringInvoice"("id")
       ON DELETE CASCADE,
     CONSTRAINT "RecurringInvoiceItem_productId_fkey"
       FOREIGN KEY ("productId") REFERENCES "Product"("id")
   )`,
  `CREATE INDEX IF NOT EXISTS "RecurringInvoiceItem_recurringId_idx"
     ON "RecurringInvoiceItem"("recurringId")`,

  // Invoice.recurringId column (nullable FK)
  `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "recurringId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Invoice_recurringId_idx"
     ON "Invoice"("recurringId")`,

  // FK guard — only add if missing
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = 'Invoice' AND constraint_name = 'Invoice_recurringId_fkey'
     ) THEN
       ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurringId_fkey"
         FOREIGN KEY ("recurringId") REFERENCES "RecurringInvoice"("id")
         ON DELETE SET NULL;
     END IF;
   END $$`,
];

async function alterDb(dbName: string): Promise<void> {
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    for (const sql of STATEMENTS) {
      await client.query(sql);
    }
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

  console.log(`Adding recurring-invoice tables to ${dbNames.size} database(s):`);
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
