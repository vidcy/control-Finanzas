import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Middleware de CORS (manejado manualmente)
  app.use((req, res, next) => {
    // Configura los headers de CORS para TODAS las respuestas
    res.header('Access-Control-Allow-Origin', 'https://mifront-production.up.railway.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Si la petición es OPTIONS, responde con 200 y termina
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    // Log de la petición (opcional)
    console.log("🔥 REQUEST:", req.method, req.url);

    next();
  });

  // Escucha en el puerto de Railway
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🔥 Backend escuchando en el puerto ${port}`);
}

bootstrap().catch(err => {
  console.error('❌ Error al iniciar el backend:', err);
});