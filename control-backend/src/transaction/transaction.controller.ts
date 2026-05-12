import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Request,
    UseGuards,
    Req,
    Put,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateTransactionDto } from './create-transaction.dto';
import { UpdateTransactionDto } from './update.transaction.dto';
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
    constructor(private readonly service: TransactionService) { }

    // 🔹 Crear transacción
    @Post()
    create(@Req() req, @Body() dto: CreateTransactionDto) {
        return this.service.create(req.user.id, dto);
    }

}