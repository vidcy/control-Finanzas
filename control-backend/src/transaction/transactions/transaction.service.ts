import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateTransactionDto,
  Currency,
  TransactionStatus,
  UpdateTransactionDto,
} from './transactions.dto';
@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const isUSD = dto.currency == Currency.USD;
    const amountSoles = isUSD
      ? dto.amount * (dto.exchangeRate || 1)
      : dto.amount;

    return this.prisma.transaction.create({
      data: {
        userId: userId,
        type: dto.type,
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId || null,
        date: dto.date ? new Date(dto.date) : new Date(),
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
      },
    });
  }

  async listTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.PAID,
      },
      orderBy: { date: 'desc' },
      include: { category: true, subCategory: true },
    });
  }
  async findById(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true, subCategory: true },
    });
  }
  async updateTransaction(id: string, dto: UpdateTransactionDto) {
    const existingTransaction = await this.findById(id);
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
        categoryId: dto.categoryId,
        subCategoryId: dto.subCategoryId,
        date: dto.date,
        paymentMethod: dto.paymentMethod || 'CASH',
        name: dto.name,
        description: dto.description,
        amount,
        currency,
        justified: dto.justified,
        programmed: dto.programmed,
        exchangeRate,
        amountSoles,
      },
    });
  }
  async deleteTransaction(id: string) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }
}
