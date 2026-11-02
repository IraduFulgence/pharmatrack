import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MailModule } from '../mail/mail.module.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_pharmatrack_jwt_key_2026_x!9qZ#L2m',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION || '24h') as any,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL) || 60000,
        limit: Number(process.env.THROTTLE_LIMIT) || 10,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
