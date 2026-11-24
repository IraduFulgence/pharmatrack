import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { UploadService } from '../upload/upload.service.js';

/**
 * Medicine photos are product pictures, not personal data, so they are public:
 * the mobile app can load them straight into an <Image>.
 */
@ApiTags('Medicine Images')
@Controller('api/medicines')
export class MedicineImagePublicController {
  constructor(private readonly uploadService: UploadService) {}

  @Get(':medicineId/image')
  @ApiOperation({ summary: 'Get a medicine photo' })
  async getImage(
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @Res() res: Response,
  ) {
    const stored = await this.uploadService.getMedicineImagePath(medicineId);
    const absolutePath = this.uploadService.resolveStoredFile(stored, 'medicine-images');
    if (!absolutePath) {
      throw new NotFoundException('This medicine has no photo.');
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(absolutePath);
  }
}
