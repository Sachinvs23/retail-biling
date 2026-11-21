import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';

describe('StoresController', () => {
  const service = { create: vi.fn() };
  let controller: StoresController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new StoresController(service as unknown as StoresService);
  });

  it('forwards authenticated identity, business header, and DTO', async () => {
    const dto: CreateStoreDto = {
      storeName: 'Tambaram Branch',
      storeCode: 'TAMBARAM',
    };

    await controller.create(
      { user: { userId: 'user-1', email: 'user@example.com' } } as never,
      'business-1',
      dto,
    );

    expect(service.create).toHaveBeenCalledWith('user-1', 'business-1', dto);
  });

  it('requires JWT authentication', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, StoresController)).toEqual([
      AuthGuard('jwt'),
    ]);
  });
});
