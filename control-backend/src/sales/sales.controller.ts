import { Controller, Get, Post, Param, Body, Query, Req, UseGuards, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/role.guard';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  listSales(
    @Req() req,
    @Query('workspace') workspace?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') filterUserId?: string,
    @Query('branchId') branchId?: string,
    @Query('advisorId') advisorId?: string,
  ) {
    const ownerId = req.user.parentId || req.user.id;
    const workerId = req.user.parentId ? req.user.id : undefined;
    return this.salesService.listSalesFiltered({
      ownerId,
      workerId,
      workspace: workspace || 'BUSINESS',
      startDate,
      endDate,
      branchId,
      advisorId,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getSaleDetails(@Param('id') id: string) {
    return this.salesService.getSaleDetails(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/retry-billing')
  retryBilling(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.salesService.retryBilling(ownerId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/credit-note')
  issueCreditNote(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { reasonCode: number; reasonText?: string; amount?: number },
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.salesService.issueCreditNote(
      ownerId,
      id,
      dto.reasonCode || 1,
      dto.reasonText || 'Anulación',
      dto.amount,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/debit-note')
  issueDebitNote(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { reasonCode: number; reasonText?: string; amount?: number },
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.salesService.issueDebitNote(
      ownerId,
      id,
      dto.reasonCode || 1,
      dto.reasonText || 'Débito',
      dto.amount,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  deleteSale(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.salesService.deleteSale(ownerId, id);
  }
}
