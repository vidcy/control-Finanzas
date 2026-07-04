import { Module } from '@nestjs/common';
import { CommissionModelsService } from './commission-models.service';
import { CommissionModelsController } from './commission-models.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommissionModelsController],
  providers: [CommissionModelsService],
  exports: [CommissionModelsService],
})
export class CommissionModelsModule {}
