import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { CcofactModule } from '../ccofact/ccofact.module';
import { CashShiftModule } from '../cash-shift/cash-shift.module';

@Module({
  imports: [PrismaModule, ProductsModule, CcofactModule, CashShiftModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule { }
