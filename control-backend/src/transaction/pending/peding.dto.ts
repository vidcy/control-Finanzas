import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TransactionType,
  PaymentMethod,
  Currency,
  TransactionStatus,
} from '@prisma/client';

export class CreatePendingTransactionDto {
  // 🟢 Tipo: INCOME (por cobrar) | EXPENSE (por pagar)
  @IsEnum(TransactionType)
  type: TransactionType;

  // 🟢 Categoría
  @IsString()
  categoryId: string;

  // 🟣 Subcategoría (opcional)
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  // 📅 Fecha de vencimiento (clave en cuentas pendientes)
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // 💳 método de pago (opcional en deuda)
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  // 📝 descripción
  @IsOptional()
  @IsString()
  description?: string;

  // 💰 monto
  @Type(() => Number)
  @IsNumber()
  amount: number;

  // 💱 moneda
  @IsEnum(Currency)
  currency: Currency;

  // 💵 tipo de cambio (solo si USD)
  @ValidateIf((o) => o.currency === Currency.USD)
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;
}

export class UpdatePendingTransactionDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsNumber()
  amountSoles?: number;
}
