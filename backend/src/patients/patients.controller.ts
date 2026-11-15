
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';

import { PatientsService } from './patients.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

import { NearbyPharmaciesDto } from './dto/nearby-pharmacies.dto.js';
import { SearchMedicineDto } from './dto/search-medicine.dto.js';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('api/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  @Get('medicines/search')
  @ApiOperation({ summary: 'Search for medicines' })
  @SwaggerResponse({ status: 200, description: 'Medicines retrieved successfully' })
  async searchMedicines(
    @Query() dto: SearchMedicineDto,
  ) {
    return this.patientsService.searchMedicines(dto.name);
  }

  @Get('pharmacies/nearby')
  @ApiOperation({ summary: 'Find nearby pharmacies' })
  @SwaggerResponse({ status: 200, description: 'Nearby pharmacies retrieved successfully' })
  async getNearbyPharmacies(
    @Query() dto: NearbyPharmaciesDto,
  ) {
    return this.patientsService.getNearbyPharmacies(
      String(dto.latitude),
      String(dto.longitude),
      dto.medicineId,
    );
  }
}
