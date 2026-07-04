import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PassportModule } from '@nestjs/passport';
import { CategoriesModule } from './category/category.module';
import { ConfigModule } from '@nestjs/config';
import { PendingTransactionModule } from './transaction/pending/peding.module';
import { TransactionsModule } from './transaction/transactions/transactions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProductsModule } from './products/products.module';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TimezoneMiddleware } from './middlewares/timezone.middleware';
import { CashShiftModule } from './cash-shift/cash-shift.module';
import { UploadModule } from './upload/upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UserContextInterceptor } from './common/interceptors/user-context.interceptor';
import { AnalyticsModule } from './analytics/analytics.module';
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module';
import { AuditModule } from './audit/audit.module';
import { BranchesModule } from './branches/branches.module';
import { AdvisorsModule } from './advisors/advisors.module';
import { CommissionModelsModule } from './commission-models/commission-models.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // 👈 CLAVE
    AuthModule,
    PendingTransactionModule,
    TransactionsModule,
    NotificationsModule,
    ProductsModule,
    CashShiftModule,
    UploadModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    CategoriesModule,
    AnalyticsModule,
    InventoryMovementsModule,
    AuditModule,
    BranchesModule,
    AdvisorsModule,
    CommissionModelsModule,
    SalesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TimezoneMiddleware).forRoutes('*'); // ← se aplica a TODAS las rutas
  }
}
