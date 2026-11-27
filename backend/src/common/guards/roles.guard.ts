import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { UserRole } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User has no role assigned.');
    }

    const userRole = user.role;
    const hasRole = requiredRoles.some((role) => {
      if (role === userRole) return true;
      if ((role === 'ADMIN' || role === 'SYSTEM_ADMIN') && (userRole === 'ADMIN' || userRole === 'SYSTEM_ADMIN')) {
        return true;
      }
      if ((role === 'PHARMACY' || role === 'PHARMACY_ADMIN') && (userRole === 'PHARMACY' || userRole === 'PHARMACY_ADMIN')) {
        return true;
      }
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Access restricted to roles: ${requiredRoles.join(', ')}.`);
    }

    return true;
  }
}

