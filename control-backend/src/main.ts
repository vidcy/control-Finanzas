import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ⭐⭐ MUY IMPORTANTE PARA RAILWAY / PROXIES
  app.set('trust proxy', 1);

  // ⭐⭐ ESTO RESPONDE EL PREFLIGHT OPTIONS ANTES DE NEST
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://mifront-production.up.railway.app');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.header('Access-Control-Allow-Credentials', 'true');

    // ⭐ RESPUESTA DIRECTA AL PREFLIGHT
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  // CORS normal de Nest (se deja también)
  app.enableCors({
    origin: 'https://mifront-production.up.railway.app',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();