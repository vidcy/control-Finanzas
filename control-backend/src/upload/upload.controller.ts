import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnsupportedMediaTypeException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Request } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt.guard';

// Allowed image-only types
const IMAGE_TYPES = {
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

// Allowed document types (receipt/comprobante) — includes PDF
const DOCUMENT_TYPES = {
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

function ensureUploadsDir(subdir: string) {
  const dir = join(process.cwd(), 'uploads', subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function buildStorageOptions(subdir: string) {
  return diskStorage({
    destination: (req, file, cb) => {
      const dir = ensureUploadsDir(subdir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
}

function buildFileFilter(allowed: typeof IMAGE_TYPES) {
  return (req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!allowed.extensions.includes(ext) || !allowed.mimeTypes.includes(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `Tipo de archivo no permitido. Solo se acepta: ${allowed.extensions.join(', ')}`,
        ),
        false,
      );
    }
    cb(null, true);
  };
}

function buildAbsoluteUrl(req: Request, subdir: string, filename: string): string {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/uploads/${subdir}/${filename}`;
}

@Controller('upload')
export class UploadController {
  /**
   * Upload a PRODUCT IMAGE (no PDF, images only)
   * Used by: BusinessInventoryPage to attach a product photo
   */
  @UseGuards(JwtAuthGuard)
  @Post('product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildStorageOptions('products'),
      fileFilter: buildFileFilter(IMAGE_TYPES),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for product images
    }),
  )
  uploadProductImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo o el tipo no es soportado.');
    }
    const url = buildAbsoluteUrl(req, 'products', file.filename);
    return {
      message: 'Imagen del producto subida correctamente',
      url,
      filename: file.filename,
    };
  }

  /**
   * Upload a RECEIPT / COMPROBANTE (image or PDF)
   * Used by: POS checkout with Yape/Plin/digital, Finance transactions
   */
  @UseGuards(JwtAuthGuard)
  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildStorageOptions('receipts'),
      fileFilter: buildFileFilter(DOCUMENT_TYPES),
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB for receipts
    }),
  )
  uploadReceipt(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo o el tipo no es soportado.');
    }
    const url = buildAbsoluteUrl(req, 'receipts', file.filename);
    return {
      message: 'Comprobante subido correctamente',
      url,
      filename: file.filename,
    };
  }
}
