import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [CommonModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
