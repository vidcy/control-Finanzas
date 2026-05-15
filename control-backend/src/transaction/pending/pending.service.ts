import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreatePendingTransactionDto,
  UpdatePendingTransactionDto,
} from './peding.dto';
import { Currency, TransactionStatus, TransactionType } from '@prisma/client';
import { type } from 'os';
@Injectable()
export class PendingTransactionService {
  constructor(private prisma: PrismaService) { }
  async createPendingTransaction(
    userId: string,
    dto: CreatePendingTransactionDto,
  ) {
    const isUSD = dto.currency == Currency.USD;
    const amountSoles = isUSD
      ? dto.amount * (dto.exchangeRate || 1)
      : dto.amount;
    console.log("SUBCATEGORY RECIBIDA:", dto.subCategoryId);
    return this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId || null,
        date: dto.date ? new Date(dto.date) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paymentMethod: dto.paymentMethod || 'CASH',
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        status: TransactionStatus.PENDING,
        currency: dto.currency ?? Currency.PEN,
        exchangeRate: dto.exchangeRate,
        amountSoles,
      },
    });
  }
  async listPendingTransactions(userId: string, type?: TransactionType) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.PENDING,
        ...(type ? { type } : {}),
      },
      orderBy: { date: 'desc' },
      include: { category: true, subCategory: true },
    });
  }
  async getPendingTransactionDetails(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
      },
    });
  }
  async updatePendingTransaction(id: string, dto: UpdatePendingTransactionDto) {
    const existingTransaction = await this.getPendingTransactionDetails(id);
    if (!existingTransaction) {
      throw new Error('Transaccion no encontrada');
    }
    const currency = dto.currency ?? existingTransaction.currency;
    const amount = dto.amount ?? existingTransaction.amount;
    const exchangeRate = dto.exchangeRate ?? existingTransaction.exchangeRate;
    let amountSoles = existingTransaction.amountSoles;

    if (dto.amount || dto.currency || dto.exchangeRate) {
      const isUSD = currency === Currency.USD;
      amountSoles = isUSD ? amount * (exchangeRate || 1) : amount;
    }
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        subCategoryId: dto.subCategoryId, // Puede ser null
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        amount,
        ...(dto.status && { status: dto.status }),
        currency,
        exchangeRate,
        amountSoles,
      },
    });
  }
  async deletePendingTransaction(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }
  async markPendingTransactionAsPaid(id: string) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        status: TransactionStatus.PAID,
      },
    });
  }
}
