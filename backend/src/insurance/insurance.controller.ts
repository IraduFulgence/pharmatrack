// src/insurance/insurance.controller.ts
// ------------------------------------------------------------
// Insurance API controller
// ------------------------------------------------------------
// All routes are scoped under a specific pharmacy (pharmacyId)
// and are only accessible to users with the PHARMACY_ADMIN role.

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { Controller, Get, Param, Post, Body, Patch } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { CreatePharmacyInsuranceDto } from './dto/create-pharmacy-insurance.dto.js';
import { UpdatePharmacyInsuranceDto } from './dto/update-pharmacy-insurance.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../auth/role.enum.js';

@Roles(Role.PHARMACY_ADMIN)
@Controller('api/pharmacy/:pharmacyId/insurances')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) { }

  /**
   * GET /api/pharmacy/:pharmacyId/insurances
   * Retrieves all insurance configurations for the given pharmacy.
   */
  @Get()
  @ApiOperation({ summary: 'Retrieves all insurance Configurations for the given pharmacy' })
  @SwaggerResponse({ status: 200, description: 'Insurance Configurations' })
  async getAll(@Param('pharmacyId') pharmacyId: number) {
    return this.insuranceService.getInsurances(+pharmacyId);
  }

  /**
   * POST /api/pharmacy/:pharmacyId/insurances
   * Creates a new pharmacy‑insurance association.
   */
  @Post()
  @ApiOperation({ summary: 'Creates a new pharmacy-insurance association.' })
  @SwaggerResponse({ status: 200, description: 'Insurance Configuration Created Successfully' })
  async create(
    @Param('pharmacyId') pharmacyId: number,
    @Body() dto: CreatePharmacyInsuranceDto,
  ) {
    return this.insuranceService.createInsurance(+pharmacyId, dto);
  }

  /**
   * PATCH /api/pharmacy/:pharmacyId/insurances/:id
   * Updates an existing association (coverage %, active flag, etc.).
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Updates an existing association (Coverage %, active flag, etc)' })
  @SwaggerResponse({ status: 200, description: 'Insurance Configuration updated Successfully.' })
  async toggleStatus(
    @Param('pharmacyId') pharmacyId: number,
    @Param('id') id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.insuranceService.toggleInsurance(+id, isActive);
  }
}

