// Seed default ledger categories. Idempotent — skips ones that already exist.
//
//   npm run seed:ledger-categories

import "dotenv/config";
import { PrismaClient as MasterClient, LedgerType } from "../src/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.MASTER_DATABASE_URL;
if (!url) throw new Error("MASTER_DATABASE_URL is not set");

const prisma = new MasterClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const DEFAULTS: { name: string; type: LedgerType }[] = [
  { name: "ລາຍຮັບອື່ນໆ", type: LedgerType.INCOME },
  { name: "Refund / ຄືນເງິນ", type: LedgerType.INCOME },
  { name: "Hosting / Server", type: LedgerType.EXPENSE },
  { name: "Domain / SSL", type: LedgerType.EXPENSE },
  { name: "Software / SaaS", type: LedgerType.EXPENSE },
  { name: "ຄ່າເຊົ່າຫ້ອງການ", type: LedgerType.EXPENSE },
  { name: "ໄຟ້ຟ້າ / ນ້ຳ / Internet", type: LedgerType.EXPENSE },
  { name: "ເງິນເດືອນ / ໂບນັດ", type: LedgerType.EXPENSE },
  { name: "Marketing", type: LedgerType.EXPENSE },
  { name: "ລາຍຈ່າຍອື່ນໆ", type: LedgerType.EXPENSE },
];

async function main() {
  let created = 0;
  for (const def of DEFAULTS) {
    try {
      await prisma.ledgerCategory.create({ data: def });
      created++;
      console.log(`  + ${def.type} / ${def.name}`);
    } catch {
      // Unique violation — already exists. Skip silently.
    }
  }
  console.log(`\n✓ Seeded ${created} new categor${created === 1 ? "y" : "ies"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
