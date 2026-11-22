import { Module } from '@nestjs/common';
import { SalesOfficerController } from './sales-officer.controller.js';
import { SalesOfficerService } from './sales-officer.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SalesOfficerController],
  providers: [SalesOfficerService],
  exports: [SalesOfficerService],
})
export class SalesOfficerModule {}
