import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [CommonModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
