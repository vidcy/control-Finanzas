import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 SOLUCIÓN CORS COMPLETA (IMPORTANTE)
  app.enableCors({
    origin: '*', // frontend Vite
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // ⭐ ESTA ES LA CLAVE
}
bootstrap();
