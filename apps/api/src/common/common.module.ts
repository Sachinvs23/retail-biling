import { Module } from '@nestjs/common';
import { BusinessAccessService } from './business-access.service.js';

@Module({
  providers: [BusinessAccessService],
  exports: [BusinessAccessService],
})
export class CommonModule {}
