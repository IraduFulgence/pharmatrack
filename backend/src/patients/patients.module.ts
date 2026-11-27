
import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
