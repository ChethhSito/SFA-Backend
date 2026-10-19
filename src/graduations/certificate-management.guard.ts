import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class CertificateManagementGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user;
    // Only claims verified by Firebase Admin are authoritative for document registration.
    if (!user?.uid || !['mge', 'administrador', 'superadmin'].includes(user.role)) {
      throw new ForbiddenException('La cuenta Firebase debe tener un rol autorizado de MGE en sus claims para gestionar certificados.');
    }
    return true;
  }
}
