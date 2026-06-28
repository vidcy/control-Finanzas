import { Controller, Param, Req } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Body, Post, Get, Patch, Delete, Query } from '@nestjs/common';
import { CreateTransactionDto } from './create-transaction.dto';
import { UpdateTransactionDto } from './update-transaction.dto';
import { MarkAsPendingDto } from './mark-transaction.dto';
import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}
  @UseGuards(AuthGuard('jwt'))
  @Post()
  createTransaction(@Req() req, @Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(req.user.id, dto);
  }
  @UseGuards(AuthGuard('jwt'))
  @Get()
  listTransactions(
    @Req() req,
    @Query('workspace') workspace?: string,
    @Query('isPosSale') isPosSale?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') filterUserId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const ownerId = req.user.id;
    const workerId = req.user.workerId;
    return this.transactionService.listTransactionsFiltered({
      ownerId,
      workerId,
      workspace: workspace || 'PERSONAL',
      isPosSale:
        isPosSale === 'true'
          ? true
          : isPosSale === 'false'
            ? false
            : isPosSale === 'all'
              ? 'all'
              : undefined,
      startDate,
      endDate,
      filterUserId,
      branchId,
    });
  }
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getTransactionDetails(@Req() req, @Param('id') id: string) {
    return this.transactionService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  updateTransaction(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionService.updateTransaction(id, dto);
  }
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  deleteTransaction(@Req() req, @Param('id') id: string) {
    return this.transactionService.deleteTransaction(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/mark-pending')
  markAsPending(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: MarkAsPendingDto,
  ) {
    return this.transactionService.markTransactionAsPending(id, dto);
  }
}
