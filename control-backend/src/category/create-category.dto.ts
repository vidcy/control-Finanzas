import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['INCOME', 'EXPENSE'])
  @IsNotEmpty()
  type: 'INCOME' | 'EXPENSE';

  @IsString()
  @IsOptional() // Opcional porque el DTO dice parentId?
  parentId?: string;

  @IsString()
  @IsOptional() // Opcional porque el DTO dice color?
  color?: string;
}
