import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

describe('ProductsController', () => {
  const service = {
    create: vi.fn(),
    list: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };
  let controller: ProductsController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new ProductsController(service as unknown as ProductsService);
  });

  it('forwards identity, business header, DTO, query, and product ID', async () => {
    const request = { user: { userId: 'user-1', email: 'a@b.com' } } as never;
    const create: CreateProductDto = { name: 'Tea', sellingPrice: '1' };
    const query: ListProductsDto = { page: 2, limit: 10 };
    const update: UpdateProductDto = { isActive: false };
    await controller.create(request, 'business-1', create);
    await controller.list(request, 'business-1', query);
    await controller.findOne(request, 'business-1', 'product-1');
    await controller.update(request, 'business-1', 'product-1', update);
    expect(service.create).toHaveBeenCalledWith('user-1', 'business-1', create);
    expect(service.list).toHaveBeenCalledWith('user-1', 'business-1', query);
    expect(service.findOne).toHaveBeenCalledWith(
      'user-1',
      'business-1',
      'product-1',
    );
    expect(service.update).toHaveBeenCalledWith(
      'user-1',
      'business-1',
      'product-1',
      update,
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ProductsController)).toEqual([
      AuthGuard('jwt'),
    ]);
  });
});
