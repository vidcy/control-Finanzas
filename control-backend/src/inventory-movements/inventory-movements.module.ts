import { Module } from '@nestjs/common';
import { InventoryMovementsController } from './inventory-movements.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [InventoryMovementsController],
  providers: [PrismaService],
})
export class InventoryMovementsModule {}
