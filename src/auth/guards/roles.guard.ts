import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint no especifica @Roles, el acceso por rol es libre
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const headerRole = request.headers['x-user-role'];

    // Obtenemos el rol del usuario autenticado o del encabezado de contexto
    const userRole = (
      user?.role ||
      user?.claims?.role ||
      user?.customClaims?.role ||
      headerRole ||
      ''
    ).toString().trim().toUpperCase();

    if (!userRole) {
      throw new ForbiddenException(
        'Acceso denegado: No se identificó el rol del usuario',
      );
    }

    const normalizedRequired = requiredRoles.map((r) => r.trim().toUpperCase());

    // Administrador o SUPERADMIN siempre tiene acceso a todo
    if (userRole === 'ADMIN' || userRole === 'ADMINISTRADOR') {
      return true;
    }

    const hasPermission = normalizedRequired.includes(userRole);
    if (!hasPermission) {
      throw new ForbiddenException(
        `Acceso denegado: Se requiere rol [${requiredRoles.join(', ')}] pero el usuario tiene rol [${userRole}]`,
      );
    }

    return true;
  }
}
