import { AuthModule } from './auth/auth.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { ProductsModule } from './products/products.module.js';
import { CommonModule } from './common/common.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    BusinessesModule,
    ProductsModule,
    CommonModule,
    InventoryModule,
    SuppliersModule,
    PurchasesModule,
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
