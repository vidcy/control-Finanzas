import { Module } from '@nestjs/common';
import { PendingTransactionService } from './pending.service';
import { PendingTransactionController } from './pending.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PendingTransactionController],
  providers: [PendingTransactionService],
})
export class PendingTransactionModule {}
