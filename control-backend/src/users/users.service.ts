import { ConflictException, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CategoriesService } from 'src/category/category.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoriesService,
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
      },
    });
    //seed categories
    await this.categoryService.seedDefaultCategories(user.id);
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
}
