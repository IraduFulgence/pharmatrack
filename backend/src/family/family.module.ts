import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FamilyController } from './family.controller.js';
import { FamilyService } from './family.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
