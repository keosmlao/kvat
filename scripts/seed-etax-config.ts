// Seed the global EtaxConfig row from env vars OR from an existing tenant's
// Setting (whichever has values). Idempotent — won't overwrite an existing
// row with non-empty credentials.
//
//   npm exec tsx scripts/seed-etax-config.ts

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

type Creds = {
  gateway: string;
  env: string;
  username: string;
  secret: string;
};

function envCreds(): Creds {
  return {
    gateway: process.env.ETAX_GATEWAY_URL ?? "",
    env: process.env.ETAX_ENV ?? "dev",
    username: process.env.ETAX_USERNAME ?? "",
    secret: process.env.ETAX_SECRET ?? "",
  };
}

async function firstConfiguredTenantSetting(): Promise<Creds | null> {
  // Look through tenants for the first one with a fully-configured Setting row.
  const tenants = await masterPrisma.tenant.findMany({
    select: { dbName: true },
  });
  for (const t of tenants) {
    const client = new Client({ connectionString: tenantUrl(t.dbName) });
    try {
      await client.connect();
      const r = await client.query<{
        etaxEnv: string | null;
        etaxUsername: string | null;
        etaxSecret: string | null;
      }>(
        `SELECT "etaxEnv", "etaxUsername", "etaxSecret"
         FROM "Setting" WHERE id = 'default' LIMIT 1`,
      );
      const row = r.rows[0];
      if (row && row.etaxUsername && row.etaxSecret) {
        return {
          gateway: process.env.ETAX_GATEWAY_URL ?? "",
          env: row.etaxEnv ?? "dev",
          username: row.etaxUsername,
          secret: row.etaxSecret,
        };
      }
    } catch {
      // Column may not exist yet on some tenants — ignore and try next.
    } finally {
      await client.end().catch(() => {});
    }
  }
  return null;
}

async function main() {
  const existing = await masterPrisma.etaxConfig.findUnique({ where: { id: 1 } });
  if (existing && existing.username && existing.secret) {
    console.log("✓ EtaxConfig already populated — skipping seed");
    return;
  }

  const fromTenant = await firstConfiguredTenantSetting();
  const source = fromTenant ?? envCreds();
  const sourceLabel = fromTenant ? "existing tenant Setting" : "env vars";

  await masterPrisma.etaxConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...source },
    update: source,
  });

  console.log(`✓ EtaxConfig seeded from ${sourceLabel}`);
  console.log(`  env=${source.env}  user=${source.username}`);
  if (!source.username || !source.secret) {
    console.log(
      "  ⚠ Username/Secret blank — set them in /manage/etax-config before issuing invoices",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => masterPrisma.$disconnect());
