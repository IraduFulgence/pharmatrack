import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('My Profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get your own profile' })
  @SwaggerResponse({ status: 200, description: 'Profile data' })
  async getOwnProfile(@CurrentUser() user: JwtPayload): Promise<ApiResponse> {
    const data = await this.profileService.getOwnProfile(user);
    return { success: true, message: 'Profile fetched', data };
  }

  @Patch()
  @ApiOperation({ summary: 'Update your own profile' })
  @SwaggerResponse({ status: 200, description: 'Profile updated' })
  async updateOwnProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse> {
    const data = await this.profileService.updateOwnProfile(user, dto);
    return { success: true, message: 'Profile updated', data };
  }
}
