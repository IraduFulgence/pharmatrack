
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { PharmacyMarketplaceService } from './pharmacy-marketplace.service.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@ApiTags('Pharmacy Marketplace')
@ApiBearerAuth()
@Controller('api/pharmacy/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PHARMACY')
export class PharmacyMarketplaceController {
  constructor(
    private readonly marketplaceService: PharmacyMarketplaceService,
  ) {}

  // =========================================================
  // PHARMACY ORDERS
  // =========================================================

  @Get('orders')
  @ApiOperation({
    summary: 'Get orders received by the authenticated pharmacy',
  })
  @ApiQuery({ name: 'status', required: false })
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.marketplaceService.getOrders(user.sub, status);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get details of a pharmacy order' })
  @ApiParam({ name: 'orderId', type: Number })
  async getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.getOrder(user.sub, orderId);
  }

  @Patch('orders/:orderId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a pending patient order' })
  async acceptOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.acceptOrder(user.sub, orderId);
  }

  @Patch('orders/:orderId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending patient order' })
  async rejectOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { reason: string },
  ) {
    return this.marketplaceService.rejectOrder(
      user.sub,
      orderId,
      body,
    );
  }

  @Patch('orders/:orderId/status')
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
      user.sub,
      orderId,
      body,
    );
  }

  @Patch('orders/:orderId/confirm-stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm medicine availability for an order' })
  async confirmOrderStock(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.confirmOrderStock(
      user.sub,
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
    return this.marketplaceService.getMedicines(user.sub);
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
      user.sub,
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
      user.sub,
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
      user.sub,
      medicineId,
      body,
    );
  }
}
