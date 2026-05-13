import { ConflictException, Injectable } from '@nestjs/common';
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
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role as 'ADMIN' | 'USER',
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
    return this.prisma.user.findMany();
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
      },
    });
  }
}
