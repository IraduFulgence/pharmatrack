
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { PharmacyMarketplaceService } from './pharmacy-marketplace.service.js';
import { UploadService } from '../upload/upload.service.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

const pharmacyIdOf = (user: JwtPayload): number => Number(user.pharmacyId || user.sub);

// Orders are handled by the whole pharmacy team; catalogue and prices stay admin-only.
const ORDER_ROLES = ['PHARMACY', 'PHARMACY_ADMIN', 'SALES_OFFICER', 'PHARMACIST'] as const;

@ApiTags('Pharmacy Marketplace')
@ApiBearerAuth()
@Controller('api/pharmacy/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACY')
export class PharmacyMarketplaceController {
  constructor(
    private readonly marketplaceService: PharmacyMarketplaceService,
    private readonly uploadService: UploadService,
  ) {}

  // =========================================================
  // PHARMACY ORDERS
  // =========================================================

  @Get('orders')
  @Roles(...ORDER_ROLES)
  @ApiOperation({
    summary: 'Get orders received by the authenticated pharmacy',
  })
  @ApiQuery({ name: 'status', required: false })
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.marketplaceService.getOrders(pharmacyIdOf(user), status);
  }

  @Get('orders/:orderId')
  @Roles(...ORDER_ROLES)
  @ApiOperation({ summary: 'Get details of a pharmacy order' })
  @ApiParam({ name: 'orderId', type: Number })
  async getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.getOrder(pharmacyIdOf(user), orderId);
  }

  @Get('orders/:orderId/prescription-image')
  @Roles(...ORDER_ROLES)
  @ApiOperation({ summary: 'View the prescription photo the patient attached to an order' })
  async getOrderPrescriptionImage(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Res() res: Response,
  ) {
    const stored = await this.marketplaceService.getOrderPrescriptionImagePath(pharmacyIdOf(user), orderId);
    const absolutePath = this.uploadService.resolveStoredFile(stored, 'prescriptions');
    if (!absolutePath) {
      throw new NotFoundException('No prescription photo was attached to this order.');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(absolutePath);
  }

  @Patch('orders/:orderId/accept')
  @Roles(...ORDER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a pending patient order' })
  async acceptOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.acceptOrder(pharmacyIdOf(user), orderId);
  }

  @Patch('orders/:orderId/reject')
  @Roles(...ORDER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending patient order' })
  async rejectOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { reason: string },
  ) {
    return this.marketplaceService.rejectOrder(
      pharmacyIdOf(user),
      orderId,
      body,
    );
  }

  @Patch('orders/:orderId/status')
  @Roles(...ORDER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order fulfilment status' })
  async updateOrderStatus(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body()
    body: {
      status: 'READY_FOR_COLLECTION' | 'COMPLETED';
    },
  ) {
    return this.marketplaceService.updateOrderStatus(
      pharmacyIdOf(user),
      orderId,
      body,
    );
  }

  @Patch('orders/:orderId/confirm-stock')
  @Roles(...ORDER_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm medicine availability for an order' })
  async confirmOrderStock(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.confirmOrderStock(
      pharmacyIdOf(user),
      orderId,
    );
  }

  // =========================================================
  // PHARMACY MARKETPLACE MEDICINES
  // =========================================================

  @Get('medicines')
  @ApiOperation({
    summary: 'Get medicines available in the authenticated pharmacy',
  })
  async getMedicines(@CurrentUser() user: JwtPayload) {
    return this.marketplaceService.getMedicines(pharmacyIdOf(user));
  }

  @Patch('medicines/:medicineId/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update marketplace medicine availability' })
  async updateAvailability(
    @CurrentUser() user: JwtPayload,
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @Body() body: { available: boolean },
  ) {
    return this.marketplaceService.updateAvailability(
      pharmacyIdOf(user),
      medicineId,
      body,
    );
  }

  @Get('medicines/:medicineId/price')
  @ApiOperation({ summary: 'Get a medicine price at this pharmacy' })
  async getMedicinePrice(
    @CurrentUser() user: JwtPayload,
    @Param('medicineId', ParseIntPipe) medicineId: number,
  ) {
    return this.marketplaceService.getMedicinePrice(
      pharmacyIdOf(user),
      medicineId,
    );
  }

  @Patch('medicines/:medicineId/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a medicine marketplace price' })
  async updateMedicinePrice(
    @CurrentUser() user: JwtPayload,
    @Param('medicineId', ParseIntPipe) medicineId: number,
    @Body() body: { price: number },
  ) {
    return this.marketplaceService.updateMedicinePrice(
      pharmacyIdOf(user),
      medicineId,
      body,
    );
  }
}
