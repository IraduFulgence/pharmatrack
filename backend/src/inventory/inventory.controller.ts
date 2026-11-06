import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AddStockDto } from './dto/add-stock.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';
import { CreateMedicineDto } from './dto/create-medicine.dto.js';
import { UpdateMedicineDto } from './dto/update-medicine.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
import { QueryReportDto } from './dto/query-report.dto.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('api/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACY', 'ADMIN')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ───────────── 1. Dashboard Overview ─────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get pharmacy inventory dashboard overview' })
  @ApiQuery({ name: 'pharmacyId', required: false, description: 'Admin only tenant override' })
  @SwaggerResponse({ status: 200, description: 'Inventory dashboard statistics' })
  async getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getDashboardOverview(targetPharmacyId);
  }

  // ───────────── 2. Central Medicine Catalogue ─────────────

  @Get('catalogue')
  @ApiOperation({ summary: 'Search and browse central medicine catalogue' })
  async searchCatalogue(
    @Query('search') search?: string,
    @Query('dosageForm') dosageForm?: string,
    @Query('requiresPrescription') requiresPrescription?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse> {
    const reqPrescriptionBool =
      requiresPrescription === 'true'
        ? true
        : requiresPrescription === 'false'
        ? false
        : undefined;

    return this.inventoryService.searchCatalogue({
      search,
      dosageForm,
      requiresPrescription: reqPrescriptionBool,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('medicines')
  @ApiOperation({ summary: 'Register a new medicine in the central catalogue' })
  async createMedicine(@Body() dto: CreateMedicineDto): Promise<ApiResponse> {
    return this.inventoryService.createMedicine(dto);
  }

  @Patch('medicines/:id')
  @ApiOperation({ summary: 'Update medicine details in the central catalogue' })
  async updateMedicine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicineDto,
  ): Promise<ApiResponse> {
    return this.inventoryService.updateMedicine(id, dto);
  }

  // ───────────── 3. Pharmacy Stocked Medicines ─────────────

  @Get('medicines')
  @ApiOperation({ summary: 'Get aggregated medicines in this pharmacy inventory' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getPharmacyMedicines(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryInventoryDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getPharmacyMedicines(targetPharmacyId, query);
  }

  @Get('medicines/:id')
  @ApiOperation({ summary: 'Get details of a specific medicine and all its batches in pharmacy' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getMedicineDetails(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getMedicineDetails(targetPharmacyId, id);
  }

  // ───────────── 4. Add Stock / Receive Batch ─────────────

  @Post('batches')
  @ApiOperation({ summary: 'Receive new stock batch into inventory' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async addStock(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddStockDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.addStock(targetPharmacyId, dto, user.email);
  }

  @Post('stock-in')
  @ApiOperation({ summary: 'Alias for receiving new stock batch' })
  async stockIn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddStockDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.addStock(targetPharmacyId, dto, user.email);
  }

  // ───────────── 5. Batches Management ─────────────

  @Get('batches')
  @ApiOperation({ summary: 'Get all batches with FEFO priority and filters' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getBatches(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryInventoryDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getBatches(targetPharmacyId, query);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch details and its transaction history' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getBatchDetails(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getBatchDetails(targetPharmacyId, id);
  }

  @Patch('batches/:id')
  @ApiOperation({ summary: 'Update batch unit price, reorder level, or status' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async updateBatch(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBatchDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.updateBatch(targetPharmacyId, id, dto);
  }

  // ───────────── 6. Stock Adjustments ─────────────

  @Post('adjustments')
  @ApiOperation({
    summary: 'Adjust inventory stock (Increase, Decrease, Damaged, Expired, Lost, Physical Count)',
  })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async adjustStock(
    @CurrentUser() user: JwtPayload,
    @Body() dto: StockAdjustmentDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.adjustStock(targetPharmacyId, dto, user.email);
  }

  // ───────────── 7. Alerts and Notifications ─────────────

  @Get('alerts')
  @ApiOperation({ summary: 'Get low stock, expired, and expiring-soon alerts' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getAlerts(
    @CurrentUser() user: JwtPayload,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getAlerts(targetPharmacyId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get inventory notifications for pharmacy' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getNotifications(targetPharmacyId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark an inventory notification as read' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async markNotificationRead(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.markNotificationRead(targetPharmacyId, id);
  }

  @Post('notifications/scan-alerts')
  @ApiOperation({ summary: 'Scan inventory and generate new alert notifications' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async scanAlerts(
    @CurrentUser() user: JwtPayload,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.scanAndGenerateAlerts(targetPharmacyId);
  }

  // ───────────── 8. Transactions History ─────────────

  @Get('transactions')
  @ApiOperation({ summary: 'Get complete inventory transaction history' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('inventoryId') inventoryId?: string,
    @Query('medicineId') medicineId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.inventoryService.getTransactions(targetPharmacyId, {
      inventoryId: inventoryId ? Number(inventoryId) : undefined,
      medicineId: medicineId ? Number(medicineId) : undefined,
      transactionType,
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ───────────── 9. Inventory Reports ─────────────

  @Get('reports')
  @ApiOperation({ summary: 'Generate inventory report (JSON or CSV export)' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryReportDto,
    @Res() res: Response,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<void> {
    const targetPharmacyId = await this.inventoryService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );

    const result = await this.inventoryService.generateReport(targetPharmacyId, query);

    if (query.exportFormat === 'csv' && result.csvString !== undefined) {
      const filename = `inventory-report-${query.reportType.toLowerCase()}-${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result.csvString);
      return;
    }

    res.json(result.response);
  }
}

