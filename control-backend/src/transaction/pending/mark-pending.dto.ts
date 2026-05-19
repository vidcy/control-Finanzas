import {
    IsEnum,
} from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class MarkAsPaidDto {
    @IsEnum(TransactionStatus)
    status: TransactionStatus;
}