import { Injectable, UnauthorizedException } from '@nestjs/common';
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
