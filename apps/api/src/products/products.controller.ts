import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('products')
@UseGuards(AuthGuard('jwt'))
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(request.user.userId, businessId, dto);
  }

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Query() query: ListProductsDto,
  ) {
    return this.productsService.list(request.user.userId, businessId, query);
  }

  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.findOne(
      request.user.userId,
      businessId,
      productId,
    );
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(
      request.user.userId,
      businessId,
      productId,
      dto,
    );
  }
}
