import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new UnauthorizedException('Usuario no existe');

    // Check trial expiration
    if (user.isSelfRegistered && user.trialEndsAt && new Date() > new Date(user.trialEndsAt)) {
      if (user.isActive) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });
      }
      throw new UnauthorizedException(
        'Tu período de prueba de 30 días ha vencido. Por favor, comunícate con el administrador para adquirir una licencia.',
      );
    }

    // ✅ Check account activation BEFORE password so the error is clear
    if (!user.isActive)
      throw new UnauthorizedException(
        'Tu cuenta no está activa. Por favor, revisa tu correo y haz clic en el enlace de activación.',
      );

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Contraseña incorrecta');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      parentId: user.parentId,
    };
    const token = this.jwtService.sign(payload);
    return {
      message: 'Usuario logueado correctamente',
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profiles: user.profiles || [],
      },
    };
  }

  generateActivationToken(email: string): string {
    return this.jwtService.sign({ email }, { expiresIn: '24h' });
  }

  verifyActivationToken(token: string): { email: string } {
    try {
      return this.jwtService.verify(token);
    } catch (err) {
      throw new BadRequestException('Token de activación inválido o expirado');
    }
  }

  generateTokenForUser(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      parentId: user.parentId,
    };
    return this.jwtService.sign(payload);
  }
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        message:
          'Si el correo existe, se enviará un enlace para restablecer la contraseña',
      };
    }
    const resetToken = crypto.randomUUID();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetToken,
        resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 15), // 15 min}
      },
    });
    await this.mailService.sendResetPassword(email, resetToken);
    return {
      message:
        'Se ha enviado un enlace a tu correo para restablecer la contraseña',
      token: resetToken,
    };
  }
  private validatePasswordStrength(password: string) {
    const pwd = password || '';
    if (pwd.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }
    if (!/[A-Z]/.test(pwd)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos una letra mayúscula',
      );
    }
    if (!/[a-z]/.test(pwd)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos una letra minúscula',
      );
    }
    if (!/[0-9]/.test(pwd)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos un número',
      );
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos un carácter especial (ej: !@#$%)',
      );
    }
  }

  async resetPassword(token: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });
    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    return {
      message: 'Contraseña restablecida correctamente',
    };
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    this.validatePasswordStrength(newPassword);

    const user = await this.usersService.findUser(id);
    console.log('USER FROM DB 👉', user);
    if (!user) {
      throw new UnauthorizedException('Usuario no existe');
    }
    if (!user.password) {
      throw new UnauthorizedException('Usuario no tiene contraseña');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Password incorrecto');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
    return {
      message: 'Contraseña cambiada correctamente',
    };
  }
  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
