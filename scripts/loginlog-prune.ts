// Delete LoginLog rows older than LOGIN_LOG_KEEP_DAYS (default 90).
// Run from cron weekly. Cheap — single SQL DELETE bounded by an index.

import "dotenv/config";
import { PrismaClient } from "../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.MASTER_DATABASE_URL;
if (!url) throw new Error("MASTER_DATABASE_URL is not set");

const KEEP_DAYS = parseInt(process.env.LOGIN_LOG_KEEP_DAYS ?? "90", 10);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.loginLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(
    `✓ Pruned ${result.count} LoginLog row(s) older than ${cutoff.toISOString()}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
