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
import { AdvisorsService } from './advisors.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('advisors')
export class AdvisorsController {
  constructor(private readonly advisorsService: AdvisorsService) {}

  @Post()
  create(@Req() req, @Body() data: { name: string; commissionPercentage?: number; commissionType?: string; commissionValue?: number; isActive?: boolean; commissionModelId?: string }) {
    const ownerId = req.user.parentId || req.user.id;
    return this.advisorsService.create(ownerId, data);
  }

  @Get()
  findAll(@Req() req, @Query('isActive') isActive?: string) {
    const ownerId = req.user.parentId || req.user.id;
    const isActiveOnly = isActive === 'true';
    return this.advisorsService.findAll(ownerId, isActive ? isActiveOnly : undefined);
  }

  @Get('commissions-report')
  getCommissionsReport(
    @Req() req,
    @Query('advisorId') advisorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.advisorsService.getCommissionsReport(ownerId, { advisorId, startDate, endDate });
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() data: Partial<{ name: string; commissionPercentage: number; commissionType: string; commissionValue: number; isActive: boolean; commissionModelId: string }>,
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.advisorsService.update(ownerId, id, data);
  }

  @Patch('commissions/:id/status')
  updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.advisorsService.updateCommissionStatus(ownerId, id, body.status);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.advisorsService.remove(ownerId, id);
  }
}
