
import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  ParseIntPipe,
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
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

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

  // ─────────────────────────────────────────
  // MEDICINE ENDPOINTS
  // ─────────────────────────────────────────

  @Get('medicines/search')
  @ApiOperation({
    summary: 'Search for medicines by medicine name',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Medicines retrieved successfully',
  })
  async searchMedicines(
    @Query() dto: SearchMedicineDto,
  ) {
    return this.patientsService.searchMedicines(dto.name);
  }

  @Get('medicines/intelligent-search')
  @ApiOperation({
    summary: 'Search medicines using everyday language and pharmacy-assigned categories',
    description:
      'Understands common medicine descriptions and category-related phrases, then searches medicines using categories assigned by pharmacies.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Intelligent medicine search results retrieved successfully',
  })
  async intelligentSearchMedicines(
    @Query() dto: SearchMedicineDto,
  ) {
    return this.patientsService.intelligentSearchMedicines(dto.name);
  }

  @Post('medicines/search')
  @ApiOperation({
    summary: 'Search multiple medicines and recommend pharmacies',
    description:
      'Prioritizes a single pharmacy within 5 km, then a nearby pharmacy group, then a single farther pharmacy.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Multi-medicine pharmacy recommendations retrieved successfully',
  })
  async searchMultipleMedicines(
    @Body()
    body: {
      medicines: string[];
      latitude: number;
      longitude: number;
    },
  ) {
    return this.patientsService.searchMultipleMedicines(body);
  }

  @Get('pharmacies/nearby')
  @ApiOperation({
    summary: 'Find nearby pharmacies',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Nearby pharmacies retrieved successfully',
  })
  async getNearbyPharmacies(
    @Query() dto: NearbyPharmaciesDto,
  ) {
    return this.patientsService.getNearbyPharmacies(
      String(dto.latitude),
      String(dto.longitude),
      dto.medicineId,
    );
  }

  // ─────────────────────────────────────────
  // PATIENT CHAT ENDPOINTS
  // ─────────────────────────────────────────

  @Post('chats')
  @ApiOperation({
    summary: 'Start a conversation with a pharmacy',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Chat conversation opened successfully',
  })
  async startChat(
    @CurrentUser() user: JwtPayload,
    @Body('pharmacyId', ParseIntPipe) pharmacyId: number,
  ) {
    return this.patientsService.startChat(
      user.sub,
      pharmacyId,
    );
  }

  @Get('chats')
  @ApiOperation({
    summary: 'Get all conversations belonging to the patient',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Patient conversations retrieved successfully',
  })
  async getPatientChats(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.getPatientChats(
      user.sub,
    );
  }

  @Get('chats/:chatId/messages')
  @ApiOperation({
    summary: 'Get messages in a conversation',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Patient chat messages retrieved successfully',
  })
  async getPatientChatMessages(
    @CurrentUser() user: JwtPayload,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    return this.patientsService.getPatientChatMessages(
      user.sub,
      chatId,
    );
  }

  @Post('chats/:chatId/messages')
  @ApiOperation({
    summary: 'Send a message to a pharmacy',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  async sendPatientChatMessage(
    @CurrentUser() user: JwtPayload,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body('message') message: string,
  ) {
    return this.patientsService.sendPatientChatMessage(
      user.sub,
      user.email,
      chatId,
      message,
    );
  }

  @Patch('chats/:chatId/messages/:messageId')
  @ApiOperation({
    summary: 'Edit your message within 10 minutes of sending',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Message edited successfully',
  })
  async editPatientChatMessage(
    @CurrentUser() user: JwtPayload,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body('message') message: string,
  ) {
    return this.patientsService.editPatientChatMessage(
      user.sub,
      chatId,
      messageId,
      message,
    );
  }
}
