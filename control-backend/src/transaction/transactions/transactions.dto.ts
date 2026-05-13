// src/transaction/transactions/dto/create-transaction.dto.ts

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatus {
  PAID = 'PAID',
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

export class CreateTransactionDto {
  // 👇 nombre corto del movimiento (Ej: "Sueldo Mayo")
  // 👇 ingreso o egreso
  @IsEnum(TransactionType)
  type: TransactionType;

  // 👇 categoría padre (OBLIGATORIA)
  @IsUUID()
  categoryId: string;

  // 👇 subcategoría (OPCIONAL 💥 muy importante)
  @IsOptional()
  @IsUUID()
  subCategoryId?: string;

  // 💰 monto en moneda original
  @IsNumber()
  amount: number;

  // 💱 moneda usada
  @IsEnum(Currency)
  currency: Currency;

  // 💱 tipo de cambio (solo si USD)
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  // 📅 fecha del movimiento
  @IsDateString()
  date: string;

  // 💳 método de pago
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @IsOptional()
  amountSoles?: number;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  // 📝 descripción opcional
  @IsOptional()
  @IsString()
  description?: string;
}
export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subCategoryId?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumber()
  amountSoles?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
