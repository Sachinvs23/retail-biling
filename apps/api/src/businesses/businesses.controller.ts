import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { BusinessesService } from './businesses.service.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('businesses')
@UseGuards(AuthGuard('jwt'))
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('context')
  getContext(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId?: string,
  ) {
    return this.businessesService.getContext(request.user.userId, businessId);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.businessesService.list(request.user.userId);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(request.user.userId, dto);
  }
}
