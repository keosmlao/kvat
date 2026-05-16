import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getTenantPrisma } from "./tenant-prisma";
import { getSession } from "./session";

// Tenant-aware Prisma — `prisma` is a Proxy that resolves to the current
// request's tenant DB at access time. Routes without a session fall back to
// DATABASE_URL (used during /signup before a session exists).
//
// Existing call sites keep their shape:
//   await prisma.user.findMany()          → resolves tenant, then findMany
//   await prisma.$transaction(async (tx) => …)  → resolves tenant, then $tx
//
// Inside a $transaction callback, `tx` is the real per-transaction client
// from Prisma (not the proxy), so isolation is correct.

const globalForFallback = globalThis as unknown as {
  fallbackPrisma: PrismaClient | undefined;
};

async function resolveClient(): Promise<PrismaClient> {
  const session = await safeGetSession();
  if (session?.dbName) return getTenantPrisma(session.dbName);
  return getFallbackPrisma();
}

async function safeGetSession() {
  // cookies() throws outside a request context (e.g. accidental import from a
  // build script). Fall back to the env DB rather than crashing.
  try {
    return await getSession();
  } catch {
    return null;
  }
}

function getFallbackPrisma(): PrismaClient {
  if (globalForFallback.fallbackPrisma) return globalForFallback.fallbackPrisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  if (process.env.NODE_ENV !== "production") {
    globalForFallback.fallbackPrisma = client;
  }
  return client;
}

// `prop` is the top-level key on PrismaClient — a model delegate name
// (`user`, `invoice`, …) or a `$`-prefixed method (`$transaction`, `$connect`).
function makeLazyDelegate(prop: string) {
  // Function target so the Proxy is callable (covers `prisma.$transaction(…)`).
  const target = function () {} as unknown as object;
  return new Proxy(target, {
    get(_, method: string | symbol) {
      // `prisma.user.findMany(...)` lands here.
      return (...args: unknown[]) =>
        resolveClient().then((client) => {
          const delegate = (client as unknown as Record<string, unknown>)[prop];
          const fn = (delegate as Record<string, (...a: unknown[]) => unknown>)[
            method as string
          ];
          return fn.call(delegate, ...args);
        });
    },
    apply(_, __, args) {
      // `prisma.$transaction(...)` lands here.
      return resolveClient().then((client) => {
        const fn = (client as unknown as Record<string, (...a: unknown[]) => unknown>)[
          prop
        ];
        return fn.call(client, ...args);
      });
    },
  });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    if (typeof prop !== "string") return undefined;
    return makeLazyDelegate(prop);
  },
}) as PrismaClient;

// Async accessor for code that needs the raw client (rarely — e.g. when
// passing the client into a long-lived structure). Prefer `prisma` everywhere.
export async function db(): Promise<PrismaClient> {
  return resolveClient();
}
