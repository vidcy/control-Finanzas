import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CcofactModule } from '../ccofact/ccofact.module';
import { CashShiftModule } from '../cash-shift/cash-shift.module';

@Module({
  imports: [PrismaModule, CcofactModule, CashShiftModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
