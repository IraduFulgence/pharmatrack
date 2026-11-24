import { Controller, Get, Param, UseGuards, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { SalesOfficerService } from './sales-officer.service.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Sales Officer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SALES_OFFICER', 'PHARMACY_ADMIN', 'ADMIN', 'SYSTEM_ADMIN')
@Controller('api/sales-officer/:salesOfficerId')
export class SalesOfficerController {
  constructor(private readonly service: SalesOfficerService) {}

  private checkOfficerAccess(user: JwtPayload, salesOfficerId: number) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' || user.role === 'PHARMACY_ADMIN';
    if (!isAdmin && Number(user.sub) !== Number(salesOfficerId)) {
      throw new ForbiddenException('Access denied. You can only view your own sales officer records.');
    }
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory for the pharmacy assigned to the sales officer' })
  async getInventory(
    @CurrentUser() user: JwtPayload,
    @Param('salesOfficerId', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    this.checkOfficerAccess(user, id);
    return this.service.getInventory(id);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get sales/billing data for the pharmacy assigned to the sales officer' })
  async getSales(
    @CurrentUser() user: JwtPayload,
    @Param('salesOfficerId', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    this.checkOfficerAccess(user, id);
    return this.service.getSales(id);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Get tasks/assignments given by the pharmacy admin to the sales officer' })
  async getAssignments(
    @CurrentUser() user: JwtPayload,
    @Param('salesOfficerId', ParseIntPipe) id: number,
  ): Promise<ApiResponse> {
    this.checkOfficerAccess(user, id);
    return this.service.getAssignments(id);
  }
}
