import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);



  app.enableCors({
    origin: [
      'https://mifront-production.up.railway.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    console.log("🔥 REQUEST:", req.method, req.url);
    next();
  });
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log("🔥 BACKEND ACTIVO EN RAILWAY");
}

bootstrap();