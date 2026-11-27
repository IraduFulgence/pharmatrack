import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

