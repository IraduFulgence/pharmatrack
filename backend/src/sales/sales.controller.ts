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
import { SalesService } from './sales.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { CalculateBillDto } from './dto/calculate-bill.dto.js';
import { QuerySalesDto } from './dto/query-sales.dto.js';
import { RefundSaleDto } from './dto/refund-sale.dto.js';
import { UpdateClaimDto } from './dto/update-claim.dto.js';
import { RegisterSalePatientDto } from './dto/register-sale-patient.dto.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Sales & Billing')
@ApiBearerAuth()
@Controller('api/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACY', 'ADMIN')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ───────────── 1. Sales Dashboard ─────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get sales dashboard statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: 'today' | 'week' | 'month' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.getSalesDashboard(targetPharmacyId, {
      period,
      startDate,
      endDate,
    });
  }

  // ───────────── 2. POS Medicine & Batch Lookup ─────────────

  @Get('pos/search-medicines')
  @ApiOperation({ summary: 'Search available non-expired medicines and batches in pharmacy' })
  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async searchMedicines(
    @CurrentUser() user: JwtPayload,
    @Query('query') query: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.searchMedicinesForPos(targetPharmacyId, query || '');
  }

  // ───────────── 3. Patient Management for Sales ─────────────

  @Get('patients/search')
  @ApiOperation({ summary: 'Search existing registered patients' })
  @ApiQuery({ name: 'query', required: true })
  async searchPatients(@Query('query') query: string): Promise<ApiResponse> {
    return this.salesService.searchPatients(query || '');
  }

  @Post('patients/register-walkin')
  @ApiOperation({ summary: 'Quick register a patient during checkout' })
  async registerWalkinPatient(@Body() dto: RegisterSalePatientDto): Promise<ApiResponse> {
    return this.salesService.registerWalkinPatient(dto);
  }

  // ───────────── 4. Prescription Integration ─────────────

  @Get('prescriptions/search')
  @ApiOperation({ summary: 'Search prescriptions to dispense at POS' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async searchPrescriptions(
    @CurrentUser() user: JwtPayload,
    @Query('query') query?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.searchPrescriptions(targetPharmacyId, query);
  }

  // ───────────── 5. Insurance Providers ─────────────

  @Get('insurance-providers')
  @ApiOperation({ summary: 'Get all active registered insurance providers' })
  async getInsuranceProviders(): Promise<ApiResponse> {
    return this.salesService.getInsuranceProviders();
  }

  // ───────────── 6. Automatic Billing Calculation ─────────────

  @Post('calculate-bill')
  @ApiOperation({ summary: 'Preview automatic bill calculation for POS items' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async calculateBill(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CalculateBillDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.calculateBill(targetPharmacyId, dto);
  }

  // ───────────── 7. Process Sale ─────────────

  @Post()
  @ApiOperation({ summary: 'Complete sales transaction, deduct stock, and generate receipt' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async createSale(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSaleDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.createSale(targetPharmacyId, dto, user.email);
  }

  // ───────────── 8. Sales History ─────────────

  @Get()
  @ApiOperation({ summary: 'Get sales history with filters and pagination' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getSales(
    @CurrentUser() user: JwtPayload,
    @Query() query: QuerySalesDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.getSalesHistory(targetPharmacyId, query);
  }

  // ───────────── 9. Insurance Claims (Ordered before parameterized :id) ─────────────

  @Get('claims/summary')
  @ApiOperation({ summary: 'Get summary statistics of insurance claims' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getClaimsSummary(
    @CurrentUser() user: JwtPayload,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.getClaimsSummary(targetPharmacyId);
  }

  @Get('claims')
  @ApiOperation({ summary: 'List insurance claims with filters' })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getClaims(
    @CurrentUser() user: JwtPayload,
    @Query('providerId') providerId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.getInsuranceClaims(targetPharmacyId, {
      providerId: providerId ? Number(providerId) : undefined,
      status,
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('claims/:id/status')
  @ApiOperation({ summary: 'Update claim status, approval, or insurance payment' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async updateClaimStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClaimDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.updateClaimStatus(targetPharmacyId, id, dto, user.email);
  }

  // ───────────── 10. Single Sale & Receipt ─────────────

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get official sale receipt (JSON data or printable HTML)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'html'] })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getReceipt(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Query('format') format?: 'json' | 'html',
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<void> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    const result = await this.salesService.getReceipt(targetPharmacyId, id);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.data.html);
      return;
    }

    res.json(result);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process sales refund or cancellation and restore inventory' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async refundSale(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundSaleDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.salesService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.salesService.refundSale(targetPharmacyId, id, dto, user.email);
  }
}

