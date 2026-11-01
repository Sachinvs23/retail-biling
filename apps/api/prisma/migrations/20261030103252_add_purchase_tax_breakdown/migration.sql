/*
  Warnings:

  - Added the required column `taxType` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxableAmount` to the `PurchaseItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchasePriceMode" AS ENUM ('GST_EXCLUSIVE', 'GST_INCLUSIVE');

-- CreateEnum
CREATE TYPE "PurchaseTaxType" AS ENUM ('CGST_SGST', 'IGST');

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "priceMode" "PurchasePriceMode" NOT NULL DEFAULT 'GST_EXCLUSIVE',
ADD COLUMN     "taxType" "PurchaseTaxType" NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount" DECIMAL(12,2) NOT NULL;
