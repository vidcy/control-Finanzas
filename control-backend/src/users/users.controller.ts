import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Param,
  Inject,
  forwardRef,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { Roles } from 'src/auth/role.decorator';
import { RolesGuard } from 'src/auth/role.guard';
import { AuthService } from '../auth/auth.service';
import { MailService } from 'src/mail/mail.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    // 1. Validar correo electrónico
    const email = (body.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Correo electrónico inválido');
    }

    // 2. Validar contraseña
    const password = body.password || '';
    if (password.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos una letra mayúscula',
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos una letra minúscula',
      );
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos un número',
      );
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new BadRequestException(
        'La contraseña debe incluir al menos un carácter especial (ej: !@#$%)',
      );
    }

    // 3. Verificar si el correo ya está registrado
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      if (!existingUser.isActive) {
        // Cuenta existe pero no está activada → reenviar correo
        const activationToken = this.authService.generateActivationToken(
          existingUser.email,
        );
        try {
          await this.mailService.sendActivationEmail(
            existingUser.email,
            activationToken,
          );
        } catch (mailError) {
          console.error('Error reenviando correo de activación:', mailError);
        }
        return {
          message:
            'Tu cuenta ya fue registrada pero aún no está activa. Hemos reenviado el correo de activación a tu bandeja.',
          activationRequired: true,
          alreadyExists: true,
        };
      } else {
        // Cuenta existe y está activa → indicar que inicie sesión
        throw new BadRequestException(
          'Este correo ya está registrado y activo. Por favor inicia sesión.',
        );
      }
    }

    // 4. Crear usuario inactivo por defecto para registro público
    body.email = email;
    body.isActive = false;
    const user = await this.usersService.createUsers(body);

    // 5. Generar token y enviar correo de activación
    const activationToken = this.authService.generateActivationToken(
      user.email,
    );
    try {
      await this.mailService.sendActivationEmail(user.email, activationToken);
    } catch (mailError) {
      console.error('Error enviando correo de activación:', mailError);
    }

    return {
      message:
        'Usuario registrado correctamente. Por favor verifica tu correo para activar tu cuenta.',
      activationRequired: true,
      alreadyExists: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profiles: user.profiles,
      },
    };
  }

  @Post('activate')
  async activate(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('El token de activación es requerido');
    }
    const payload = this.authService.verifyActivationToken(token);
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new BadRequestException('El usuario no existe');
    }
    await this.usersService.activeUserRequest(user.id);
    return {
      message: 'Cuenta activada correctamente. Ya puedes iniciar sesión.',
    };
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  createUsers(@Body() body: any) {
    return this.usersService.createUsers(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  listUser(@Req() req) {
    // console.log('USER EN REQUEST:', req.user);
    return this.usersService.listUser();
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const userId = req.user.workerId || req.user.id;
    const user = await this.usersService.me(userId);
    if (req.user.workerId && user) {
      const parent = await this.usersService.me(req.user.id);
      return {
        ...user,
        businessName: parent?.businessName,
        businessRuc: parent?.businessRuc,
        businessReason: parent?.businessReason,
        businessRubro: parent?.businessRubro,
        businessLogo: parent?.businessLogo,
        businessBanner: parent?.businessBanner,
        agentRoleSingular: parent?.agentRoleSingular,
        agentRolePlural: parent?.agentRolePlural,
        defaultCommissionModel: parent?.defaultCommissionModel,
        hasElectronicBilling: parent?.hasElectronicBilling,
        nubefactUrl: parent?.nubefactUrl,
        nubefactToken: parent?.nubefactToken,
      };
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profiles')
  updateProfiles(@Req() req, @Body('profiles') profiles: string[]) {
    const userId = req.user.workerId || req.user.id;
    return this.usersService.updateProfiles(userId, profiles);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  updateMyProfile(@Req() req, @Body() body: any) {
    const userId = req.user.workerId || req.user.id;
    return this.usersService.updateMyProfile(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('workers')
  listWorkers(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.usersService.listWorkers(ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('workers')
  createWorker(@Req() req, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.usersService.createWorker(ownerId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('workers/:id')
  updateWorker(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.usersService.updateWorker(ownerId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('workers/:id')
  deleteWorker(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.usersService.deleteWorker(ownerId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findUser(@Param('id') id: string) {
    return this.usersService.findUser(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/active')
  activeUserRequest(@Param('id') id: string) {
    return this.usersService.activeUserRequest(id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/inactive')
  inactiveUserRequest(@Param('id') id: string) {
    return this.usersService.inactiveUserRequest(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/document/:type/:number')
  async queryDocument(@Param('type') type: string, @Param('number') number: string) {
    try {
      let url = '';
      if (type.toUpperCase() === 'DNI') {
        url = `https://api.apis.net.pe/v1/dni?numero=${number}`;
      } else if (type.toUpperCase() === 'RUC') {
        url = `https://api.apis.net.pe/v1/ruc?numero=${number}`;
      } else {
        throw new BadRequestException('Tipo de documento no soportado para consulta automática');
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('No se pudo obtener información del documento');
      }
      
      const data: any = await response.json();
      
      return {
        success: true,
        nombre: data.nombre || data.razonSocial,
        direccion: data.direccion || '',
        data
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
