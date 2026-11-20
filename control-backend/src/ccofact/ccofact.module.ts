import { Global, Module } from '@nestjs/common';
import { CcofactService } from './ccofact.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CcofactService],
  exports: [CcofactService],
})
export class CcofactModule {}
