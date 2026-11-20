import { Module } from '@nestjs/common';

import { PharmacyMessagingController } from './pharmacy-messaging.controller.js';
import { PharmacyMessagingService } from './pharmacy-messaging.service.js';

import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
  ],
  controllers: [
    PharmacyMessagingController,
  ],
  providers: [
    PharmacyMessagingService,
  ],
  exports: [
    PharmacyMessagingService,
  ],
})
export class PharmacyMessagingModule {}