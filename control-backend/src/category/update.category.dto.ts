export class UpdateCategoryDto {
    name?: string;
    type?: 'INCOME' | 'EXPENSE';
    parentId?: string;
}