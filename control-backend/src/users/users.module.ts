import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesModule } from 'src/category/category.module';
import { CategoriesController } from 'src/category/category.controller';
import { CategoriesService } from 'src/category/category.service';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PrismaModule, CategoriesModule, MailModule, forwardRef(() => AuthModule)], // 👈 LA MAGIA
  controllers: [UsersController, CategoriesController],
  providers: [UsersService, CategoriesService],
  exports: [UsersService],
})
export class UsersModule {}
