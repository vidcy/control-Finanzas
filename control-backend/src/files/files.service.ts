import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class FilesService {
    constructor() {
        // Aquí configuras tus credenciales (puedes ponerlas en el .env)
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadReceipt(file: Express.Multer.File): Promise<string> {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new BadRequestException('Las credenciales de Cloudinary no están configuradas en el archivo .env del backend (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
        }
        // Validación estricta de formatos
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Formato no permitido. Solo JPG, PNG, WEBP o PDF.');
        }

        // Subida profesional usando streams (muy rápido y eficiente)
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'comprobantes' }, // Carpeta en Cloudinary
                (error, result) => {
                    if (error) return reject(new BadRequestException(error.message));
                    resolve(result.secure_url); // Esta URL es la que guardas en Prisma
                }
            );
            Readable.from(file.buffer).pipe(uploadStream);
        });
    }

    async uploadProductImage(file: Express.Multer.File): Promise<string> {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new BadRequestException('Las credenciales de Cloudinary no están configuradas en el archivo .env del backend (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
        }
        // Validación de imágenes del producto
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Formato no permitido. Solo imágenes JPG, PNG o WEBP.');
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'productos' }, // Carpeta en Cloudinary
                (error, result) => {
                    if (error) return reject(new BadRequestException(error.message));
                    resolve(result.secure_url);
                }
            );
            Readable.from(file.buffer).pipe(uploadStream);
        });
    }
}