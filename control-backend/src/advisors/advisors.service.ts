import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdvisorsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, data: { name: string; commissionPercentage: number; isActive?: boolean }) {
    return this.prisma.advisor.create({
      data: {
        name: data.name,
        commissionPercentage: data.commissionPercentage,
        isActive: data.isActive ?? true,
        userId: ownerId,
      },
    });
  }

  async findAll(ownerId: string, isActiveOnly?: boolean) {
    return this.prisma.advisor.findMany({
      where: {
        userId: ownerId,
        ...(isActiveOnly ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(ownerId: string, id: string, data: Partial<{ name: string; commissionPercentage: number; isActive: boolean }>) {
    const advisor = await this.prisma.advisor.findFirst({
      where: { id, userId: ownerId },
    });
    if (!advisor) {
      throw new NotFoundException('Asesor no encontrado');
    }
    return this.prisma.advisor.update({
      where: { id },
      data,
    });
  }

  async remove(ownerId: string, id: string) {
    const advisor = await this.prisma.advisor.findFirst({
      where: { id, userId: ownerId },
    });
    if (!advisor) {
      throw new NotFoundException('Asesor no encontrado');
    }
    return this.prisma.advisor.delete({
      where: { id },
    });
  }

  async getCommissionsReport(ownerId: string, params: { advisorId?: string; startDate?: string; endDate?: string }) {
    const { advisorId, startDate, endDate } = params;

    const whereClause: any = {
      workspace: 'BUSINESS',
      isPosSale: true,
      status: 'PAID',
      advisorId: advisorId ? advisorId : { not: null },
      OR: [
        { userId: ownerId },
        { user: { parentId: ownerId } },
      ],
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      include: {
        advisor: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return transactions;
  }
}
