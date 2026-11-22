
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UploadModule } from '../upload/upload.module.js';

import { PharmacyMarketplaceController } from './pharmacy-marketplace.controller.js';
import { PharmacyMarketplaceService } from './pharmacy-marketplace.service.js';
import { MedicineImageController } from './medicine-image.controller.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UploadModule,
  ],
  controllers: [
    PharmacyMarketplaceController,
    MedicineImageController,
  ],
  providers: [
    PharmacyMarketplaceService,
  ],
  exports: [
    PharmacyMarketplaceService,
  ],
})
export class PharmacyMarketplaceModule {}
