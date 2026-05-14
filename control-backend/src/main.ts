import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CorsMiddleware } from './middlewares/cors.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);



  // Registra el middleware global de CORS
  app.use(new CorsMiddleware().use);

  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    console.log("🔥 REQUEST:", req.method, req.url);
    next();
  });
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log("🔥 BACKEND ACTIVO EN RAILWAY");
}

bootstrap();