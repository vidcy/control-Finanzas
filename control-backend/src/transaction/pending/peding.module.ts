import { Module } from '@nestjs/common';
import { PendingTransactionService } from './pending.service';
import { PendingTransactionController } from './pending.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FilesModule } from '../../files/files.module';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [PendingTransactionController],
  providers: [PendingTransactionService],
})
export class PendingTransactionModule {}
