import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Req() req,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
    @Query('userId') filterUserId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const ownerId = req.user.id;
    const workerId = req.user.workerId;

    const whereClause: any = {};

    if (workerId) {
      whereClause.OR = [{ userId: ownerId }, { user: { parentId: ownerId } }];
    } else {
      if (filterUserId) {
        whereClause.userId = filterUserId;
      } else {
        whereClause.OR = [{ userId: ownerId }, { user: { parentId: ownerId } }];
      }
    }

    if (productId) {
      whereClause.productId = productId;
    }
    if (type) {
      whereClause.type = type as any;
    }
    if (branchId) {
      whereClause.branchId = branchId;
    }
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    return this.prisma.inventoryMovement.findMany({
      where: whereClause,
      include: {
        product: {
          select: { id: true, name: true, unit: true, imageUrl: true, sku: true },
        },
        presentation: { select: { id: true, name: true } },
        user: {
          select: { id: true, name: true, lastName: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    // Verify ownership via product.userId
    const movement = await this.prisma.inventoryMovement.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!movement) {
      throw new Error('Movimiento no encontrado o sin acceso.');
    }
    return this.prisma.inventoryMovement.delete({ where: { id } });
  }
}
