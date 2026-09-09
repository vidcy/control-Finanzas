import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  health() {
    return { message: 'Finance API running 🚀' };
  }

  private async getCatalogUser(emailQuery?: string) {
    const targetEmail = (emailQuery || 'beaz.estileza@gmail.com').toLowerCase().trim();

    // 1. Try finding user with exact email or case-variations
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: targetEmail },
          { email: 'beaz.estileza@gmail.com' },
          { email: 'beaz.estileza@gmail.com' },
          { email: 'beaz.estileza@gmail.com' },
        ],
      },
    });

    if (user) return user;

    // 2. Fallback search by email containing estileza
    return this.prisma.user.findFirst({
      where: {
        email: {
          contains: 'estileza',
        },
      },
    });
  }

  @Get('catalog/products')
  async getCatalogProducts(@Query('email') email?: string) {
    const user = await this.getCatalogUser(email);
    if (!user) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        userId: user.id,
      },
      include: {
        presentations: true,
        brand: true,
        family: true,
        branchStocks: {
          include: {
            branch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('catalog/brands')
  async getCatalogBrands(@Query('email') email?: string) {
    const user = await this.getCatalogUser(email);
    if (!user) {
      return [];
    }

    return this.prisma.brand.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('catalog/families')
  async getCatalogFamilies(@Query('email') email?: string) {
    const user = await this.getCatalogUser(email);
    if (!user) {
      return [];
    }

    return this.prisma.family.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { name: 'asc' },
    });
  }
}
