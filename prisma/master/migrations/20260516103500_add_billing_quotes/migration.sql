CREATE TYPE "BillingQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED');

CREATE TABLE "BillingQuote" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatMode" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LAK',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "status" "BillingQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "sn" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ໜ່ວຍ',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BillingQuoteItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingQuote_number_key" ON "BillingQuote"("number");
CREATE INDEX "BillingQuote_customerId_idx" ON "BillingQuote"("customerId");
CREATE INDEX "BillingQuote_status_idx" ON "BillingQuote"("status");
CREATE INDEX "BillingQuote_issueDate_idx" ON "BillingQuote"("issueDate");
CREATE INDEX "BillingQuoteItem_quoteId_idx" ON "BillingQuoteItem"("quoteId");

ALTER TABLE "BillingQuote" ADD CONSTRAINT "BillingQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "BillingCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingQuoteItem" ADD CONSTRAINT "BillingQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "BillingQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingQuoteItem" ADD CONSTRAINT "BillingQuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "BillingProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
