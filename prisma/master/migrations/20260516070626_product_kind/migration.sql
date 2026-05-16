-- CreateEnum
CREATE TYPE "BillingProductKind" AS ENUM ('PRODUCT', 'SERVICE');

-- AlterTable
ALTER TABLE "BillingProduct" ADD COLUMN     "kind" "BillingProductKind" NOT NULL DEFAULT 'SERVICE';

-- CreateIndex
CREATE INDEX "BillingProduct_kind_idx" ON "BillingProduct"("kind");
