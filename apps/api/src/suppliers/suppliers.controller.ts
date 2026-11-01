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
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { ListSuppliersDto } from './dto/list-suppliers.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto.js';
import { SuppliersService } from './suppliers.service.js';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'))
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(request.user.userId, businessId, dto);
  }

  @Get()
  list(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Query() query: ListSuppliersDto,
  ) {
    return this.suppliersService.list(request.user.userId, businessId, query);
  }

  @Get(':id')
  findOne(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('id') supplierId: string,
  ) {
    return this.suppliersService.findOne(
      request.user.userId,
      businessId,
      supplierId,
    );
  }

  @Patch(':id')
  update(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('id') supplierId: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(
      request.user.userId,
      businessId,
      supplierId,
      dto,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: { user: { userId: string } },
    @Headers('x-business-id') businessId: string,
    @Param('id') supplierId: string,
    @Body() dto: UpdateSupplierStatusDto,
  ) {
    return this.suppliersService.updateStatus(
      request.user.userId,
      businessId,
      supplierId,
      dto.isActive,
    );
  }
}
