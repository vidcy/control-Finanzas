import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { CcofactModule } from '../ccofact/ccofact.module';

@Module({
  imports: [PrismaModule, FilesModule, CcofactModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule { }
