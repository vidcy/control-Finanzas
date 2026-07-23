import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CashShiftService {
  private readonly logger = new Logger(CashShiftService.name);

  constructor(private prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoCloseShifts() {
    this.logger.log('Iniciando cierre de caja automático de medianoche...');

    const openShifts = await this.prisma.cashShift.findMany({
      where: { status: 'OPEN' },
    });

    for (const shift of openShifts) {
      try {
        const workerUser = await this.prisma.user.findUnique({
          where: { id: shift.userId },
        });
        const ownerId = workerUser?.parentId || shift.userId;
        await this.closeShift(ownerId, shift.userId, undefined, undefined, undefined, true);
        this.logger.log(
          `Caja cerrada automáticamente para usuario ${shift.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error al cerrar caja automática para usuario ${shift.userId}:`,
          error.message,
        );
      }
    }

    this.logger.log('Cierre de caja automático finalizado.');
  }

  async openShift(options: {
    ownerId: string;
    workerId: string;
    initialBalance: number;
    password?: string;
    branchId?: string;
    categoryId?: string;
    subCategoryId?: string;
  }) {
    const {
      ownerId,
      workerId,
      initialBalance,
      password,
      branchId,
      categoryId,
      subCategoryId,
    } = options;

    if (!password) {
      throw new BadRequestException(
        'Se requiere la contraseña del dueño del negocio para abrir la caja.',
      );
    }

    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
    });
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!worker || !owner) {
      throw new NotFoundException('Usuario o dueño del negocio no encontrado.');
    }
    if (!owner.cashRegisterPin) {
      throw new BadRequestException(
        'El dueño del negocio aún no ha configurado la clave de caja. Debe configurarla en el módulo de Control de Caja.',
      );
    }

    if (password !== owner.cashRegisterPin) {
      throw new BadRequestException(
        'La contraseña ingresada para abrir caja es incorrecta',
      );
    }

    const activeShift = await this.prisma.cashShift.findFirst({
      where: { userId: workerId, status: 'OPEN' },
    });

    if (activeShift) {
      throw new BadRequestException(
        'Ya existe una caja abierta para este usuario.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.create({
        data: {
          userId: workerId,
          initialBalance,
          status: 'OPEN',
          totalSales: 0,
          branchId: branchId || null,
        },
      });

      if (initialBalance > 0 && categoryId) {
        await tx.transaction.create({
          data: {
            name: 'Apertura de Caja',
            type: 'EXPENSE',
            amount: initialBalance,
            categoryId,
            subCategoryId: subCategoryId || null,
            date: new Date(),
            status: 'PAID',
            currency: 'PEN',
            paymentMethod: 'CASH',
            description: `Fondo inicial asignado a caja. Caja ID: ${shift.id.substring(0, 8)}...`,
            workspace: 'BUSINESS',
            branchId: branchId || null,
            cashShiftId: shift.id,
            userId: workerId,
          },
        });
      }

      return shift;
    });
  }

  async closeShift(
    ownerId: string,
    workerId: string,
    categoryId?: string,
    subCategoryId?: string,
    password?: string,
    isCron: boolean = false,
  ) {
    if (!isCron) {
      if (!password) {
        throw new BadRequestException(
          'Se requiere la clave de caja para cerrar el turno.',
        );
      }

      const worker = await this.prisma.user.findUnique({
        where: { id: workerId },
      });
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
      });

      if (!worker || !owner) {
        throw new NotFoundException('Usuario o dueño del negocio no encontrado.');
      }

      if (!owner.cashRegisterPin) {
        throw new BadRequestException(
          'El dueño del negocio aún no ha configurado la clave de caja. Debe configurarla en el módulo de Control de Caja.',
        );
      }

      if (password !== owner.cashRegisterPin) {
        throw new BadRequestException(
          'La contraseña ingresada para cerrar caja es incorrecta',
        );
      }
    }

    const activeShift = await this.prisma.cashShift.findFirst({
      where: { userId: workerId, status: 'OPEN' },
    });

    if (!activeShift) {
      throw new BadRequestException('No hay una caja abierta para cerrar.');
    }

    const salesList = await this.prisma.sale.findMany({
      where: {
        cashShiftId: activeShift.id,
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    const commissionsList = await this.prisma.commission.findMany({
      where: {
        sale: { cashShiftId: activeShift.id }
      }
    });

    const totalSales = salesList.reduce((acc, s) => acc + s.amount, 0);
    const cashSales = salesList
      .filter((s) => !s.paymentMethod || (s.paymentMethod as string) === 'CASH' || (s.paymentMethod as string) === 'EFECTIVO')
      .reduce((acc, s) => acc + s.amount, 0);

    const totalAdditionalCommissions = commissionsList
      .filter((c) => c.isAdditional)
      .reduce((sum, c) => sum + c.amount, 0);

    const treasuryClosingAmount = activeShift.initialBalance + cashSales - totalAdditionalCommissions;
    const finalBalance = activeShift.initialBalance + cashSales - totalAdditionalCommissions;

    return this.prisma.$transaction(async (tx) => {
      const closedShift = await tx.cashShift.update({
        where: { id: activeShift.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          totalSales,
          finalBalance,
        },
      });

      // Register Treasury INCOME transaction
      let categoryIdToUse = categoryId || '';
      let subCategoryIdToUse: string | null = subCategoryId || null;

      if (!categoryIdToUse) {
        const incomeCategory = await tx.category.findFirst({
          where: {
            userId: ownerId,
            type: 'INCOME',
            name: { contains: 'Ingreso' },
          },
        });

        if (incomeCategory) {
          categoryIdToUse = incomeCategory.id;
          const subCat = await tx.category.findFirst({
            where: {
              parentId: incomeCategory.id,
              name: { contains: 'Caja' },
            },
          });
          if (subCat) subCategoryIdToUse = subCat.id;
        } else {
          const firstCat = await tx.category.findFirst({
            where: { userId: ownerId, type: 'INCOME' },
          });
          if (firstCat) categoryIdToUse = firstCat.id;
        }
      }

      if (categoryIdToUse) {
        await tx.transaction.create({
          data: {
            name: 'Cierre de Caja',
            type: 'INCOME',
            amount: parseFloat(treasuryClosingAmount.toFixed(2)),
            categoryId: categoryIdToUse,
            subCategoryId: subCategoryIdToUse,
            date: new Date(),
            status: 'PAID',
            currency: 'PEN',
            paymentMethod: 'CASH',
            description: `Cierre de Caja - ID: ${closedShift.id.substring(0, 8)}... (Fondo Inicial: S/ ${activeShift.initialBalance.toFixed(2)} + Ventas (Neto comisiones): S/ ${(totalSales - totalAdditionalCommissions).toFixed(2)})`,
            workspace: 'BUSINESS',
            branchId: activeShift.branchId,
            cashShiftId: closedShift.id,
            userId: workerId,
          },
        });
      }

      return closedShift;
    });
  }

  async getActiveShift(workerId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { userId: workerId, status: 'OPEN' },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    if (!shift) return null;

    const salesList = await this.prisma.sale.findMany({
      where: {
        cashShiftId: shift.id,
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    const totalSales = salesList.reduce((acc, s) => acc + s.amount, 0);
    const cashSales = salesList
      .filter((s) => !s.paymentMethod || (s.paymentMethod as string) === 'CASH' || (s.paymentMethod as string) === 'EFECTIVO')
      .reduce((acc, s) => acc + s.amount, 0);
    const digitalSales = totalSales - cashSales;
    const expectedCashInBox = shift.initialBalance + cashSales;

    return {
      ...shift,
      currentSales: totalSales,
      cashSales,
      digitalSales,
      expectedCashInBox,
    };
  }

  async getAllActiveShifts(ownerId: string) {
    const shifts = await this.prisma.cashShift.findMany({
      where: {
        status: 'OPEN',
        user: {
          OR: [
            { id: ownerId },
            { parentId: ownerId },
          ],
        },
      },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return Promise.all(
      shifts.map(async (shift) => {
        const salesList = await this.prisma.sale.findMany({
          where: { cashShiftId: shift.id },
          select: { amount: true, paymentMethod: true },
        });

        const totalSales = salesList.reduce((acc, s) => acc + s.amount, 0);
        const cashSales = salesList
          .filter(
            (s) =>
              !s.paymentMethod ||
              (s.paymentMethod as string) === 'CASH' ||
              (s.paymentMethod as string) === 'EFECTIVO',
          )
          .reduce((acc, s) => acc + s.amount, 0);
        const digitalSales = totalSales - cashSales;
        const expectedCashInBox = shift.initialBalance + cashSales;

        return {
          ...shift,
          currentSales: totalSales,
          cashSales,
          digitalSales,
          expectedCashInBox,
        };
      }),
    );
  }

  async getCashRegisterPin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cashRegisterPin: true },
    });
    return { pin: user?.cashRegisterPin || null, hasPin: !!user?.cashRegisterPin };
  }

  async setCashRegisterPin(userId: string, pin: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { cashRegisterPin: pin || null },
    });
    return { success: true, pin };
  }

  async getShiftHistory(userId: string) {
    return this.prisma.cashShift.findMany({
      where: { userId, status: 'CLOSED' },
      orderBy: { closedAt: 'desc' },
      take: 20,
    });
  }

  async getShiftHistoryFiltered(options: {
    ownerId: string;
    loggedInWorkerId?: string;
    page: number;
    limit: number;
    branchId?: string;
    workerId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const {
      ownerId,
      loggedInWorkerId,
      page,
      limit,
      branchId,
      workerId,
      startDate,
      endDate,
    } = options;

    const whereClause: any = {
      status: 'CLOSED',
    };

    if (loggedInWorkerId) {
      whereClause.userId = loggedInWorkerId;
    } else {
      if (workerId) {
        whereClause.userId = workerId;
      } else {
        whereClause.OR = [{ userId: ownerId }, { user: { parentId: ownerId } }];
      }
    }

    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (startDate || endDate) {
      whereClause.closedAt = {};
      if (startDate) {
        whereClause.closedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.closedAt.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.cashShift.findMany({
        where: whereClause,
        orderBy: { closedAt: 'desc' },
        skip,
        take: limit,
        include: {
          branch: true,
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.cashShift.count({
        where: whereClause,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getShiftDetails(id: string, ownerId: string, workerId?: string, userRole?: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: {
        id,
        OR: workerId
          ? [{ userId: workerId }]
          : [{ userId: ownerId }, { user: { parentId: ownerId } }],
      },
      include: {
        branch: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException(
        'Cierre de caja no encontrado o no tiene permisos para verlo.',
      );
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        cashShiftId: id,
      },
      include: {
        items: true,
      },
      orderBy: { date: 'asc' },
    });

    let totalSales = 0;
    for (const sale of sales) {
      totalSales += sale.amount;
    }

    const commissionsList = await this.prisma.commission.findMany({
      where: { sale: { cashShiftId: id } }
    });

    const totalCommissions = commissionsList.reduce((sum, c) => sum + c.amount, 0);
    const totalAdditionalCommissions = commissionsList
      .filter((c) => c.isAdditional)
      .reduce((sum, c) => sum + c.amount, 0);

    const showFinancials = userRole === 'ADMIN' || !workerId;

    return {
      shift,
      sales,
      ...(showFinancials ? {
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalCommissions: parseFloat(totalCommissions.toFixed(2)),
        netAmount: parseFloat((totalSales - totalAdditionalCommissions).toFixed(2)),
        netEarnings: parseFloat((totalSales - totalAdditionalCommissions).toFixed(2)),
      } : {}),
    };
  }
}
