// Move every TRIAL tenant whose trial has elapsed to SUSPENDED.
// Idempotent. Intended to run from cron, e.g. daily at 02:00:
//   0 2 * * *  cd /path/to/smlao-app && npm run trial:expire
//
// `authenticate()` also checks on every login, so this script mainly catches
// tenants that aren't actively used.

import "dotenv/config";
import { PrismaClient, TenantStatus } from "../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.MASTER_DATABASE_URL;
if (!url) throw new Error("MASTER_DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const now = new Date();
  const expired = await prisma.tenant.findMany({
    where: { status: TenantStatus.TRIAL, trialEndsAt: { lt: now } },
    select: { id: true, slug: true, trialEndsAt: true },
  });

  if (expired.length === 0) {
    console.log("✓ No expired trials");
    return;
  }

  for (const t of expired) {
    await prisma.tenant.update({
      where: { id: t.id },
      data: { status: TenantStatus.SUSPENDED },
    });
    const daysOver = Math.floor(
      (now.getTime() - t.trialEndsAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    console.log(`✗ ${t.slug} → SUSPENDED (trial ended ${daysOver}d ago)`);
  }
  console.log(`done — suspended ${expired.length} tenant(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
