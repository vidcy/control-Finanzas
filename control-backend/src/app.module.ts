import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PassportModule } from '@nestjs/passport';
import { CategoriesModule } from './category/category.module';
import { ConfigModule } from '@nestjs/config';
import { PendingTransactionModule } from './transaction/pending/peding.module';
import { TransactionsModule } from './transaction/transactions/transactions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NestModule, MiddlewareConsumer } from '@nestjs/common'
import { TimezoneMiddleware } from './middlewares/timezone.middleware'


@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // 👈 CLAVE
    AuthModule,
    PendingTransactionModule,
    TransactionsModule,
    NotificationsModule,
    PrismaModule,
    UsersModule,
    CategoriesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimezoneMiddleware)
      .forRoutes('*') // ← se aplica a TODAS las rutas
  }
}