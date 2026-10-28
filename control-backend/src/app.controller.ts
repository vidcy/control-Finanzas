import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return { message: 'Finance API running 🚀' };
  }

  private async getCatalogUser(rawIdentifier?: string, req?: any) {
    const raw = (rawIdentifier || '').trim();

    // 0. Extract logged-in userId from JWT Authorization header if available
    let tokenUserId: string | null = null;
    if (req?.headers?.authorization) {
      const authHeader = String(req.headers.authorization);
      if (authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice(7).trim();
          const parts = token.split('.');
          if (parts.length === 3) {
            const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);
            tokenUserId = payload.sub || payload.id || payload.userId || null;
          }
        } catch (e) {}
      }
    }

    const lowerRaw = raw.toLowerCase();

    // 1. If query is 'mi-tienda' or 'catalogo' or empty, and user is logged in, resolve directly to their store
    if ((!raw || lowerRaw === 'mi-tienda' || lowerRaw === 'catalogo') && tokenUserId) {
      try {
        let loggedUser: any = await this.prisma.user.findUnique({ where: { id: tokenUserId } });
        if (loggedUser) {
          if (loggedUser.parentId) {
            const parent = await this.prisma.user.findUnique({ where: { id: loggedUser.parentId } });
            if (parent) loggedUser = parent;
          }
          await this.enrichUserCatalogData(loggedUser);
          return loggedUser;
        }
      } catch (e) {}
    }

    // If identifier is completely empty and no logged-in user, return null (DO NOT fallback to Veaz)
    if (!raw) return null;

    // 2. Veaz Estileza flagship boutique - ONLY for explicit Veaz identifiers
    const isVeazFlagship =
      lowerRaw === 'veaz-estileza' ||
      lowerRaw === 'estileza' ||
      lowerRaw === 'beaz.estileza@gmail.com';

    if (isVeazFlagship) {
      try {
        const users: any[] = await this.prisma.user.findMany({
          where: {
            OR: [
              { email: 'beaz.estileza@gmail.com' },
              { email: { contains: 'estileza', mode: 'insensitive' } },
            ],
          },
          take: 1,
        });
        if (users && users.length > 0) {
          await this.enrichUserCatalogData(users[0]);
          return users[0];
        }
      } catch (e) {}
      return null;
    }

    try {
      const slugifiedRaw = lowerRaw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      let user: any = null;

      // 3. Match by exact UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
      if (isUuid) {
        try {
          user = await this.prisma.user.findUnique({ where: { id: raw } });
          if (user) {
            if (user.parentId) {
              const parent = await this.prisma.user.findUnique({ where: { id: user.parentId } });
              user = parent || user;
            }
            await this.enrichUserCatalogData(user);
            return user;
          }
        } catch (e) {}
      }

      // 4. Match by exact businessSlug
      try {
        user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { businessSlug: { equals: raw, mode: 'insensitive' } },
              { businessSlug: { equals: slugifiedRaw, mode: 'insensitive' } },
            ],
          },
        });
      } catch (e) {
        try {
          const rawSlug: any = await this.prisma.$queryRawUnsafe(
            'SELECT * FROM "User" WHERE LOWER("businessSlug") = LOWER($1) OR LOWER("businessSlug") = LOWER($2) LIMIT 1',
            raw,
            slugifiedRaw,
          );
          if (rawSlug && rawSlug.length > 0) user = rawSlug[0];
        } catch (err) {}
      }

      // 5. Match by exact email or email prefix (e.g. david@gmail.com or 'david')
      if (!user) {
        try {
          user = await this.prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: raw, mode: 'insensitive' } },
                { email: { startsWith: raw + '@', mode: 'insensitive' } },
                { email: { startsWith: slugifiedRaw + '@', mode: 'insensitive' } },
              ],
            },
          });
        } catch (e) {}
      }

      // 6. Match by exact businessName or businessReason (with spaces or normalized)
      if (!user) {
        try {
          const withSpaces = slugifiedRaw.replace(/-/g, ' ');
          user = await this.prisma.user.findFirst({
            where: {
              OR: [
                { businessName: { equals: raw, mode: 'insensitive' } },
                { businessName: { equals: slugifiedRaw, mode: 'insensitive' } },
                { businessName: { equals: withSpaces, mode: 'insensitive' } },
                { businessReason: { equals: raw, mode: 'insensitive' } },
                { businessReason: { equals: slugifiedRaw, mode: 'insensitive' } },
                { businessReason: { equals: withSpaces, mode: 'insensitive' } },
              ],
            },
          });
        } catch (e) {}
      }

      // 7. Strict normalized slug comparison against all merchants
      if (!user) {
        try {
          const toSlug = (text?: string | null) => {
            if (!text) return '';
            return String(text)
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
          };

          const allUsers = await this.prisma.user.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              lastName: true,
              businessName: true,
              businessSlug: true,
              businessReason: true,
              parentId: true,
            },
          });

          // Exclude flagship Veaz unless requested explicitly
          const candidates = allUsers.filter((u) => {
            const em = (u.email || '').toLowerCase();
            return !em.includes('estileza') && em !== 'beaz.estileza@gmail.com';
          });

          // Match exact slug of businessName, businessSlug, businessReason, or full name
          const matched = candidates.find((u) => {
            if (u.businessSlug && toSlug(u.businessSlug) === slugifiedRaw) return true;
            if (u.businessName && toSlug(u.businessName) === slugifiedRaw) return true;
            if (u.businessReason && toSlug(u.businessReason) === slugifiedRaw) return true;
            const fullName = ((u.name || '') + ' ' + (u.lastName || '')).trim();
            if (fullName && toSlug(fullName) === slugifiedRaw) return true;
            if (u.email) {
              const prefix = u.email.split('@')[0];
              if (toSlug(prefix) === slugifiedRaw) return true;
            }
            return false;
          });

          if (matched) {
            user = await this.prisma.user.findUnique({ where: { id: matched.id } });
            // Safely set businessSlug if it was null
            if (user && !user.businessSlug && slugifiedRaw && slugifiedRaw.length <= 50) {
              try {
                await this.prisma.user.update({
                  where: { id: user.id },
                  data: { businessSlug: slugifiedRaw },
                });
                user.businessSlug = slugifiedRaw;
              } catch (err) {}
            }
          }
        } catch (e) {
          console.error('Error in slug resolution:', e);
        }
      }

      // If user is a worker, resolve to parent owner
      if (user && user.parentId) {
        const parentUser = await this.prisma.user.findUnique({
          where: { id: user.parentId },
        });
        if (parentUser) user = parentUser;
      }

      if (user) {
        await this.enrichUserCatalogData(user);
      }

      return user || null;
    } catch (e) {
      console.error('Error resolving catalog user:', e);
      return null;
    }
  }

  private async enrichUserCatalogData(user: any) {
    if (!user) return;
    if (!user.catalogConfig || !user.businessSlug) {
      try {
        const extra: any = await this.prisma.$queryRawUnsafe(
          'SELECT "catalogConfig", "businessSlug" FROM "User" WHERE "id" = $1',
          user.id,
        );
        if (extra && extra.length > 0) {
          if (extra[0].catalogConfig && !user.catalogConfig) {
            user.catalogConfig = extra[0].catalogConfig;
          }
          if (extra[0].businessSlug && !user.businessSlug) {
            user.businessSlug = extra[0].businessSlug;
          }
        }
      } catch (e) {}
    }
  }

  @Get('catalog/store-info')
  async getStoreInfoQuery(
    @Query('identifier') identifier?: string,
    @Query('email') email?: string,
    @Req() req?: any,
  ) {
    return this.resolveStoreInfo(identifier || email, req);
  }

  @Get('catalog/store-info/:identifier')
  async getStoreInfoParam(@Param('identifier') identifier: string, @Req() req?: any) {
    return this.resolveStoreInfo(identifier, req);
  }

  private async resolveStoreInfo(identifier?: string, req?: any) {
    const user: any = await this.getCatalogUser(identifier, req);
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

    const displayName =
      user.businessName ||
      [user.name, user.lastName].filter(Boolean).join(' ').trim() ||
      'Catálogo Oficial';

    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      businessName: displayName,
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
      notFound: false,
    };
  }

  @Get('catalog/products')
  async getCatalogProducts(
    @Query('identifier') identifier?: string,
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Req() req?: any,
  ) {
    return this.resolveCatalogProducts(userId || identifier || email, req);
  }

  @Get('catalog/products/:identifier')
  async getCatalogProductsParam(@Param('identifier') identifier: string, @Req() req?: any) {
    return this.resolveCatalogProducts(identifier, req);
  }

  private async resolveCatalogProducts(identifier?: string, req?: any) {
    const user: any = await this.getCatalogUser(identifier, req);
    if (!user) {
      return [];
    }

    const ownerId = user.parentId || user.id;

    try {
      return await this.prisma.product.findMany({
        where: {
          userId: ownerId,
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
    } catch (eFull) {
      try {
        return await this.prisma.product.findMany({
          where: {
            userId: ownerId,
          },
          include: {
            presentations: true,
            brand: true,
            family: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (eBasic) {
        console.error('Error fetching catalog products:', eBasic);
        return [];
      }
    }
  }

  @Get('catalog/brands')
  async getCatalogBrands(
    @Query('identifier') identifier?: string,
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Req() req?: any,
  ) {
    return this.resolveCatalogBrands(userId || identifier || email, req);
  }

  @Get('catalog/brands/:identifier')
  async getCatalogBrandsParam(@Param('identifier') identifier: string, @Req() req?: any) {
    return this.resolveCatalogBrands(identifier, req);
  }

  private async resolveCatalogBrands(identifier?: string, req?: any) {
    const user: any = await this.getCatalogUser(identifier, req);
    if (!user) {
      return [];
    }

    const ownerId = user.parentId || user.id;

    try {
      return await this.prisma.brand.findMany({
        where: {
          userId: ownerId,
        },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      return [];
    }
  }

  @Get('catalog/families')
  async getCatalogFamilies(
    @Query('identifier') identifier?: string,
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Req() req?: any,
  ) {
    return this.resolveCatalogFamilies(userId || identifier || email, req);
  }

  @Get('catalog/families/:identifier')
  async getCatalogFamiliesParam(@Param('identifier') identifier: string, @Req() req?: any) {
    return this.resolveCatalogFamilies(identifier, req);
  }

  private async resolveCatalogFamilies(identifier?: string, req?: any) {
    const user: any = await this.getCatalogUser(identifier, req);
    if (!user) {
      return [];
    }

    const ownerId = user.parentId || user.id;

    try {
      return await this.prisma.family.findMany({
        where: {
          userId: ownerId,
        },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      return [];
    }
  }
}
