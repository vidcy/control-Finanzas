import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class FilesService {
  private getS3Client(): S3Client {
    if (
      !process.env.DO_SPACES_KEY ||
      !process.env.DO_SPACES_SECRET ||
      !process.env.DO_SPACES_ENDPOINT ||
      !process.env.DO_SPACES_BUCKET
    ) {
      throw new BadRequestException(
        'Las credenciales de DigitalOcean Spaces no están configuradas correctamente en el archivo .env (DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET).',
      );
    }

    return new S3Client({
      endpoint: process.env.DO_SPACES_ENDPOINT,
      region: 'us-east-1', // DigitalOcean Spaces ignora la región pero el SDK de AWS la requiere
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
      },
    });
  }

  private generateKey(folder: string, originalName: string): string {
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    return `${folder}/${uniqueSuffix}-${cleanName}`;
  }

  private getAbsoluteUrl(key: string): string {
    const bucket = process.env.DO_SPACES_BUCKET || '';
    const cdnBase = process.env.DO_SPACES_CDN || '';
    const endpoint = process.env.DO_SPACES_ENDPOINT || '';

    if (cdnBase) {
      const cleanCdn = cdnBase.replace(/\/$/, '');
      try {
        const parsed = new URL(cleanCdn);
        // Si es el host CDN genérico de DO y no comienza con el nombre del bucket
        if (parsed.hostname.endsWith('.cdn.digitaloceanspaces.com') && !parsed.hostname.startsWith(bucket)) {
          return `https://${bucket}.${parsed.hostname}/${key}`;
        }
      } catch (e) {
        // Fallback si no es una URL válida
      }
      return `${cleanCdn}/${key}`;
    }

    // Endpoint estándar de DO Spaces: https://{bucket}.{region}.digitaloceanspaces.com o similar
    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${bucket}.${cleanEndpoint}/${key}`;
  }

  async uploadReceipt(file: Express.Multer.File): Promise<string> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'image/heic',
      'image/heif',
      'image/octet-stream',
      'application/octet-stream',
    ];

    const originalName = file.originalname || 'photo.jpg';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'];

    const isValidMime = allowedMimeTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(extension);

    if (!isValidMime && !isValidExt) {
      throw new BadRequestException(
        'Formato no permitido. Solo JPG, PNG, WEBP, PDF o HEIC.',
      );
    }

    let contentType = file.mimetype;
    if (contentType === 'application/octet-stream' || contentType === 'image/octet-stream') {
      const extToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        pdf: 'application/pdf',
        heic: 'image/heic',
        heif: 'image/heif',
      };
      contentType = extToMime[extension] || contentType;
    }

    try {
      const s3Client = this.getS3Client();
      const key = this.generateKey('comprobantes', originalName);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: contentType,
          ACL: 'public-read',
        }),
      );

      return this.getAbsoluteUrl(key);
    } catch (error: any) {
      throw new BadRequestException(
        `Error al subir el comprobante a DigitalOcean Spaces: ${error.message}`,
      );
    }
  }

  async uploadProductImage(file: Express.Multer.File): Promise<string> {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/octet-stream',
      'application/octet-stream',
    ];

    const originalName = file.originalname || 'photo.jpg';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

    const isValidMime = allowedMimeTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(extension);

    if (!isValidMime && !isValidExt) {
      throw new BadRequestException(
        'Formato no permitido. Solo imágenes JPG, PNG, WEBP o HEIC.',
      );
    }

    let contentType = file.mimetype;
    if (contentType === 'application/octet-stream' || contentType === 'image/octet-stream') {
      const extToMime: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        heic: 'image/heic',
        heif: 'image/heif',
      };
      contentType = extToMime[extension] || contentType;
    }

    try {
      const s3Client = this.getS3Client();
      const key = this.generateKey('productos', originalName);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: contentType,
          ACL: 'public-read',
        }),
      );

      return this.getAbsoluteUrl(key);
    } catch (error: any) {
      throw new BadRequestException(
        `Error al subir la imagen del producto a DigitalOcean Spaces: ${error.message}`,
      );
    }
  }

  async deleteFile(url: string): Promise<boolean> {
    if (!url) return false;
    try {
      const parsedUrl = new URL(url);
      let key = parsedUrl.pathname;

      const bucketName = process.env.DO_SPACES_BUCKET;
      // Remover prefijo del bucket si existe en la ruta (ej. /bucket-name/key)
      if (bucketName && key.startsWith(`/${bucketName}/`)) {
        key = key.substring(bucketName.length + 2);
      } else if (key.startsWith('/')) {
        key = key.substring(1);
      }

      key = decodeURIComponent(key);

      const s3Client = this.getS3Client();
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.DO_SPACES_BUCKET,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      console.error('Error al eliminar archivo de DigitalOcean Spaces:', error);
      return false;
    }
  }
}
