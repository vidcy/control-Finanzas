import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CashShiftService {
  private readonly logger = new Logger(CashShiftService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutoCloseShifts() {
    this.logger.log('Iniciando cierre de caja automático de medianoche...');

    const openShifts = await this.prisma.cashShift.findMany({
      where: { status: 'OPEN' },
    });

    for (const shift of openShifts) {
      try {
        await this.closeShift(shift.userId);
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

  async openShift(userId: string, initialBalance: number) {
    // Verificar si ya hay una caja abierta
    const activeShift = await this.prisma.cashShift.findFirst({
      where: { userId, status: 'OPEN' },
    });

    if (activeShift) {
      throw new BadRequestException('Ya existe una caja abierta.');
    }

    return this.prisma.cashShift.create({
      data: {
        userId,
        initialBalance,
        status: 'OPEN',
        totalSales: 0,
      },
    });
  }

  async closeShift(userId: string) {
    const activeShift = await this.prisma.cashShift.findFirst({
      where: { userId, status: 'OPEN' },
    });

    if (!activeShift) {
      throw new BadRequestException('No hay ninguna caja abierta.');
    }

    // Calcular ventas totales desde que se abrió la caja
    // Solo ventas de POS (Venta en Caja) que hayan ocurrido desde openedAt
    const sales = await this.prisma.transaction.aggregate({
      where: {
        userId,
        workspace: 'BUSINESS',
        type: 'INCOME',
        name: 'Venta en Caja',
        createdAt: {
          gte: activeShift.openedAt,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalSales = sales._sum.amount || 0;
    const finalBalance = activeShift.initialBalance + totalSales;

    return this.prisma.cashShift.update({
      where: { id: activeShift.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        totalSales,
        finalBalance,
      },
    });
  }

  async getActiveShift(userId: string) {
    const shift = await this.prisma.cashShift.findFirst({
      where: { userId, status: 'OPEN' },
    });

    if (!shift) return null;

    // Obtener las ventas actuales calculadas (solo POS)
    const sales = await this.prisma.transaction.aggregate({
      where: {
        userId,
        workspace: 'BUSINESS',
        type: 'INCOME',
        name: 'Venta en Caja',
        createdAt: {
          gte: shift.openedAt,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      ...shift,
      currentSales: sales._sum.amount || 0,
    };
  }

  async getShiftHistory(userId: string) {
    return this.prisma.cashShift.findMany({
      where: { userId, status: 'CLOSED' },
      orderBy: { closedAt: 'desc' },
      take: 20, // últimos 20 cierres
    });
  }
}
