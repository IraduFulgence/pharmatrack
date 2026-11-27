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
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { RejectPharmacyDto } from './dto/reject-pharmacy.dto.js';
import { UpdateAdminDto } from './dto/update-admin.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { UpdateSalesOfficerDto } from './dto/update-sales-officer.dto.js';
import { TransferSalesOfficerDto } from './dto/transfer-sales-officer.dto.js';

import { CreatePharmacyDto } from './dto/create-pharmacy.dto.js';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { QueryActivityDto } from '../staff/dto/query-activity.dto.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ───────────── Dashboard ─────────────

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @SwaggerResponse({ status: 200, description: 'Dashboard statistics.' })
  async getDashboardStats(): Promise<ApiResponse> {
    return this.adminService.getDashboardStats();
  }

  // ───────────── Patients ─────────────

  @Get('patients')
  @ApiOperation({ summary: 'List all patients with search and pagination' })
  async listPatients(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse> {
    return this.adminService.listPatients(search, status, Number(page) || 1, Number(limit) || 20);
  }

  @Get('patients/:id')
  @ApiOperation({ summary: 'Get a single patient by ID' })
  async getPatient(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    return this.adminService.getPatient(id);
  }

  @Patch('patients/:id')
  @ApiOperation({ summary: 'Update patient information' })
  async updatePatient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ): Promise<ApiResponse> {
    return this.adminService.updatePatient(id, dto);
  }

  @Patch('patients/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle patient active/inactive status' })
  async togglePatientStatus(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    return this.adminService.togglePatientStatus(id);
  }

  @Post('patients')
  @ApiOperation({ summary: 'Create a new patient account by admin' })
  @SwaggerResponse({ status: 201, description: 'Patient created successfully.' })
  async createPatient(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.createPatient(dto, user.sub);
  }

  // ───────────── Pharmacies ─────────────

  @Get('pharmacies')
  @ApiOperation({ summary: 'List all pharmacies with search, filter, and pagination' })
  async listPharmacies(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse> {
    return this.adminService.listPharmacies(search, status, Number(page) || 1, Number(limit) || 20);
  }

  @Get('pharmacies/:id')
  @ApiOperation({ summary: 'Get a single pharmacy by ID' })
  async getPharmacy(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    return this.adminService.getPharmacy(id);
  }

  @Patch('pharmacies/:id/approve')
  @ApiOperation({ summary: 'Approve a pharmacy' })
  async approvePharmacy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.approvePharmacy(id, user.sub);
  }

  @Patch('pharmacies/:id/reject')
  @ApiOperation({ summary: 'Reject a pharmacy with a reason' })
  async rejectPharmacy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPharmacyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.rejectPharmacy(id, user.sub, dto);
  }

  @Get('pharmacies/:id/certificate/:type')
  @ApiOperation({ summary: 'Download pharmacy certificate document' })
  async getPharmacyCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Param('type') type: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!['pharmacy', 'rdb'].includes(type)) {
      throw new NotFoundException('Certificate type must be "pharmacy" or "rdb".');
    }
    const filePath = await this.adminService.getPharmacyCertificatePath(id, type);
    if (!filePath) {
      throw new NotFoundException('Certificate file not found.');
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Certificate file not found on disk.');
    }

    res.sendFile(absolutePath);
  }

  @Post('pharmacies')
  @ApiOperation({ summary: 'Create a new pharmacy account by admin' })
  @SwaggerResponse({ status: 201, description: 'Pharmacy created successfully.' })
  async createPharmacy(
    @Body() dto: CreatePharmacyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.createPharmacy(dto, user.sub);
  }

  @Patch('pharmacies/:id')
  @ApiOperation({ summary: 'Update pharmacy details by System Admin' })
  async updatePharmacy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePharmacyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.updatePharmacy(id, dto, user.sub);
  }

  @Patch('pharmacies/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle pharmacy active/suspended status' })
  async togglePharmacyStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.togglePharmacyStatus(id, user.sub);
  }

  @Get('pharmacies/:id/activities')
  @ApiOperation({ summary: 'Get audit activity logs for a pharmacy' })
  async getPharmacyActivities(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryActivityDto,
  ): Promise<ApiResponse> {
    return this.adminService.getPharmacyActivities(id, query);
  }

  @Get('reports/system-overview')
  @ApiOperation({ summary: 'Get comprehensive system overview report' })
  async getSystemOverviewReport(): Promise<ApiResponse> {
    return this.adminService.getSystemOverviewReport();
  }

  // ───────────── Administrators ─────────────

  @Get('administrators')
  @ApiOperation({ summary: 'List all administrators' })
  async listAdmins(): Promise<ApiResponse> {
    return this.adminService.listAdmins();
  }

  @Post('administrators')
  @ApiOperation({ summary: 'Create a new admin account' })
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.createAdmin(dto, user.sub);
  }

  @Patch('sales-officers/:id')
  @ApiOperation({ summary: 'Update sales officer profile (name, email, phone)' })
  @ApiBody({ type: UpdateSalesOfficerDto })
  async updateSalesOfficer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalesOfficerDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.updateSalesOfficerProfile(id, dto, user.sub);
  }

  @Patch('sales-officers/:id/transfer')
  @ApiOperation({ summary: 'Transfer sales officer to another pharmacy' })
  @ApiBody({ type: TransferSalesOfficerDto })
  async transferSalesOfficer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferSalesOfficerDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.transferSalesOfficer(id, dto.targetPharmacyId, user.sub);
  }

}

