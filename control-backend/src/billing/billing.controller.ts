import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '@nestjs/passport';
import { EmitBillingDto, IssueNoteDto, UpdateBillingDto, DeleteBillingDto, SyncSeriesDto } from './emit-billing.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('stats')
  getStats(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.getStats(ownerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('documents')
  listDocuments(
    @Req() req,
    @Query('docType') docType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.listDocuments(ownerId, {
      docType,
      status,
      search,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('documents/:id')
  getDocument(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.getDocument(ownerId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('emit')
  emitDocument(@Req() req, @Body() dto: EmitBillingDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.emitDocument(ownerId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('retry/:id')
  retryDocument(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.retryDocument(ownerId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('note')
  issueNote(@Req() req, @Body() dto: IssueNoteDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.issueNote(ownerId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(['documents/:id/smart-edit', ':id/smart-edit', 'smart-edit/:id'])
  smartEditDocument(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.smartEditBillingDocument(ownerId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(['documents/:id/manual-note', ':id/manual-note', 'manual-note/:id'])
  emitManualNote(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.emitManualNoteForDocument(ownerId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(['documents/:id/guia-remision', ':id/guia-remision', 'guia-remision/:id'])
  emitGuiaRemision(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.emitGuiaRemisionForDocument(ownerId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(['guia-remision', 'documents/guia-remision'])
  emitStandaloneGuiaRemision(@Req() req, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.emitGuiaRemisionForDocument(ownerId, 'standalone', body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('simulate-sandbox')
  simulateSandbox(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.simulateSandbox(ownerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('documents/:id')
  updateDocument(@Req() req, @Param('id') id: string, @Body() dto: UpdateBillingDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.updateDocument(ownerId, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('documents/:id')
  deleteDocument(@Req() req, @Param('id') id: string, @Body() dto?: DeleteBillingDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.deleteDocument(ownerId, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('test-connection')
  testCcofactConnection(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.testCcofactConnection(ownerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('config')
  getConfig(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.getConfig(ownerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('config')
  updateConfig(
    @Req() req,
    @Body()
    body: {
      hasElectronicBilling?: boolean;
      businessRuc?: string;
      businessReason?: string;
      businessName?: string;
      businessAddress?: string;
      businessDepartment?: string;
      businessProvince?: string;
      businessDistrict?: string;
      ccofactUrl?: string;
      ccofactApiKey?: string;
      billingSerieBoleta?: string;
      billingSerieInvoice?: string;
    },
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.updateConfig(ownerId, body);
  }


  @UseGuards(AuthGuard('jwt'))
  @Post(['documents/:id/baja-gre', ':id/baja-gre'])
  bajaGuiaRemision(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { motivo: string; constanciaTicket?: string },
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.bajaGuiaRemision(ownerId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('consultar-ruc/:ruc')
  consultarRuc(@Param('ruc') ruc: string) {
    return this.billingService.consultarRuc(ruc);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('sync-series')
  syncSeries(@Req() req, @Body() body: SyncSeriesDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.syncSeries(ownerId, body);
  }

  // Rutas alias para compatibilidad universal
  @UseGuards(AuthGuard('jwt'))
  @Post('series')
  syncSeriesPostAlias(@Req() req, @Body() body: SyncSeriesDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.syncSeries(ownerId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('series')
  syncSeriesPutAlias(@Req() req, @Body() body: SyncSeriesDto) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.syncSeries(ownerId, body);
  }
}
