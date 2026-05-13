import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'http://localhost:5173',
    'https://mifront-production.up.railway.app',
  ];

  app.enableCors({
    origin: allowedOrigins,   // ⭐ CAMBIO CLAVE
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // ⭐⭐ CLAVE
    allowedHeaders: 'Content-Type, Accept, Authorization', // ⭐⭐ CLAVE
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();