import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { StoresService } from './stores.service.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('stores')
@UseGuards(AuthGuard('jwt'))
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Body() dto: CreateStoreDto,
  ) {
    return this.storesService.create(request.user.userId, businessId, dto);
  }
}
