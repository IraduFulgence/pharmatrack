
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Admin Medicine Images')
@ApiBearerAuth()
@Controller('api/pharmacy/marketplace/medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MedicineImageController {
  constructor(
    private readonly uploadService: UploadService,
  ) {}

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
    summary: 'Upload a medicine image (Admin only)',
  })
  async uploadMedicineImage(
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Replace a medicine image (Admin only)',
  })
  async replaceMedicineImage(
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
