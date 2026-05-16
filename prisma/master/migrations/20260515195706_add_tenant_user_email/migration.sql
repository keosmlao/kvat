-- CreateTable
CREATE TABLE "TenantUserEmail" (
    "email" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUserEmail_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE INDEX "TenantUserEmail_tenantId_idx" ON "TenantUserEmail"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantUserEmail" ADD CONSTRAINT "TenantUserEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
