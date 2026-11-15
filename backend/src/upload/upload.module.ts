import { Module } from '@nestjs/common';
import { UploadService } from './upload.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}

