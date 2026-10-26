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
    if (!raw) return null;

    const lowerRaw = raw.toLowerCase();
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
        if (users && users.length > 0) return users[0];
      } catch (e) {}

      try {
        const fallback = await this.prisma.user.findFirst({
          where: { email: { contains: 'estileza', mode: 'insensitive' } },
        });
        if (fallback) return fallback;
      } catch (e) {}

      return null;
    }

    try {
      const slugifiedRaw = lowerRaw
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      let user: any = null;

      // 1. Intentar por UUID exacto
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
      if (isUuid) {
        try {
          user = await this.prisma.user.findUnique({ where: { id: raw } });
          if (user) {
            if (user.parentId) {
              const parent = await this.prisma.user.findUnique({ where: { id: user.parentId } });
              return parent || user;
            }
            return user;
          }
        } catch (e) {}
      }

      // 2. Intentar por businessSlug exacto
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

      // 3. Intentar por Email o prefijo de email
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

      // 4. Intentar por businessName exacto
      if (!user) {
        try {
          user = await this.prisma.user.findFirst({
            where: { businessName: { equals: raw, mode: 'insensitive' } },
          });
        } catch (e) {}
      }

      // 5. BÚSQUEDA INTELIGENTE POR SLUG Y TOKENS (Multi-criterio, sin restricciones de isActive o businessName null)
      if (!user) {
        try {
          const searchTokens = slugifiedRaw.split('-').filter((t) => t.length >= 3);
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

          // A) Coincidencia directa de slug generado a partir de businessName
          let matched = allUsers.find((u) => {
            if (u.businessSlug) {
              const uSlug = u.businessSlug.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
              if (uSlug === slugifiedRaw) return true;
            }
            if (u.businessName) {
              const uBSlug = u.businessName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              if (uBSlug === slugifiedRaw) return true;
            }
            return false;
          });

          // B) Coincidencia de inclusión mutua (slug contiene o está contenido)
          if (!matched) {
            matched = allUsers.find((u) => {
              if (u.businessName) {
                const uBSlug = u.businessName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                if (uBSlug.includes(slugifiedRaw) || slugifiedRaw.includes(uBSlug)) return true;
                const cleanA = uBSlug.replace(/-/g, '');
                const cleanB = slugifiedRaw.replace(/-/g, '');
                if (cleanA && cleanB && (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;
              }
              return false;
            });
          }

          // C) Coincidencia por tokens (ej: tokens = ['electrodomesticos', 'ayca'])
          if (!matched && searchTokens.length > 0) {
            matched = allUsers.find((u) => {
              const fullStr = `${u.businessName || ''} ${u.businessSlug || ''} ${u.businessReason || ''} ${u.name || ''} ${u.lastName || ''} ${u.email || ''}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '');
              return searchTokens.every((token) => fullStr.includes(token));
            });
          }

          // D) Coincidencia por token representativo más largo (ej: "electrodomesticos" o "ayca")
          if (!matched && searchTokens.length > 0) {
            const sortedTokens = [...searchTokens].sort((a, b) => b.length - a.length);
            for (const t of sortedTokens) {
              if (t.length >= 4) {
                matched = allUsers.find((u) => {
                  const bNameNorm = `${u.businessName || ''} ${u.name || ''} ${u.lastName || ''}`
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[̀-ͯ]/g, '');
                  return bNameNorm.includes(t);
                });
                if (matched) break;
              }
            }
          }

          if (matched) {
            user = await this.prisma.user.findUnique({ where: { id: matched.id } });

            // Auto-asignar businessSlug si estaba en null para acelerar futuras consultas
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
          console.error('Error in smart slug match:', e);
        }
      }

      // Si el usuario es trabajador de una sucursal, resolver al dueño del negocio
      if (user && user.parentId) {
        const parentUser = await this.prisma.user.findUnique({
          where: { id: user.parentId },
        });
        if (parentUser) user = parentUser;
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
