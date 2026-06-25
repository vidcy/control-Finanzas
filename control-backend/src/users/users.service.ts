import { ConflictException, Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CategoriesService } from 'src/category/category.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoriesService,
    private filesService: FilesService,
  ) {}
  async createUsers(data: any) {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Usuario ya existe');
    }

    // Split name into first and last name if lastName is not provided
    let firstName = data.name || '';
    let lastName = data.lastName || '';
    if (!lastName && firstName.includes(' ')) {
      const parts = firstName.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: firstName,
        lastName: lastName,
        email: data.email,
        password: hashedPassword,
        role: (data.role || 'USER') as 'ADMIN' | 'USER',
        profiles: data.profiles && data.profiles.length > 0 ? data.profiles : ['PERSONAL'],
        isActive: data.isActive !== undefined ? data.isActive : true,
        parentId: data.parentId || null,
      },
    });
    //seed categories only if it's not a worker user
    if (!user.parentId) {
      await this.categoryService.seedDefaultCategories(user.id);
    }
    return user;
  }
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
  async listUser() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        profiles: true,
        blockedProfiles: true,
        parentId: true,
      }
    });
  }
  async findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        password: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  async activeUserRequest(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
    return user;
  }
  async inactiveUserRequest(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return user;
  }
  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: data,
    });
  }
  async me(id: string) {
    // console.log("🔥 PROFILE SERVICE ID:", id);
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        profiles: true,
        blockedProfiles: true,
        personalAvatar: true,
        businessName: true,
        businessRuc: true,
        businessReason: true,
        businessRubro: true,
        businessLogo: true,
        businessBanner: true,
        parentId: true,
      },
    });
  }

  async updateMyProfile(id: string, data: any) {
    const allowedFields = [
      'name',
      'lastName',
      'personalAvatar',
      'businessName',
      'businessRuc',
      'businessReason',
      'businessRubro',
      'businessLogo',
      'businessBanner',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    // Validar RUC si se envía (11 dígitos numéricos en Perú)
    if (updateData.businessRuc !== undefined && updateData.businessRuc !== null) {
      const rucStr = String(updateData.businessRuc).trim();
      if (rucStr !== '') {
        if (!/^\d{11}$/.test(rucStr)) {
          throw new BadRequestException('El RUC debe tener exactamente 11 dígitos numéricos.');
        }
      }
    }

    // Obtener los datos actuales del usuario antes de actualizar para limpiar de Cloudinary si cambia/elimina imágenes
    const currentUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        personalAvatar: true,
        businessLogo: true,
        businessBanner: true,
      },
    });

    if (currentUser) {
      // 1. Foto de perfil personal (personalAvatar)
      if (
        updateData.personalAvatar !== undefined &&
        currentUser.personalAvatar &&
        updateData.personalAvatar !== currentUser.personalAvatar
      ) {
        this.filesService.deleteFile(currentUser.personalAvatar).catch((err) =>
          console.error('Error deleting old personalAvatar:', err),
        );
      }
      // 2. Logo del negocio (businessLogo)
      if (
        updateData.businessLogo !== undefined &&
        currentUser.businessLogo &&
        updateData.businessLogo !== currentUser.businessLogo
      ) {
        this.filesService.deleteFile(currentUser.businessLogo).catch((err) =>
          console.error('Error deleting old businessLogo:', err),
        );
      }
      // 3. Banner del negocio (businessBanner)
      if (
        updateData.businessBanner !== undefined &&
        currentUser.businessBanner &&
        updateData.businessBanner !== currentUser.businessBanner
      ) {
        this.filesService.deleteFile(currentUser.businessBanner).catch((err) =>
          console.error('Error deleting old businessBanner:', err),
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        profiles: true,
        blockedProfiles: true,
        personalAvatar: true,
        businessName: true,
        businessRuc: true,
        businessReason: true,
        businessRubro: true,
        businessLogo: true,
        businessBanner: true,
      },
    });
  }

  async updateProfiles(id: string, profiles: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { blockedProfiles: true } });
    if (user?.blockedProfiles) {
      const blocked = user.blockedProfiles as string[];
      for (const p of profiles) {
        if (blocked.includes(p)) {
          throw new ForbiddenException("El módulo fue desabilitado, comuníquese con soporte-think@ccoplex.com o al 912509111");
        }
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { profiles },
      select: {
        id: true,
        profiles: true,
      },
    });
  }

  async listWorkers(ownerId: string) {
    return this.prisma.user.findMany({
      where: { parentId: ownerId },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        profiles: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWorker(ownerId: string, data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('Usuario/trabajador ya existe con este correo');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        name: data.name,
        lastName: data.lastName || '',
        email: data.email,
        password: hashedPassword,
        role: 'USER',
        profiles: data.profiles || [],
        branchId: data.branchId || null,
        parentId: ownerId,
        isActive: true,
      },
    });
  }

  async updateWorker(ownerId: string, id: string, data: any) {
    const worker = await this.prisma.user.findFirst({
      where: { id, parentId: ownerId },
    });
    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const updateData: any = {
      name: data.name,
      lastName: data.lastName,
      profiles: data.profiles,
      branchId: data.branchId || null,
      isActive: data.isActive !== undefined ? data.isActive : worker.isActive,
    };

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteWorker(ownerId: string, id: string) {
    const worker = await this.prisma.user.findFirst({
      where: { id, parentId: ownerId },
    });
    if (!worker) {
      throw new NotFoundException('Trabajador no encontrado');
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
