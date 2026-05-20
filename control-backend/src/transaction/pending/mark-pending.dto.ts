import {
    IsDate,
    IsDateString,
    IsEnum,
    IsOptional,
} from 'class-validator';
import { TransactionStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class MarkAsPaidDto {
    @IsEnum(TransactionStatus)
    status: TransactionStatus;
}