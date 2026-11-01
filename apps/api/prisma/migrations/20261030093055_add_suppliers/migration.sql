-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_tenantId_name_idx" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_phone_idx" ON "Supplier"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_gstin_idx" ON "Supplier"("tenantId", "gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_code_key" ON "Supplier"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
