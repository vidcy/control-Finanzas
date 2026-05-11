import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update.category.dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    // 🔹 Crear categoría para el usuario logueado
    async create(userId: string, dto: CreateCategoryDto) {
        return this.prisma.category.create({
            data: {
                name: dto.name,
                type: dto.type,
                ...(dto.parentId ? { parentId: dto.parentId } : {}),
                userId,
            },
        });
    }
    async update(id: string, userId: string, dto: UpdateCategoryDto) {
        return this.prisma.category.update({
            where: {
                id,
                userId,
            },
            data: {
                name: dto.name,
                type: dto.type,
                ...(dto.parentId ? { parentId: dto.parentId } : {}),
                userId,
            },
        });
    }

    // 🔹 Obtener SOLO categorías del usuario logueado
    findAllByUser(userId: string) {
        return this.prisma.category.findMany({
            where: {
                userId,
            },
            include: {
                children: true,
                parent: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
    }

    // FIND ONE
    async findOne(userId: string, id: string) {
        const category = await this.prisma.category.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return category;
    }

    // UPDATE
    async updateCategory(userId: string, id: string, dto: UpdateCategoryDto) {
        await this.findOne(userId, id);

        return this.prisma.category.update({
            where: { id },
            data: dto,
        });
    }

    // DELETE
    async remove(userId: string, id: string) {
        await this.findOne(userId, id);

        return this.prisma.category.delete({
            where: { id },
        });
    }
}