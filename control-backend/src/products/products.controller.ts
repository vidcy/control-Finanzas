import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('checkout')
  checkout(@Req() req, @Body() body: any) {
    return this.productsService.checkout(req.user.id, body);
  }

  @Post(':id/restock')
  restock(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.productsService.restock(req.user.id, id, body);
  }

  @Post()
  create(@Req() req, @Body() data: any) {
    return this.productsService.create(req.user.id, data);
  }

  @Get('low-stock-analysis')
  getLowStockAnalysis(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.productsService.getLowStockAnalysis(req.user.id, startDate, endDate);
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
