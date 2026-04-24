import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Request,
    UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
    constructor(private categoriesService: CategoriesService) { }

    // 🔹 Crear categoría
    @Post()
    create(
        @Body() body: { name: string; type: 'INCOME' | 'EXPENSE' },
        @Request() req,
    ) {
        const userId = req.user.sub;
        return this.categoriesService.create(body.name, body.type, userId);
    }

    // 🔹 Listar MIS categorías
    @Get()
    findAll(@Request() req) {
        const userId = req.user.sub;
        return this.categoriesService.findAllByUser(userId);
    }

    // 🔹 Eliminar categoría
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        const userId = req.user.sub;
        return this.categoriesService.remove(id, userId);
    }
}