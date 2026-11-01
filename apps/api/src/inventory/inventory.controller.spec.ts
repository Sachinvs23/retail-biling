import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { ListInventoryDto } from './dto/list-inventory.dto.js';
import { OpeningStockDto } from './dto/opening-stock.dto.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

describe('InventoryController', () => {
  const inventoryService = {
    openingStock: vi.fn(),
    adjustStock: vi.fn(),
    listStoreInventory: vi.fn(),
    getStoreProductInventory: vi.fn(),
  };
  let controller: InventoryController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new InventoryController(
      inventoryService as unknown as InventoryService,
    );
  });

  it('forwards opening stock context and DTO', async () => {
    const user = { userId: 'user-1' } as AuthenticatedUser;
    const dto: OpeningStockDto = { quantity: '3.125' };
    await controller.openingStock(
      { user } as never,
      'business-1',
      'store-1',
      'product-1',
      dto,
    );
    expect(inventoryService.openingStock).toHaveBeenCalledWith(
      'user-1',
      'business-1',
      'store-1',
      'product-1',
      dto,
    );
  });

  it('forwards adjustment context and DTO', async () => {
    const user = { userId: 'user-1' } as AuthenticatedUser;
    const dto: AdjustStockDto = {
      type: 'ADJUSTMENT_OUT',
      quantity: '1',
      note: 'count',
    };
    await controller.adjustStock(
      { user } as never,
      'business-1',
      'store-1',
      'product-1',
      dto,
    );
    expect(inventoryService.adjustStock).toHaveBeenCalledWith(
      'user-1',
      'business-1',
      'store-1',
      'product-1',
      dto,
    );
  });

  it('forwards authenticated context and query DTO to the list endpoint', async () => {
    const query: ListInventoryDto = {
      page: 2,
      limit: 10,
      search: 'tea',
      lowStock: 'true',
    };
    await controller.listStoreInventory(
      { user: { userId: 'user-1' } },
      'business-1',
      'store-1',
      query,
    );
    expect(inventoryService.listStoreInventory).toHaveBeenCalledWith(
      'user-1',
      'business-1',
      'store-1',
      query,
    );
  });

  it('forwards authenticated context and product ID to the single-item endpoint', async () => {
    await controller.getStoreProductInventory(
      { user: { userId: 'user-1' } },
      'business-1',
      'store-1',
      'product-1',
    );
    expect(inventoryService.getStoreProductInventory).toHaveBeenCalledWith(
      'user-1',
      'business-1',
      'store-1',
      'product-1',
    );
  });

  it('uses the JWT guard at the controller level', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      InventoryController,
    ) as Array<ReturnType<typeof AuthGuard>>;
    expect(guards).toEqual([AuthGuard('jwt')]);
  });
});
