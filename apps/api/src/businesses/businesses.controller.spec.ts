import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '@nestjs/passport';
import { BusinessesService } from './businesses.service.js';
import { BusinessesController } from './businesses.controller.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';

describe('BusinessesController', () => {
  it('uses authenticated user identity, forwards DTO, and requires JWT', async () => {
    const service = { create: vi.fn() };
    const controller = new BusinessesController(
      service as unknown as BusinessesService,
    );
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
});
