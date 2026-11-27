
import {
  Body,
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@ApiTags('Medicine Marketplace')
@ApiBearerAuth()
@Controller('api/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
  ) {}

  // ---------------------------------------------------------
  // MEDICINE BROWSING
  // ---------------------------------------------------------

  @Get('medicines')
  @ApiOperation({ summary: 'Browse the medicine catalogue' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getMedicines(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.marketplaceService.getMedicines(q, limit, offset);
  }

  @Get('prescriptions/lookup')
  @ApiOperation({
    summary: 'Find one of your prescriptions by its number or SMS code, with the medicines on it',
    description: 'Family heads and spouses also find prescriptions written for members of their family.',
  })
  @ApiQuery({ name: 'reference', required: true, description: 'Prescription number or SMS code' })
  async lookupPrescription(
    @CurrentUser() user: JwtPayload,
    @Query('reference') reference: string,
  ) {
    return this.marketplaceService.lookupPrescription(Number(user.sub), reference);
  }

  @Get('medicines/search')
  @ApiOperation({
    summary: 'Search medicines and view pharmacy availability and prices',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Medicine name, generic name, or brand name',
  })
  async searchMedicines(@Query('name') name: string) {
    return this.marketplaceService.searchMedicines(name);
  }

  @Get('medicines/:medicineId/pharmacies')
  @ApiOperation({
    summary: 'Compare pharmacies offering a specific medicine',
  })
  @ApiParam({ name: 'medicineId', description: 'Medicine ID' })
  async getMedicinePharmacies(
    @Param('medicineId', ParseIntPipe) medicineId: number,
  ) {
    return this.marketplaceService.getMedicinePharmacies(medicineId);
  }

  @Get('medicines/:medicineId')
  @ApiOperation({ summary: 'View medicine details' })
  @ApiParam({ name: 'medicineId', description: 'Medicine ID' })
  async getMedicineDetails(
    @Param('medicineId', ParseIntPipe) medicineId: number,
  ) {
    return this.marketplaceService.getMedicineDetails(medicineId);
  }

  // ---------------------------------------------------------
  // PHARMACY BROWSING
  // ---------------------------------------------------------

  @Get('pharmacies/nearby')
  @ApiOperation({ summary: 'Find nearby approved pharmacies' })
  @ApiQuery({ name: 'latitude', required: true })
  @ApiQuery({ name: 'longitude', required: true })
  @ApiQuery({ name: 'medicineId', required: false })
  async getNearbyPharmacies(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('medicineId') medicineId?: string,
  ) {
    return this.marketplaceService.getNearbyPharmacies(
      latitude,
      longitude,
      medicineId,
    );
  }

  @Get('pharmacies/:pharmacyId/medicines')
  @ApiOperation({
    summary: 'Browse medicines available at a pharmacy',
  })
  @ApiParam({ name: 'pharmacyId', description: 'Pharmacy ID' })
  async getPharmacyMedicines(
    @Param('pharmacyId', ParseIntPipe) pharmacyId: number,
  ) {
    return this.marketplaceService.getPharmacyMedicines(pharmacyId);
  }

  // ---------------------------------------------------------
  // PATIENT CART
  // ---------------------------------------------------------

  @Post('cart/items')
  @ApiOperation({ summary: 'Add a medicine to the patient cart' })
  async addCartItem(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      pharmacyId: number;
      medicineId: number;
      quantity: number;
    },
  ) {
    return this.marketplaceService.addCartItem(
      Number(user.sub),
      body,
    );
  }

  @Get('cart')
  @ApiOperation({ summary: 'View the current patient cart' })
  async getCart(@CurrentUser() user: JwtPayload) {
    return this.marketplaceService.getCart(Number(user.sub));
  }

  @Patch('cart/items/:itemId')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  async updateCartItem(
    @CurrentUser() user: JwtPayload,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: { quantity: number },
  ) {
    return this.marketplaceService.updateCartItem(
      Number(user.sub),
      itemId,
      body.quantity,
    );
  }

  @Delete('cart/items/:itemId')
  @ApiOperation({ summary: 'Remove a medicine from the patient cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  async removeCartItem(
    @CurrentUser() user: JwtPayload,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.marketplaceService.removeCartItem(
      Number(user.sub),
      itemId,
    );
  }

  // ---------------------------------------------------------
  // PATIENT ORDERS
  // ---------------------------------------------------------

  @Post('orders')
  @ApiOperation({
    summary: 'Place an order from the current cart',
    description:
      'JSON, or multipart/form-data with an optional "prescription" photo (JPEG/PNG/WebP, max 5 MB). ' +
      'Orders with prescription-only medicine need prescriptionReference or the photo. ' +
      'Family heads and spouses can send forPatientId to order for a member of their family.',
  })
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(
    FileInterceptor('prescription', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }),
  )
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      paymentMethod: 'CASH_ON_COLLECTION' | 'MOBILE_MONEY';
      mobileMoneyProvider?: 'MTN_MOMO' | 'AIRTEL_MONEY';
      paymentPhoneNumber?: string;
      prescriptionReference?: string;
      /** Family member the order is for (family heads and spouses only). Omit for yourself. */
      forPatientId?: number | string;
    },
    @UploadedFile() prescription?: Express.Multer.File,
  ) {
    return this.marketplaceService.createOrder(
      Number(user.sub),
      body,
      prescription,
      // Set when a family manager is acting for this patient: record who really placed it.
      user.actedBy ? Number(user.actedBy) : undefined,
    );
  }

  @Get('orders')
  @ApiOperation({ summary: 'View patient order history' })
  async getPatientOrders(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.marketplaceService.getPatientOrders(
      Number(user.sub),
    );
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'View a specific patient order' })
  @ApiParam({ name: 'orderId', description: 'Marketplace order ID' })
  async getPatientOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.getPatientOrder(
      Number(user.sub),
      orderId,
    );
  }

  @Patch('orders/:orderId/cancel')
  @ApiOperation({ summary: 'Cancel an eligible patient order' })
  @ApiParam({ name: 'orderId', description: 'Marketplace order ID' })
  async cancelPatientOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.marketplaceService.cancelPatientOrder(
      Number(user.sub),
      orderId,
    );
  }
}
