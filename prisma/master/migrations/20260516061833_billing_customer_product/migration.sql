/*
  Warnings:

  - You are about to drop the column `tenantId` on the `BillingInvoice` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `BillingInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BillingCustomerType" AS ENUM ('TENANT', 'EXTERNAL');

-- DropForeignKey
ALTER TABLE "BillingInvoice" DROP CONSTRAINT "BillingInvoice_tenantId_fkey";

-- DropIndex
DROP INDEX "BillingInvoice_tenantId_idx";

-- AlterTable
ALTER TABLE "BillingInvoice" DROP COLUMN "tenantId",
ADD COLUMN     "customerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BillingInvoiceItem" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BillingCustomerType" NOT NULL DEFAULT 'EXTERNAL',
    "tenantId" TEXT,
    "taxId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProduct" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'ໜ່ວຍ',
    "priceLak" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_code_key" ON "BillingCustomer"("code");

-- CreateIndex
CREATE INDEX "BillingCustomer_type_idx" ON "BillingCustomer"("type");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_tenantId_key" ON "BillingCustomer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProduct_code_key" ON "BillingProduct"("code");

-- CreateIndex
CREATE INDEX "BillingProduct_active_idx" ON "BillingProduct"("active");

-- CreateIndex
CREATE INDEX "BillingInvoice_customerId_idx" ON "BillingInvoice"("customerId");

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "BillingCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoiceItem" ADD CONSTRAINT "BillingInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BillingProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
