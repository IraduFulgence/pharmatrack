import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterPatientDto } from './dto/register-patient.dto.js';
import { RegisterPharmacyDto } from './dto/register-pharmacy.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { ApiResponse } from '../common/interfaces/api-response.interface.js';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/patient')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new patient account' })
  @SwaggerResponse({
    status: 201,
    description: 'Patient account created successfully.',
  })
  @SwaggerResponse({ status: 400, description: 'Validation failed.' })
  @SwaggerResponse({ status: 409, description: 'Duplicate patient data (National ID, email, or phone).' })
  async registerPatient(@Body() dto: RegisterPatientDto): Promise<ApiResponse> {
    return this.authService.registerPatient(dto);
  }

  @Post('register/pharmacy')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new pharmacy account' })
  @SwaggerResponse({
    status: 201,
    description: 'Pharmacy account created successfully.',
  })
  @SwaggerResponse({ status: 400, description: 'Validation failed.' })
  @SwaggerResponse({ status: 409, description: 'Duplicate pharmacy data (email or phone).' })
  async registerPharmacy(@Body() dto: RegisterPharmacyDto): Promise<ApiResponse> {
    return this.authService.registerPharmacy(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Unified login for patients and pharmacies (email or phone number)' })
  @SwaggerResponse({ status: 200, description: 'Login successful.' })
  @SwaggerResponse({ status: 400, description: 'Validation failed.' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials.' })
  @SwaggerResponse({ status: 403, description: 'Account inactive or suspended.' })
  @SwaggerResponse({ status: 429, description: 'Too many requests.' })
  async login(@Body() dto: LoginDto): Promise<ApiResponse> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset email link' })
  @SwaggerResponse({
    status: 200,
    description: 'If an account exists, a password reset link has been sent.',
  })
  @SwaggerResponse({ status: 400, description: 'Validation failed.' })
  @SwaggerResponse({ status: 429, description: 'Too many requests.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ApiResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token received via email' })
  @SwaggerResponse({
    status: 200,
    description: 'Password has been reset successfully.',
  })
  @SwaggerResponse({ status: 400, description: 'Invalid or expired token / validation error.' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponse> {
    return this.authService.resetPassword(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile (JWT protected)' })
  @SwaggerResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized or token expired.' })
  async getProfile(@CurrentUser() user: JwtPayload): Promise<ApiResponse> {
    return this.authService.getProfile(user.sub, user.role);
  }
}
