const fs = require('fs');
const path = require('path');

const backendPath = path.resolve(__dirname, '../../control-backend');

// 1. Patch users.controller.ts
const usersControllerPath = path.join(backendPath, 'src/users/users.controller.ts');
let usersController = fs.readFileSync(usersControllerPath, 'utf8');

// Replace all @Roles('ADMIN') with @Roles('ADMIN', 'SUPERADMIN')
usersController = usersController.replace(/@Roles\('ADMIN'\)/g, "@Roles('ADMIN', 'SUPERADMIN')");
fs.writeFileSync(usersControllerPath, usersController, 'utf8');
console.log('✅ users.controller.ts updated with @Roles("ADMIN", "SUPERADMIN")');

// 2. Patch role.guard.ts
const roleGuardPath = path.join(backendPath, 'src/auth/role.guard.ts');
const roleGuardContent = `import {
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
`;
fs.writeFileSync(roleGuardPath, roleGuardContent, 'utf8');
console.log('✅ role.guard.ts updated with bulletproof universal role checking');

// 3. Patch jwt.strategy.ts
const jwtStrategyPath = path.join(backendPath, 'src/auth/jwt.strategy.ts');
const jwtStrategyContent = `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Token inválido');
    }

    // Consultamos usuario en tiempo real en PostgreSQL para garantizar que el rol esté siempre actualizado
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        parentId: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Usuario no existe en la base de datos');
    }

    if (!dbUser.isActive) {
      throw new UnauthorizedException('Tu cuenta está desactivada');
    }

    return {
      id: dbUser.parentId || dbUser.id,
      workerId: dbUser.parentId ? dbUser.id : undefined,
      email: dbUser.email,
      role: dbUser.role, // Rol en tiempo real desde PostgreSQL
    };
  }
}
`;
fs.writeFileSync(jwtStrategyPath, jwtStrategyContent, 'utf8');
console.log('✅ jwt.strategy.ts updated to fetch live role and status from PostgreSQL');

// 4. Patch users.service.ts for orderBy and clean typing
const usersServicePath = path.join(backendPath, 'src/users/users.service.ts');
let usersService = fs.readFileSync(usersServicePath, 'utf8');

// Ensure listUser has orderBy
if (!usersService.includes("orderBy: { createdAt: 'desc' }")) {
  usersService = usersService.replace(
    /async listUser\(\) \{\s*return this\.prisma\.user\.findMany\(\{/g,
    "async listUser() {\n    return this.prisma.user.findMany({\n      orderBy: { createdAt: 'desc' },"
  );
  fs.writeFileSync(usersServicePath, usersService, 'utf8');
  console.log('✅ users.service.ts listUser updated with orderBy createdAt: desc');
}

// 5. Patch tsconfig.build.json
const tsconfigBuildPath = path.join(backendPath, 'tsconfig.build.json');
const tsconfigBuild = {
  extends: './tsconfig.json',
  compilerOptions: {
    rootDir: 'src'
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'test', 'dist', '**/*spec.ts']
};
fs.writeFileSync(tsconfigBuildPath, JSON.stringify(tsconfigBuild, null, 2), 'utf8');
console.log('✅ tsconfig.build.json updated with rootDir: src and include: src/**/*');
