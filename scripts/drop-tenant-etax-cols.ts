// One-time migration: drop the per-tenant eTax credential columns from every
// tenant DB + the kvat template. Credentials are now stored globally in master
// DB (EtaxConfig). Idempotent — uses IF EXISTS.
//
//   npm run migrate:drop-tenant-etax
//
// Run AFTER seed:etax-config has populated the master row so no credentials
// are lost in the transition.

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

const DROP_SQL = `
  ALTER TABLE "Setting" DROP COLUMN IF EXISTS "etaxEnv";
  ALTER TABLE "Setting" DROP COLUMN IF EXISTS "etaxUsername";
  ALTER TABLE "Setting" DROP COLUMN IF EXISTS "etaxSecret";
  ALTER TABLE "Setting" DROP COLUMN IF EXISTS "etaxIssueCode";
`;

async function alterDb(dbName: string): Promise<void> {
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    await client.query(DROP_SQL);
    console.log(`  ✓ ${dbName}`);
  } catch (e) {
    console.error(`  ✗ ${dbName}: ${e instanceof Error ? e.message : e}`);
    throw e;
  } finally {
    await client.end();
  }
}

async function main() {
  // Safety check — refuse to drop if master config is empty.
  const cfg = await masterPrisma.etaxConfig.findUnique({ where: { id: 1 } });
  if (!cfg || !cfg.username || !cfg.secret) {
    throw new Error(
      "EtaxConfig in master is not populated — run `npm run seed:etax-config` " +
        "or fill it in via /manage/etax-config first. Aborting to avoid " +
        "losing credentials.",
    );
  }

  const tenants = await masterPrisma.tenant.findMany({
    select: { dbName: true },
  });
  const dbNames = new Set(tenants.map((t) => t.dbName));
  dbNames.add(process.env.KVAT_DB ?? "kvat");

  console.log(`Dropping eTax cred columns from ${dbNames.size} database(s):`);
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
