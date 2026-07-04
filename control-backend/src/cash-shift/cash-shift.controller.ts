import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { CashShiftService } from './cash-shift.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('cash-shift')
export class CashShiftController {
  constructor(private readonly cashShiftService: CashShiftService) {}

  @Post('open')
  async openShift(
    @Request() req,
    @Body('initialBalance') initialBalance: number,
    @Body('branchId') branchId?: string,
    @Body('categoryId') categoryId?: string,
    @Body('subCategoryId') subCategoryId?: string,
  ) {
    const ownerId = req.user.id;
    const workerId = req.user.workerId || req.user.id;
    return this.cashShiftService.openShift({
      ownerId,
      workerId,
      initialBalance,
      branchId,
      categoryId,
      subCategoryId,
    });
  }

  @Post('close')
  async closeShift(
    @Request() req,
    @Body('categoryId') categoryId?: string,
    @Body('subCategoryId') subCategoryId?: string,
  ) {
    const ownerId = req.user.id;
    const workerId = req.user.workerId || req.user.id;
    return this.cashShiftService.closeShift(
      ownerId,
      workerId,
      categoryId,
      subCategoryId,
    );
  }

  @Get('active')
  async getActiveShift(@Request() req) {
    const workerId = req.user.workerId || req.user.id;
    return this.cashShiftService.getActiveShift(workerId);
  }

  @Get('history')
  async getShiftHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchId') branchId?: string,
    @Query('workerId') workerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const ownerId = req.user.id;
    const loggedInWorkerId = req.user.workerId;
    return this.cashShiftService.getShiftHistoryFiltered({
      ownerId,
      loggedInWorkerId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      branchId,
      workerId,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  async getShiftDetails(@Request() req, @Param('id') id: string) {
    const ownerId = req.user.id;
    const workerId = req.user.workerId;
    const userRole = req.user.role;
    return this.cashShiftService.getShiftDetails(id, ownerId, workerId, userRole);
  }
}
