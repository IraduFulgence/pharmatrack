import { Module } from '@nestjs/common';

import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

import { PatientsModule } from '../patients/patients.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { UploadModule } from '../upload/upload.module.js';

@Module({
  imports: [
    DatabaseModule,
    PatientsModule,
    AuthModule,
    UploadModule,
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