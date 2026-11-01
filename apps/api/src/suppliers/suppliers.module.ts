import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { SuppliersController } from './suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';

@Module({
  imports: [CommonModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
