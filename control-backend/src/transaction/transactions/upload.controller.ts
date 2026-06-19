import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../../files/files.service';

@Controller('upload')
export class UploadController {
    constructor(private readonly filesService: FilesService) { }

    @Post('receipt')
    @UseInterceptors(FileInterceptor('file')) // 'file' es el nombre del campo en el formulario
    async upload(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No se envió archivo');
        const url = await this.filesService.uploadReceipt(file);
        return { url }; // <-- Esto devuelve la URL que tu frontend debe capturar
    }
}