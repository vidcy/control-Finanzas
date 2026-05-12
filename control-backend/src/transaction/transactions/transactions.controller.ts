import { Controller, Param, Req } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { Body, Post, Get, Patch, Delete } from "@nestjs/common";
import { CreateTransactionDto, UpdateTransactionDto } from "./transactions.dto";
import { AuthGuard } from "@nestjs/passport";
import { UseGuards } from "@nestjs/common";

@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) { }
    @UseGuards(AuthGuard('jwt'))
    @Post()
    createTransaction(@Req() req, @Body() dto: CreateTransactionDto) {
        return this.transactionService.createTransaction(req.user.id, dto);
    }
    @UseGuards(AuthGuard('jwt'))
    @Get()
    listTransactions(@Req() req) {
        return this.transactionService.listTransactions(req.user.id);
    }
    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    getTransactionDetails(@Req() req, @Param('id') id: string) {
        return this.transactionService.findById(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    updateTransaction(@Req() req, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
        return this.transactionService.updateTransaction(id, dto);
    }
    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    deleteTransaction(@Req() req, @Param('id') id: string) {
        return this.transactionService.deleteTransaction(id);
    }
}