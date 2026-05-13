import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PassportModule } from '@nestjs/passport';
import { CategoriesModule } from './category/category.module';
import { ConfigModule } from '@nestjs/config';
import { PendingTransactionModule } from './transaction/pending/peding.module';
import { TransactionsModule } from './transaction/transactions/transactions.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // 👈 CLAVE
    AuthModule,
    PendingTransactionModule,
    TransactionsModule,
    PrismaModule,
    UsersModule,
    CategoriesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
