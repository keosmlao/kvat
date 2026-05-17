import "server-only";
import { PrismaClient } from "@/generated/master/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Master DB client — one connection, app-wide singleton.
// Holds Tenant, ManagementUser, LoginLog, ApprovalRequest. Never holds tenant
// app data (invoices, products, customers). For tenant data use getTenantPrisma().

const globalForMaster = globalThis as unknown as {
  masterPrisma: PrismaClient | undefined;
};

const connectionString = process.env.MASTER_DATABASE_URL;
if (!connectionString) {
  throw new Error("MASTER_DATABASE_URL is not set");
}

export const masterPrisma =
  globalForMaster.masterPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // Default pg client has no connection timeout; first request after an idle
      // period can hang waiting on a dead socket. Cap it so we fail fast and
      // Next can retry the request instead of returning P1008 to the user.
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForMaster.masterPrisma = masterPrisma;
}
