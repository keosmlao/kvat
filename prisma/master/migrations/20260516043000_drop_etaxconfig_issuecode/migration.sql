-- TIN is now per-tenant (read from tenant Setting.taxId at request time),
-- not a global config value.
ALTER TABLE "EtaxConfig" DROP COLUMN IF EXISTS "issueCode";
