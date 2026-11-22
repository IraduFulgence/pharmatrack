import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../auth/role.enum.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { SalesOfficerService } from './sales-officer.service.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Sales Officer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALES_OFFICER)
@Controller('api/sales-officer/:salesOfficerId')
export class SalesOfficerController {
  constructor(private readonly service: SalesOfficerService) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory for the pharmacy assigned to the sales officer' })
  async getInventory(@Param('salesOfficerId') id: number): Promise<ApiResponse> {
    return this.service.getInventory(id);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales/billing data for the pharmacy assigned to the sales officer' })
  async getSales(@Param('salesOfficerId') id: number): Promise<ApiResponse> {
    return this.service.getSales(id);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Get tasks/assignments given by the pharmacy admin to the sales officer' })
  async getAssignments(@Param('salesOfficerId') id: number): Promise<ApiResponse> {
    return this.service.getAssignments(id);
  }
}
