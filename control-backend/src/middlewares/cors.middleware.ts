// src/middlewares/cors.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Configura los headers de CORS para todas las respuestas
        res.header('Access-Control-Allow-Origin', 'https://mifront-production.up.railway.app');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');

        // Si la petición es OPTIONS, responde con 200 y termina
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }

        next();
    }
}