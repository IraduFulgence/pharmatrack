
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SalesModule } from './sales/sales.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { PharmacyMessagingModule } from './pharmacy-messaging/pharmacy-messaging.module.js';
import { MarketplaceModule } from './marketplace/marketplace.module.js';
import { PharmacyMarketplaceModule } from './pharmacy-marketplace/pharmacy-marketplace.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AdminModule,
    InventoryModule,
    SalesModule,
    PatientsModule,
    PharmacyMessagingModule,
    MarketplaceModule,
    PharmacyMarketplaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
