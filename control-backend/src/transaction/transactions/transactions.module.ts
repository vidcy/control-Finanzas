import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transactions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CategoriesService } from 'src/category/category.service';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionController],
  providers: [TransactionService, CategoriesService],
  exports: [TransactionService],
})
export class TransactionsModule {}
