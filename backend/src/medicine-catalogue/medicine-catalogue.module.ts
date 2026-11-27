import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MedicineCatalogueController, MedicineCategoriesController } from './medicine-catalogue.controller.js';
import { MedicineCatalogueService } from './medicine-catalogue.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MedicineCatalogueController, MedicineCategoriesController],
  providers: [MedicineCatalogueService],
  exports: [MedicineCatalogueService],
})
export class MedicineCatalogueModule {}
