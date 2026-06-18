import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: any) {
    return this.prisma.product.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(userId: string, id: string, data: any) {
    await this.findOne(userId, id); // Verifica que exista y sea de este usuario
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
