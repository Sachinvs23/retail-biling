import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';

@Module({
  imports: [CommonModule],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}
