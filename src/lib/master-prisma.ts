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
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForMaster.masterPrisma = masterPrisma;
}
