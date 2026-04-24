import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    // 🔹 Crear categoría para el usuario logueado
    create(name: string, type: 'INCOME' | 'EXPENSE', userId: string) {
        return this.prisma.category.create({
            data: {
                name,
                type,
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
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // 🔹 Eliminar categoría SOLO si pertenece al usuario
    remove(id: string, userId: string) {
        return this.prisma.category.deleteMany({
            where: {
                id,
                userId,
            },
        });
    }
}