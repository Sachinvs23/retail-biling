import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

type PriceMode = 'GST_EXCLUSIVE' | 'GST_INCLUSIVE';
type TaxType = 'CGST_SGST' | 'IGST';

interface PurchaseLineInput {
  quantity: string;
  unitCost: string;
  gstRate: string;
  discountAmount?: string;
}

interface PurchaseCalculationInput {
  priceMode: PriceMode;
  taxType: TaxType;
  items: PurchaseLineInput[];
}

const roundMoney = (value: Prisma.Decimal) =>
  value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export function calculatePurchaseLine(
  input: PurchaseLineInput,
  priceMode: PriceMode,
  taxType: TaxType,
) {
  const quantity = new Prisma.Decimal(input.quantity);
  const unitCost = new Prisma.Decimal(input.unitCost);
  const gstRate = new Prisma.Decimal(input.gstRate);
  const discountAmount = new Prisma.Decimal(input.discountAmount ?? '0');

  if (!quantity.isFinite() || quantity.lte(0)) {
    throw new BadRequestException('Quantity must be greater than zero');
  }

  if (!unitCost.isFinite() || unitCost.lt(0)) {
    throw new BadRequestException('Unit cost cannot be negative');
  }

  if (!gstRate.isFinite() || gstRate.lt(0) || gstRate.gt(100)) {
    throw new BadRequestException('Invalid GST rate');
  }

  if (!discountAmount.isFinite() || discountAmount.lt(0)) {
    throw new BadRequestException('Discount cannot be negative');
  }

  const enteredAmount = quantity.mul(unitCost);

  const taxableBeforeDiscount =
    priceMode === 'GST_INCLUSIVE'
      ? enteredAmount.div(new Prisma.Decimal(1).plus(gstRate.div(100)))
      : enteredAmount;

  const taxableAmount = roundMoney(taxableBeforeDiscount.minus(discountAmount));

  if (taxableAmount.lt(0)) {
    throw new BadRequestException('Discount cannot exceed the taxable amount');
  }

  const discount = roundMoney(discountAmount);

  const taxAmount = roundMoney(taxableAmount.mul(gstRate).div(100));

  const totalAmount = taxableAmount.plus(taxAmount);

  let cgstAmount = new Prisma.Decimal(0);
  let sgstAmount = new Prisma.Decimal(0);
  let igstAmount = new Prisma.Decimal(0);

  if (taxType === 'IGST') {
    igstAmount = taxAmount;
  } else {
    cgstAmount = roundMoney(taxAmount.div(2));
    sgstAmount = taxAmount.minus(cgstAmount);
  }

  return {
    quantity,
    unitCost,
    gstRate,
    discountAmount: discount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    totalAmount,
  };
}

export function calculatePurchaseTotals(input: PurchaseCalculationInput) {
  if (input.items.length === 0) {
    throw new BadRequestException('A purchase must contain at least one item');
  }

  const items = input.items.map((item) =>
    calculatePurchaseLine(item, input.priceMode, input.taxType),
  );

  const zero = new Prisma.Decimal(0);

  const totals = items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal.plus(item.taxableAmount.plus(item.discountAmount)),
      discountAmount: acc.discountAmount.plus(item.discountAmount),
      taxAmount: acc.taxAmount.plus(item.taxAmount),
      totalAmount: acc.totalAmount.plus(item.totalAmount),
    }),
    {
      subtotal: zero,
      discountAmount: zero,
      taxAmount: zero,
      totalAmount: zero,
    },
  );

  return {
    items,
    subtotal: roundMoney(totals.subtotal),
    discountAmount: roundMoney(totals.discountAmount),
    taxAmount: roundMoney(totals.taxAmount),
    totalAmount: roundMoney(totals.totalAmount),
  };
}
