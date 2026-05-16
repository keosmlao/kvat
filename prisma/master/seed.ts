// Seeds master DB with an initial ManagementUser.
// Run after `npm run master:migrate` and the master DB exists.

import "dotenv/config";
import { PrismaClient } from "../../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = process.env.MASTER_DATABASE_URL;
if (!url) throw new Error("MASTER_DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const email = process.env.MASTER_ADMIN_EMAIL ?? "admin@smlao.la";
  const password = process.env.MASTER_ADMIN_PASSWORD ?? "smlao-admin";
  const name = process.env.MASTER_ADMIN_NAME ?? "SMLAO Admin";

  const existing = await prisma.managementUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ ManagementUser ${email} already exists`);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.managementUser.create({
    data: { email, password: hashed, name },
  });
  console.log(`✓ Created ManagementUser ${email} (password: ${password})`);
  console.log("  Change the password immediately in production.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
