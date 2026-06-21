import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FilesService } from '../files/files.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload a PRODUCT IMAGE (no PDF, images only)
   * Uploads to Cloudinary 'productos' folder
   */
  @UseGuards(JwtAuthGuard)
  @Post('product-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No se envió ningún archivo o el tipo no es soportado.',
      );
    }
    const url = await this.filesService.uploadProductImage(file);
    return {
      message: 'Imagen del producto subida correctamente a Cloudinary',
      url,
    };
  }

  /**
   * Upload a RECEIPT / COMPROBANTE (image or PDF)
   * Uploads to Cloudinary 'comprobantes' folder
   */
  @UseGuards(JwtAuthGuard)
  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
    }),
  )
  async uploadReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No se envió ningún archivo o el tipo no es soportado.',
      );
    }
    const url = await this.filesService.uploadReceipt(file);
    return {
      message: 'Comprobante subido correctamente a Cloudinary',
      url,
    };
  }
}
