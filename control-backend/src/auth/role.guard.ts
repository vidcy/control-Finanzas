import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtenemos roles requeridos desde @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles definidos, permite el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Obtenemos usuario del request (inyectado por JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const userRole = String(user.role || '').trim().toUpperCase();

    // 3. SUPERADMIN tiene acceso total e irrestricto
    if (userRole === 'SUPERADMIN') {
      return true;
    }

    // 4. Validar si el rol del usuario cumple con alguno de los roles requeridos
    const hasRole = requiredRoles.some((r) => {
      const reqRole = String(r).trim().toUpperCase();
      if (reqRole === userRole) return true;
      if (reqRole === 'ADMIN' && (userRole === 'SUPERADMIN' || userRole === 'ADMIN')) return true;
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos suficientes');
    }

    return true;
  }
}
