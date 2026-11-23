// src/insurance/insurance.controller.ts
// ------------------------------------------------------------
// Insurance API controller
// ------------------------------------------------------------
// The insurers a pharmacy accepts, and the coverage % it applies for each.
// Pharmacy accounts can only see and change their own pharmacy, whatever
// pharmacyId is in the URL; system admins can manage any pharmacy.

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { CreatePharmacyInsuranceDto } from './dto/create-pharmacy-insurance.dto.js';
import { UpdatePharmacyInsuranceDto } from './dto/update-pharmacy-insurance.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@ApiTags('Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACY', 'PHARMACY_ADMIN', 'ADMIN', 'SYSTEM_ADMIN')
@Controller('api/pharmacy/:pharmacyId/insurances')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /** Pharmacy accounts may only act on their own pharmacy. */
  private resolvePharmacyId(user: JwtPayload, requested: number): number {
    if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') {
      return requested;
    }
    const own = Number(user.pharmacyId || user.sub);
    if (requested !== own) {
      throw new ForbiddenException('You can only manage insurances for your own pharmacy.');
    }
    return own;
  }

  /**
   * GET /api/pharmacy/:pharmacyId/insurances
   * Retrieves all insurance configurations for the given pharmacy.
   */
  @Get()
  @ApiOperation({ summary: 'Retrieves all insurance Configurations for the given pharmacy' })
  @SwaggerResponse({ status: 200, description: 'Insurance Configurations' })
  async getAll(
    @CurrentUser() user: JwtPayload,
    @Param('pharmacyId', ParseIntPipe) pharmacyId: number,
  ) {
    return this.insuranceService.getInsurances(this.resolvePharmacyId(user, pharmacyId));
  }

  /**
   * GET /api/pharmacy/:pharmacyId/insurances/available
   * Every active insurer in PharmaTrack, marking the ones this pharmacy already set up.
   */
  @Get('available')
  @ApiOperation({ summary: 'Lists insurers the pharmacy can add' })
  async getAvailable(
    @CurrentUser() user: JwtPayload,
    @Param('pharmacyId', ParseIntPipe) pharmacyId: number,
  ) {
    return this.insuranceService.getAvailableProviders(this.resolvePharmacyId(user, pharmacyId));
  }

  /**
   * POST /api/pharmacy/:pharmacyId/insurances
   * Creates a new pharmacy‑insurance association.
   */
  @Post()
  @ApiOperation({ summary: 'Creates a new pharmacy-insurance association.' })
  @SwaggerResponse({ status: 201, description: 'Insurance Configuration Created Successfully' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('pharmacyId', ParseIntPipe) pharmacyId: number,
    @Body() dto: CreatePharmacyInsuranceDto,
  ) {
    return this.insuranceService.createInsurance(this.resolvePharmacyId(user, pharmacyId), dto);
  }

  /**
   * PATCH /api/pharmacy/:pharmacyId/insurances/:id/status
   * Updates an existing association (coverage %, active flag).
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Updates an existing association (Coverage %, active flag, etc)' })
  @SwaggerResponse({ status: 200, description: 'Insurance Configuration updated Successfully.' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('pharmacyId', ParseIntPipe) pharmacyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePharmacyInsuranceDto,
  ) {
    return this.insuranceService.updateInsurance(this.resolvePharmacyId(user, pharmacyId), id, dto);
  }
}
