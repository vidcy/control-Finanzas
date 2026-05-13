import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 SOLUCIÓN CORS COMPLETA (IMPORTANTE)
  const allowedOrigins = [
    'http://localhost:5173', // dev local
    'https://mifront-production.up.railway.app', // producción
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // permitir requests sin origin (postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // ⭐ ESTA ES LA CLAVE
}
bootstrap();
