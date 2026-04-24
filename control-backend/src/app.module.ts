import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { PassportModule } from '@nestjs/passport'
import { CategoriesModule } from './category/category.module'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // 👈 CLAVE
    AuthModule,
    PrismaModule,
    UsersModule,
    CategoriesModule,
  ],
})
export class AppModule { }