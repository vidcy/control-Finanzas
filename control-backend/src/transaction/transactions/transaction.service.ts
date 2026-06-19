import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateTransactionDto,
  Currency,
  TransactionStatus,
} from './create-transaction.dto';
import { MarkAsPendingDto } from './mark-transaction.dto';
import { UpdateTransactionDto } from './update-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) { }

  // =========================================================
  // CREATE
  // Frontend envía fecha en UTC → guardar tal cual
  // =========================================================
  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const isUSD = dto.currency === Currency.USD;

    const amountSoles = isUSD
      ? dto.amount * (dto.exchangeRate || 1)
      : dto.amount;

    return this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId || null,

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
      },
    });
  }

  // =========================================================
  // LIST
  // Backend devuelve UTC sin tocar fechas
  // =========================================================
  async listTransactions(userId: string, workspace: string = 'PERSONAL') {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.PAID,
        workspace,
      },
      orderBy: { date: 'desc' },
      include: {
        category: true,
        subCategory: true,
      },
    });
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

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        subCategoryId: dto.subCategoryId,

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
      },
    });
  }

  // =========================================================
  // DELETE
  // =========================================================
  async deleteTransaction(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  // =========================================================
  // MARK AS PENDING
  // Cambio de estado únicamente
  // =========================================================
  async markTransactionAsPending(id: string, dto: MarkAsPendingDto) {
    await this.findById(id);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: dto.status as any,
        paidAt: dto.status === 'PAID' ? new Date() : null,
      },
    });
  }
}
