-- Replace hardcoded Yearly/Lifetime prices with product references so admin
-- manages SaaS plan pricing inside the Products catalog.

ALTER TABLE "BillingConfig" DROP COLUMN IF EXISTS "yearlyPriceLak";
ALTER TABLE "BillingConfig" DROP COLUMN IF EXISTS "lifetimePriceLak";

ALTER TABLE "BillingConfig" ADD COLUMN IF NOT EXISTS "yearlyProductId" TEXT;
ALTER TABLE "BillingConfig" ADD COLUMN IF NOT EXISTS "lifetimeProductId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "BillingConfig_yearlyProductId_key"
  ON "BillingConfig"("yearlyProductId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingConfig_lifetimeProductId_key"
  ON "BillingConfig"("lifetimeProductId");

ALTER TABLE "BillingConfig"
  ADD CONSTRAINT "BillingConfig_yearlyProductId_fkey"
  FOREIGN KEY ("yearlyProductId") REFERENCES "BillingProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingConfig"
  ADD CONSTRAINT "BillingConfig_lifetimeProductId_fkey"
  FOREIGN KEY ("lifetimeProductId") REFERENCES "BillingProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
