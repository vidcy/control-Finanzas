import { Module } from '@nestjs/common';
import { CategoriesService } from './category.service';
import { CategoriesController } from './category.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CategoriesController],
    providers: [CategoriesService],
})
export class CategoriesModule { }