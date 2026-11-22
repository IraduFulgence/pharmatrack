import { Module } from '@nestjs/common';

import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

import { PatientsModule } from '../patients/patients.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [
    DatabaseModule,
    PatientsModule,
    AuthModule,
  ],
  controllers: [
    MarketplaceController,
  ],
  providers: [
    MarketplaceService,
  ],
  exports: [
    MarketplaceService,
  ],
})
export class MarketplaceModule {}