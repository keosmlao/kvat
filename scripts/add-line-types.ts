// One-time migration: add lineType column + relax productId NOT NULL on
// InvoiceItem and QuotationItem across every tenant DB + the kvat template.
// Idempotent — uses IF NOT EXISTS / catches "already nullable" errors.
//
//   npm exec tsx scripts/add-line-types.ts

import "dotenv/config";
import { Client } from "pg";
import { PrismaClient } from "../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

const masterUrl = process.env.MASTER_DATABASE_URL;
if (!masterUrl) throw new Error("MASTER_DATABASE_URL is not set");

const masterPrisma = new PrismaClient({
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

const SQL = `
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "lineType" TEXT NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "QuotationItem"
  ADD COLUMN IF NOT EXISTS "lineType" TEXT NOT NULL DEFAULT 'PRODUCT';
ALTER TABLE "InvoiceItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "QuotationItem" ALTER COLUMN "productId" DROP NOT NULL;
`;

async function alterDb(dbName: string): Promise<void> {
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    await client.query(SQL);
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

  console.log(`Adding lineType columns to ${dbNames.size} database(s):`);
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
