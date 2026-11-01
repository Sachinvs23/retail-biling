import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Get, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { OpeningStockDto } from './dto/opening-stock.dto.js';
import { InventoryService } from './inventory.service.js';
import { ListInventoryDto } from './dto/list-inventory.dto.js';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('stores/:storeId/inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post(':productId/opening-stock')
  openingStock(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: OpeningStockDto,
  ) {
    return this.inventoryService.openingStock(
      request.user.userId,
      businessId,
      storeId,
      productId,
      dto,
    );
  }

  @Post(':productId/adjustments')
  adjustStock(
    @Req() request: AuthenticatedRequest,
    @Headers('x-business-id') businessId: string,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(
      request.user.userId,
      businessId,
      storeId,
      productId,
      dto,
    );
  }

  @Get()
  listStoreInventory(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('storeId') storeId: string,
    @Query() query: ListInventoryDto,
  ) {
    return this.inventoryService.listStoreInventory(
      request.user.userId,
      businessId,
      storeId,
      query,
    );
  }

  @Get(':productId')
  getStoreProductInventory(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getStoreProductInventory(
      request.user.userId,
      businessId,
      storeId,
      productId,
    );
  }
}
