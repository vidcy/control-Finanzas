import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreatePendingTransactionDto, UpdatePendingTransactionDto } from "./peding.dto";
import { Currency, TransactionStatus, TransactionType } from "@prisma/client";
import { type } from "os";
@Injectable()
export class PendingTransactionService {
    constructor(private prisma: PrismaService) { }
    async createPendingTransaction(userId: string, dto: CreatePendingTransactionDto) {
        const isUSD = dto.currency == Currency.USD;
        const amountSoles = isUSD ? dto.amount * (dto.exchangeRate || 1) : dto.amount;
        return this.prisma.transaction.create({
            data: {
                userId,
                type: dto.type,
                categoryId: dto.categoryId,
                subCategoryId: dto.subCategoryId,
                date: new Date(),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                paymentMethod: dto.paymentMethod || 'CASH',
                description: dto.description,
                amount: dto.amount,
                status: TransactionStatus.PENDING,
                currency: dto.currency,
                exchangeRate: dto.exchangeRate,
                amountSoles,
            },
        });

    }
    async listPendingTransactions(userId: string, type?: TransactionType) {
        return this.prisma.transaction.findMany({
            where: {
                userId, status: TransactionStatus.PENDING,
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
        const isUSD = dto.currency === Currency.USD;
        const amountSoles = dto.amount ? (isUSD ? dto.amount * (dto.exchangeRate || 1) : dto.amount) : undefined;

        return this.prisma.transaction.update({
            where: { id },
            data: {

                ...(dto.status && { status: dto.status }),
                ...(dto.amount && { amount: dto.amount }),
                ...(dto.description && { description: dto.description }),
                ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
                ...(dto.currency && { currency: dto.currency }),
                ...(dto.exchangeRate && { exchangeRate: dto.exchangeRate }),
                ...(dto.amountSoles && { amountSoles }),
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