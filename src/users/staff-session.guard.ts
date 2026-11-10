import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class StaffSessionGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException();
    const user = await this.users.userFromToken(token);
    if (user.role !== 'superadmin') throw new ForbiddenException('Se requiere SuperAdmin.');
    request.staffUser = user;
    return true;
  }
}

@Injectable()
export class MafSessionGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException();
    const user = await this.users.userFromToken(token);
    if (!['maf', 'superadmin'].includes(user.role)) throw new ForbiddenException('Se requiere acceso a MAF.');
    request.staffUser = user;
    return true;
  }
}
