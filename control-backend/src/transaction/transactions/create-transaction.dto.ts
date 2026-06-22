// src/transaction/transactions/dto/create-transaction.dto.ts

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
  ValidateIf,
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

export class CreateTransactionDto {
  // 👇 nombre corto del movimiento (Ej: "Sueldo Mayo")
  // 👇 ingreso o egreso
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  status?: TransactionStatus;

  // 👇 categoría padre (OBLIGATORIA)
  @IsUUID()
  categoryId: string;

  // 👇 subcategoría (OPCIONAL 💥 muy importante)
  @IsOptional()
  @ValidateIf((o) => o.subCategoryId !== null && o.subCategoryId !== '')
  @IsUUID()
  subCategoryId?: string | null;

  // 📅 fecha
  @IsDateString()
  date: string;

  // 📅 fecha de vencimiento
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  paidAt?: string;

  // 💳 método de pago
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  name?: string;

  // 📝 descripción opcional
  @IsOptional()
  @IsString()
  description?: string;

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

  @IsNumber()
  @IsOptional()
  amountSoles?: number;

  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsBoolean()
  programmed?: boolean;

  @IsOptional()
  @IsString()
  workspace?: string;

  @IsOptional()
  @ValidateIf((o) => o.receiptUrl !== null)
  @IsString()
  receiptUrl?: string | null;
}
