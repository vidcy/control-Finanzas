import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update.category.dto';
import { defaultCategories } from './default-category';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // 🔹 Crear categoría para el usuario logueado
  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parentCategory = await this.prisma.category.findFirst({
        where: {
          id: dto.parentId,
          userId,
        },
      });
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }
    if (dto.parentId && dto.parentId === dto.name) {
      throw new BadRequestException(
        'la Subcategoria es la misma que la catgeoria padre',
      );
    }
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, userId },
      });

      if (parent?.type !== dto.type) {
        throw new BadRequestException('Type mismatch with parent category');
      }
    }
    const exists = await this.prisma.category.findFirst({
      where: {
        name: dto.name,
        userId,
        parentId: dto.parentId ?? null,
      },
    });

    if (exists) {
      throw new BadRequestException('Category already exists');
    }
    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
        ...(dto.parentId ? { parentId: dto.parentId } : {}),
        userId,
      },
    });
  }
  async update(id: string, userId: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: {
        id,
        userId,
      },
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
        ...(dto.parentId ? { parentId: dto.parentId } : {}),
        userId,
      },
    });
  }

  // 🔹 Obtener SOLO categorías del usuario logueado
  findAllByUser(userId: string) {
    return this.prisma.category.findMany({
      where: {
        userId,
      },
      include: {
        children: true,
        parent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // FIND ONE
  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  // UPDATE
  async updateCategory(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(userId, id);

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  // DELETE
  async remove(userId: string, id: string) {
    const category = await this.findOne(userId, id);

    const isParentCategory = category.children.length > 0;
    // 🔍 1️⃣ Verificar si es subcategoría o categoría padre
    const isSubCategory = !!category.parentId;

    // 🔍 2️⃣ Validar transacciones si es SUBCATEGORÍA
    if (isSubCategory) {
      const hasTransactions = await this.prisma.transaction.findFirst({
        where: { subCategoryId: id, userId },
      });

      if (hasTransactions) {
        throw new BadRequestException(
          'Esta subcategoría tiene transacciones asociadas',
        );
      }
      return await this.prisma.category.delete({
        where: { id, userId },
      });
    }
    // 🔍 3️⃣ Validar transacciones si es CATEGORÍA PADRE
    if (isParentCategory) {
      throw new BadRequestException('Primero elimina las subcategorías');
    }
    const hasTransactions = await this.prisma.transaction.findFirst({
      where: { categoryId: id, userId },
    });

    if (hasTransactions) {
      throw new BadRequestException(
        'Esta categoría tiene transacciones asociadas',
      );
    }

    // 🔍 4️⃣ Verificar si tiene subcategorías
    const hasChildren = await this.prisma.category.findFirst({
      where: { parentId: id, userId },
    });

    if (hasChildren) {
      throw new BadRequestException('Primero elimina las subcategorías');
    }
    // 🗑️ 5️⃣ eliminar
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async seedDefaultCategories(userId: string) {
    let seededCount = 0;

    // 1️⃣ Seed INCOME & EXPENSE if missing
    const hasIncomeExpense = await this.prisma.category.findFirst({
      where: { userId, type: { in: ['INCOME', 'EXPENSE'] } },
    });

    if (!hasIncomeExpense) {
      for (const type of ['INCOME', 'EXPENSE'] as const) {
        for (const category of defaultCategories[type]) {
          const parent = await this.prisma.category.create({
            data: {
              name: category.name,
              type,
              color: category.color,
              userId,
            },
          });

          for (const sub of category.subcategories) {
            await this.prisma.category.create({
              data: {
                name: sub.name,
                type,
                color: category.color,
                parentId: parent.id,
                userId,
              },
            });
          }
        }
      }
      seededCount += 2;
    }

    // 2️⃣ Seed TRANSFER if missing
    const hasTransfer = await this.prisma.category.findFirst({
      where: { userId, type: 'TRANSFER' },
    });

    if (!hasTransfer && defaultCategories.TRANSFER) {
      for (const category of defaultCategories.TRANSFER) {
        const parent = await this.prisma.category.create({
          data: {
            name: category.name,
            type: 'TRANSFER',
            color: category.color,
            userId,
          },
        });

        for (const sub of category.subcategories) {
          await this.prisma.category.create({
            data: {
              name: sub.name,
              type: 'TRANSFER',
              color: category.color,
              parentId: parent.id,
              userId,
            },
          });
        }
      }
      seededCount += 1;
    }

    if (seededCount > 0) {
      return { message: 'Estructura inicial cargada correctamente 🚀' };
    }
    return { message: 'ya inicializado' };
  }
}
