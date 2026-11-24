import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SalesModule } from './sales/sales.module.js';
import { SalesOfficerModule } from './sales-officer/sales-officer.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { PharmacyMessagingModule } from './pharmacy-messaging/pharmacy-messaging.module.js';
import { StaffModule } from './staff/staff.module.js';
import { InsuranceModule } from './insurance/insurance.module.js';
import { ProfileModule } from './profile/profile.module.js';



@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AdminModule,
    InventoryModule,
    SalesModule,
    SalesOfficerModule,
    PatientsModule,
    PharmacyMessagingModule,
    ProfileModule,
    StaffModule,
    InsuranceModule,
  ],
  
  
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}