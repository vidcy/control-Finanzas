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
        billingStatus: { not: 'CANCELLED' },
      },
      select: {
        amount: true,
        paymentMethod: true,
        fiscalDocument: {
          select: { status: true },
        },
      },
    });

    const validSales = salesList.filter(
      (s) => s.fiscalDocument?.status !== 'CANCELLED',
    );

    const commissionsList = await this.prisma.commission.findMany({
      where: {
        sale: {
          cashShiftId: activeShift.id,
          billingStatus: { not: 'CANCELLED' },
        },
      },
      include: {
        sale: {
          select: {
            fiscalDocument: { select: { status: true } },
          },
        },
      },
    });

    const validCommissions = commissionsList.filter(
      (c) => c.sale?.fiscalDocument?.status !== 'CANCELLED',
    );

    const totalSales = validSales.reduce((acc, s) => acc + s.amount, 0);
    const cashSales = validSales
      .filter((s) => !s.paymentMethod || (s.paymentMethod as string) === 'CASH' || (s.paymentMethod as string) === 'EFECTIVO')
      .reduce((acc, s) => acc + s.amount, 0);

    const totalAdditionalCommissions = validCommissions
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
          where: {
            cashShiftId: shift.id,
            billingStatus: { not: 'CANCELLED' },
          },
          select: {
            amount: true,
            paymentMethod: true,
            fiscalDocument: { select: { status: true } },
          },
        });

        const validSales = salesList.filter(
          (s) => s.fiscalDocument?.status !== 'CANCELLED',
        );

        const totalSales = validSales.reduce((acc, s) => acc + s.amount, 0);
        const cashSales = validSales
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
        fiscalDocument: true,
      },
      orderBy: { date: 'asc' },
    });

    const validSales = sales.filter(
      (sale) =>
        sale.billingStatus !== 'CANCELLED' &&
        sale.fiscalDocument?.status !== 'CANCELLED',
    );

    let totalSales = 0;
    for (const sale of validSales) {
      totalSales += sale.amount;
    }

    const commissionsList = await this.prisma.commission.findMany({
      where: {
        sale: {
          cashShiftId: id,
          billingStatus: { not: 'CANCELLED' },
        },
      },
      include: {
        sale: {
          select: {
            fiscalDocument: { select: { status: true } },
          },
        },
      },
    });

    const validCommissions = commissionsList.filter(
      (c) => c.sale?.fiscalDocument?.status !== 'CANCELLED',
    );

    const totalCommissions = validCommissions.reduce((sum, c) => sum + c.amount, 0);
    const totalAdditionalCommissions = validCommissions
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

  async recalculateShiftTotals(shiftId: string) {
    if (!shiftId) return null;

    const shift = await this.prisma.cashShift.findUnique({
      where: { id: shiftId },
    });
    if (!shift) return null;

    const salesList = await this.prisma.sale.findMany({
      where: {
        cashShiftId: shiftId,
        billingStatus: { not: 'CANCELLED' },
      },
      select: {
        amount: true,
        paymentMethod: true,
        fiscalDocument: {
          select: { status: true },
        },
      },
    });

    const validSales = salesList.filter(
      (s) => s.fiscalDocument?.status !== 'CANCELLED',
    );

    const commissionsList = await this.prisma.commission.findMany({
      where: {
        sale: {
          cashShiftId: shiftId,
          billingStatus: { not: 'CANCELLED' },
        },
      },
      include: {
        sale: {
          select: {
            fiscalDocument: { select: { status: true } },
          },
        },
      },
    });

    const validCommissions = commissionsList.filter(
      (c) => c.sale?.fiscalDocument?.status !== 'CANCELLED',
    );

    const totalSales = validSales.reduce((acc, s) => acc + s.amount, 0);
    const cashSales = validSales
      .filter(
        (s) =>
          !s.paymentMethod ||
          (s.paymentMethod as string) === 'CASH' ||
          (s.paymentMethod as string) === 'EFECTIVO',
      )
      .reduce((acc, s) => acc + s.amount, 0);

    const totalAdditionalCommissions = validCommissions
      .filter((c) => c.isAdditional)
      .reduce((sum, c) => sum + c.amount, 0);

    const finalBalance = parseFloat(
      (shift.initialBalance + cashSales - totalAdditionalCommissions).toFixed(2),
    );

    if (shift.status === 'CLOSED') {
      await this.prisma.cashShift.update({
        where: { id: shiftId },
        data: {
          totalSales: parseFloat(totalSales.toFixed(2)),
          finalBalance,
          expectedBalance: finalBalance,
        },
      });

      // Asegurar que todas las ventas anuladas de esta caja cerrada tengan su registro formal de Egreso en tesorería
      const cancelledSales = await this.prisma.sale.findMany({
        where: {
          cashShiftId: shiftId,
          OR: [
            { billingStatus: 'CANCELLED' },
            { fiscalDocument: { status: 'CANCELLED' } },
          ],
        },
        include: { fiscalDocument: true },
      });

      for (const cs of cancelledSales) {
        const docRef =
          cs.fiscalDocument?.fullNumber ||
          (cs.billingSerie && cs.billingNumber
            ? `${cs.billingSerie}-${String(cs.billingNumber).padStart(8, '0')}`
            : cs.code || cs.id);

        const cashPart =
          !cs.paymentMethod ||
          cs.paymentMethod === 'CASH' ||
          (cs.paymentMethod as string) === 'EFECTIVO'
            ? cs.amount
            : 0;

        if (cashPart > 0) {
          await this.registerTreasuryAdjustment({
            shiftId,
            saleId: cs.id,
            docNumber: docRef,
            adjustmentType: 'ANULADO',
            amountDeducted: cashPart,
            reason:
              cs.fiscalDocument?.sunatDescription ||
              cs.billingError ||
              'Anulación / Baja formal de comprobante',
            ownerId: shift.userId,
            workerId: cs.userId,
            branchId: cs.branchId || shift.branchId,
          }).catch(() => {});
        }
      }
    }

    return {
      shiftId,
      totalSales: parseFloat(totalSales.toFixed(2)),
      cashSales: parseFloat(cashSales.toFixed(2)),
      finalBalance,
    };
  }

  /**
   * REGISTRO AUDITABLE DE AJUSTE EN TESORERÍA (CONTRA-ASIENTO DE EGRESO)
   * Crea un nuevo registro en tesorería haciendo referencia a la venta anulada/modificada
   * y al turno de caja original para trazabilidad contable impecable.
   */
  async registerTreasuryAdjustment(options: {
    shiftId: string;
    saleId?: string;
    docNumber?: string;
    adjustmentType: 'ELIMINADO' | 'MODIFICADO' | 'ANULADO';
    amountDeducted: number;
    reason: string;
    ownerId: string;
    workerId?: string;
    branchId?: string | null;
  }) {
    const {
      shiftId,
      saleId,
      docNumber,
      adjustmentType,
      amountDeducted,
      reason,
      ownerId,
      workerId,
      branchId,
    } = options;

    if (!shiftId || !amountDeducted || amountDeducted <= 0) return null;

    const shift = await this.prisma.cashShift.findUnique({
      where: { id: shiftId },
      include: { user: true },
    });
    if (!shift) return null;

    const closingTx = await this.prisma.transaction.findFirst({
      where: {
        cashShiftId: shiftId,
        name: 'Cierre de Caja',
      },
    });

    if (!closingTx && shift.status !== 'CLOSED') {
      return null;
    }

    const refTag = docNumber || saleId || 'Venta';
    const bitacoraDesc = `[BITÁCORA DE AJUSTE: ${adjustmentType}] Referencia: ${refTag}. Turno de Caja: ${shiftId.substring(0, 8)}... Motivo: ${reason}. Monto descontado de tesorería: S/ ${amountDeducted.toFixed(2)}`;

    // Evitar transacciones duplicadas para la misma referencia en este turno
    const existingTx = await this.prisma.transaction.findFirst({
      where: {
        cashShiftId: shiftId,
        description: { contains: refTag },
      },
    });

    if (existingTx) {
      return existingTx;
    }

    // Buscar categoría de Egreso adecuada
    const effectiveOwnerId = ownerId || shift.user?.parentId || shift.userId;
    let categoryIdToUse = closingTx?.categoryId || '';
    let subCategoryIdToUse = closingTx?.subCategoryId || null;

    const adjustmentCat = await this.prisma.category.findFirst({
      where: {
        userId: effectiveOwnerId,
        type: 'EXPENSE',
        OR: [
          { name: { contains: 'Ajuste', mode: 'insensitive' } },
          { name: { contains: 'Devoluc', mode: 'insensitive' } },
          { name: { contains: 'Caja', mode: 'insensitive' } },
          { name: { contains: 'Egreso', mode: 'insensitive' } },
        ],
      },
    });

    if (adjustmentCat) {
      categoryIdToUse = adjustmentCat.id;
      subCategoryIdToUse = null;
    } else if (!categoryIdToUse) {
      const anyExpense = await this.prisma.category.findFirst({
        where: { userId: effectiveOwnerId, type: 'EXPENSE' },
      });
      if (anyExpense) categoryIdToUse = anyExpense.id;
    }

    if (!categoryIdToUse) {
      const newCat = await this.prisma.category.create({
        data: {
          name: 'Ajustes y Devoluciones de Caja',
          type: 'EXPENSE',
          userId: effectiveOwnerId,
        },
      });
      categoryIdToUse = newCat.id;
    }

    const actionName =
      adjustmentType === 'MODIFICADO'
        ? 'Ajuste por Modificación de Venta'
        : 'Ajuste por Anulación de Venta';

    const adjustmentTx = await this.prisma.transaction.create({
      data: {
        name: actionName,
        type: 'EXPENSE',
        amount: parseFloat(amountDeducted.toFixed(2)),
        categoryId: categoryIdToUse,
        subCategoryId: subCategoryIdToUse,
        date: new Date(),
        status: 'PAID',
        currency: 'PEN',
        paymentMethod: 'CASH',
        description: bitacoraDesc,
        workspace: 'BUSINESS',
        branchId: branchId || shift.branchId,
        cashShiftId: shiftId,
        userId: workerId || shift.userId,
      },
    });

    // Restaurar el monto bruto del Cierre de Caja en tesorería para que el Egreso
    // registrado formalmente sea el que descuente el saldo con total transparencia
    if (closingTx) {
      const allAdjustments = await this.prisma.transaction.findMany({
        where: {
          cashShiftId: shiftId,
          type: 'EXPENSE',
          name: { contains: 'Ajuste' },
        },
      });
      const totalExpenseAdjustments = allAdjustments.reduce(
        (acc, t) => acc + t.amount,
        0,
      );

      const expectedOriginalGross = parseFloat(
        (shift.finalBalance + totalExpenseAdjustments).toFixed(2),
      );
      if (closingTx.amount !== expectedOriginalGross) {
        await this.prisma.transaction.update({
          where: { id: closingTx.id },
          data: {
            amount: expectedOriginalGross,
            description: `Cierre de Caja - ID: ${shiftId.substring(0, 8)}... (Registro original bruto de cierre. Ajustes registrados debajo).`,
          },
        });
      }
    }

    return adjustmentTx;
  }

  /**
   * BITÁCORA DETALLADA DE AUDITORÍA DE TURNO DE CAJA & TESORERÍA
   */
  async getShiftAuditTrail(shiftId: string) {
    const shift = await this.prisma.cashShift.findUnique({
      where: { id: shiftId },
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true } },
        branch: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Turno de caja no encontrado.');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { cashShiftId: shiftId },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });

    const sales = await this.prisma.sale.findMany({
      where: { cashShiftId: shiftId },
      include: { fiscalDocument: true, items: true },
      orderBy: { date: 'asc' },
    });

    return {
      shift,
      transactions,
      sales,
    };
  }
}
