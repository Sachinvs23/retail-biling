import {
  calculatePurchaseLine,
  calculatePurchaseTotals,
} from './purchase-calculation.js';

describe('Purchase calculation', () => {
  it('calculates GST-exclusive prices with CGST and SGST', () => {
    const result = calculatePurchaseLine(
      {
        quantity: '1',
        unitCost: '100',
        gstRate: '18',
      },
      'GST_EXCLUSIVE',
      'CGST_SGST',
    );

    expect(result.taxableAmount.toString()).toBe('100');
    expect(result.cgstAmount.toString()).toBe('9');
    expect(result.sgstAmount.toString()).toBe('9');
    expect(result.taxAmount.toString()).toBe('18');
    expect(result.totalAmount.toString()).toBe('118');
  });

  it('extracts GST from GST-inclusive prices', () => {
    const result = calculatePurchaseLine(
      {
        quantity: '1',
        unitCost: '118',
        gstRate: '18',
      },
      'GST_INCLUSIVE',
      'IGST',
    );

    expect(result.taxableAmount.toString()).toBe('100');
    expect(result.igstAmount.toString()).toBe('18');
    expect(result.totalAmount.toString()).toBe('118');
  });

  it('applies discounts before calculating GST', () => {
    const result = calculatePurchaseLine(
      {
        quantity: '1',
        unitCost: '100',
        gstRate: '18',
        discountAmount: '10',
      },
      'GST_EXCLUSIVE',
      'CGST_SGST',
    );

    expect(result.taxableAmount.toString()).toBe('90');
    expect(result.taxAmount.toString()).toBe('16.2');
    expect(result.totalAmount.toString()).toBe('106.2');
  });

  it('calculates invoice totals across multiple items', () => {
    const result = calculatePurchaseTotals({
      priceMode: 'GST_EXCLUSIVE',
      taxType: 'IGST',
      items: [
        {
          quantity: '1',
          unitCost: '100',
          gstRate: '18',
        },
        {
          quantity: '2',
          unitCost: '50',
          gstRate: '5',
        },
      ],
    });

    expect(result.subtotal.toString()).toBe('200');
    expect(result.taxAmount.toString()).toBe('23');
    expect(result.totalAmount.toString()).toBe('223');
  });

  it('rejects zero quantity', () => {
    expect(() =>
      calculatePurchaseLine(
        {
          quantity: '0',
          unitCost: '100',
          gstRate: '18',
        },
        'GST_EXCLUSIVE',
        'IGST',
      ),
    ).toThrow('Quantity must be greater than zero');
  });

  it('rejects discounts greater than taxable value', () => {
    expect(() =>
      calculatePurchaseLine(
        {
          quantity: '1',
          unitCost: '100',
          gstRate: '18',
          discountAmount: '101',
        },
        'GST_EXCLUSIVE',
        'IGST',
      ),
    ).toThrow('Discount cannot exceed the taxable amount');
  });
});
