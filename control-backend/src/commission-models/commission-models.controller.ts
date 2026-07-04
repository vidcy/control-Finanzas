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
} from '@nestjs/common';
import { CommissionModelsService } from './commission-models.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('commission-models')
export class CommissionModelsController {
  constructor(private readonly service: CommissionModelsService) {}

  @Post()
  create(@Req() req, @Body() data: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.service.create(ownerId, data);
  }

  @Get()
  findAll(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.service.findAll(ownerId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.service.findOne(ownerId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() data: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.service.update(ownerId, id, data);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.service.remove(ownerId, id);
  }
}
