import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum BillingDocTypeEnum {
  FACTURA = 'FACTURA',
  BOLETA = 'BOLETA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  NOTA_DEBITO = 'NOTA_DEBITO',
}

export class BillingItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  unit?: string; // 'NIU' (unidades), 'ZZ' (servicios), 'KGM' (kilos)

  @IsOptional()
  @IsNumber()
  igvType?: number; // 1 = Gravado - Operación Onerosa, 8 = Exonerado, 9 = Inafecto
}

export class EmitBillingDto {
  @IsEnum(BillingDocTypeEnum)
  docType: BillingDocTypeEnum;

  @IsString()
  @IsNotEmpty()
  customerDocType: string; // '6' RUC, '1' DNI, '-' SIN DOCUMENTO

  @IsString()
  @IsNotEmpty()
  customerDocNum: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  currency?: 'PEN' | 'USD';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingItemDto)
  items: BillingItemDto[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  saleId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class IssueNoteDto {
  @IsString()
  @IsNotEmpty()
  originalFiscalDocumentId: string;

  @IsEnum(['CREDIT', 'DEBIT'])
  noteType: 'CREDIT' | 'DEBIT';

  @IsNumber()
  reasonCode: number;

  @IsString()
  @IsNotEmpty()
  reasonText: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
