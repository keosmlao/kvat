// One-time migration: add UserActivity table to every tenant DB + the
// kvat template. Idempotent — IF NOT EXISTS.
//
//   npm exec tsx scripts/add-user-activity.ts
//
// After this completes, regenerate the template snapshot:
//   npm run dump:tenant-schema

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

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS "UserActivity" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT,
  "action"     TEXT NOT NULL,
  "recordType" TEXT,
  "recordId"   TEXT,
  "summary"    TEXT NOT NULL,
  "meta"       TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "UserActivity_userId_createdAt_idx"
  ON "UserActivity" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserActivity_createdAt_idx"
  ON "UserActivity" ("createdAt");
CREATE INDEX IF NOT EXISTS "UserActivity_recordType_recordId_idx"
  ON "UserActivity" ("recordType", "recordId");
CREATE INDEX IF NOT EXISTS "UserActivity_action_idx"
  ON "UserActivity" ("action");
`;

async function alterDb(dbName: string): Promise<void> {
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    await client.query(CREATE_SQL);
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

  console.log(`Creating UserActivity table on ${dbNames.size} database(s):`);
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
