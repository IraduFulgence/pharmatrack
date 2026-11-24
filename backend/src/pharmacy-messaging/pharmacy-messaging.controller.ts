import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { PharmacyMessagingService } from './pharmacy-messaging.service.js';
import { SendPharmacyMessageDto } from './dto/send-pharmacy-message.dto.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';

@ApiTags('Pharmacy Messaging')
@ApiBearerAuth()
@Controller('api/pharmacy/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
// Pharmacy admins and their staff (sales officers, pharmacists) handle patient messages.
@Roles('PHARMACY', 'PHARMACY_ADMIN', 'SALES_OFFICER', 'PHARMACIST')
export class PharmacyMessagingController {
  constructor(
    private readonly messagingService: PharmacyMessagingService,
  ) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all patient conversations for the authenticated pharmacy',
  })
  @ApiResponse({
    status: 200,
    description: 'Pharmacy conversations retrieved successfully.',
  })
  async getConversations(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.getConversations(user);
  }

  @Get('conversations/:chatId')
  @ApiOperation({
    summary: 'Get messages in a patient conversation',
  })
  async getConversationMessages(
    @CurrentUser() user: JwtPayload,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    return this.messagingService.getConversationMessages(user, chatId);
  }

  @Post('conversations/:chatId')
  @ApiOperation({
    summary: 'Send a reply to a patient conversation',
  })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() dto: SendPharmacyMessageDto,
  ) {
    return this.messagingService.sendMessage(
      user,
      chatId,
      dto.message,
    );
  }
}