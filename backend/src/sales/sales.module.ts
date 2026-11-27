import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

