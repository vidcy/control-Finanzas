import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
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
  ) {
    return this.cashShiftService.openShift(req.user.id, initialBalance);
  }

  @Post('close')
  async closeShift(@Request() req) {
    return this.cashShiftService.closeShift(req.user.id);
  }

  @Get('active')
  async getActiveShift(@Request() req) {
    return this.cashShiftService.getActiveShift(req.user.id);
  }

  @Get('history')
  async getShiftHistory(@Request() req) {
    return this.cashShiftService.getShiftHistory(req.user.id);
  }
}
