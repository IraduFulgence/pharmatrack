import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StaffService } from './staff.service.js';
import { ActivityLogService } from './activity-log.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { ActivateStaffDto } from './dto/activate-staff.dto.js';
import { QueryStaffDto } from './dto/query-staff.dto.js';
import { QueryActivityDto } from './dto/query-activity.dto.js';
import { UpdatePharmacyProfileDto } from './dto/update-pharmacy-profile.dto.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Pharmacy Staff & RBAC')
@Controller('api')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────── 1. Public Account Activation ─────────────

  @Post('staff/activate')
  @ApiOperation({ summary: 'Activate staff account with temporary code and set new password' })
  @SwaggerResponse({ status: 200, description: 'Account activated successfully.' })
  async activateAccount(@Body() dto: ActivateStaffDto): Promise<ApiResponse> {
    return this.staffService.activateAccount(dto);
  }

  // ───────────── 2. Staff Management (Pharmacy Admin) ─────────────

  @Post('pharmacy/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new Sales Officer or Pharmacist with temporary credentials' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async registerStaff(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.registerStaff(targetPharmacyId, dto, user.pharmacyUserId || user.sub);
  }

  @Get('pharmacy/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all staff members belonging to the pharmacy' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async listStaff(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryStaffDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.listStaff(targetPharmacyId, query);
  }

  @Get('pharmacy/staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of an individual staff member' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getStaffById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.getStaffById(targetPharmacyId, id);
  }

  @Patch('pharmacy/staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update staff member information' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async updateStaff(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.updateStaff(targetPharmacyId, id, dto, user.pharmacyUserId || user.sub);
  }

  @Patch('pharmacy/staff/:id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend or reactivate a staff member account' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async toggleStaffStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.toggleStaffStatus(targetPharmacyId, id, user.pharmacyUserId || user.sub);
  }

  @Post('pharmacy/staff/:id/reissue-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reissue temporary activation code for unactivated staff member' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async reissueActivationCode(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.reissueActivationCode(targetPharmacyId, id, user.pharmacyUserId || user.sub);
  }

  // ───────────── 3. Activity Monitoring & Logs (Section 3.4) ─────────────

  @Get('pharmacy/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View staff activity monitoring logs for the pharmacy' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getPharmacyActivities(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryActivityDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.activityLogService.getLogs(targetPharmacyId, query);
  }

  @Get('pharmacy/staff/:id/activity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View activity history of an individual employee' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getStaffActivity(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryActivityDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.activityLogService.getLogs(targetPharmacyId, { ...query, staffId: id });
  }

  // ───────────── 4. Pharmacy Reports (Section 3.5) ─────────────

  @Get('pharmacy/reports/staff-sales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get daily, weekly, monthly and total sales performance per employee' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'custom'] })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getStaffSalesReport(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('staffId') staffId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.getStaffSalesReport(targetPharmacyId, {
      period,
      staffId: staffId ? Number(staffId) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('pharmacy/reports/inventory-operations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stock-in, stock-out, damaged stock, and adjustments per employee' })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getStaffInventoryOperationsReport(
    @CurrentUser() user: JwtPayload,
    @Query('staffId') staffId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.getStaffInventoryOperationsReport(targetPharmacyId, {
      staffId: staffId ? Number(staffId) : undefined,
      type,
      startDate,
      endDate,
    });
  }

  // ───────────── 5. Pharmacy Profile Management (Section 3.1) ─────────────

  @Patch('pharmacy/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACY_ADMIN', 'PHARMACY', 'ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pharmacy details (name, address, location, telephone, email)' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async updatePharmacyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePharmacyProfileDto,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.updatePharmacyProfile(
      targetPharmacyId,
      dto,
      user.pharmacyUserId || user.sub,
    );
  }

  // ───────────── 6. Pharmacist & Sales Officer Personal Operations (Section 4) ─────────────

  @Get('staff/my-reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'SALES_OFFICER', 'PHARMACY_ADMIN', 'PHARMACY')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personal sales and dispensing performance report' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'all'] })
  async getMyPersonalReport(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
  ): Promise<ApiResponse> {
    const pharmacyId = user.pharmacyId || user.sub;
    const staffUserId = user.pharmacyUserId || user.sub;
    return this.staffService.getMyPersonalReport(pharmacyId, staffUserId, period);
  }

  @Get('staff/inventory-updates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PHARMACIST', 'SALES_OFFICER', 'PHARMACY_ADMIN', 'PHARMACY', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Monitor real-time inventory updates (New stock, stock out, low stock, damaged stock)' })
  @ApiQuery({ name: 'pharmacyId', required: false })
  async getInventoryMonitor(
    @CurrentUser() user: JwtPayload,
    @Query('pharmacyId') pharmacyId?: string,
  ): Promise<ApiResponse> {
    const targetPharmacyId = await this.staffService.resolvePharmacyId(
      user,
      pharmacyId ? Number(pharmacyId) : undefined,
    );
    return this.staffService.getInventoryMonitor(targetPharmacyId);
  }
}
