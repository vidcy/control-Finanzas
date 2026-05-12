import { PrismaService } from "../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateTransactionDto } from "./transaction.service.dto";
@Injectable()
export class TransactionService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateTransactionDto) {
        return this.prisma.transaction.create({
            data: {
                ...dto,
                userId,
            },
        });
    }
}