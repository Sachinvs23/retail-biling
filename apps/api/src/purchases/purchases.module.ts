import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { PurchasesController } from './purchases.controller.js';
import { PurchasesService } from './purchases.service.js';

@Module({
  imports: [CommonModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
