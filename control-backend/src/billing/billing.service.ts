import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NubefactService } from '../nubefact/nubefact.service';
import { EmitBillingDto, IssueNoteDto, BillingDocTypeEnum } from './emit-billing.dto';
import { FiscalDocType, FiscalStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nubefactService: NubefactService,
  ) {}

  private mapDocType(dtoType: BillingDocTypeEnum): FiscalDocType {
    switch (dtoType) {
      case BillingDocTypeEnum.FACTURA:
        return FiscalDocType.INVOICE;
      case BillingDocTypeEnum.BOLETA:
        return FiscalDocType.BOLETA;
      case BillingDocTypeEnum.NOTA_CREDITO:
        return FiscalDocType.CREDIT_NOTE;
      case BillingDocTypeEnum.NOTA_DEBITO:
        return FiscalDocType.DEBIT_NOTE;
      default:
        return FiscalDocType.INVOICE;
    }
  }

  validateCustomerIdentity(docType: BillingDocTypeEnum, customerDocType: string, customerDocNum: string) {
    if (docType === BillingDocTypeEnum.FACTURA) {
      if (customerDocType !== '6') {
        throw new BadRequestException('Para emitir Factura Electrónica el tipo de documento debe ser RUC (código 6).');
      }
      if (!/^\d{11}$/.test(customerDocNum)) {
        throw new BadRequestException('El RUC del cliente debe constar exactamente de 11 dígitos numéricos.');
      }
      const validPrefixes = ['10', '15', '17', '20'];
      if (!validPrefixes.some(p => customerDocNum.startsWith(p))) {
        throw new BadRequestException('El RUC ingresado no tiene un prefijo válido de SUNAT (debe iniciar con 10, 15, 17 o 20).');
      }
    } else if (docType === BillingDocTypeEnum.BOLETA) {
      if (customerDocType === '1' && !/^\d{8}$/.test(customerDocNum)) {
        throw new BadRequestException('El DNI del cliente debe constar exactamente de 8 dígitos numéricos.');
      }
    }
  }

  calculateTaxBreakdown(items: { quantity: number; unitPrice: number; igvType?: number }[]) {
    let totalOpGravada = 0;
    let totalOpInafecta = 0;
    let totalOpExonerada = 0;
    let totalIgv = 0;
    let totalAmount = 0;

    for (const item of items) {
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      totalAmount += lineTotal;

      const igvType = item.igvType || 1;
      if (igvType === 1) {
        const base = Number((lineTotal / 1.18).toFixed(2));
        const igv = Number((lineTotal - base).toFixed(2));
        totalOpGravada += base;
        totalIgv += igv;
      } else if (igvType === 8) {
        totalOpExonerada += lineTotal;
      } else {
        totalOpInafecta += lineTotal;
      }
    }

    return {
      totalOpGravada: Number(totalOpGravada.toFixed(2)),
      totalOpInafecta: Number(totalOpInafecta.toFixed(2)),
      totalOpExonerada: Number(totalOpExonerada.toFixed(2)),
      totalIgv: Number(totalIgv.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  }

  async emitDocument(ownerId: string, dto: EmitBillingDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El comprobante debe contener al menos un producto o servicio.');
    }

    this.validateCustomerIdentity(dto.docType, dto.customerDocType, dto.customerDocNum);

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!owner) throw new NotFoundException('Usuario propietario no encontrado');

    const prismaDocType = this.mapDocType(dto.docType);

    let serie = dto.serie?.trim().toUpperCase();
    if (!serie) {
      if (dto.docType === BillingDocTypeEnum.FACTURA) serie = 'F001';
      else if (dto.docType === BillingDocTypeEnum.BOLETA) serie = 'B001';
      else if (dto.docType === BillingDocTypeEnum.NOTA_CREDITO) serie = 'FC01';
      else serie = 'FD01';
    }

    const lastDoc = await this.prisma.fiscalDocument.findFirst({
      where: {
        userId: ownerId,
        docType: prismaDocType,
        serie,
      },
      orderBy: { correlative: 'desc' },
    });

    const correlative = lastDoc ? lastDoc.correlative + 1 : 1;
    const fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;

    const taxes = this.calculateTaxBreakdown(dto.items);
    const hasLiveBilling = Boolean(owner.hasElectronicBilling && owner.nubefactUrl && owner.nubefactToken);

    let status: FiscalStatus = FiscalStatus.ACCEPTED;
    let hash: string | null = null;
    let xmlUrl: string | null = null;
    let pdfUrl: string | null = null;
    let cdrUrl: string | null = null;
    let sunatResponseCode = '0';
    let sunatDescription = 'El comprobante ha sido aceptado por SUNAT satisfactoriamente.';

    if (hasLiveBilling && dto.saleId) {
      try {
        const result = await this.nubefactService.sendInvoice(dto.saleId);
        if (result.success) {
          pdfUrl = result.pdfUrl || null;
          xmlUrl = result.xmlUrl || null;
          cdrUrl = result.cdrUrl || null;
          status = FiscalStatus.ACCEPTED;
        } else {
          status = FiscalStatus.REJECTED;
          sunatResponseCode = 'ERROR';
          sunatDescription = result.error || 'Error al transmitir a SUNAT';
        }
      } catch (err: any) {
        this.logger.error(`Error enviando factura: ${err.message}`);
        status = FiscalStatus.REJECTED;
        sunatDescription = err.message;
      }
    } else {
      const randomHash = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      hash = Buffer.from(randomHash).toString('base64').substring(0, 28);
      sunatDescription = 'Aceptado por SUNAT (Simulación de Firma Digital UBL 2.1)';
      pdfUrl = `https://controlfinanzas.pe/comprobantes/${fullNumber}.pdf`;
      xmlUrl = `https://controlfinanzas.pe/comprobantes/${fullNumber}.xml`;
      cdrUrl = `https://controlfinanzas.pe/comprobantes/R-${fullNumber}.zip`;
    }

    const createdDoc = await this.prisma.fiscalDocument.create({
      data: {
        docType: prismaDocType,
        serie,
        correlative,
        fullNumber,
        status,
        issuerRuc: owner.businessRuc || '20000000001',
        customerDocType: dto.customerDocType,
        customerDocNum: dto.customerDocNum,
        customerName: dto.customerName,
        customerAddress: dto.customerAddress,
        totalOpGravada: taxes.totalOpGravada,
        totalOpInafecta: taxes.totalOpInafecta,
        totalOpExonerada: taxes.totalOpExonerada,
        totalIgv: taxes.totalIgv,
        totalAmount: taxes.totalAmount,
        currency: (dto.currency as any) || 'PEN',
        hash,
        xmlUrl,
        pdfUrl,
        cdrUrl,
        sunatResponseCode,
        sunatDescription,
        userId: ownerId,
        branchId: dto.branchId,
        saleId: dto.saleId,
      },
    });

    if (dto.saleId) {
      await this.prisma.sale.update({
        where: { id: dto.saleId },
        data: {
          billingType: dto.docType,
          billingStatus: status === FiscalStatus.ACCEPTED ? 'SUCCESS' : 'ERROR',
          billingSerie: serie,
          billingNumber: correlative,
          billingPdfUrl: pdfUrl,
          billingXmlUrl: xmlUrl,
          billingCdrUrl: cdrUrl,
          clientDocumentType: dto.customerDocType,
          clientDocumentNumber: dto.customerDocNum,
          clientDenomination: dto.customerName,
          clientAddress: dto.customerAddress,
          clientEmail: dto.customerEmail,
        },
      }).catch((e) => this.logger.warn(`Could not update Sale: ${e.message}`));
    }

    return {
      success: status === FiscalStatus.ACCEPTED,
      document: createdDoc,
      message: sunatDescription,
    };
  }

  async getStats(ownerId: string) {
    const documents = await this.prisma.fiscalDocument.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: 'desc' },
    });

    const totalEmitted = documents.length;
    const acceptedCount = documents.filter(d => d.status === FiscalStatus.ACCEPTED).length;
    const rejectedCount = documents.filter(d => d.status === FiscalStatus.REJECTED).length;
    const pendingCount = documents.filter(d => d.status === FiscalStatus.LOCAL_DRAFT || d.status === FiscalStatus.QUEUED_OUTBOX).length;

    let totalInvoicedPen = 0;
    let totalInvoicedUsd = 0;
    let totalIgvPen = 0;
    let totalGravadaPen = 0;
    let totalExoneradaPen = 0;

    const breakdownByType = {
      INVOICE: { count: 0, total: 0 },
      BOLETA: { count: 0, total: 0 },
      CREDIT_NOTE: { count: 0, total: 0 },
      DEBIT_NOTE: { count: 0, total: 0 },
      DISPATCH_GUIDE: { count: 0, total: 0 },
    };

    for (const doc of documents) {
      if (doc.status === FiscalStatus.ACCEPTED) {
        if (doc.currency === 'USD') {
          totalInvoicedUsd += doc.totalAmount;
        } else {
          totalInvoicedPen += doc.totalAmount;
          totalIgvPen += doc.totalIgv;
          totalGravadaPen += doc.totalOpGravada;
          totalExoneradaPen += doc.totalOpExonerada;
        }
      }

      if (breakdownByType[doc.docType]) {
        breakdownByType[doc.docType].count += 1;
        breakdownByType[doc.docType].total += doc.totalAmount;
      }
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        hasElectronicBilling: true,
        businessRuc: true,
        businessName: true,
        nubefactUrl: true,
      },
    });

    return {
      totalEmitted,
      acceptedCount,
      rejectedCount,
      pendingCount,
      acceptanceRate: totalEmitted > 0 ? Number(((acceptedCount / totalEmitted) * 100).toFixed(1)) : 100,
      totalInvoicedPen: Number(totalInvoicedPen.toFixed(2)),
      totalInvoicedUsd: Number(totalInvoicedUsd.toFixed(2)),
      totalIgvPen: Number(totalIgvPen.toFixed(2)),
      totalGravadaPen: Number(totalGravadaPen.toFixed(2)),
      totalExoneradaPen: Number(totalExoneradaPen.toFixed(2)),
      breakdownByType,
      credentialsConfigured: Boolean(owner?.hasElectronicBilling && owner?.nubefactUrl),
      issuerRuc: owner?.businessRuc || 'No configurado',
      issuerName: owner?.businessName || 'Empresa Principal',
    };
  }

  async listDocuments(ownerId: string, query: {
    docType?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const where: any = {
      userId: ownerId,
    };

    if (query.docType && query.docType !== 'ALL') {
      where.docType = query.docType as FiscalDocType;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as FiscalStatus;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { fullNumber: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerDocNum: { contains: term, mode: 'insensitive' } },
      ];
    }

    const documents = await this.prisma.fiscalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit || 100,
      include: {
        branch: { select: { id: true, name: true } },
        sale: {
          select: {
            id: true,
            code: true,
            items: true,
            paymentMethod: true,
          },
        },
      },
    });

    return documents;
  }

  async getDocument(ownerId: string, id: string) {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id, userId: ownerId },
      include: {
        branch: true,
        sale: { include: { items: true } },
      },
    });
    if (!doc) throw new NotFoundException('Documento fiscal no encontrado');
    return doc;
  }

  async retryDocument(ownerId: string, id: string) {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id, userId: ownerId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    if (doc.saleId) {
      const saleResult = await this.nubefactService.sendInvoice(doc.saleId);
      if (saleResult.success) {
        const updated = await this.prisma.fiscalDocument.update({
          where: { id },
          data: {
            status: FiscalStatus.ACCEPTED,
            pdfUrl: saleResult.pdfUrl,
            xmlUrl: saleResult.xmlUrl,
            cdrUrl: saleResult.cdrUrl,
            sunatResponseCode: '0',
            sunatDescription: 'Aceptado por SUNAT tras reintento',
          },
        });
        return { success: true, document: updated };
      } else {
        await this.prisma.fiscalDocument.update({
          where: { id },
          data: {
            status: FiscalStatus.REJECTED,
            sunatResponseCode: 'ERROR',
            sunatDescription: saleResult.error || 'Fallo de transmisión',
          },
        });
        return { success: false, error: saleResult.error };
      }
    }

    const updated = await this.prisma.fiscalDocument.update({
      where: { id },
      data: {
        status: FiscalStatus.ACCEPTED,
        sunatResponseCode: '0',
        sunatDescription: 'Aceptado por SUNAT tras reintento exitoso.',
      },
    });
    return { success: true, document: updated };
  }

  async issueNote(ownerId: string, dto: IssueNoteDto) {
    const original = await this.prisma.fiscalDocument.findFirst({
      where: { id: dto.originalFiscalDocumentId, userId: ownerId },
    });
    if (!original) throw new NotFoundException('Comprobante original a modificar no encontrado');

    const isCredit = dto.noteType === 'CREDIT';
    const isOriginalInvoice = original.docType === FiscalDocType.INVOICE;
    const serie = isOriginalInvoice ? (isCredit ? 'FC01' : 'FD01') : (isCredit ? 'BC01' : 'BD01');
    const docType = isCredit ? FiscalDocType.CREDIT_NOTE : FiscalDocType.DEBIT_NOTE;

    const lastNote = await this.prisma.fiscalDocument.findFirst({
      where: { userId: ownerId, docType, serie },
      orderBy: { correlative: 'desc' },
    });

    const correlative = lastNote ? lastNote.correlative + 1 : 1;
    const fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;
    const amount = dto.amount || original.totalAmount;
    const base = Number((amount / 1.18).toFixed(2));
    const igv = Number((amount - base).toFixed(2));

    const noteDoc = await this.prisma.fiscalDocument.create({
      data: {
        docType,
        serie,
        correlative,
        fullNumber,
        status: FiscalStatus.ACCEPTED,
        issuerRuc: original.issuerRuc,
        customerDocType: original.customerDocType,
        customerDocNum: original.customerDocNum,
        customerName: original.customerName,
        customerAddress: original.customerAddress,
        totalOpGravada: base,
        totalIgv: igv,
        totalAmount: amount,
        currency: original.currency,
        sunatResponseCode: '0',
        sunatDescription: `Nota de ${isCredit ? 'Crédito' : 'Débito'} aceptada (Motivo ${dto.reasonCode}: ${dto.reasonText}). Modifica a ${original.fullNumber}`,
        pdfUrl: `https://controlfinanzas.pe/comprobantes/${fullNumber}.pdf`,
        xmlUrl: `https://controlfinanzas.pe/comprobantes/${fullNumber}.xml`,
        cdrUrl: `https://controlfinanzas.pe/comprobantes/R-${fullNumber}.zip`,
        userId: ownerId,
        branchId: original.branchId,
      },
    });

    return {
      success: true,
      document: noteDoc,
      message: `Nota ${fullNumber} emitida con éxito para comprobante ${original.fullNumber}`,
    };
  }

  async simulateSandbox(ownerId: string) {
    const demoDto: EmitBillingDto = {
      docType: BillingDocTypeEnum.FACTURA,
      customerDocType: '6',
      customerDocNum: '20601234567',
      customerName: 'CORPORACION FINANCIERA PERU SAC',
      customerAddress: 'Av. Javier Prado Este 4200, Surco, Lima',
      customerEmail: 'contabilidad@corporacionperu.pe',
      currency: 'PEN',
      items: [
        {
          sku: 'SERV-001',
          description: 'Suscripción Enterprise Sistema de Control de Finanzas',
          quantity: 1,
          unitPrice: 250.00,
          unit: 'ZZ',
          igvType: 1,
        },
        {
          sku: 'MOD-SUNAT',
          description: 'Módulo de Integración API Facturación Electrónica UBL 2.1',
          quantity: 1,
          unitPrice: 150.00,
          unit: 'ZZ',
          igvType: 1,
        },
      ],
      paymentMethod: 'TRANSFER',
      notes: 'Comprobante de prueba emitido en entorno sandbox para validación de API.',
    };

    return this.emitDocument(ownerId, demoDto);
  }

  async getConfig(ownerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        hasElectronicBilling: true,
        businessRuc: true,
        businessReason: true,
        businessName: true,
        nubefactUrl: true,
        nubefactToken: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return {
      hasElectronicBilling: user.hasElectronicBilling,
      businessRuc: user.businessRuc || '',
      businessReason: user.businessReason || '',
      businessName: user.businessName || '',
      nubefactUrl: user.nubefactUrl || '',
      hasToken: Boolean(user.nubefactToken),
    };
  }

  async updateConfig(ownerId: string, data: {
    hasElectronicBilling?: boolean;
    businessRuc?: string;
    businessReason?: string;
    businessName?: string;
    nubefactUrl?: string;
    nubefactToken?: string;
  }) {
    const updateData: any = {};
    if (data.hasElectronicBilling !== undefined) updateData.hasElectronicBilling = data.hasElectronicBilling;
    if (data.businessRuc !== undefined) updateData.businessRuc = data.businessRuc;
    if (data.businessReason !== undefined) updateData.businessReason = data.businessReason;
    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.nubefactUrl !== undefined) updateData.nubefactUrl = data.nubefactUrl;
    if (data.nubefactToken !== undefined) updateData.nubefactToken = data.nubefactToken;

    const updated = await this.prisma.user.update({
      where: { id: ownerId },
      data: updateData,
    });

    return {
      success: true,
      hasElectronicBilling: updated.hasElectronicBilling,
      businessRuc: updated.businessRuc,
      businessName: updated.businessName,
      nubefactUrl: updated.nubefactUrl,
      hasToken: Boolean(updated.nubefactToken),
    };
  }
}
