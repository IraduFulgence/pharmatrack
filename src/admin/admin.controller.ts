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
import { UpdatePatientDto } from './dto/update-patient.dto.js';
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

  @Patch('administrators/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle admin active/inactive status' })
  async toggleAdminStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse> {
    return this.adminService.toggleAdminStatus(id, user.sub);
  }
}

