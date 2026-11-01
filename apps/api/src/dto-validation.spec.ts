import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';
import { LoginDto } from './auth/dto/login.dto.js';
import { RegisterDto } from './auth/dto/register.dto.js';
import { CreateBusinessDto } from './businesses/dto/create-business.dto.js';
import { BusinessContextDto } from './common/dto/business-context.dto.js';
import { CreateProductDto } from './products/dto/create-product.dto.js';
import { ListInventoryDto } from './inventory/dto/list-inventory.dto.js';
import { ListProductsDto } from './products/dto/list-products.dto.js';
import { UpdateProductDto } from './products/dto/update-product.dto.js';

describe('request DTO validation', () => {
  it('uses default inventory pagination values', async () => {
    const query = new ListInventoryDto();
    expect(query).toMatchObject({ page: 1, limit: 20 });
    expect(await validate(query)).toHaveLength(0);
  });

  it('accepts inventory pagination boundaries and rejects out-of-range values', async () => {
    for (const [page, limit] of [
      [1, 1],
      [2, 20],
      [100, 100],
    ]) {
      expect(
        await validate(Object.assign(new ListInventoryDto(), { page, limit })),
      ).toHaveLength(0);
    }

    for (const page of [0, -1, 1.5]) {
      const errors = await validate(
        Object.assign(new ListInventoryDto(), { page }),
      );
      expect(errors.some((error) => error.property === 'page')).toBe(true);
    }

    for (const limit of [0, 101, 1.5]) {
      const errors = await validate(
        Object.assign(new ListInventoryDto(), { limit }),
      );
      expect(errors.some((error) => error.property === 'limit')).toBe(true);
    }
  });

  it('validates inventory search length and low-stock string values', async () => {
    for (const lowStock of ['true', 'false'] as const) {
      expect(
        await validate(Object.assign(new ListInventoryDto(), { lowStock })),
      ).toHaveLength(0);
    }
    for (const lowStock of [true, 'TRUE', 'yes']) {
      const errors = await validate(
        Object.assign(new ListInventoryDto(), { lowStock }),
      );
      expect(errors.some((error) => error.property === 'lowStock')).toBe(true);
    }
    const errors = await validate(
      Object.assign(new ListInventoryDto(), { search: 's'.repeat(101) }),
    );
    expect(errors.some((error) => error.property === 'search')).toBe(true);
  });

  it('transforms inventory query pagination using the global ValidationPipe settings', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const result = await pipe.transform(
      { page: '3', limit: '100', lowStock: 'false', search: 'tea' },
      { type: 'query', metatype: ListInventoryDto },
    );
    expect(result).toBeInstanceOf(ListInventoryDto);
    expect(result).toMatchObject({
      page: 3,
      limit: 100,
      lowStock: 'false',
      search: 'tea',
    });
    expect(typeof (result as ListInventoryDto).page).toBe('number');
  });

  it.each(['0', '0.00', '12.34', '99.99', '100', '100.0', '100.00'])(
    'accepts GST percentage format at or below 100: %s',
    async (gstRate) => {
      for (const Dto of [CreateProductDto, UpdateProductDto]) {
        const errors = await validate(
          Object.assign(new Dto(), {
            name: 'Tea',
            sellingPrice: '1',
            gstRate,
          }),
        );
        expect(errors).toHaveLength(0);
      }
    },
  );

  it.each(['100.01', '101', '100.001', '-0.01', '1.234', '.5'])(
    'rejects GST values outside the supported percentage format: %s',
    async (gstRate) => {
      for (const Dto of [CreateProductDto, UpdateProductDto]) {
        const errors = await validate(Object.assign(new Dto(), { gstRate }));
        expect(errors.some((error) => error.property === 'gstRate')).toBe(true);
      }
    },
  );

  it('validates registration and login emails, password boundaries, and names', async () => {
    const registrationErrors = await validate(
      Object.assign(new RegisterDto(), {
        email: 'bad',
        password: 'short',
        name: '',
      }),
    );
    expect(registrationErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password', 'name']),
    );
    const loginErrors = await validate(
      Object.assign(new LoginDto(), { email: 'bad', password: '' }),
    );
    expect(loginErrors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
    expect(
      await validate(
        Object.assign(new RegisterDto(), {
          email: 'a@example.com',
          password: 'long enough!',
          name: 'A',
        }),
      ),
    ).toHaveLength(0);
  });

  it('validates business names, slug format, and optional store code length', async () => {
    const bad = await validate(
      Object.assign(new CreateBusinessDto(), {
        businessName: 'x',
        slug: 'Invalid slug',
        storeName: 'x',
        storeCode: 'c'.repeat(31),
      }),
    );
    expect(bad.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'businessName',
        'slug',
        'storeName',
        'storeCode',
      ]),
    );
    expect(
      await validate(
        Object.assign(new CreateBusinessDto(), {
          businessName: 'Shop',
          slug: 'shop-1',
          storeName: 'Main',
        }),
      ),
    ).toHaveLength(0);
  });

  it('validates product required fields, decimal formats, GST bounds, and optional field limits', async () => {
    const bad = await validate(
      Object.assign(new CreateProductDto(), {
        name: '',
        sellingPrice: '-1',
        gstRate: '100.01',
        sku: 's'.repeat(61),
      }),
    );
    expect(bad.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'sellingPrice', 'gstRate', 'sku']),
    );
    expect(
      await validate(
        Object.assign(new CreateProductDto(), {
          name: 'Tea',
          sellingPrice: '0.10',
          purchasePrice: '0',
          gstRate: '5.00',
        }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        Object.assign(new CreateProductDto(), {
          name: 'Tea',
          sellingPrice: '1',
          gstRate: '100.00',
        }),
      ),
    ).toHaveLength(0);
  });

  it('validates update fields and nullable optional strings as implemented', async () => {
    expect(
      await validate(
        Object.assign(new UpdateProductDto(), {
          sku: null,
          barcode: null,
          description: null,
          hsnCode: null,
          isActive: false,
        }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        Object.assign(new UpdateProductDto(), { gstRate: '100.01' }),
      ),
    ).not.toHaveLength(0);
    const errors = await validate(
      Object.assign(new UpdateProductDto(), {
        name: '',
        sellingPrice: '1.999',
        isActive: 'false',
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'sellingPrice', 'isActive']),
    );
  });

  it('transforms pagination query strings and rejects out-of-range values', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const result = await pipe.transform(
      { page: '3', limit: '25', search: 'Tea' },
      { type: 'query', metatype: ListProductsDto },
    );
    expect(result).toBeInstanceOf(ListProductsDto);
    expect(result).toMatchObject({ page: 3, limit: 25, search: 'Tea' });
    await expect(
      pipe.transform(
        { page: '0', limit: '101' },
        { type: 'query', metatype: ListProductsDto },
      ),
    ).rejects.toThrow();
  });

  it('rejects unknown properties with the configured global validation policy', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        { name: 'Tea', sellingPrice: '1', tenantId: 'attacker-tenant' },
        { type: 'body', metatype: CreateProductDto },
      ),
    ).rejects.toThrow();
  });

  it('validates business context ID limits', async () => {
    expect(
      await validate(
        Object.assign(new BusinessContextDto(), { businessId: '' }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        Object.assign(new BusinessContextDto(), { businessId: 'tenant-1' }),
      ),
    ).toHaveLength(0);
  });
});
