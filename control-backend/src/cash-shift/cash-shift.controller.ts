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
    @Body('password') password?: string,
    @Body('branchId') branchId?: string,
    @Body('categoryId') categoryId?: string,
    @Body('subCategoryId') subCategoryId?: string,
    @Body('targetWorkerId') targetWorkerId?: string,
  ) {
    const ownerId = req.user.parentId || req.user.id;
    const workerId = req.user.workerId || targetWorkerId || req.user.id;
    return this.cashShiftService.openShift({
      ownerId,
      workerId,
      initialBalance,
      password,
      branchId,
      categoryId,
      subCategoryId,
    });
  }

  @Post('close')
  async closeShift(
    @Request() req,
    @Body('password') password?: string,
    @Body('categoryId') categoryId?: string,
    @Body('subCategoryId') subCategoryId?: string,
    @Body('targetWorkerId') targetWorkerId?: string,
  ) {
    const ownerId = req.user.parentId || req.user.id;
    const workerId = req.user.workerId || targetWorkerId || req.user.id;
    return this.cashShiftService.closeShift(
      ownerId,
      workerId,
      categoryId,
      subCategoryId,
      password,
    );
  }

  @Get('active')
  async getActiveShift(@Request() req) {
    const workerId = req.user.workerId || req.user.id;
    return this.cashShiftService.getActiveShift(workerId);
  }

  @Get('active-all')
  async getAllActiveShifts(@Request() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.cashShiftService.getAllActiveShifts(ownerId);
  }

  @Get('pin')
  async getPin(@Request() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.cashShiftService.getCashRegisterPin(ownerId);
  }

  @Post('pin')
  async setPin(@Request() req, @Body('pin') pin: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.cashShiftService.setCashRegisterPin(ownerId, pin);
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
