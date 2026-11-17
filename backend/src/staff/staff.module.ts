import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller.js';
import { StaffService } from './staff.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [DatabaseModule, MailModule],
  controllers: [StaffController],
  providers: [StaffService, ActivityLogService],
  exports: [StaffService, ActivityLogService],
})
export class StaffModule {}
