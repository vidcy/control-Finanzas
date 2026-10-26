import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  interestType?: string;

  @IsOptional()
  appointmentDate?: any;

  @IsOptional()
  @IsString()
  appointmentTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  monthlySalesVolume?: string;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  storeIdentifier?: string;

  @IsOptional()
  @IsBoolean()
  isPlatformLead?: boolean;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productSku?: string;
}
