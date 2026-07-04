import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transactions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CategoriesService } from 'src/category/category.service';
import { FilesModule } from '../../files/files.module';
import { NubefactService } from '../../nubefact/nubefact.service';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [TransactionController],
  providers: [TransactionService, CategoriesService, NubefactService],
  exports: [TransactionService],
})
export class TransactionsModule { }
