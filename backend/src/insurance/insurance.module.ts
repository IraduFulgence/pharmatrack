import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { InsuranceController } from './insurance.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [InsuranceService],
  controllers: [InsuranceController],
})
export class InsuranceModule {}
