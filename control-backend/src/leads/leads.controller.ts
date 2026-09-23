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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // PÚBLICO: Captura de prospectos desde Landing Page, Demos y Citas
  @Post()
  create(@Body() body: any) {
    return this.leadsService.create(body);
  }

  // PÚBLICO: Interacción con el Asesor Virtual en tiempo real
  @Post('chat-message')
  chatMessage(@Body() body: any) {
    return this.leadsService.handleChatMessage(body);
  }

  // PROTEGIDO: Métrica resumen para el panel administrativo
  @UseGuards(AuthGuard('jwt'))
  @Get('stats')
  getStats() {
    return this.leadsService.getStats();
  }

  // PROTEGIDO: Listado de prospectos para el panel
  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Query('status') status?: string) {
    return this.leadsService.findAll(status);
  }

  // PROTEGIDO: Detalle de un prospecto
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  // PROTEGIDO: Actualizar estado, notas o fecha de cita
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.leadsService.update(id, body);
  }

  // PROTEGIDO: Eliminar prospecto
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}