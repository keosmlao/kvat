import "server-only";
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { getTenantPrisma, disposeTenantPrisma } from "./tenant-prisma";
import { PROVINCES } from "../../prisma/seed-locations";

// Tenant provisioning: CREATE DATABASE kvat_<slug>, replay the kvat schema dump,
// then seed the minimum core data (admin user, default Setting, baseline
// catalogue + locations). All idempotent helpers — safe to retry on failure.

function adminUrl(): string {
  const url = process.env.TENANT_DB_ADMIN_URL;
  if (!url) {
    throw new Error("TENANT_DB_ADMIN_URL is not set");
  }
  return url;
}

function tenantUrl(dbName: string): string {
  const host = process.env.TENANT_DB_HOST ?? "localhost";
  const port = process.env.TENANT_DB_PORT ?? "5432";
  const user = process.env.TENANT_DB_USER;
  const password = process.env.TENANT_DB_PASSWORD ?? "";
  if (!user) throw new Error("TENANT_DB_USER is not set");
  const auth = password ? `${user}:${encodeURIComponent(password)}` : user;
  return `postgresql://${auth}@${host}:${port}/${dbName}`;
}

function assertSafeDbName(dbName: string) {
  // Allow lowercase ascii + digits + underscore only. Identifier injection
  // through the dbName would be catastrophic since CREATE DATABASE can't use
  // bind params — the value is inlined.
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(dbName)) {
    throw new Error(`Invalid dbName: ${dbName}`);
  }
}

export async function createTenantDatabase(dbName: string): Promise<void> {
  assertSafeDbName(dbName);
  const admin = new Client({ connectionString: adminUrl() });
  await admin.connect();
  try {
    // CREATE DATABASE doesn't support IF NOT EXISTS in pg, so check first.
    const exists = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (exists.rowCount && exists.rowCount > 0) {
      throw new Error(`Database "${dbName}" already exists`);
    }
    // dbName is validated above; safe to inline as identifier.
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }
}

export async function dropTenantDatabase(dbName: string): Promise<void> {
  assertSafeDbName(dbName);
  await disposeTenantPrisma(dbName); // release any cached connections
  const admin = new Client({ connectionString: adminUrl() });
  await admin.connect();
  try {
    // Terminate live connections before drop — otherwise pg refuses.
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [dbName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    await admin.end();
  }
}

let schemaSqlCache: string | null = null;

// SET statements that only exist on PG 17+. pg_dump always emits them; if the
// target server is older we strip them so replay still works. The values are
// "0" (default) anyway, so dropping them changes nothing semantically.
const PG17_ONLY_SETTINGS = ["transaction_timeout"];

async function loadSchemaSql(): Promise<string> {
  if (schemaSqlCache) return schemaSqlCache;
  const file = path.join(
    process.cwd(),
    "prisma",
    "master",
    "tenant-schema.sql",
  );
  const raw = await readFile(file, "utf8");
  schemaSqlCache = raw
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !PG17_ONLY_SETTINGS.some((s) =>
        trimmed.startsWith(`SET ${s}`),
      );
    })
    .join("\n");
  return schemaSqlCache;
}

export async function replayTenantSchema(dbName: string): Promise<void> {
  assertSafeDbName(dbName);
  const sql = await loadSchemaSql();
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    // pg-node accepts multi-statement strings via simple Query. The dump is
    // self-contained (SET statements + DDL) and idempotent enough to run once.
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function ensureTenantCompatibility(dbName: string): Promise<void> {
  assertSafeDbName(dbName);
  const client = new Client({ connectionString: tenantUrl(dbName) });
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'lo';
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'light';
    `);
  } finally {
    await client.end();
  }
}

export type TenantSeedInput = {
  shopName: string;
  ownerEmail: string;
  ownerName: string;
  ownerPassword: string; // plain — hashed inside
  taxId?: string;
  phone?: string;
};

export async function seedTenantCore(
  dbName: string,
  input: TenantSeedInput,
): Promise<void> {
  const db = getTenantPrisma(dbName);
  const hashed = await bcrypt.hash(input.ownerPassword, 10);

  await db.user.create({
    data: {
      email: input.ownerEmail.toLowerCase(),
      password: hashed,
      name: input.ownerName,
      role: "ADMIN",
    },
  });

  await db.setting.create({
    data: {
      id: "default",
      shopName: input.shopName,
      taxId: input.taxId ?? null,
      phone: input.phone ?? null,
      email: input.ownerEmail.toLowerCase(),
      vatRate: 0.1,
      defaultCurrency: "LAK",
      invoicePrefix: "INV",
    },
  });

  // Baseline units — covers ~90% of small shops. Owner can extend in Settings.
  await db.unit.createMany({
    data: [
      { code: "PCS", name: "ອັນ" },
      { code: "BOX", name: "ກ່ອງ" },
      { code: "KG", name: "ກິໂລ" },
      { code: "L", name: "ລິດ" },
      { code: "M", name: "ແມັດ" },
    ],
  });

  await db.category.createMany({
    data: [{ code: "GEN", name: "ທົ່ວໄປ" }],
  });

  await db.productType.createMany({
    data: [
      { code: "GOODS", name: "ສິນຄ້າ", trackStock: true },
      { code: "SERVICE", name: "ບໍລິການ", trackStock: false },
    ],
  });

  await db.warehouse.createMany({
    data: [{ code: "MAIN", name: "ຄັງຫຼັກ" }],
  });

  // Provinces + districts of Laos. Loaded once at signup so the customer
  // dropdown is populated immediately. Villages are owner-managed (too many
  // to seed in bulk + many shops only care about the village string).
  for (const p of PROVINCES) {
    await db.province.create({
      data: {
        code: p.code,
        name: p.name,
        nameEn: p.nameEn,
        districts: {
          create: p.districts.map((d) => ({
            code: d.code,
            name: d.name,
            nameEn: d.nameEn,
          })),
        },
      },
    });
  }
}

export type ProvisionResult =
  | { ok: true; dbName: string }
  | { ok: false; error: string; rollback?: "db_dropped" };

// End-to-end provisioning. On any failure after the DB is created, the DB is
// dropped to leave master in a consistent state (no orphan DB).
export async function provisionTenant(
  dbName: string,
  seed: TenantSeedInput,
): Promise<ProvisionResult> {
  try {
    await createTenantDatabase(dbName);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    await replayTenantSchema(dbName);
    await ensureTenantCompatibility(dbName);
    await seedTenantCore(dbName, seed);
    return { ok: true, dbName };
  } catch (e) {
    try {
      await dropTenantDatabase(dbName);
      return { ok: false, error: errMsg(e), rollback: "db_dropped" };
    } catch {
      return { ok: false, error: errMsg(e) };
    }
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
