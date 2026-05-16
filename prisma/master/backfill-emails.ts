// Backfill TenantUserEmail rows from every existing tenant DB. Idempotent —
// run after introducing the mapping table OR after adding a User outside
// the normal signup flow (rare).

import "dotenv/config";
import { PrismaClient as MasterClient } from "../../src/generated/master/client";
import { PrismaClient as TenantClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const masterUrl = process.env.MASTER_DATABASE_URL;
if (!masterUrl) throw new Error("MASTER_DATABASE_URL is not set");

const master = new MasterClient({
  adapter: new PrismaPg({ connectionString: masterUrl }),
});

function tenantUrl(dbName: string): string {
  const host = process.env.TENANT_DB_HOST ?? "localhost";
  const port = process.env.TENANT_DB_PORT ?? "5432";
  const user = process.env.TENANT_DB_USER ?? "itdpt";
  const password = process.env.TENANT_DB_PASSWORD ?? "";
  const auth = password ? `${user}:${encodeURIComponent(password)}` : user;
  return `postgresql://${auth}@${host}:${port}/${dbName}`;
}

async function main() {
  const tenants = await master.tenant.findMany();
  for (const t of tenants) {
    const tenantClient = new TenantClient({
      adapter: new PrismaPg({ connectionString: tenantUrl(t.dbName) }),
    });
    try {
      const users = await tenantClient.user.findMany({ select: { email: true } });
      let added = 0;
      for (const u of users) {
        const r = await master.tenantUserEmail.upsert({
          where: { email: u.email.toLowerCase() },
          update: { tenantId: t.id },
          create: { email: u.email.toLowerCase(), tenantId: t.id },
        });
        if (r) added++;
      }
      console.log(`✓ ${t.slug} (${t.dbName}): ${added}/${users.length} mapped`);
    } catch (e) {
      console.error(`✗ ${t.slug}: ${e instanceof Error ? e.message : e}`);
    } finally {
      await tenantClient.$disconnect();
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => master.$disconnect());
