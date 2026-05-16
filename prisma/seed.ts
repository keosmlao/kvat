import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PROVINCES } from "./seed-locations";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("🌱 Seeding database...");

  // ── Provinces + Districts (Lao administrative divisions) ──
  for (const p of PROVINCES) {
    const province = await prisma.province.upsert({
      where: { code: p.code },
      create: { code: p.code, name: p.name, nameEn: p.nameEn },
      update: { name: p.name, nameEn: p.nameEn },
    });
    for (const d of p.districts) {
      await prisma.district.upsert({
        where: { code: d.code },
        create: {
          code: d.code,
          name: d.name,
          nameEn: d.nameEn,
          provinceId: province.id,
        },
        update: { name: d.name, nameEn: d.nameEn, provinceId: province.id },
      });
    }
  }
  console.log(
    `   ✓ ${PROVINCES.length} provinces + ${PROVINCES.reduce(
      (s, p) => s + p.districts.length,
      0,
    )} districts`,
  );

  await prisma.setting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      shopName: "ຮ້ານຄ້າ ສມລາວ",
      shopNameEn: "SMLAO Store",
      taxId: "1234567890",
      address: "ນະຄອນຫຼວງວຽງຈັນ, ລາວ",
      phone: "020 5555 5555",
      email: "info@smlao.la",
      vatRate: 0.1,
      defaultCurrency: "LAK",
      invoicePrefix: "INV",
    },
    update: {},
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  await prisma.user.upsert({
    where: { email: "admin@smlao.la" },
    create: {
      email: "admin@smlao.la",
      password: adminPassword,
      name: "ຜູ້ດູແລລະບົບ",
      role: "ADMIN",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "staff@smlao.la" },
    create: {
      email: "staff@smlao.la",
      password: staffPassword,
      name: "ພະນັກງານຂາຍ",
      role: "STAFF",
    },
    update: {},
  });

  const units = [
    { code: "PCS", name: "ອັນ" },
    { code: "BTL", name: "ຂວດ" },
    { code: "BOX", name: "ກ່ອງ" },
    { code: "BAG", name: "ຖົງ" },
    { code: "PACK", name: "ຫໍ່" },
    { code: "KG", name: "ກິໂລ" },
    { code: "L", name: "ລິດ" },
  ];
  const unitRecords: Record<string, string> = {};
  for (const u of units) {
    const rec = await prisma.unit.upsert({
      where: { code: u.code },
      create: u,
      update: {},
    });
    unitRecords[u.code] = rec.id;
  }

  const categories = [
    { code: "DRINK", name: "ເຄື່ອງດື່ມ", description: "ນ້ຳດື່ມ, ນ້ຳອັດລົມ" },
    { code: "FOOD", name: "ອາຫານ", description: "ອາຫານ ແລະ ເຄື່ອງປຸງ" },
    { code: "HOUSEHOLD", name: "ຄົວເຮືອນ", description: "ຂອງໃຊ້ໃນເຮືອນ" },
    { code: "OTHER", name: "ອື່ນໆ", description: "" },
  ];
  const catRecords: Record<string, string> = {};
  for (const c of categories) {
    const rec = await prisma.category.upsert({
      where: { code: c.code },
      create: c,
      update: {},
    });
    catRecords[c.code] = rec.id;
  }

  const types = [
    { code: "STORABLE", name: "ສິນຄ້າຄົງເຫຼືອ", trackStock: true },
    { code: "CONSUMABLE", name: "ສິ້ນເປືອງ", trackStock: false },
    { code: "SERVICE", name: "ບໍລິການ", trackStock: false },
  ];
  const typeRecords: Record<string, string> = {};
  for (const t of types) {
    const rec = await prisma.productType.upsert({
      where: { code: t.code },
      create: t,
      update: {},
    });
    typeRecords[t.code] = rec.id;
  }

  const warehouses = [
    { code: "MAIN", name: "ສາງຫຼັກ", address: "ສຳນັກງານໃຫຍ່" },
    { code: "SHOP", name: "ໜ້າຮ້ານ", address: "ບ່ອນຂາຍປະຈຳວັນ" },
  ];
  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      create: w,
      update: {},
    });
  }

  const paymentTerms = [
    { code: "IMMEDIATE", name: "ຈ່າຍທັນທີ", days: 0 },
    { code: "NET7", name: "ພາຍໃນ 7 ມື້", days: 7 },
    { code: "NET15", name: "ພາຍໃນ 15 ມື້", days: 15 },
    { code: "NET30", name: "ພາຍໃນ 30 ມື້", days: 30 },
    { code: "NET60", name: "ພາຍໃນ 60 ມື້", days: 60 },
  ];
  for (const pt of paymentTerms) {
    await prisma.paymentTerm.upsert({
      where: { code: pt.code },
      create: pt,
      update: {},
    });
  }

  const products = [
    { code: "P001", name: "ນ້ຳດື່ມ 500ml", unit: "ຂວດ", unitCode: "BTL", catCode: "DRINK", typeCode: "STORABLE", priceLak: 5000, costLak: 3000, stock: 200 },
    { code: "P002", name: "ນ້ຳອັດລົມ 1.25L", unit: "ຂວດ", unitCode: "BTL", catCode: "DRINK", typeCode: "STORABLE", priceLak: 12000, costLak: 8000, stock: 100 },
    { code: "P003", name: "ເຂົ້າສານ 5kg", unit: "ຖົງ", unitCode: "BAG", catCode: "FOOD", typeCode: "STORABLE", priceLak: 85000, costLak: 65000, stock: 50 },
    { code: "P004", name: "ນ້ຳມັນປາມ 1L", unit: "ຂວດ", unitCode: "BTL", catCode: "FOOD", typeCode: "STORABLE", priceLak: 35000, costLak: 27000, stock: 80 },
    { code: "P005", name: "ບະຫມີ່ກຶ່ງສໍາເລັດຮູບ", unit: "ຫໍ່", unitCode: "PACK", catCode: "FOOD", typeCode: "STORABLE", priceLak: 4000, costLak: 2500, stock: 300 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        unit: p.unit,
        unitId: unitRecords[p.unitCode],
        categoryId: catRecords[p.catCode],
        typeId: typeRecords[p.typeCode],
        priceLak: p.priceLak,
        costLak: p.costLak,
        stock: p.stock,
      },
      update: {
        unitId: unitRecords[p.unitCode],
        categoryId: catRecords[p.catCode],
        typeId: typeRecords[p.typeCode],
      },
    });
  }

  await prisma.customer.upsert({
    where: { code: "C001" },
    create: {
      code: "C001",
      name: "ບໍລິສັດ ABC ຈໍາກັດ",
      taxId: "9876543210",
      phone: "021 555 555",
      email: "abc@example.la",
      address: "ບ້ານ ສີຫອມ, ນະຄອນຫຼວງວຽງຈັນ",
    },
    update: {},
  });

  await prisma.customer.upsert({
    where: { code: "C002" },
    create: {
      code: "C002",
      name: "ລູກຄ້າທົ່ວໄປ",
      address: "-",
    },
    update: {},
  });

  console.log("✅ Seed complete!");
  console.log("   Admin: admin@smlao.la / admin123");
  console.log("   Staff: staff@smlao.la / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
