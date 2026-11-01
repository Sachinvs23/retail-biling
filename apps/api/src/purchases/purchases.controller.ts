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
import { CreatePurchaseDto } from './dto/create-purchase.dto.js';
import { CreatePurchasePaymentDto } from './dto/create-purchase-payment.dto.js';
import { ListPurchasesDto } from './dto/list-purchases.dto.js';
import { PurchasesService } from './purchases.service.js';

@Controller('purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(request.user.userId, businessId, dto);
  }

  @Get()
  findAll(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Query() query: ListPurchasesDto,
  ) {
    return this.purchasesService.findAll(
      request.user.userId,
      businessId,
      query,
    );
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('id') purchaseId: string,
  ) {
    return this.purchasesService.findOne(
      request.user.userId,
      businessId,
      purchaseId,
    );
  }

  @Patch(':id/receive')
  receive(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('id') purchaseId: string,
  ) {
    return this.purchasesService.receive(
      request.user.userId,
      businessId,
      purchaseId,
    );
  }

  @Post(':id/payments')
  recordPayment(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('id') purchaseId: string,
    @Body() dto: CreatePurchasePaymentDto,
  ) {
    return this.purchasesService.recordPayment(
      request.user.userId,
      businessId,
      purchaseId,
      dto,
    );
  }
}
