import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommissionModelsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, data: any) {
    return this.prisma.commissionModel.create({
      data: {
        name: data.name,
        type: data.type || 'PERCENT',
        value: data.value ?? 0.0,
        applyTo: data.applyTo || 'SALE',
        minCommission: data.minCommission ?? 0.0,
        maxCommission: data.maxCommission ?? null,
        allowDiscounts: data.allowDiscounts ?? true,
        allowManualEdit: data.allowManualEdit ?? true,
        isAdditional: data.isAdditional ?? false,
        categoryIds: data.categoryIds || null,
        brandIds: data.brandIds || null,
        productIds: data.productIds || null,
        userId: ownerId,
      },
    });
  }

  async findAll(ownerId: string) {
    return this.prisma.commissionModel.findMany({
      where: {
        userId: ownerId,
      },
      include: {
        advisors: true,
      },
    });
  }

  async findOne(ownerId: string, id: string) {
    const model = await this.prisma.commissionModel.findFirst({
      where: {
        id,
        userId: ownerId,
      },
      include: {
        advisors: true,
      },
    });
    if (!model) {
      throw new NotFoundException(`Modelo de comisión con ID ${id} no encontrado`);
    }
    return model;
  }

  async update(ownerId: string, id: string, data: any) {
    // Verify existence
    await this.findOne(ownerId, id);

    return this.prisma.commissionModel.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        value: data.value,
        applyTo: data.applyTo,
        minCommission: data.minCommission,
        maxCommission: data.maxCommission,
        allowDiscounts: data.allowDiscounts,
        allowManualEdit: data.allowManualEdit,
        isAdditional: data.isAdditional,
        categoryIds: data.categoryIds !== undefined ? data.categoryIds : undefined,
        brandIds: data.brandIds !== undefined ? data.brandIds : undefined,
        productIds: data.productIds !== undefined ? data.productIds : undefined,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    // Verify existence
    await this.findOne(ownerId, id);

    return this.prisma.commissionModel.delete({
      where: { id },
    });
  }
}
