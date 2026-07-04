import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePendingTransactionDto } from './create-pending.dto';
import { UpdatePendingTransactionDto } from './update-pending.dto';
import { MarkAsPaidDto } from './mark-pending.dto';
import { Currency, TransactionStatus, TransactionType } from '@prisma/client';
import { FilesService } from '../../files/files.service';

@Injectable()
export class PendingTransactionService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  // =========================================================
  // CREATE
  // El frontend YA envía fechas en UTC → solo validamos y guardamos
  // =========================================================
  async createPendingTransaction(
    userId: string,
    dto: CreatePendingTransactionDto,
  ) {
    const isUSD = dto.currency === Currency.USD;

    // Calculamos monto en soles SOLO para reporting interno
    const amountSoles = isUSD
      ? dto.amount * (dto.exchangeRate || 1)
      : dto.amount;

    return this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        categoryId: dto.categoryId,
        subCategoryId:
          dto.subCategoryId === '' ? null : dto.subCategoryId || null,

        // 🔥 IMPORTANTE: fechas llegan en UTC → guardar tal cual
        date: new Date(dto.date),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,

        paymentMethod: dto.paymentMethod || 'CASH',
        name: dto.name,
        description: dto.description,

        amount: dto.amount,
        amountSoles,

        currency: dto.currency ?? Currency.PEN,
        exchangeRate: dto.exchangeRate,

        status: TransactionStatus.PENDING,
        workspace: dto.workspace || 'PERSONAL',
        receiptUrl: dto.receiptUrl || null,
      },
    });
  }

  // =========================================================
  // LIST
  // Siempre devolver UTC. El frontend convertirá.
  // =========================================================
  async listPendingTransactions(
    userId: string,
    type?: TransactionType,
    workspace: string = 'PERSONAL',
  ) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.PENDING,
        workspace,
        ...(type ? { type } : {}),
      },
      orderBy: { date: 'desc' },
      include: {
        category: true,
        subCategory: true,
      },
    });
  }

  // =========================================================
  // DETAILS
  // 🔥 Ya NO convertimos fechas aquí
  // =========================================================
  async getPendingTransactionDetails(id: string) {
    const pending = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
      },
    });

    if (!pending) {
      throw new NotFoundException('Cuenta pendiente no encontrada');
    }

    return pending; // ← TODO en UTC
  }

  // =========================================================
  // UPDATE
  // Fechas siempre llegan en UTC desde el frontend
  // =========================================================
  async updatePendingTransaction(id: string, dto: UpdatePendingTransactionDto) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // Determinar valores finales
    const currency = dto.currency ?? existing.currency;
    const amount = dto.amount ?? existing.amount;
    const exchangeRate = dto.exchangeRate ?? existing.exchangeRate;

    // Recalcular monto en soles si cambian variables financieras
    let amountSoles = existing.amountSoles;
    if (dto.amount || dto.currency || dto.exchangeRate) {
      const isUSD = currency === Currency.USD;
      amountSoles = isUSD ? amount * (exchangeRate || 1) : amount;
    }

    if (
      dto.receiptUrl !== undefined &&
      dto.receiptUrl !== existing.receiptUrl &&
      existing.receiptUrl
    ) {
      await this.filesService.deleteFile(existing.receiptUrl);
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        subCategoryId: dto.subCategoryId === '' ? null : dto.subCategoryId,

        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.paidAt && { paidAt: new Date(dto.paidAt) }),

        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),

        amount,
        currency,
        exchangeRate,
        amountSoles,
      },
    });
  }

  // =========================================================
  // DELETE
  // =========================================================
  async deletePendingTransaction(id: string) {
    const existing = await this.getPendingTransactionDetails(id);
    const result = await this.prisma.transaction.delete({
      where: { id },
    });
    if (existing.receiptUrl) {
      await this.filesService.deleteFile(existing.receiptUrl);
    }
    return result;
  }

  // =========================================================
  // MARK AS PAID
  // paidAt SIEMPRE en UTC
  // =========================================================
  async markTransactionAsPaid(id: string, dto: MarkAsPaidDto) {
    const existing = await this.getPendingTransactionDetails(id);

    if (dto.status === 'PAID' && existing.status !== 'PAID') {
      if (existing.type === 'EXPENSE') {
        const ownerId = await this.prisma.user.findUnique({
          where: { id: existing.userId },
          select: { parentId: true },
        }).then(user => user?.parentId || existing.userId);

        const txs = await this.prisma.transaction.findMany({
          where: {
            OR: [{ userId: ownerId }, { user: { parentId: ownerId } }],
            workspace: existing.workspace,
            status: 'PAID',
          },
          select: {
            type: true,
            amountSoles: true,
            amount: true,
          },
        });

        let income = 0;
        let expense = 0;
        for (const t of txs) {
          const amt = t.amountSoles !== null && t.amountSoles !== undefined ? t.amountSoles : t.amount;
          if (t.type === 'INCOME') {
            income += amt;
          } else {
            expense += amt;
          }
        }
        const currentLiquidity = income - expense;

        const amtToCheck = existing.amountSoles !== null && existing.amountSoles !== undefined ? existing.amountSoles : existing.amount;
        if (amtToCheck > currentLiquidity) {
          throw new BadRequestException(
            `Límite de liquidez superado. No tiene suficiente liquidez en caja para realizar este pago. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
          );
        }
      }
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: dto.status as any,
        paidAt: dto.status === 'PAID' ? new Date() : null,
      },
    });
  }
}
