export class CreateCategoryDto {
    name: string;
    type: 'INCOME' | 'EXPENSE';
    parentId?: string;
}
