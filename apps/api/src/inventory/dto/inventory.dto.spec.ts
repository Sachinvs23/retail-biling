import { validate } from 'class-validator';
import { AdjustStockDto } from './adjust-stock.dto.js';
import { OpeningStockDto } from './opening-stock.dto.js';

describe('inventory DTO validation', () => {
  it.each(['1', '12.345', '999999999.001'])(
    'accepts positive decimal quantity format %s',
    async (quantity) => {
      const errors = await validate(
        Object.assign(new OpeningStockDto(), { quantity }),
      );
      expect(errors).toHaveLength(0);
    },
  );

  it.each(['-1', '1.1234', '1.', '.5', '1000000000'])(
    'rejects invalid opening quantity format %s',
    async (quantity) => {
      const errors = await validate(
        Object.assign(new OpeningStockDto(), { quantity }),
      );
      expect(errors.some((error) => error.property === 'quantity')).toBe(true);
    },
  );

  it('accepts optional non-negative unit cost up to two decimal places and a bounded note', async () => {
    const errors = await validate(
      Object.assign(new OpeningStockDto(), {
        quantity: '1',
        unitCost: '0.25',
        note: 'opening',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it.each(['-1', '1.001', '12345678901', 'cost'])(
    'rejects invalid unit cost %s',
    async (unitCost) => {
      const errors = await validate(
        Object.assign(new OpeningStockDto(), { quantity: '1', unitCost }),
      );
      expect(errors.some((error) => error.property === 'unitCost')).toBe(true);
    },
  );

  it('enforces the optional opening note length limit', async () => {
    const errors = await validate(
      Object.assign(new OpeningStockDto(), {
        quantity: '1',
        note: 'n'.repeat(501),
      }),
    );
    expect(errors.some((error) => error.property === 'note')).toBe(true);
  });

  it('accepts both adjustment types with an optional reference ID', async () => {
    for (const type of ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] as const) {
      const errors = await validate(
        Object.assign(new AdjustStockDto(), {
          type,
          quantity: '1.125',
          note: 'cycle',
          referenceId: 'ref-1',
        }),
      );
      expect(errors).toHaveLength(0);
    }
  });

  it('rejects an invalid adjustment type and missing note', async () => {
    const errors = await validate(
      Object.assign(new AdjustStockDto(), { type: 'OPENING', quantity: '1' }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['type', 'note']),
    );
  });

  it('enforces optional reference ID and note length limits', async () => {
    const errors = await validate(
      Object.assign(new AdjustStockDto(), {
        type: 'ADJUSTMENT_IN',
        quantity: '1',
        note: 'n'.repeat(501),
        referenceId: 'r'.repeat(101),
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['note', 'referenceId']),
    );
  });
});
