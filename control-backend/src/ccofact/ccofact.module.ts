import { Module } from '@nestjs/common';
import { CcofactService } from './ccofact.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CcofactService],
  exports: [CcofactService],
})
export class CcofactModule {}
