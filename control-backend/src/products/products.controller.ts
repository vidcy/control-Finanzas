import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Req() req, @Body() data: any) {
    return this.productsService.create(req.user.id, data);
  }

  @Get()
  findAll(@Req() req) {
    return this.productsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.productsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() data: any) {
    return this.productsService.update(req.user.id, id, data);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.productsService.remove(req.user.id, id);
  }
}
