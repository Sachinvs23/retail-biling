import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { BusinessesService } from './businesses.service.js';
import { BusinessesController } from './businesses.controller.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';

describe('BusinessesController', () => {
  const service = {
    create: vi.fn(),
    list: vi.fn(),
    getContext: vi.fn(),
  };
  let controller: BusinessesController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new BusinessesController(
      service as unknown as BusinessesService,
    );
  });

  it('uses authenticated user identity, forwards DTO, and requires JWT', async () => {
    const dto: CreateBusinessDto = {
      businessName: 'Shop',
      slug: 'shop',
      storeName: 'Main',
    };
    await controller.create({ user: { userId: 'user-1' } } as never, dto);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
    expect(Reflect.getMetadata(GUARDS_METADATA, BusinessesController)).toEqual([
      AuthGuard('jwt'),
    ]);
  });

  it('lists businesses for the authenticated user', async () => {
    await controller.list({ user: { userId: 'user-1' } } as never);

    expect(service.list).toHaveBeenCalledWith('user-1');
  });

  it('forwards the requested business ID when loading context', async () => {
    await controller.getContext(
      { user: { userId: 'user-1' } } as never,
      'tenant-1',
    );

    expect(service.getContext).toHaveBeenCalledWith('user-1', 'tenant-1');
  });
});
