import "dotenv/config";
import { defineConfig } from "prisma/config";

// Master DB config — used by `prisma migrate / generate --config prisma.master.config.ts`.
// Kept separate from prisma.config.ts so the tenant schema stays the default.
export default defineConfig({
  schema: "prisma/master/schema.prisma",
  migrations: {
    path: "prisma/master/migrations",
  },
  datasource: {
    url: process.env["MASTER_DATABASE_URL"],
  },
});
