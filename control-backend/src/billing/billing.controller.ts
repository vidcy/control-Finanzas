import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '@nestjs/passport';
import { EmitBillingDto, IssueNoteDto } from './emit-billing.dto';

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
  @Post('simulate-sandbox')
  simulateSandbox(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.simulateSandbox(ownerId);
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
      nubefactUrl?: string;
      nubefactToken?: string;
    },
  ) {
    const ownerId = req.user.parentId || req.user.id;
    return this.billingService.updateConfig(ownerId, body);
  }
}
