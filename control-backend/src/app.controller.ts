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
        const users: any[] = await this.prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: 'estileza', mode: 'insensitive' } },
              { email: 'beaz.estileza@gmail.com' },
            ],
          },
          take: 1,
        });
        if (users && users.length > 0) return users[0];
      } catch (e) {}

      try {
        const fallback = await this.prisma.user.findFirst({
          where: { isActive: true, email: { contains: 'estileza', mode: 'insensitive' } },
        });
        if (fallback) return fallback;
      } catch (e) {}

      return null;
    }

    try {
      const cleanRaw = raw.trim();
      const lowerRaw = cleanRaw.toLowerCase();
      const slugifiedRaw = lowerRaw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      let user: any = null;

      // 1. Match by exact businessSlug (safely with try/catch in case of VPS schema cache)
      try {
        user = await this.prisma.user.findFirst({
          where: { businessSlug: { equals: cleanRaw, mode: 'insensitive' } },
        });
      } catch (e) {
        try {
          const rawSlug: any = await this.prisma.$queryRawUnsafe(
            'SELECT * FROM "User" WHERE LOWER("businessSlug") = LOWER($1) LIMIT 1',
            cleanRaw,
          );
          if (rawSlug && rawSlug.length > 0) user = rawSlug[0];
        } catch (err) {}
      }

      // 2. Match by user ID (UUID)
      if (!user) {
        try {
          user = await this.prisma.user.findFirst({
            where: { id: cleanRaw },
          });
        } catch (e) {}
      }

      // 3. Match by email or email prefix
      if (!user) {
        try {
          user = await this.prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: cleanRaw, mode: 'insensitive' } },
                { email: { startsWith: cleanRaw + '@', mode: 'insensitive' } },
              ],
            },
          });
        } catch (e) {}
      }

      // 4. Match by exact businessName
      if (!user) {
        try {
          user = await this.prisma.user.findFirst({
            where: { businessName: { equals: cleanRaw, mode: 'insensitive' } },
          });
        } catch (e) {}
      }

      // 5. Match by slugified businessName or slug
      if (!user && slugifiedRaw) {
        try {
          const users = await this.prisma.user.findMany({
            where: { isActive: true, businessName: { not: null } },
            select: { id: true, businessName: true, businessSlug: true },
          });
          const matched = users.find((u) => {
            if (u.businessSlug && u.businessSlug.toLowerCase() === slugifiedRaw) return true;
            if (u.businessName) {
              const bSlug = u.businessName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
              if (bSlug === slugifiedRaw || bSlug.includes(slugifiedRaw) || slugifiedRaw.includes(bSlug)) {
                return true;
              }
            }
            return false;
          });
          if (matched) {
            user = await this.prisma.user.findUnique({ where: { id: matched.id } });
          }
        } catch (e) {}
      }

      // 6. Partial match on businessName if cleanRaw has at least 3 characters
      if (!user && cleanRaw.length >= 3) {
        try {
          user = await this.prisma.user.findFirst({
            where: { businessName: { contains: cleanRaw, mode: 'insensitive' } },
          });
        } catch (e) {}
      }

      // If user is a worker/branch account, resolve to the store owner
      if (user && user.parentId) {
        const parentUser = await this.prisma.user.findUnique({
          where: { id: user.parentId },
        });
        if (parentUser) {
          user = parentUser;
        }
      }

      return user || null;
    } catch (e) {
      console.error('Error resolving catalog user:', e);
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
        businessRubro: 'Comercio General',
        isOfficialStore: false,
      };
    }

    const isOfficial =
      (user.email && user.email.toLowerCase().includes('estileza')) ||
      (identifier || '').toLowerCase() === 'veaz-estileza';

    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      businessName: user.businessName || `${user.name} ${user.lastName}`,
      businessReason: user.businessReason || '',
      businessRubro: user.businessRubro || 'Comercio General',
      businessLogo: user.businessLogo || null,
      businessBanner: user.businessBanner || null,
      businessSlug: user.businessSlug || null,
      businessPhone: user.businessPhone || null,
      businessAddress: user.businessAddress || null,
      businessDepartment: user.businessDepartment || null,
      businessProvince: user.businessProvince || null,
      businessDistrict: user.businessDistrict || null,
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

    const ownerId = user.parentId || user.id;

    return this.prisma.product.findMany({
      where: {
        userId: ownerId,
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

    const ownerId = user.parentId || user.id;

    return this.prisma.brand.findMany({
      where: {
        userId: ownerId,
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

    const ownerId = user.parentId || user.id;

    return this.prisma.family.findMany({
      where: {
        userId: ownerId,
      },
      orderBy: { name: 'asc' },
    });
  }
}
