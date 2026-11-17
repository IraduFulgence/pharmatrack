import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MailModule } from '../mail/mail.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, MailModule, AuthModule],
  controllers: [StaffController],
  providers: [StaffService, ActivityLogService],
  exports: [StaffService, ActivityLogService],
})
export class StaffModule {}
