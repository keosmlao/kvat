// One-off: insert the "template" tenant pointing at the existing kvat DB.
// Safe to re-run — uses upsert on slug.

import "dotenv/config";
import { PrismaClient, TenantPlan, TenantStatus } from "../../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = process.env.MASTER_DATABASE_URL;
if (!url) throw new Error("MASTER_DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const slug = "template";
  const email = "admin@smlao.la";
  const password = await bcrypt.hash("smlao-admin", 10);

  // LIFETIME plan, ACTIVE status — the template tenant should never expire.
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {
      isTemplate: true,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.LIFETIME,
    },
    create: {
      slug,
      name: "SMLAO Template",
      email,
      password,
      ownerName: "SMLAO Admin",
      dbName: "kvat",
      plan: TenantPlan.LIFETIME,
      status: TenantStatus.ACTIVE,
      isTemplate: true,
      // trialEndsAt is required, but irrelevant for a LIFETIME tenant.
      trialEndsAt: new Date("2099-12-31"),
      paidUntil: null,
      approvedAt: new Date(),
      notes: "Template tenant — backs the original kvat database",
    },
  });

  console.log(`✓ Tenant "${tenant.slug}" → DB "${tenant.dbName}"`);
  console.log(`  status=${tenant.status}, plan=${tenant.plan}`);
  console.log(`  login: ${tenant.email} / smlao-admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
