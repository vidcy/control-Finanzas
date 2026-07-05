// src/transaction/transactions/dto/create-transaction.dto.ts

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
}

export enum Currency {
  PEN = 'PEN',
  USD = 'USD',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  CARD = 'CARD',
}

export class MarkAsPendingDto {
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsOptional()
  @IsBoolean()
  ignoreLiquidity?: boolean;
}
