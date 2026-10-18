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
    // 1. obtenemos roles requeridos desde @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // si no hay roles definidos, deja pasar
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. obtenemos usuario del request (viene del JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }
    //  console.log('user', user);

    // 3. validamos rol (SUPERADMIN tiene acceso total a todos los módulos)
    if (user.role === 'SUPERADMIN') {
      return true;
    }
    const hasRole = requiredRoles.includes(user.role) || (requiredRoles.includes('ADMIN') && user.role === 'SUPERADMIN');

    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos');
    }

    return true;
  }
}
