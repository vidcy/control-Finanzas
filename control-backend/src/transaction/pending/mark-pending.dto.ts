import { IsDate, IsDateString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { TransactionStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class MarkAsPaidDto {
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsOptional()
  @IsBoolean()
  ignoreLiquidity?: boolean;
}
