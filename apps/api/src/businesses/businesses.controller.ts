import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(request.user.userId, dto);
  }
}
