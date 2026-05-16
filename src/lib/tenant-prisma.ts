import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Per-tenant Prisma client factory with LRU + idle eviction. Each tenant has
// its own physical database (e.g. `kvat_acme`). We cache one PrismaClient per
// dbName so repeated requests share connections, but bound the cache size and
// disconnect entries that haven't been touched recently — otherwise long-lived
// processes leak pools.

const MAX_ENTRIES = parseInt(process.env.TENANT_PRISMA_MAX ?? "50", 10);
const IDLE_MS = parseInt(
  process.env.TENANT_PRISMA_IDLE_MS ?? `${30 * 60_000}`,
  10,
);

type Entry = { client: PrismaClient; lastUsed: number };
type Cache = Map<string, Entry>;

const globalForTenants = globalThis as unknown as {
  tenantPrismaCache: Cache | undefined;
};

const cache: Cache = globalForTenants.tenantPrismaCache ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForTenants.tenantPrismaCache = cache;
}

function touch(key: string, entry: Entry) {
  entry.lastUsed = Date.now();
  // Re-insert to bump LRU position — Map iterates in insertion order.
  cache.delete(key);
  cache.set(key, entry);
}

async function evictIfNeeded(): Promise<void> {
  const now = Date.now();
  // 1. Drop idle entries.
  for (const [key, entry] of cache) {
    if (now - entry.lastUsed > IDLE_MS) {
      cache.delete(key);
      entry.client.$disconnect().catch(() => {});
    }
  }
  // 2. Cap size — disconnect oldest until we're under the limit.
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    const entry = cache.get(oldest);
    cache.delete(oldest);
    entry?.client.$disconnect().catch(() => {});
  }
}

function tenantConnectionString(dbName: string): string {
  const host = process.env.TENANT_DB_HOST ?? "localhost";
  const port = process.env.TENANT_DB_PORT ?? "5432";
  const user = process.env.TENANT_DB_USER;
  const password = process.env.TENANT_DB_PASSWORD ?? "";
  if (!user) {
    throw new Error("TENANT_DB_USER is not set");
  }
  const auth = password ? `${user}:${encodeURIComponent(password)}` : user;
  return `postgresql://${auth}@${host}:${port}/${dbName}`;
}

export function getTenantPrisma(dbName: string): PrismaClient {
  if (!/^[a-z0-9_]+$/i.test(dbName)) {
    throw new Error(`Invalid tenant dbName: ${dbName}`);
  }
  const cached = cache.get(dbName);
  if (cached) {
    touch(dbName, cached);
    return cached.client;
  }
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: tenantConnectionString(dbName) }),
  });
  cache.set(dbName, { client, lastUsed: Date.now() });
  // Fire-and-forget — don't await so the caller isn't slowed by eviction.
  void evictIfNeeded();
  return client;
}

// Disconnect and drop a tenant client from the cache. Use when a tenant is
// deleted/suspended so its pool is released.
export async function disposeTenantPrisma(dbName: string): Promise<void> {
  const entry = cache.get(dbName);
  if (!entry) return;
  cache.delete(dbName);
  await entry.client.$disconnect();
}
