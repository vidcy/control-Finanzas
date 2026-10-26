import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // PÚBLICO: Captura de prospectos desde Landing Page, Demos, Citas y Catálogos Web
  @Post()
  create(@Body() body: any) {
    return this.leadsService.create(body);
  }

  // PÚBLICO: Interacción con el Asesor Virtual en tiempo real
  @Post('chat-message')
  chatMessage(@Body() body: any) {
    return this.leadsService.handleChatMessage(body);
  }

  // PROTEGIDO: Métrica resumen para el panel administrativo o de tienda
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats(@Req() req: any, @Query('scope') scope?: string) {
    return this.leadsService.getStats(req.user, scope);
  }

  // PROTEGIDO: Listado de prospectos para el panel
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
  ) {
    return this.leadsService.findAll(req.user, status, scope);
  }

  // PROTEGIDO: Detalle de un prospecto
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  // PROTEGIDO: Actualizar estado, notas o fecha de cita
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.leadsService.update(id, body);
  }

  // PROTEGIDO: Eliminar prospecto
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
