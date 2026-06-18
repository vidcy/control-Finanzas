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
  ) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        userId: req.user.id,
        ...(productId ? { productId } : {}),
        ...(type ? { type: type as any } : {}),
      },
      include: {
        product: { select: { id: true, name: true, unit: true, imageUrl: true } },
        presentation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
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
