import { Controller, Get, Query, Param } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return { message: 'Finance API running 🚀' };
  }

  private async getCatalogUser(queryOrParam?: string) {
    const raw = (queryOrParam || '').trim();
    const isVeazFlagship =
      !raw ||
      raw.toLowerCase() === 'veaz-estileza' ||
      raw.toLowerCase() === 'estileza' ||
      raw.toLowerCase() === 'beaz.estileza@gmail.com';

    if (isVeazFlagship) {
      try {
        const users: any[] = await this.prisma.$queryRawUnsafe(
          `SELECT * FROM "User" WHERE LOWER(email) LIKE '%estileza%' OR LOWER(email) = 'beaz.estileza@gmail.com' LIMIT 1`
        );
        if (users && users.length > 0) return users[0];
      } catch (e) {}

      try {
        const fallback: any[] = await this.prisma.$queryRawUnsafe(
          `SELECT * FROM "User" WHERE "isActive" = true ORDER BY "createdAt" ASC LIMIT 1`
        );
        return fallback && fallback.length > 0 ? fallback[0] : null;
      } catch (e) {
        return null;
      }
    }

    try {
      const matched: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "User" 
         WHERE "id" = $1 
            OR LOWER(email) = LOWER($1) 
            OR LOWER(email) LIKE LOWER($1 || '@%')
            OR LOWER("businessName") = LOWER($1)
            OR LOWER(COALESCE("businessSlug", '')) = LOWER($1)
            OR LOWER("businessName") LIKE LOWER('%' || $1 || '%')
         LIMIT 1`,
        raw
      );
      return matched && matched.length > 0 ? matched[0] : null;
    } catch (e) {
      return null;
    }
  }

  @Get('catalog/store-info')
  async getStoreInfoQuery(
    @Query('identifier') identifier?: string,
    @Query('email') email?: string,
  ) {
    return this.resolveStoreInfo(identifier || email);
  }

  @Get('catalog/store-info/:identifier')
  async getStoreInfoParam(@Param('identifier') identifier: string) {
    return this.resolveStoreInfo(identifier);
  }

  private async resolveStoreInfo(identifier?: string) {
    const user: any = await this.getCatalogUser(identifier);
    if (!user) {
      return {
        notFound: true,
        businessName: 'Catálogo Digital',
        businessRubro: 'Moda y Calzados',
        isOfficialStore: false,
      };
    }

    const isOfficial =
      (user.email && user.email.toLowerCase().includes('estileza')) ||
      identifier === 'veaz-estileza';

    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      businessName: user.businessName || `${user.name} ${user.lastName}`,
      businessReason: user.businessReason || '',
      businessRubro: user.businessRubro || 'Calzados, Moda y Accesorios',
      businessLogo: user.businessLogo || null,
      businessBanner: user.businessBanner || null,
      businessSlug: user.businessSlug || null,
      catalogConfig: user.catalogConfig || null,
      isOfficialStore: isOfficial,
    };
  }

  @Get('catalog/products')
  async getCatalogProducts(
    @Query('identifier') identifier?: string,
    @Query('email') email?: string,
  ) {
    const user: any = await this.getCatalogUser(identifier || email);
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
        variants: true,
        seriesCurves: true,
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
  async getCatalogBrands(
    @Query('identifier') identifier?: string,
    @Query('email') email?: string,
  ) {
    const user: any = await this.getCatalogUser(identifier || email);
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
  async getCatalogFamilies(
    @Query('identifier') identifier?: string,
    @Query('email') email?: string,
  ) {
    const user: any = await this.getCatalogUser(identifier || email);
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
