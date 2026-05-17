// Add SMTP columns to Setting + EmailLog table to every tenant DB +
// the kvat template. Idempotent — uses IF NOT EXISTS.
//
//   npm run migrate:email-system
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
  // SMTP columns on Setting
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpHost" TEXT`,
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpPort" INTEGER DEFAULT 587`,
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpUser" TEXT`,
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpPassword" TEXT`,
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpFromName" TEXT`,
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpFromEmail" TEXT`,
  `ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "smtpSecure" BOOLEAN NOT NULL DEFAULT false`,

  // EmailLog table
  `CREATE TABLE IF NOT EXISTS "EmailLog" (
     "id" TEXT PRIMARY KEY,
     "toEmail" TEXT NOT NULL,
     "subject" TEXT NOT NULL,
     "kind" TEXT NOT NULL,
     "recordType" TEXT,
     "recordId" TEXT,
     "status" TEXT NOT NULL DEFAULT 'SENT',
     "errorMsg" TEXT,
     "sentByUserId" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "EmailLog_sentByUserId_fkey" FOREIGN KEY ("sentByUserId")
       REFERENCES "User"("id") ON DELETE SET NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_recordType_recordId_idx"
     ON "EmailLog"("recordType", "recordId")`,
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

  console.log(`Adding email system to ${dbNames.size} database(s):`);
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
