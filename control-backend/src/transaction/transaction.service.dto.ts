import {
    IsEnum,
    IsOptional,
    IsString,
    IsNumber,
    IsDateString,
} from "class-validator";
import { TransactionType, PaymentMethod, Currency } from "@prisma/client";

export class CreatePendingDto {
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
    @IsNumber()
    amount: number;

    // 💱 moneda
    @IsEnum(Currency)
    currency: Currency;

    // 💵 tipo de cambio (solo si USD)
    @IsOptional()
    @IsNumber()
    exchangeRate?: number;
}