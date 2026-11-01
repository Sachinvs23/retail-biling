/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,id]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Supplier_tenantId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_id_key" ON "Supplier"("tenantId", "id");
