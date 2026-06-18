import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CreatePendingTransactionDto } from './create-pending.dto';
import { TransactionType } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { PendingTransactionService } from './pending.service';
import { MarkAsPaidDto } from './mark-pending.dto';
import { UpdatePendingTransactionDto } from './update-pending.dto';

@Controller('pending')
export class PendingTransactionController {
  constructor(private readonly service: PendingTransactionService) {}

  // 🔹 Crear transacción
  @UseGuards(JwtAuthGuard)
  @Post()
  createPendingTransaction(
    @Req() req,
    @Body() dto: CreatePendingTransactionDto,
  ) {
    return this.service.createPendingTransaction(req.user.id, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Get()
  listPendingTransactions(
    @Req() req,
    @Query('type') type?: TransactionType,
    @Query('workspace') workspace?: string,
  ) {
    return this.service.listPendingTransactions(req.user.id, type, workspace);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getTransactionDetails(@Param('id') id: string) {
    return this.service.getPendingTransactionDetails(id);
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updatePendingTransaction(
    @Param('id') id: string,
    @Body() dto: UpdatePendingTransactionDto,
  ) {
    return this.service.updatePendingTransaction(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePendingTransaction(@Param('id') id: string) {
    return this.service.deletePendingTransaction(id);
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id/mark-paid')
  markAsPaid(@Req() req, @Param('id') id: string, @Body() dto: MarkAsPaidDto) {
    return this.service.markTransactionAsPaid(id, dto);
  }
}
