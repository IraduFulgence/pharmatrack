import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { MedicineCatalogueService } from './medicine-catalogue.service.js';
import { CatalogueMedicineDto, CreateCategoryDto, UpdateCatalogueMedicineDto } from './dto/catalogue.dto.js';

const IMPORT_LIMITS = { limits: { fileSize: 5 * 1024 * 1024, files: 1 } };

// System admins curate the shared medicine catalogue: categories, what each medicine
// treats, age limits and dosage notes; one at a time or in bulk from CSV / Excel.
@ApiTags('Admin Medicine Catalogue')
@ApiBearerAuth()
@Controller('api/admin/medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SYSTEM_ADMIN')
export class MedicineCatalogueController {
  constructor(private readonly catalogue: MedicineCatalogueService) {}

  @Get()
  @ApiOperation({ summary: 'List medicines (scope: CATALOGUE, PHARMACY or ALL)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false, description: "A category ID, or 'none'" })
  @ApiQuery({ name: 'scope', required: false, enum: ['CATALOGUE', 'PHARMACY', 'ALL'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('scope') scope?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogue.listMedicines({ q, categoryId, scope, page, limit });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Medicine categories' })
  categories() {
    return this.catalogue.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Add a medicine category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogue.createCategory(dto);
  }

  @Get('import/template')
  @ApiOperation({ summary: 'Download the catalogue import template' })
  @ApiQuery({ name: 'format', enum: ['xlsx', 'csv'], required: false })
  template(@Query('format') format: string, @Res() res: Response) {
    const file = this.catalogue.catalogueTemplate(format === 'csv' ? 'csv' : 'xlsx');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  @Post('import/preview')
  @ApiOperation({ summary: 'Check a catalogue file and show what will be added or updated' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', IMPORT_LIMITS))
  preview(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('Choose a CSV or Excel file.');
    return this.catalogue.previewImport(file.buffer);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import the valid rows of a catalogue file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', IMPORT_LIMITS))
  import(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('Choose a CSV or Excel file.');
    return this.catalogue.importCatalogue(file.buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One medicine' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.catalogue.getMedicine(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a medicine to the shared catalogue' })
  create(@Body() dto: CatalogueMedicineDto) {
    return this.catalogue.createMedicine(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a medicine (category, what it treats, age limits, dosage...)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogueMedicineDto) {
    return this.catalogue.updateMedicine(id, dto);
  }
}

/** Categories for anyone signed in (pharmacies and patients filter by them). */
@ApiTags('Medicine Categories')
@ApiBearerAuth()
@Controller('api/medicine-categories')
@UseGuards(JwtAuthGuard)
export class MedicineCategoriesController {
  constructor(private readonly catalogue: MedicineCatalogueService) {}

  @Get()
  @ApiOperation({ summary: 'Medicine categories' })
  categories() {
    return this.catalogue.listCategories();
  }
}
