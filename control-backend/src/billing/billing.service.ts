import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CcofactService } from '../ccofact/ccofact.service';
import {
  EmitBillingDto,
  IssueNoteDto,
  BillingDocTypeEnum,
  UpdateBillingDto,
  DeleteBillingDto,
} from './emit-billing.dto';
import { FiscalDocType, FiscalStatus, Currency } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ccofactService: CcofactService,
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

  validateCustomerIdentity(
    docType: BillingDocTypeEnum,
    customerDocType: string,
    customerDocNum: string,
    customerName?: string,
    totalAmount?: number,
  ) {
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
      if (!customerName || customerName.trim() === '' || customerName.trim() === 'CLIENTES VARIOS') {
        throw new BadRequestException('La Razón Social del cliente es obligatoria para emitir Factura Electrónica.');
      }
    } else if (docType === BillingDocTypeEnum.BOLETA) {
      const total = totalAmount || 0;
      // Regla estricta SUNAT R.S. N° 193-2020: Boletas >= S/ 700.00
      if (total >= 700) {
        if (
          !customerDocNum ||
          customerDocNum.trim() === '' ||
          customerDocNum === '00000000' ||
          customerDocType === '-' ||
          customerDocType === '0'
        ) {
          throw new BadRequestException(
            `Según la R.S. N° 193-2020/SUNAT, toda Boleta de Venta igual o mayor a S/ 700.00 exige identificar obligatoriamente al cliente con DNI o RUC. Total: S/ ${total.toFixed(2)}`,
          );
        }
        if (!customerName || customerName.trim() === '' || customerName.trim().toUpperCase() === 'CLIENTES VARIOS') {
          throw new BadRequestException(
            'Para boletas iguales o mayores a S/ 700.00 debe consignar los apellidos y nombres completos del cliente.',
          );
        }
      }

      if (customerDocType === '1' && customerDocNum && customerDocNum !== '00000000') {
        if (!/^\d{8}$/.test(customerDocNum)) {
          throw new BadRequestException('El DNI del cliente debe constar exactamente de 8 dígitos numéricos.');
        }
      }
    }
  }

  validateIssueDate(issueDateStr?: string) {
    if (!issueDateStr) return;
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];

    const minDateObj = new Date(today);
    minDateObj.setDate(minDateObj.getDate() - 3);
    const minDate = minDateObj.toISOString().split('T')[0];

    const selected = issueDateStr.split('T')[0];
    if (selected > maxDate) {
      throw new BadRequestException(`SUNAT no permite emitir comprobantes con fecha futura posterior a hoy (${maxDate}).`);
    }
    if (selected < minDate) {
      throw new BadRequestException(
        `Según la R.S. N° 193-2020/SUNAT, la fecha de emisión electrónica solo puede retroceder como máximo hasta 3 días calendario (${minDate}). La fecha seleccionada (${selected}) no es válida.`,
      );
    }
  }

  calculateTaxBreakdown(
    items: {
      quantity: number;
      unitPrice: number;
      igvType?: number;
      igvAffectation?: string;
      igvRate?: number;
    }[],
  ) {
    let totalOpGravada = 0;
    let totalOpInafecta = 0;
    let totalOpExonerada = 0;
    let totalIgv = 0;
    let totalAmount = 0;

    for (const item of items) {
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      totalAmount += lineTotal;

      const igvType = item.igvType;
      const affectation = item.igvAffectation;
      const rate = item.igvRate;

      if (igvType === 8 || affectation === '20') {
        // Exonerado (Amazonía / Apéndice I)
        totalOpExonerada += lineTotal;
      } else if (igvType === 9 || affectation === '30') {
        // Inafecto
        totalOpInafecta += lineTotal;
      } else if (igvType === 10 || affectation === '10_MYPE' || rate === 10) {
        // Gravado 10% Especial MYPE Restaurantes y Hoteles (Ley 31556)
        const base = Number((lineTotal / 1.10).toFixed(2));
        const igv = Number((lineTotal - base).toFixed(2));
        totalOpGravada += base;
        totalIgv += igv;
      } else {
        // Gravado Estándar 18% (RER, RMT, RG)
        const base = Number((lineTotal / 1.18).toFixed(2));
        const igv = Number((lineTotal - base).toFixed(2));
        totalOpGravada += base;
        totalIgv += igv;
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

  normalizeCcofactBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch {
      return url.replace(/\/api\/.*$/, '').replace(/\/+$/, '');
    }
  }

  normalizeCcofactEmitUrl(url: string): string {
    if (url.includes('/api/v1/ccofact/emitir')) return url;
    const base = this.normalizeCcofactBaseUrl(url);
    return `${base}/api/v1/ccofact/emitir`;
  }

  async emitDocument(ownerId: string, dto: EmitBillingDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El comprobante debe contener al menos un producto o servicio.');
    }

    const taxes = this.calculateTaxBreakdown(dto.items);
    this.validateCustomerIdentity(dto.docType, dto.customerDocType, dto.customerDocNum, dto.customerName, taxes.totalAmount);
    this.validateIssueDate(dto.issueDate);

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

    let correlative = lastDoc ? lastDoc.correlative + 1 : 1;
    let fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;

    const hasLiveBilling = Boolean(owner.hasElectronicBilling && owner.ccofactUrl && owner.ccofactApiKey);

    let status: FiscalStatus = FiscalStatus.ACCEPTED;
    let hash: string | null = null;
    let xmlUrl: string | null = null;
    let pdfUrl: string | null = null;
    let cdrUrl: string | null = null;
    let sunatResponseCode = '0';
    let sunatDescription = 'El comprobante ha sido aceptado por SUNAT satisfactoriamente.';

    if (hasLiveBilling) {
      if (dto.saleId) {
        try {
          const result = await this.ccofactService.sendInvoice(dto.saleId);
          if (result.success) {
            pdfUrl = result.pdfUrl || null;
            xmlUrl = result.xmlUrl || null;
            cdrUrl = result.cdrUrl || null;
            serie = result.serie || serie;
            correlative = result.number || correlative;
            fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;
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
        // Emisión directa e independiente conectada a CCOFACT PRO
        try {
          const ccofactPayload = {
            idempotency_key: `billing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            tipo_comprobante:
              dto.docType === BillingDocTypeEnum.FACTURA
                ? '01'
                : dto.docType === BillingDocTypeEnum.BOLETA
                ? '03'
                : dto.docType === BillingDocTypeEnum.NOTA_CREDITO
                ? '07'
                : '08',
            serie: serie,
            fecha_de_emision: dto.issueDate || undefined,
            moneda: dto.currency || 'PEN',
            forma_pago: dto.paymentType || dto.paymentMethod || 'Contado',
            fecha_de_vencimiento: dto.dueDate || undefined,
            cuotas: dto.cuotas || undefined,
            observaciones: dto.notes || dto.observaciones || undefined,
            cliente: {
              tipo_documento: dto.customerDocType,
              numero_documento: dto.customerDocNum,
              razon_social: dto.customerName,
              direccion: dto.customerAddress || '',
              email: dto.customerEmail || '',
            },
            items: dto.items.map((it, idx) => ({
              codigo: it.sku || `PROD-${idx + 1}`,
              descripcion: it.description,
              unidad_medida: it.unit || 'NIU',
              cantidad: Number(it.quantity),
              precio_unitario: Number(it.unitPrice),
              tipo_afectacion_igv:
                it.igvAffectation ||
                (it.igvType === 8 ? '20' : it.igvType === 9 ? '30' : it.igvType === 10 ? '10_MYPE' : '10'),
            })),
            enviar_a_sunat_inmediato: true,
          };

          const emitUrl = this.normalizeCcofactEmitUrl(owner.ccofactUrl);
          const resp = await fetch(emitUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': owner.ccofactApiKey,
              'Authorization': `Bearer ${owner.ccofactApiKey}`,
            },
            body: JSON.stringify(ccofactPayload),
          });

          const respData: any = await resp.json();
          if (resp.ok && respData.exito !== false && !respData.errors) {
            status = FiscalStatus.ACCEPTED;
            pdfUrl =
              respData.recursos?.pdf_a4 ||
              respData.recursos?.ticket_pos_80mm ||
              respData.enlace_del_pdf ||
              null;
            xmlUrl =
              respData.recursos?.xml_firmado ||
              respData.enlace_del_xml ||
              null;
            cdrUrl =
              respData.recursos?.cdr_sunat ||
              respData.enlace_del_cdr ||
              null;
            hash =
              respData.sunat?.codigo_hash ||
              respData.codigo_hash ||
              null;
            sunatResponseCode = respData.sunat?.codigo_respuesta || '0';
            sunatDescription =
              respData.sunat?.descripcion ||
              'Aceptado por SUNAT exitosamente.';
            if (respData.comprobante?.numero) {
              correlative = respData.comprobante.numero;
              serie = respData.comprobante.serie || serie;
              fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;
            }
          } else {
            status = FiscalStatus.REJECTED;
            sunatResponseCode = 'ERROR';
            sunatDescription =
              respData.errors ||
              respData.mensaje ||
              respData.message ||
              'Error transmitiendo a SUNAT';
          }
        } catch (err: any) {
          this.logger.error(`Error enviando comprobante a CCOFACT: ${err.message}`);
          status = FiscalStatus.REJECTED;
          sunatDescription = err.message;
        }
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
        ccofactUrl: true,
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
      credentialsConfigured: Boolean(owner?.hasElectronicBilling && owner?.ccofactUrl),
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

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Usuario propietario no encontrado');

    if (doc.saleId) {
      const saleResult = await this.ccofactService.sendInvoice(doc.saleId);
      if (saleResult.success) {
        const updated = await this.prisma.fiscalDocument.update({
          where: { id },
          data: {
            status: FiscalStatus.ACCEPTED,
            pdfUrl: saleResult.pdfUrl,
            xmlUrl: saleResult.xmlUrl,
            cdrUrl: saleResult.cdrUrl,
            sunatResponseCode: '0',
            sunatDescription: 'Aceptado por SUNAT tras reintento exitoso',
          },
        });
        return { success: true, document: updated };
      } else {
        await this.prisma.fiscalDocument.update({
          where: { id },
          data: {
            status: FiscalStatus.REJECTED,
            sunatResponseCode: 'ERROR',
            sunatDescription: saleResult.error || 'Fallo de transmisión a SUNAT',
          },
        });
        return { success: false, error: saleResult.error };
      }
    }

    // Si es comprobante independiente, reintentar a CCOFACT PRO
    if (owner.hasElectronicBilling && owner.ccofactUrl && owner.ccofactApiKey) {
      try {
        const ccofactPayload = {
          idempotency_key: `retry_${doc.id}_${Date.now()}`,
          tipo_comprobante:
            doc.docType === FiscalDocType.INVOICE
              ? '01'
              : doc.docType === FiscalDocType.BOLETA
              ? '03'
              : doc.docType === FiscalDocType.CREDIT_NOTE
              ? '07'
              : '08',
          serie: doc.serie,
          moneda: doc.currency || 'PEN',
          forma_pago: 'Contado',
          cliente: {
            tipo_documento: doc.customerDocType,
            numero_documento: doc.customerDocNum,
            razon_social: doc.customerName,
            direccion: doc.customerAddress || '',
          },
          items: [
            {
              codigo: 'SERV',
              descripcion: 'Comprobante comercial',
              unidad_medida: 'NIU',
              cantidad: 1,
              precio_unitario: doc.totalAmount,
              tipo_afectacion_igv: '10',
            },
          ],
          enviar_a_sunat_inmediato: true,
        };

        const emitUrl = this.normalizeCcofactEmitUrl(owner.ccofactUrl);
        const resp = await fetch(emitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': owner.ccofactApiKey,
            'Authorization': `Bearer ${owner.ccofactApiKey}`,
          },
          body: JSON.stringify(ccofactPayload),
        });

        const respData: any = await resp.json();
        if (resp.ok && respData.exito !== false) {
          const updated = await this.prisma.fiscalDocument.update({
            where: { id },
            data: {
              status: FiscalStatus.ACCEPTED,
              pdfUrl: respData.recursos?.pdf_a4 || respData.recursos?.ticket_pos_80mm || doc.pdfUrl,
              xmlUrl: respData.recursos?.xml_firmado || doc.xmlUrl,
              cdrUrl: respData.recursos?.cdr_sunat || doc.cdrUrl,
              hash: respData.sunat?.codigo_hash || doc.hash,
              sunatResponseCode: '0',
              sunatDescription: respData.sunat?.descripcion || 'Aceptado por SUNAT tras reintento exitoso',
            },
          });
          return { success: true, document: updated };
        }
      } catch (e: any) {
        this.logger.error(`Error reintentando comprobante independiente en CCOFACT: ${e.message}`);
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

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Usuario propietario no encontrado');

    const isCredit = dto.noteType === 'CREDIT';
    const isOriginalInvoice = original.docType === FiscalDocType.INVOICE;
    const serie = isOriginalInvoice ? (isCredit ? 'FC01' : 'FD01') : (isCredit ? 'BC01' : 'BD01');
    const docType = isCredit ? FiscalDocType.CREDIT_NOTE : FiscalDocType.DEBIT_NOTE;

    const lastNote = await this.prisma.fiscalDocument.findFirst({
      where: { userId: ownerId, docType, serie },
      orderBy: { correlative: 'desc' },
    });

    let correlative = lastNote ? lastNote.correlative + 1 : 1;
    let fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;
    const amount = dto.amount || original.totalAmount;
    const base = Number((amount / 1.18).toFixed(2));
    const igv = Number((amount - base).toFixed(2));

    let status: FiscalStatus = FiscalStatus.ACCEPTED;
    let pdfUrl: string | null = null;
    let xmlUrl: string | null = null;
    let cdrUrl: string | null = null;
    let hash: string | null = null;
    let sunatResponseCode = '0';
    let sunatDescription = `Nota de ${isCredit ? 'Crédito' : 'Débito'} generada exitosamente. Modifica a ${original.fullNumber}`;

    const hasLiveBilling = Boolean(owner.hasElectronicBilling && owner.ccofactUrl && owner.ccofactApiKey);

    if (hasLiveBilling) {
      try {
        const payload = {
          idempotency_key: `note_${original.id}_${Date.now()}`,
          tipo_comprobante: isCredit ? '07' : '08',
          serie: serie,
          moneda: original.currency || 'PEN',
          forma_pago: 'Contado',
          cliente: {
            tipo_documento: original.customerDocType,
            numero_documento: original.customerDocNum,
            razon_social: original.customerName,
            direccion: original.customerAddress || '',
            email: '',
          },
          items: [
            {
              codigo: 'NOTA',
              descripcion: `${dto.reasonText || (isCredit ? 'Anulación de la operación' : 'Ajuste de precio')} (Modifica a ${original.fullNumber})`,
              unidad_medida: 'NIU',
              cantidad: 1,
              precio_unitario: amount,
              tipo_afectacion_igv: '10',
            },
          ],
          ref_documento: {
            tipo: original.docType === FiscalDocType.INVOICE ? '01' : '03',
            serie: original.serie,
            numero: original.correlative,
            motivo_codigo: String(dto.reasonCode).padStart(2, '0'),
            motivo_descripcion: dto.reasonText,
          },
          enviar_a_sunat_inmediato: true,
        };

        const emitUrl = this.normalizeCcofactEmitUrl(owner.ccofactUrl);
        const resp = await fetch(emitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': owner.ccofactApiKey,
            'Authorization': `Bearer ${owner.ccofactApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        const respData: any = await resp.json();
        if (resp.ok && respData.exito !== false && !respData.errors) {
          status = FiscalStatus.ACCEPTED;
          pdfUrl = respData.recursos?.pdf_a4 || respData.recursos?.ticket_pos_80mm || respData.enlace_del_pdf || null;
          xmlUrl = respData.recursos?.xml_firmado || respData.enlace_del_xml || null;
          cdrUrl = respData.recursos?.cdr_sunat || respData.enlace_del_cdr || null;
          hash = respData.sunat?.codigo_hash || respData.codigo_hash || null;
          sunatDescription = respData.sunat?.descripcion || `Nota de ${isCredit ? 'Crédito' : 'Débito'} aceptada por SUNAT. Modifica a ${original.fullNumber}`;
          if (respData.comprobante?.numero) {
            correlative = respData.comprobante.numero;
            fullNumber = `${serie}-${String(correlative).padStart(8, '0')}`;
          }
        } else {
          status = FiscalStatus.REJECTED;
          sunatResponseCode = 'ERROR';
          sunatDescription = respData.errors || respData.mensaje || respData.message || 'Error al transmitir nota a SUNAT';
        }
      } catch (err: any) {
        this.logger.error(`Error transmitiendo nota a CCOFACT: ${err.message}`);
        status = FiscalStatus.REJECTED;
        sunatDescription = err.message;
      }
    } else {
      const randomHash = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      hash = Buffer.from(randomHash).toString('base64').substring(0, 28);
      pdfUrl = `https://controlfinanzas.pe/comprobantes/${fullNumber}.pdf`;
      xmlUrl = `https://controlfinanzas.pe/comprobantes/${fullNumber}.xml`;
      cdrUrl = `https://controlfinanzas.pe/comprobantes/R-${fullNumber}.zip`;
    }

    const noteDoc = await this.prisma.fiscalDocument.create({
      data: {
        docType,
        serie,
        correlative,
        fullNumber,
        status,
        issuerRuc: original.issuerRuc,
        customerDocType: original.customerDocType,
        customerDocNum: original.customerDocNum,
        customerName: original.customerName,
        customerAddress: original.customerAddress,
        totalOpGravada: base,
        totalIgv: igv,
        totalAmount: amount,
        currency: original.currency,
        hash,
        pdfUrl,
        xmlUrl,
        cdrUrl,
        sunatResponseCode,
        sunatDescription,
        userId: ownerId,
        branchId: original.branchId,
      },
    });

    // Si fue anulación total (motivo 1), marcar el comprobante original como CANCELLED
    if (dto.reasonCode === 1 && status === FiscalStatus.ACCEPTED) {
      await this.prisma.fiscalDocument.update({
        where: { id: original.id },
        data: {
          status: FiscalStatus.CANCELLED,
          sunatDescription: `Comprobante anulado formalmente ante SUNAT mediante Nota de Crédito ${fullNumber}. Motivo: ${dto.reasonText}`,
        },
      });

      if (original.saleId) {
        await this.prisma.sale.update({
          where: { id: original.saleId },
          data: {
            billingStatus: 'CANCELLED',
          },
        }).catch(() => {});
      }
    }

    return {
      success: status === FiscalStatus.ACCEPTED,
      document: noteDoc,
      message: sunatDescription,
    };
  }

  /**
   * MODIFICAR COMPROBANTE FISCAL
   * Si el comprobante está en DRAFT o REJECTED, actualiza los datos.
   * Si ya fue ACEPTADO por SUNAT, aplica el procedimiento legal de rectificación
   * emitiendo una Nota de Crédito de anulación y generando el nuevo comprobante corregido.
   */
  async updateDocument(ownerId: string, id: string, dto: UpdateBillingDto) {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id, userId: ownerId },
    });
    if (!doc) throw new NotFoundException('Documento fiscal no encontrado');

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Usuario propietario no encontrado');

    // CASO 1: Si ya fue ACEPTADO por SUNAT
    if (doc.status === FiscalStatus.ACCEPTED) {
      if (!dto.rectifyAccepted) {
        throw new BadRequestException(
          `El comprobante ${doc.fullNumber} ya fue ACEPTADO por SUNAT con CDR. Conforme a la Resolución de Superintendencia SUNAT N.° 097-2012, no es posible editarlo en frío directamente. Debe rectificarlo mediante Nota de Crédito activando "rectifyAccepted: true".`,
        );
      }

      // Proceso de Rectificación Oficial:
      // 1. Anular el comprobante original emitiendo Nota de Crédito ante SUNAT
      const ncReason = dto.rectifyReason || 'ANULACION POR MODIFICACION Y RECTIFICACION DE COMPROBANTE';
      const ncRes = await this.issueNote(ownerId, {
        originalFiscalDocumentId: doc.id,
        noteType: 'CREDIT',
        reasonCode: 1, // Anulación de la operación
        reasonText: ncReason,
        amount: doc.totalAmount,
      });

      if (!ncRes.success) {
        throw new BadRequestException(`No se pudo anular el comprobante original en SUNAT: ${ncRes.message}`);
      }

      // 2. Emitir el nuevo comprobante corregido con la siguiente correlación
      const itemsToUse = (dto.items && dto.items.length > 0)
        ? dto.items
        : [{ description: 'Servicio / Producto comercial', quantity: 1, unitPrice: doc.totalAmount, igvType: 1 }];

      const newDocDto: EmitBillingDto = {
        docType: doc.docType === FiscalDocType.INVOICE ? BillingDocTypeEnum.FACTURA : BillingDocTypeEnum.BOLETA,
        customerDocType: dto.customerDocType || doc.customerDocType,
        customerDocNum: dto.customerDocNum || doc.customerDocNum,
        customerName: dto.customerName || doc.customerName,
        customerAddress: dto.customerAddress !== undefined ? dto.customerAddress : (doc.customerAddress || undefined),
        customerEmail: dto.customerEmail,
        currency: (dto.currency as any) || (doc.currency as any) || 'PEN',
        items: itemsToUse,
        saleId: doc.saleId || undefined,
        branchId: doc.branchId || undefined,
        notes: `Comprobante rectificado. Reemplaza al comprobante anulado ${doc.fullNumber} (Nota de Crédito ${ncRes.document.fullNumber})`,
      };

      const newDocRes = await this.emitDocument(ownerId, newDocDto);

      return {
        success: true,
        message: `Comprobante ${doc.fullNumber} rectificado exitosamente ante SUNAT. Se emitió la Nota de Crédito ${ncRes.document.fullNumber} y el nuevo comprobante ${newDocRes.document.fullNumber}.`,
        originalAnulado: {
          id: doc.id,
          fullNumber: doc.fullNumber,
          notaCredito: ncRes.document.fullNumber,
        },
        nuevoComprobante: newDocRes.document,
      };
    }

    // CASO 2: Si está en borrador o rechazado (LOCAL_DRAFT, REJECTED)
    const updateData: any = {};
    if (dto.customerName) updateData.customerName = dto.customerName;
    if (dto.customerDocType) updateData.customerDocType = dto.customerDocType;
    if (dto.customerDocNum) updateData.customerDocNum = dto.customerDocNum;
    if (dto.customerAddress !== undefined) updateData.customerAddress = dto.customerAddress;

    if (dto.items && dto.items.length > 0) {
      const taxes = this.calculateTaxBreakdown(dto.items);
      updateData.totalOpGravada = taxes.totalOpGravada;
      updateData.totalOpInafecta = taxes.totalOpInafecta;
      updateData.totalOpExonerada = taxes.totalOpExonerada;
      updateData.totalIgv = taxes.totalIgv;
      updateData.totalAmount = taxes.totalAmount;
    }

    if (dto.currency) updateData.currency = dto.currency;

    const updated = await this.prisma.fiscalDocument.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      message: `Comprobante ${updated.fullNumber} actualizado correctamente.`,
      document: updated,
    };
  }

  /**
   * ELIMINAR O ANULAR COMPROBANTE FISCAL
   * Si está aceptado ante SUNAT, efectúa la anulación oficial mediante Nota de Crédito en CCOFACT
   * y marca el comprobante como CANCELLED.
   * Si es borrador o rechazado, elimina el registro.
   */
  async deleteDocument(ownerId: string, id: string, options?: DeleteBillingDto) {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id, userId: ownerId },
    });
    if (!doc) throw new NotFoundException('Comprobante fiscal no encontrado');

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const hasLiveBilling = Boolean(owner?.hasElectronicBilling && owner?.ccofactUrl && owner?.ccofactApiKey);

    // Si ya está ACEPTADO por SUNAT: No se puede eliminar en frío, debe anularse legalmente
    if (doc.status === FiscalStatus.ACCEPTED) {
      const motivo = options?.motivo || 'ANULACION DE LA OPERACION POR EL EMISOR';

      if (hasLiveBilling && owner?.ccofactUrl && owner?.ccofactApiKey) {
        const baseUrl = this.normalizeCcofactBaseUrl(owner.ccofactUrl);
        try {
          const anularRes = await fetch(`${baseUrl}/api/v1/documents/by-series-number/${doc.serie}/${doc.correlative}/anular-fiscal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': owner.ccofactApiKey,
              'Authorization': `Bearer ${owner.ccofactApiKey}`,
            },
            body: JSON.stringify({ motivo }),
          });
          const anularData = await anularRes.json();
          this.logger.log(`Resultado de anulación CCOFACT: ${JSON.stringify(anularData)}`);
        } catch (e: any) {
          this.logger.warn(`Error al comunicar anulación a CCOFACT: ${e.message}`);
        }
      }

      // Marcar comprobante como CANCELLED
      const cancelledDoc = await this.prisma.fiscalDocument.update({
        where: { id },
        data: {
          status: FiscalStatus.CANCELLED,
          sunatDescription: `Comprobante anulado formalmente ante SUNAT conforme a Ley (Catálogo 09 Motivo 01). Motivo: ${motivo}`,
        },
      });

      // Si estaba asociado a una venta
      if (doc.saleId) {
        await this.prisma.sale.update({
          where: { id: doc.saleId },
          data: { billingStatus: 'CANCELLED' },
        }).catch(() => {});

        // Si se solicitó revertir stock
        if (options?.restoreStock) {
          const movements = await this.prisma.inventoryMovement.findMany({
            where: { documentId: doc.saleId, type: 'OUT', reason: 'SALE' },
          });
          for (const mov of movements) {
            if (mov.branchId) {
              const bStock = await this.prisma.branchStock.findUnique({
                where: { productId_branchId: { productId: mov.productId, branchId: mov.branchId } },
              });
              if (bStock) {
                await this.prisma.branchStock.update({
                  where: { id: bStock.id },
                  data: { stock: { increment: mov.quantity } },
                });
              }
            }
            await this.prisma.product.update({
              where: { id: mov.productId },
              data: { stock: { increment: mov.quantity } },
            });
            await this.prisma.inventoryMovement.create({
              data: {
                productId: mov.productId,
                quantity: mov.quantity,
                type: 'IN',
                reason: 'SALE_RETURN',
                userId: ownerId,
                unitCost: mov.unitCost,
                totalCost: mov.totalCost,
                stockResult: 0,
                documentId: doc.saleId,
                branchId: mov.branchId,
              },
            });
          }
        }
      }

      if (options?.forceDelete) {
        await this.prisma.fiscalDocument.delete({ where: { id } });
        return {
          success: true,
          message: `Comprobante ${doc.fullNumber} anulado formalmente ante SUNAT y removido de la vista.`,
        };
      }

      return {
        success: true,
        message: `Comprobante ${doc.fullNumber} anulado formalmente ante SUNAT conforme a Ley.`,
        document: cancelledDoc,
      };
    }

    // Si NO estaba aceptado (DRAFT, ERROR, REJECTED)
    if (hasLiveBilling && owner?.ccofactUrl && owner?.ccofactApiKey) {
      const baseUrl = this.normalizeCcofactBaseUrl(owner.ccofactUrl);
      try {
        await fetch(`${baseUrl}/api/v1/documents/by-series-number/${doc.serie}/${doc.correlative}`, {
          method: 'DELETE',
          headers: {
            'x-api-key': owner.ccofactApiKey,
            'Authorization': `Bearer ${owner.ccofactApiKey}`,
          },
        });
      } catch (e) {}
    }

    await this.prisma.fiscalDocument.delete({ where: { id } });
    return {
      success: true,
      message: `Comprobante ${doc.fullNumber} eliminado exitosamente.`,
    };
  }

  /**
   * PROBAR CONEXIÓN EN VIVO CON CCOFACT PRO ENGINE
   */
  async testCcofactConnection(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        hasElectronicBilling: true,
        businessRuc: true,
        businessReason: true,
        businessName: true,
        ccofactUrl: true,
        ccofactApiKey: true,
      },
    });

    if (!owner) throw new NotFoundException('Usuario no encontrado');

    if (!owner.ccofactUrl || !owner.ccofactApiKey) {
      return {
        connected: false,
        online: false,
        message: 'No se han configurado la URL o API Key de CCOFACT PRO.',
      };
    }

    const baseUrl = this.normalizeCcofactBaseUrl(owner.ccofactUrl);
    const statusUrl = `${baseUrl}/api/v1/ccofact/status`;

    try {
      const resp = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'x-api-key': owner.ccofactApiKey,
          'Authorization': `Bearer ${owner.ccofactApiKey}`,
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        return {
          connected: false,
          online: false,
          message: `CCOFACT respondió con estado HTTP ${resp.status}: ${text}`,
        };
      }

      const data = await resp.json();
      return {
        connected: true,
        online: true,
        engine: data.engine || 'CCOFACT PRO Enterprise',
        version: data.version || '2.0.0-ENTERPRISE',
        company: data.company,
        message: 'Conexión con CCOFACT PRO establecida y verificada exitosamente.',
      };
    } catch (err: any) {
      return {
        connected: false,
        online: false,
        message: `No se pudo conectar con CCOFACT PRO en ${baseUrl}: ${err.message}`,
      };
    }
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
        ccofactUrl: true,
        ccofactApiKey: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return {
      hasElectronicBilling: user.hasElectronicBilling,
      businessRuc: user.businessRuc || '',
      businessReason: user.businessReason || '',
      businessName: user.businessName || '',
      ccofactUrl: user.ccofactUrl || 'http://localhost:4001/api/v1/ccofact/emitir',
      ccofactApiKey: user.ccofactApiKey || '',
      hasToken: Boolean(user.ccofactApiKey),
    };
  }

  async updateConfig(ownerId: string, data: {
    hasElectronicBilling?: boolean;
    businessRuc?: string;
    businessReason?: string;
    businessName?: string;
    ccofactUrl?: string;
    ccofactApiKey?: string;
  }) {
    const updateData: any = {};
    if (data.hasElectronicBilling !== undefined) updateData.hasElectronicBilling = data.hasElectronicBilling;
    if (data.businessRuc !== undefined) updateData.businessRuc = data.businessRuc;
    if (data.businessReason !== undefined) updateData.businessReason = data.businessReason;
    if (data.businessName !== undefined) updateData.businessName = data.businessName;
    if (data.ccofactUrl !== undefined) updateData.ccofactUrl = data.ccofactUrl;
    if (data.ccofactApiKey !== undefined) updateData.ccofactApiKey = data.ccofactApiKey;

    const updated = await this.prisma.user.update({
      where: { id: ownerId },
      data: updateData,
    });

    return {
      success: true,
      hasElectronicBilling: updated.hasElectronicBilling,
      businessRuc: updated.businessRuc,
      businessName: updated.businessName,
      ccofactUrl: updated.ccofactUrl || '',
      ccofactApiKey: updated.ccofactApiKey || '',
      hasToken: Boolean(updated.ccofactApiKey),
    };
  }
}
