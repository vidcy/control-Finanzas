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

  @IsDateString()
  date: string;

  // 📅 Fecha de vencimiento (clave en cuentas pendientes)
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // 📅 Fecha de pago (clave en cuentas pendientes)
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  // 💳 método de pago (opcional en deuda)
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  // 👤 nombre (persona/deudor/acreedor)
  @IsOptional()
  @IsString()
  name?: string;

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

  @IsOptional()
  @IsString()
  workspace?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
