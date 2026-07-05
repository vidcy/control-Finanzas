import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdvisorsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, data: { name: string; commissionPercentage?: number; commissionType?: string; commissionValue?: number; isActive?: boolean; commissionModelId?: string }) {
    return this.prisma.advisor.create({
      data: {
        name: data.name,
        commissionPercentage: data.commissionPercentage ?? 0.0,
        commissionType: data.commissionType ?? 'PERCENT',
        commissionValue: data.commissionValue ?? 0.0,
        commissionModelId: data.commissionModelId || null,
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
      include: {
        commissionModel: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(ownerId: string, id: string, data: Partial<{ name: string; commissionPercentage: number; commissionType: string; commissionValue: number; isActive: boolean; commissionModelId: string }>) {
    const advisor = await this.prisma.advisor.findFirst({
      where: { id, userId: ownerId },
    });
    if (!advisor) {
      throw new NotFoundException('Asesor no encontrado');
    }
    return this.prisma.advisor.update({
      where: { id },
      data: {
        ...data,
        commissionModelId: data.commissionModelId === '' ? null : data.commissionModelId,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    const advisor = await this.prisma.advisor.findFirst({
      where: { id, userId: ownerId },
    });
    if (!advisor) {
      throw new NotFoundException('Asesor no encontrado');
    }

    const [salesCount, commissionsCount] = await Promise.all([
      this.prisma.sale.count({ where: { advisorId: id } }),
      this.prisma.commission.count({ where: { advisorId: id } }),
    ]);

    const reasons: string[] = [];
    if (salesCount > 0) reasons.push(`${salesCount} venta(s)`);
    if (commissionsCount > 0) reasons.push(`${commissionsCount} comisión(es)`);

    if (reasons.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el asesor porque tiene registros asociados: ${reasons.join(', ')}. Puede desactivar su cuenta en lugar de eliminarla.`,
      );
    }

    return this.prisma.advisor.delete({
      where: { id },
    });
  }

  async getCommissionsReport(ownerId: string, params: { advisorId?: string; startDate?: string; endDate?: string }) {
    const { advisorId, startDate, endDate } = params;

    const baseFilter: any = {
      sale: {
        workspace: 'BUSINESS',
      }
    };

    if (startDate || endDate) {
      baseFilter.sale.date = {};
      if (startDate) {
        baseFilter.sale.date.gte = new Date(startDate);
      }
      if (endDate) {
        baseFilter.sale.date.lte = new Date(endDate);
      }
    }

    if (advisorId) {
      baseFilter.advisorId = advisorId;
      baseFilter.advisor = {
        OR: [
          { userId: ownerId },
          { user: { parentId: ownerId } },
        ]
      };
    } else {
      baseFilter.advisor = {
        OR: [
          { userId: ownerId },
          { user: { parentId: ownerId } },
        ]
      };
    }

    const commissions = await this.prisma.commission.findMany({
      where: baseFilter,
      include: {
        advisor: true,
        sale: {
          include: {
            cashShift: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastName: true,
                  }
                },
                branch: true,
              }
            },
            items: {
              include: {
                product: true,
              }
            },
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped: any[] = commissions.map(comm => {
      const sale = comm.sale;
      const desc = sale ? sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'Venta';
      
      const items = sale ? sale.items.map(item => {
        const unitCost = item.product?.costPrice || 0;
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          unitCost: unitCost,
          totalCost: unitCost * item.quantity,
          totalSale: item.price * item.quantity,
          commissionAmount: item.commissionAmount || 0,
        };
      }) : [];

      const totalCost = items.reduce((acc, item) => acc + item.totalCost, 0);
      const totalSale = items.reduce((acc, item) => acc + item.totalSale, 0);

      return {
        id: comm.id,
        advisorId: comm.advisorId,
        advisor: comm.advisor,
        amount: sale ? sale.amount : 0, // This is the total sale amount
        commissionAmount: comm.amount,
        commissionStatus: comm.status,
        description: `Venta en POS (${comm.advisor.name}): ${desc}`,
        date: sale ? sale.date : comm.createdAt,
        items,
        totalCost,
        totalSale,
        cashShift: sale?.cashShift ? {
          id: sale.cashShift.id,
          openedAt: sale.cashShift.openedAt,
          closedAt: sale.cashShift.closedAt,
          user: sale.cashShift.user,
          branch: sale.cashShift.branch,
        } : null,
        cashShiftId: sale?.cashShiftId || null,
        saleId: sale?.id || null,
      };
    });

    return mapped;
  }

  async updateCommissionStatus(ownerId: string, id: string, status: any) {
    const comm = await this.prisma.commission.findFirst({
      where: {
        id,
        advisor: {
          OR: [
            { userId: ownerId },
            { user: { parentId: ownerId } },
          ]
        }
      },
    });

    if (!comm) {
      throw new NotFoundException('Comisión no encontrada');
    }

    await this.prisma.commission.update({
      where: { id },
      data: {
        status: status,
      },
    });

    return { success: true, status };
  }
}
