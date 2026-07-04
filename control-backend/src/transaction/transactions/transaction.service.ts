import { PrismaService } from 'src/prisma/prisma.service';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateTransactionDto,
  Currency,
  TransactionStatus,
} from './create-transaction.dto';
import { MarkAsPendingDto } from './mark-transaction.dto';
import { UpdateTransactionDto } from './update-transaction.dto';
import { FilesService } from '../../files/files.service';

@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  // =========================================================
  // CREATE
  // Frontend envía fecha en UTC → guardar tal cual
  // =========================================================
  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const isUSD = dto.currency === Currency.USD;

    const amountSoles = isUSD
      ? dto.amount * (dto.exchangeRate || 1)
      : dto.amount;

    // Validate liquidity for EXPENSE type
    const isPaid = dto.status === TransactionStatus.PAID || !dto.status; // defaults to PAID
    if (dto.type === 'EXPENSE' && isPaid) {
      const currentLiquidity = await this.getLiquidity(
        userId,
        dto.workspace || 'PERSONAL',
      );
      if (amountSoles > currentLiquidity) {
        throw new BadRequestException(
          `Límite de liquidez superado. No tiene suficiente liquidez en caja para realizar esta operación. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
        );
      }
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        categoryId: dto.categoryId,
        subCategoryId:
          dto.subCategoryId === '' ? null : dto.subCategoryId || null,

        // 🔥 SIEMPRE UTC
        date: dto.date ? new Date(dto.date) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(),
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),

        paymentMethod: dto.paymentMethod || 'CASH',
        name: dto.name,
        description: dto.description,

        amount: dto.amount,
        currency: dto.currency ?? Currency.PEN,
        exchangeRate: dto.exchangeRate,

        justified: dto.justified,
        programmed: dto.programmed,

        status: dto.status || TransactionStatus.PAID,
        amountSoles,
        workspace: dto.workspace || 'PERSONAL',
        receiptUrl: dto.receiptUrl || null,
        branchId: dto.branchId || null,
      },
    });
  }

  // =========================================================
  // LIST
  // Backend devuelve UTC sin tocar fechas
  // =========================================================
  async listTransactions(userId: string, workspace: string = 'PERSONAL') {
    return this.listTransactionsFiltered({
      ownerId: userId,
      workspace,
    });
  }

  async listTransactionsFiltered(options: {
    ownerId: string;
    workerId?: string;
    workspace: string;

    startDate?: string;
    endDate?: string;
    filterUserId?: string;
    branchId?: string;
    advisorId?: string;
  }) {
    const {
      ownerId,
      workerId,
      workspace,

      startDate,
      endDate,
      filterUserId,
      branchId,
      advisorId,
    } = options;

    const whereClause: any = {
      workspace,
      status: {
        in: [TransactionStatus.PAID, TransactionStatus.CANCELLED],
      },
    };

    // Exclude individual POS sales by default unless specifically requested or set to 'all'


    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (advisorId) {
      whereClause.advisorId = advisorId;
    }

    if (workspace === 'BUSINESS') {
      // In business workspace, workers and owners see the business-wide transactions
      if (filterUserId) {
        whereClause.userId = filterUserId;
      } else {
        whereClause.OR = [{ userId: ownerId }, { user: { parentId: ownerId } }];
      }
    } else {
      // In personal workspace, workers (if any) only see their own transactions
      if (workerId) {
        whereClause.userId = workerId;
      } else {
        if (filterUserId) {
          whereClause.userId = filterUserId;
        } else {
          whereClause.OR = [{ userId: ownerId }, { user: { parentId: ownerId } }];
        }
      }
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        category: true,
        subCategory: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getOwnerId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentId: true },
    });
    return user?.parentId || userId;
  }

  async getLiquidity(
    userId: string,
    workspace: string = 'PERSONAL',
  ): Promise<number> {
    const ownerId = await this.getOwnerId(userId);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ userId: ownerId }, { user: { parentId: ownerId } }],
        workspace,
        status: TransactionStatus.PAID,
      },
      select: {
        type: true,
        amountSoles: true,
        amount: true,
        status: true,
        description: true,
      },
    });

    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      const amt = t.amountSoles !== null && t.amountSoles !== undefined ? t.amountSoles : t.amount;
      if (t.type === 'INCOME') {
        income += amt;
      } else {
        expense += amt;
      }
    }

    return income - expense;
  }

  // =========================================================
  // FIND BY ID
  // =========================================================
  async findById(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    return transaction; // ← UTC puro
  }

  // =========================================================
  // UPDATE
  // Fechas siempre llegan en UTC desde el frontend
  // =========================================================
  async updateTransaction(id: string, dto: UpdateTransactionDto) {
    const existing = await this.findById(id);

    const currency = dto.currency ?? existing.currency;
    const amount = dto.amount ?? existing.amount;
    const exchangeRate = dto.exchangeRate ?? existing.exchangeRate;

    let amountSoles = existing.amountSoles;

    if (dto.amount || dto.currency || dto.exchangeRate) {
      const isUSD = currency === Currency.USD;
      amountSoles = isUSD ? amount * (exchangeRate || 1) : amount;
    }

    // Validate liquidity difference on update
    const wasPaidExpense =
      existing.type === 'EXPENSE' &&
      existing.status === TransactionStatus.PAID;

    const targetStatus = dto.status ?? existing.status;
    const targetType = dto.type ?? existing.type;

    const isPaidExpense =
      targetType === 'EXPENSE' &&
      targetStatus === TransactionStatus.PAID;

    const oldAmount = existing.amountSoles !== null && existing.amountSoles !== undefined ? existing.amountSoles : existing.amount;
    const newAmount = amountSoles !== null && amountSoles !== undefined ? amountSoles : amount;

    let diff = 0;
    if (wasPaidExpense) diff -= oldAmount;
    if (isPaidExpense) diff += newAmount;

    if (diff > 0) {
      const currentLiquidity = await this.getLiquidity(
        existing.userId,
        existing.workspace,
      );
      if (diff > currentLiquidity) {
        throw new BadRequestException(
          `Límite de liquidez superado. No tiene suficiente liquidez en caja para esta modificación. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
        );
      }
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

        // 🔥 IMPORTANTE: convertir string ISO → Date
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.paidAt && { paidAt: new Date(dto.paidAt) }),

        ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),

        ...(dto.justified !== undefined && { justified: dto.justified }),
        ...(dto.programmed !== undefined && { programmed: dto.programmed }),

        amount,
        currency,
        exchangeRate,
        amountSoles,
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      },
    });
  }

  // =========================================================
  // DELETE
  // =========================================================
  async deleteTransaction(id: string) {
    const existing = await this.findById(id);

    // 1. Buscar movimientos de inventario asociados (margen de 5 segundos)
    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        userId: existing.userId,
        createdAt: {
          gte: new Date(existing.createdAt.getTime() - 5000),
          lte: new Date(existing.createdAt.getTime() + 5000),
        },
      },
    });

    // 2. Restaurar stock para cada producto y borrar movimientos
    for (const movement of movements) {
      const productExists = await this.prisma.product.findUnique({
        where: { id: movement.productId },
      });
      if (productExists) {
        if (movement.type === 'OUT') {
          // Revertir salida: sumar al stock
          await this.prisma.product.update({
            where: { id: movement.productId },
            data: { stock: { increment: movement.quantity } },
          });
        } else if (movement.type === 'IN') {
          // Revertir entrada: restar al stock
          await this.prisma.product.update({
            where: { id: movement.productId },
            data: { stock: { decrement: movement.quantity } },
          });
        }
      }

      await this.prisma.inventoryMovement.delete({
        where: { id: movement.id },
      });
    }

    const result = await this.prisma.transaction.delete({
      where: { id },
    });
    if (existing.receiptUrl) {
      await this.filesService.deleteFile(existing.receiptUrl);
    }
    return result;
  }

  // =========================================================
  // MARK AS PENDING
  // Cambio de estado únicamente
  // =========================================================
  async markTransactionAsPending(id: string, dto: MarkAsPendingDto) {
    const existing = await this.findById(id);

    if (dto.status === 'PAID' && existing.status !== 'PAID') {
      if (existing.type === 'EXPENSE') {
        const currentLiquidity = await this.getLiquidity(
          existing.userId,
          existing.workspace,
        );
        const amtToCheck = existing.amountSoles !== null && existing.amountSoles !== undefined ? existing.amountSoles : existing.amount;
        if (amtToCheck > currentLiquidity) {
          throw new BadRequestException(
            `Límite de liquidez superado. No tiene suficiente liquidez en caja para realizar este pago. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
          );
        }
      }
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: dto.status as any,
        paidAt: dto.status === 'PAID' ? new Date() : null,
      },
    });

    // Bidirectional sync with PurchaseOrder if linked
    if (
      existing.description &&
      existing.description.includes('Pedido de Compra. ID:')
    ) {
      const match = existing.description.match(
        /Pedido de Compra\. ID:\s*([a-fA-F0-9-]+|[0-9a-fA-F]+)/,
      );
      if (match && match[1]) {
        const poId = match[1];
        let poStatus: 'PENDING' | 'PAID' = 'PENDING';
        if (dto.status === 'PAID') {
          poStatus = 'PAID';
        }
        await this.prisma.purchaseOrder
          .update({
            where: { id: poId },
            data: { status: poStatus },
          })
          .catch((err) => {
            console.error(
              'Failed to sync PurchaseOrder status from transaction:',
              err,
            );
          });
      }
    }

    return updated;
  }
}
