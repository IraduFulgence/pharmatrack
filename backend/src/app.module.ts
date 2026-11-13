import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SalesModule } from './sales/sales.module.js';
import { PatientsModule } from './patients/patients.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AdminModule,
    InventoryModule,
    SalesModule,
    PatientsModule,
  ],
 // imports: [DatabaseModule, AuthModule, AdminModule, InventoryModule,PatientsModule,SalesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}