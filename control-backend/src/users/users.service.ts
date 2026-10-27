import {
  ConflictException,
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
        profiles:
          data.profiles && data.profiles.length > 0
            ? data.profiles
            : ['PERSONAL'],
        blockedProfiles: data.blockedProfiles || [],
        hasElectronicBilling: !!data.hasElectronicBilling,
        taxRegime: data.taxRegime || 'GENERAL_18',
        igvRate: data.taxRegime === 'AMAZONIA_0' || data.taxRegime === 'EXONERADO_0' || data.taxRegime === 'INAFECTO_0' ? 0.00 : (data.taxRegime === 'RESTAURANTE_10' ? 10.00 : 18.00),
        businessDepartment: data.businessDepartment || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        parentId: data.parentId || null,
        isSelfRegistered: data.isSelfRegistered || false,
        trialEndsAt: data.isSelfRegistered
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
          : null,
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
        hasElectronicBilling: true,
        taxRegime: true, // in listUser
        businessDepartment: true,
      },
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

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('No se puede eliminar a un usuario administrador');
    }

    // Cascade cleanup if necessary before deletion
    await this.prisma.category.deleteMany({ where: { userId: id } });
    await this.prisma.product.deleteMany({ where: { userId: id } });
    await this.prisma.branch.deleteMany({ where: { userId: id } });

    return this.prisma.user.delete({
      where: { id },
    });
  }
  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.profiles !== undefined) updateData.profiles = data.profiles;
    if (data.blockedProfiles !== undefined) updateData.blockedProfiles = data.blockedProfiles;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
    if (data.hasElectronicBilling !== undefined) updateData.hasElectronicBilling = !!data.hasElectronicBilling;
    if (data.taxRegime !== undefined) updateData.taxRegime = data.taxRegime;
    if (data.igvRate !== undefined) updateData.igvRate = Number(data.igvRate);
    if (data.businessDepartment !== undefined) updateData.businessDepartment = data.businessDepartment;
    if (data.nubefactUrl !== undefined) updateData.nubefactUrl = data.nubefactUrl;
    if (data.nubefactToken !== undefined) updateData.nubefactToken = data.nubefactToken;
    if (data.password && String(data.password).trim() !== '') {
      updateData.password = await bcrypt.hash(String(data.password).trim(), 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }
  async me(id: string) {
    // console.log("🔥 PROFILE SERVICE ID:", id);
    const user = await this.prisma.user.findUnique({
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
        businessSlug: true,
        catalogConfig: true,
        parentId: true,
        advisorLabel: true,
        agentRoleSingular: true,
        agentRolePlural: true,
        defaultCommissionModel: true,
        hasElectronicBilling: true,
        nubefactUrl: true,
        nubefactToken: true,
        isSelfRegistered: true,
        trialEndsAt: true,
        taxRegime: true,
        igvRate: true,
        businessDepartment: true,
        businessProvince: true,
        businessDistrict: true,
        businessAddress: true,
        businessPhone: true,
        businessEmail: true,
        billingSerieInvoice: true,
        billingSerieBoleta: true,
      },
    });

    if (user) {
      try {
        const extra: any = await this.prisma.$queryRawUnsafe(
          'SELECT "businessSlug", "catalogConfig" FROM "User" WHERE "id" = $1',
          id,
        );
        if (extra && extra.length > 0) {
          (user as any).businessSlug = extra[0].businessSlug;
          (user as any).catalogConfig = extra[0].catalogConfig;
        }
      } catch (e: any) {
        // Ignored or logged
      }
    }

    if (user && user.isSelfRegistered && user.trialEndsAt && new Date() > new Date(user.trialEndsAt)) {
      if (user.isActive) {
        await this.prisma.user.update({
          where: { id },
          data: { isActive: false },
        });
      }
      throw new ForbiddenException(
        'Tu período de prueba de 30 días ha vencido. Por favor, comunícate con el administrador para adquirir una licencia.',
      );
    }

    return user;
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
      'advisorLabel',
      'agentRoleSingular',
      'agentRolePlural',
      'defaultCommissionModel',
      'nubefactUrl',
      'nubefactToken',
      'catalogConfig',
      'businessAddress',
      'businessPhone',
      'businessEmail',
      'businessDepartment',
      'businessProvince',
      'businessDistrict',
      'billingSerieInvoice',
      'billingSerieBoleta',
      'hasElectronicBilling',
      'taxRegime',
      'igvRate',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    // Clean and validate businessSlug
    if (data.businessSlug !== undefined) {
      const cleanSlug = data.businessSlug
        ? String(data.businessSlug)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
        : null;

      if (cleanSlug) {
        const existing = await this.prisma.user.findFirst({
          where: {
            businessSlug: cleanSlug,
            NOT: { id },
          },
        });
        if (existing) {
          throw new BadRequestException(
            'El enlace público / slug ya está en uso por otra tienda.',
          );
        }
      }
      updateData.businessSlug = cleanSlug;
    }

    // Validar RUC si se envía (11 dígitos numéricos en Perú)
    if (
      updateData.businessRuc !== undefined &&
      updateData.businessRuc !== null
    ) {
      const rucStr = String(updateData.businessRuc).trim();
      if (rucStr !== '') {
        if (!/^[0-9]{11}$/.test(rucStr)) {
          throw new BadRequestException(
            'El RUC debe tener exactamente 11 dígitos numéricos.',
          );
        }
      }
    }

    // Obtener los datos actuales del usuario antes de actualizar para limpiar de DigitalOcean Spaces si cambia/elimina imágenes
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
        this.filesService
          .deleteFile(currentUser.personalAvatar)
          .catch((err) =>
            console.error('Error deleting old personalAvatar:', err),
          );
      }
      // 2. Logo del negocio (businessLogo)
      if (
        updateData.businessLogo !== undefined &&
        currentUser.businessLogo &&
        updateData.businessLogo !== currentUser.businessLogo
      ) {
        this.filesService
          .deleteFile(currentUser.businessLogo)
          .catch((err) =>
            console.error('Error deleting old businessLogo:', err),
          );
      }
      // 3. Banner del negocio (businessBanner)
      if (
        updateData.businessBanner !== undefined &&
        currentUser.businessBanner &&
        updateData.businessBanner !== currentUser.businessBanner
      ) {
        this.filesService
          .deleteFile(currentUser.businessBanner)
          .catch((err) =>
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
        businessSlug: true,
        catalogConfig: true,
        advisorLabel: true,
        agentRoleSingular: true,
        agentRolePlural: true,
        defaultCommissionModel: true,
        hasElectronicBilling: true,
        nubefactUrl: true,
        nubefactToken: true,
      },
    });
  }

  async updateProfiles(id: string, profiles: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { blockedProfiles: true },
    });
    if (user?.blockedProfiles) {
      const blocked = user.blockedProfiles as string[];
      for (const p of profiles) {
        if (blocked.includes(p)) {
          throw new ForbiddenException(
            'El módulo fue desabilitado, comuníquese con soporte-think@ccoplex.com o al 912509111',
          );
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
      throw new ConflictException(
        'Usuario/trabajador ya existe con este correo',
      );
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

    const [salesCount, cashShiftsCount, transactionsCount, inventoryMovementsCount] = await Promise.all([
      this.prisma.sale.count({ where: { userId: id } }),
      this.prisma.cashShift.count({ where: { userId: id } }),
      this.prisma.transaction.count({ where: { userId: id } }),
      this.prisma.inventoryMovement.count({ where: { userId: id } }),
    ]);

    const reasons: string[] = [];
    if (salesCount > 0) reasons.push(`${salesCount} venta(s)`);
    if (cashShiftsCount > 0) reasons.push(`${cashShiftsCount} turno(s) de caja`);
    if (transactionsCount > 0) reasons.push(`${transactionsCount} transacción(es)`);
    if (inventoryMovementsCount > 0) reasons.push(`${inventoryMovementsCount} movimiento(s) de inventario`);

    if (reasons.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el trabajador porque tiene registros asociados: ${reasons.join(', ')}. Puede desactivar su cuenta en lugar de eliminarla.`,
      );
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
