import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { CategoriesService } from './category.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto } from './update.category.dto';
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // 🔹 Crear categoría
  @Post()
  create(@Req() req, @Body() dto: CreateCategoryDto) {
    return this.service.create(req.user.id, dto);
  }

  // 🔹 Listar MIS categorías
  @Get()
  findAll(@Req() req) {
    return this.service.findAllByUser(req.user.id);
  }
  // 🔹 Obtener una categoría por id, solo si es del usuario
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.service.findOne(req.user.id, id);
  }
  // 🔹 Actualizar categoría
  @Put(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(req.user.id, id, dto);
  } // 🔹 Eliminar categoría

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
  @UseGuards(JwtAuthGuard)
  @Post('seed-default')
  async seed(@Req() req) {
    return this.service.seedDefaultCategories(req.user.id);
  }
}
