
import {
  Controller,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UploadService } from '../upload/upload.service.js';
import { PharmacyMarketplaceService } from './pharmacy-marketplace.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Medicine Images (upload)')
@ApiBearerAuth()
@Controller('api/pharmacy/marketplace/medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
// System admins can set any photo; a pharmacy admin only for medicines it stocks.
// Photos are shared: every pharmacy and patient sees the same one.
@Roles('ADMIN', 'SYSTEM_ADMIN', 'PHARMACY', 'PHARMACY_ADMIN')
export class MedicineImageController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly marketplaceService: PharmacyMarketplaceService,
  ) {}

  private async checkAllowed(user: JwtPayload, medicineId: number) {
    if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return;
    await this.marketplaceService.assertPharmacyStocksMedicine(
      Number(user.pharmacyId || user.sub),
      medicineId,
    );
  }

  @Post(':medicineId/image')
  @UseInterceptors(
  FileInterceptor('image', {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a medicine photo (system admin, or a pharmacy that stocks it)',
  })
  async uploadMedicineImage(
    @CurrentUser() user: JwtPayload,
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.checkAllowed(user, medicineId);
    if (!file) {
      throw new BadRequestException(
        'Please provide an image using the "image" field.',
      );
    }

    const result =
      await this.uploadService.replaceMedicineImage(
        medicineId,
        file,
      );

    return {
      success: true,
      message: 'Medicine image uploaded successfully.',
      data: result,
    };
  }

  @Patch(':medicineId/image')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Replace a medicine photo (system admin, or a pharmacy that stocks it)',
  })
  async replaceMedicineImage(
    @CurrentUser() user: JwtPayload,
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.checkAllowed(user, medicineId);
    if (!file) {
      throw new BadRequestException(
        'Please provide the replacement image using the "image" field.',
      );
    }

    const result =
      await this.uploadService.replaceMedicineImage(
        medicineId,
        file,
      );

    return {
      success: true,
      message: 'Medicine image replaced successfully.',
      data: result,
    };
  }
}
