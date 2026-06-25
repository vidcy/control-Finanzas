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

  @Post('purchase-orders')
  createPurchaseOrder(@Req() req, @Body() body: any) {
    return this.productsService.createPurchaseOrder(req.user.id, body);
  }

  @Get('purchase-orders')
  getPurchaseOrders(@Req() req, @Query('status') status?: string) {
    return this.productsService.getPurchaseOrders(req.user.id, status);
  }

  @Post('purchase-orders/:id/receive')
  receivePurchaseOrder(@Req() req, @Param('id') id: string) {
    return this.productsService.receivePurchaseOrder(req.user.id, id);
  }

  @Post('purchase-orders/:id/pay')
  payPurchaseOrder(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.productsService.payPurchaseOrder(req.user.id, id, body);
  }

  @Post('purchase-orders/:id/revert')
  revertPurchaseOrder(@Req() req, @Param('id') id: string) {
    return this.productsService.revertPurchaseOrder(req.user.id, id);
  }

  @Patch('purchase-orders/:id/cancel')
  cancelPurchaseOrder(@Req() req, @Param('id') id: string) {
    return this.productsService.cancelPurchaseOrder(req.user.id, id);
  }

  @Delete('purchase-orders/:id')
  deletePurchaseOrder(@Req() req, @Param('id') id: string) {
    return this.productsService.deletePurchaseOrder(req.user.id, id);
  }

  @Patch('purchase-orders/:id')
  updatePurchaseOrder(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.productsService.updatePurchaseOrder(req.user.id, id, body);
  }

  @Post(':id/restock')
  restock(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.productsService.restock(req.user.id, id, body);
  }

  @Get('brands')
  getBrands(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.getBrands(ownerId);
  }

  @Post('brands')
  createBrand(@Req() req, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.createBrand(ownerId, body);
  }

  @Patch('brands/:id')
  updateBrand(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.updateBrand(ownerId, id, body);
  }

  @Delete('brands/:id')
  deleteBrand(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.deleteBrand(ownerId, id);
  }

  @Get('families')
  getFamilies(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.getFamilies(ownerId);
  }

  @Post('families')
  createFamily(@Req() req, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.createFamily(ownerId, body);
  }

  @Patch('families/:id')
  updateFamily(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.updateFamily(ownerId, id, body);
  }

  @Delete('families/:id')
  deleteFamily(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.productsService.deleteFamily(ownerId, id);
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
