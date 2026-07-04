import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { NubefactService } from '../nubefact/nubefact.service';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [ProductsController],
  providers: [ProductsService, NubefactService],
})
export class ProductsModule { }
