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
  igvType?: number; // 1 = Gravado (18%), 8 = Exonerado (0%), 9 = Inafecto (0%), 10 = Gravado MYPE (10%)

  @IsOptional()
  @IsString()
  igvAffectation?: string; // "10", "10_MYPE", "20", "30", "40"

  @IsOptional()
  @IsNumber()
  igvRate?: number; // 18, 10, 0
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
  paymentType?: string; // 'Contado' | 'Credito'

  @IsOptional()
  @IsString()
  issueDate?: string; // YYYY-MM-DD (Retroceder hasta máx. 3 días calendario según R.S. 193-2020)

  @IsOptional()
  @IsString()
  dueDate?: string; // YYYY-MM-DD

  @IsOptional()
  cuotas?: any[];

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

  @IsOptional()
  @IsString()
  observaciones?: string;
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

export class UpdateBillingDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerDocType?: string;

  @IsOptional()
  @IsString()
  customerDocNum?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  currency?: 'PEN' | 'USD';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingItemDto)
  items?: BillingItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  rectifyAccepted?: boolean;

  @IsOptional()
  @IsString()
  rectifyReason?: string;
}

export class DeleteBillingDto {
  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  reasonText?: string;

  @IsOptional()
  @IsString()
  method?: 'COMUNICACION_BAJA' | 'NOTA_CREDITO';

  @IsOptional()
  deliveredToClient?: boolean;

  @IsOptional()
  forceDelete?: boolean;

  @IsOptional()
  restoreStock?: boolean;
}

export class SyncSeriesDto {
  @IsOptional()
  @IsString()
  serieBoleta?: string;

  @IsOptional()
  @IsString()
  serieFactura?: string;

  @IsOptional()
  @IsString()
  serieNotaCreditoBoleta?: string;

  @IsOptional()
  @IsString()
  serieNotaCreditoFactura?: string;

  @IsOptional()
  @IsString()
  serieNotaDebitoBoleta?: string;

  @IsOptional()
  @IsString()
  serieNotaDebitoFactura?: string;

  @IsOptional()
  @IsNumber()
  initialBoletaNumber?: number;

  @IsOptional()
  @IsNumber()
  initialFacturaNumber?: number;

  @IsOptional()
  @IsNumber()
  initialNcBoletaNumber?: number;

  @IsOptional()
  @IsNumber()
  initialNcFacturaNumber?: number;

  @IsOptional()
  @IsNumber()
  initialNdBoletaNumber?: number;

  @IsOptional()
  @IsNumber()
  initialNdFacturaNumber?: number;
}
