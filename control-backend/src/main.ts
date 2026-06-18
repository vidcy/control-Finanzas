import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  // 🛡️ Filtro de Excepciones Global
  app.useGlobalFilters(new AllExceptionsFilter());

  // 📝 Validación Global Estricta
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 🔥 CORS PRIMERO (OBLIGATORIO)
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Serve uploads directory and all subdirs statically
  // Legacy: /uploads/filename.jpg (old receipts saved at root)
  // New: /uploads/products/filename.jpg (product images)
  // New: /uploads/receipts/filename.jpg (payment receipts)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });


  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}

bootstrap();
