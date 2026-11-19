import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FiscalDocType, FiscalStatus, Currency } from '@prisma/client';

/**
 * ============================================================================
 * CCOFACT PRO - SERVICIO EXCLUSIVO DE FACTURACIÓN ELECTRÓNICA SUNAT UBL 2.1
 * CORPORACIÓN CCOPLEX
 * ============================================================================
 * Maneja la comunicación soberana y directa con el motor CCOFACT PRO.
 * Reemplaza completamente integraciones legacy.
 */
@Injectable()
export class CcofactService {
  private readonly logger = new Logger(CcofactService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza la URL base de CCOFACT PRO (ej. http://localhost:4001)
   */
  normalizeBaseUrl(url?: string | null): string {
    if (!url) return 'http://localhost:4001';
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch {
      return url.replace(/\/api\/.*$/, '').replace(/\/+$/, '');
    }
  }

  /**
   * Normaliza el endpoint de emisión CCOFACT PRO (/api/v1/ccofact/emitir)
   */
  normalizeEmitUrl(url?: string | null): string {
    if (!url) return 'http://localhost:4001/api/v1/ccofact/emitir';
    if (url.includes('/api/v1/ccofact/emitir')) return url;
    const base = this.normalizeBaseUrl(url);
    return `${base}/api/v1/ccofact/emitir`;
  }

  /**
   * Emite Factura o Boleta Electrónica directamente a CCOFACT PRO
   */
  async sendInvoice(saleId: string, options?: { igvAffectation?: string; igvRate?: number }): Promise<{
    success: boolean;
    pdfUrl?: string;
    xmlUrl?: string;
    cdrUrl?: string;
    error?: string;
    number?: number;
    serie?: string;
  }> {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      if (!sale) {
        return { success: false, error: 'Venta no encontrada en el sistema' };
      }

      // PREVENCIÓN ESTRICTA DE DOBLE FACTURACIÓN
      if (sale.billingStatus === 'SUCCESS' && sale.billingSerie && sale.billingNumber) {
        this.logger.warn(`Venta ${sale.id} ya emitida previamente como ${sale.billingSerie}-${sale.billingNumber}`);
        return {
          success: true,
          number: sale.billingNumber,
          serie: sale.billingSerie,
          pdfUrl: sale.billingPdfUrl || undefined,
          xmlUrl: sale.billingXmlUrl || undefined,
          cdrUrl: sale.billingCdrUrl || undefined,
        };
      }

      if (sale.billingType !== 'BOLETA' && sale.billingType !== 'FACTURA') {
        return { success: false, error: 'El comprobante seleccionado no requiere emisión electrónica' };
      }

      const ownerId = sale.user.parentId || sale.user.id;
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
      });

      if (!owner) {
        return { success: false, error: 'Empresa o usuario propietario no encontrado' };
      }

      const isFactura = sale.billingType === 'FACTURA';
      const serie = isFactura ? 'F001' : 'B001';

      // Validaciones tributarias cliente
      let docType = sale.clientDocumentType || '-';
      let docNum = sale.clientDocumentNumber || '00000000';
      let docDenom = sale.clientDenomination || 'CLIENTE VARIOS';

      if (isFactura) {
        docType = '6'; // Factura exige RUC
        if (!sale.clientDocumentNumber || !/^\d{11}$/.test(sale.clientDocumentNumber)) {
          return { success: false, error: 'Para Factura Electrónica se requiere RUC de 11 dígitos' };
        }
        if (!sale.clientDenomination) {
          return { success: false, error: 'Razón Social es obligatoria para Factura Electrónica' };
        }
      } else {
        if (docType === '1' && docNum && !/^\d{8}$/.test(docNum)) {
          return { success: false, error: 'El DNI debe contener exactamente 8 dígitos' };
        }
      }

      // DETERMINACIÓN DINÁMICA DE AFECTACIÓN TRIBUTARIA (SUNAT Catálogo 07)
      // En Madre de Dios / Amazonía por defecto es '20' (Exonerado - Ley 27037, 0% IGV)
      const affectation =
        options?.igvAffectation ||
        (sale as any).igvAffectation ||
        '20';

      const effectiveIgvRate = options?.igvRate ?? (sale as any).igvRate ?? (owner.igvRate || 18.0);
      const totalAmount = sale.amount;

      let totalGravada = 0;
      let totalExonerada = 0;
      let totalInafecta = 0;
      let totalIgv = 0;

      if (affectation === '20') {
        // EXONERADO (Amazonía / Selva Ley 27037) - 0% IGV
        totalExonerada = parseFloat(totalAmount.toFixed(2));
      } else if (affectation === '30') {
        // INAFECTO - 0% IGV
        totalInafecta = parseFloat(totalAmount.toFixed(2));
      } else {
        // GRAVADO (10)
        const rate = Number(effectiveIgvRate) || 18.0;
        const divisor = 1 + (rate / 100);
        totalGravada = parseFloat((totalAmount / divisor).toFixed(2));
        totalIgv = parseFloat((totalAmount - totalGravada).toFixed(2));
      }

      // PAYLOAD OFICIAL CCOFACT PRO UBL 2.1
      const payload = {
        idempotency_key: `sale_${sale.id}`,
        tipo_comprobante: isFactura ? '01' : '03',
        serie: serie,
        moneda: sale.currency === 'USD' ? 'USD' : 'PEN',
        forma_pago: 'Contado',
        cliente: {
          tipo_documento: docType === '-' ? '0' : docType,
          numero_documento: docNum,
          razon_social: docDenom,
          direccion: sale.clientAddress || '',
          email: sale.clientEmail || '',
        },
        items: sale.items.map((item, idx) => {
          const itemPrice = Number(item.price);
          let valorUnitario: number;
          if (affectation === '20' || affectation === '30') {
            valorUnitario = itemPrice;
          } else {
            const rate = Number(effectiveIgvRate) || 18.0;
            valorUnitario = parseFloat((itemPrice / (1 + (rate / 100))).toFixed(4));
          }
          return {
            codigo: item.product?.sku || item.product?.customCode?.toString() || `PROD-${idx + 1}`,
            descripcion: item.name || item.product?.name || 'PRODUCTO',
            unidad_medida: 'NIU',
            cantidad: Number(item.quantity),
            precio_unitario: itemPrice,
            valor_unitario: valorUnitario,
            tipo_afectacion_igv: affectation,
          };
        }),
        total_gravada: totalGravada,
        total_exonerada: totalExonerada,
        total_inafecta: totalInafecta,
        total_igv: totalIgv,
        total_impuestos: totalIgv,
        porcentaje_igv: affectation === '10' ? effectiveIgvRate : 0,
        observaciones:
          affectation === '20'
            ? 'BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037'
            : undefined,
        enviar_a_sunat_inmediato: true,
      };

      const emitEndpoint = this.normalizeEmitUrl(owner.ccofactUrl);
      this.logger.log(`Enviando comprobante CCOFACT PRO (${affectation === '20' ? 'EXONERADO LEY 27037' : 'GRAVADO'}) a ${emitEndpoint} con serie ${serie}...`);

      const response = await fetch(emitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': owner.ccofactApiKey || 'fact_demo_key_pro_2026',
        },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json();

      const hasError = !response.ok ||
        responseData.exito === false ||
        responseData.errors ||
        (responseData.statusCode && responseData.statusCode >= 400);

      if (hasError) {
        const errorMsg =
          responseData.errors ||
          responseData.mensaje ||
          responseData.message ||
          responseData.sunat_soap_error ||
          'Error devuelto por el motor CCOFACT PRO';
        const formattedErr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
        this.logger.error(`Error CCOFACT PRO: ${formattedErr}`);
        return { success: false, error: formattedErr };
      }

      const finalSerie = responseData.comprobante?.serie || serie;
      const finalNumber = responseData.comprobante?.numero || 1;
      const fullNumber = responseData.comprobante?.numero_completo || `${finalSerie}-${String(finalNumber).padStart(8, '0')}`;
      const finalPdf = responseData.recursos?.pdf_a4 || responseData.recursos?.ticket_pos_80mm || '';
      const finalXml = responseData.recursos?.xml_firmado || '';
      const finalCdr = responseData.recursos?.cdr_sunat || '';
      const finalHash = responseData.sunat?.codigo_hash || null;
      const sunatDesc = responseData.sunat?.descripcion || 'Comprobante emitido y aceptado por SUNAT satisfactoriamente';

      // Sincronización en modelo FiscalDocument
      try {
        await this.prisma.fiscalDocument.upsert({
          where: { saleId: sale.id },
          update: {
            serie: finalSerie,
            correlative: finalNumber,
            fullNumber,
            status: FiscalStatus.ACCEPTED,
            pdfUrl: finalPdf,
            xmlUrl: finalXml,
            cdrUrl: finalCdr,
            hash: finalHash,
            sunatResponseCode: '0',
            sunatDescription: sunatDesc,
            totalOpGravada: totalGravada,
            totalOpInafecta: totalInafecta,
            totalOpExonerada: totalExonerada,
            totalIgv: totalIgv,
            totalAmount: totalAmount,
          },
          create: {
            docType: isFactura ? FiscalDocType.INVOICE : FiscalDocType.BOLETA,
            serie: finalSerie,
            correlative: finalNumber,
            fullNumber,
            status: FiscalStatus.ACCEPTED,
            issuerRuc: owner.businessRuc || '20000000001',
            customerDocType: docType === '-' ? '0' : docType,
            customerDocNum: docNum,
            customerName: docDenom,
            customerAddress: sale.clientAddress || null,
            totalOpGravada: totalGravada,
            totalOpInafecta: totalInafecta,
            totalOpExonerada: totalExonerada,
            totalIgv: totalIgv,
            totalAmount: totalAmount,
            currency: (sale.currency as Currency) || Currency.PEN,
            hash: finalHash,
            xmlUrl: finalXml,
            pdfUrl: finalPdf,
            cdrUrl: finalCdr,
            sunatResponseCode: '0',
            sunatDescription: sunatDesc,
            saleId: sale.id,
            userId: ownerId,
            branchId: sale.branchId || null,
          },
        });

        // Asegurar que la venta almacene el desglose exacto
        await this.prisma.sale.update({
          where: { id: sale.id },
          data: {
            igvAffectation: affectation,
            igvRate: affectation === '10' ? effectiveIgvRate : 0,
            totalGravada,
            totalExonerada,
            totalInafecta,
            totalIgv,
          },
        });
      } catch (syncErr: any) {
        this.logger.warn(`FiscalDocument upsert warn: ${syncErr.message}`);
      }

      this.logger.log(`Comprobante ${fullNumber} emitido exitosamente con CCOFACT PRO.`);

      return {
        success: true,
        pdfUrl: finalPdf,
        xmlUrl: finalXml,
        cdrUrl: finalCdr,
        number: finalNumber,
        serie: finalSerie,
      };
    } catch (e: any) {
      this.logger.error(`Excepción en CcofactService.sendInvoice: ${e.message}`);
      return { success: false, error: e.message || 'Error de conexión con CCOFACT PRO' };
    }
  }

  /**
   * Emite Nota de Crédito o Débito vinculada mediante CCOFACT PRO
   */
  async sendNote(
    saleId: string,
    originalSaleId: string,
    noteType: 'CREDIT' | 'DEBIT',
    reasonCode: number,
    reasonText?: string,
  ): Promise<{
    success: boolean;
    pdfUrl?: string;
    xmlUrl?: string;
    cdrUrl?: string;
    error?: string;
    number?: number;
    serie?: string;
  }> {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
        include: { items: { include: { product: true } }, user: true },
      });
      const originalSale = await this.prisma.sale.findUnique({
        where: { id: originalSaleId },
      });

      if (!sale || !originalSale) {
        return { success: false, error: 'Venta o comprobante original no encontrado' };
      }

      if (originalSale.billingStatus !== 'SUCCESS' || !originalSale.billingSerie || !originalSale.billingNumber) {
        return { success: false, error: 'El comprobante original no cuenta con numeración fiscal válida de SUNAT' };
      }

      const ownerId = sale.user.parentId || sale.user.id;
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });

      if (!owner || !owner.hasElectronicBilling || !owner.ccofactUrl || !owner.ccofactApiKey) {
        return { success: false, error: 'Credenciales de CCOFACT PRO no configuradas para emisión de notas' };
      }

      const isCredit = noteType === 'CREDIT';
      const isOriginalFactura = originalSale.billingType === 'FACTURA';
      const serie = isOriginalFactura ? (isCredit ? 'FC01' : 'FD01') : (isCredit ? 'BC01' : 'BD01');

      const totalAmount = sale.amount;
      const totalGravada = parseFloat((totalAmount / 1.18).toFixed(2));
      const totalIgv = parseFloat((totalAmount - totalGravada).toFixed(2));

      const payload = {
        idempotency_key: `note_${sale.id}`,
        tipo_comprobante: isCredit ? '07' : '08',
        serie: serie,
        moneda: sale.currency === 'USD' ? 'USD' : 'PEN',
        forma_pago: 'Contado',
        cliente: {
          tipo_documento: isOriginalFactura ? '6' : (originalSale.clientDocumentType || '0'),
          numero_documento: originalSale.clientDocumentNumber || '00000000',
          razon_social: originalSale.clientDenomination || 'CLIENTE VARIOS',
          direccion: originalSale.clientAddress || '',
          email: originalSale.clientEmail || '',
        },
        items: sale.items.map((item, idx) => ({
          codigo: item.product?.sku || `PROD-${idx + 1}`,
          descripcion: item.name || 'PRODUCTO',
          unidad_medida: 'NIU',
          cantidad: Number(item.quantity),
          precio_unitario: Number(item.price),
          tipo_afectacion_igv: '10',
        })),
        ref_documento: {
          tipo: isOriginalFactura ? '01' : '03',
          serie: originalSale.billingSerie,
          numero: originalSale.billingNumber,
          motivo_codigo: String(reasonCode).padStart(2, '0'),
          motivo_descripcion: reasonText || (isCredit ? 'Anulación de la operación' : 'Ajuste de precio'),
        },
        enviar_a_sunat_inmediato: true,
      };

      const emitEndpoint = this.normalizeEmitUrl(owner.ccofactUrl);
      const response = await fetch(emitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': owner.ccofactApiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json();
      const hasError = !response.ok || responseData.exito === false || responseData.errors;

      if (hasError) {
        const err = responseData.errors || responseData.mensaje || responseData.message || 'Error al emitir nota en CCOFACT PRO';
        return { success: false, error: typeof err === 'string' ? err : JSON.stringify(err) };
      }

      const noteDocType = isCredit ? FiscalDocType.CREDIT_NOTE : FiscalDocType.DEBIT_NOTE;
      const finalNoteSerie = responseData.comprobante?.serie || serie;
      const finalNoteNumber = responseData.comprobante?.numero || 1;
      const fullNoteNumber = responseData.comprobante?.numero_completo || `${finalNoteSerie}-${String(finalNoteNumber).padStart(8, '0')}`;
      const notePdf = responseData.recursos?.pdf_a4 || responseData.recursos?.ticket_pos_80mm || '';
      const noteXml = responseData.recursos?.xml_firmado || '';
      const noteCdr = responseData.recursos?.cdr_sunat || '';
      const noteHash = responseData.sunat?.codigo_hash || null;
      const noteDesc = responseData.sunat?.descripcion || `Nota de ${isCredit ? 'Crédito' : 'Débito'} aceptada por SUNAT`;

      try {
        await this.prisma.fiscalDocument.create({
          data: {
            docType: noteDocType,
            serie: finalNoteSerie,
            correlative: finalNoteNumber,
            fullNumber: fullNoteNumber,
            status: FiscalStatus.ACCEPTED,
            issuerRuc: owner.businessRuc || '20000000001',
            customerDocType: isOriginalFactura ? '6' : (originalSale.clientDocumentType || '0'),
            customerDocNum: originalSale.clientDocumentNumber || '00000000',
            customerName: originalSale.clientDenomination || 'CLIENTE VARIOS',
            customerAddress: originalSale.clientAddress || null,
            totalOpGravada: totalGravada,
            totalOpInafecta: 0,
            totalOpExonerada: 0,
            totalIgv: totalIgv,
            totalAmount: totalAmount,
            currency: (sale.currency as Currency) || Currency.PEN,
            hash: noteHash,
            xmlUrl: noteXml,
            pdfUrl: notePdf,
            cdrUrl: noteCdr,
            sunatResponseCode: '0',
            sunatDescription: noteDesc,
            saleId: sale.id,
            userId: ownerId,
            branchId: sale.branchId || null,
          },
        });

        if (reasonCode === 1 && originalSale.billingSerie && originalSale.billingNumber) {
          await this.prisma.fiscalDocument.updateMany({
            where: {
              userId: ownerId,
              serie: originalSale.billingSerie,
              correlative: originalSale.billingNumber,
            },
            data: {
              status: FiscalStatus.CANCELLED,
              sunatDescription: `Anulado formalmente ante SUNAT mediante Nota de Crédito ${fullNoteNumber}`,
            },
          });
        }
      } catch (fErr: any) {
        this.logger.warn(`FiscalDocument creation warn: ${fErr.message}`);
      }

      return {
        success: true,
        pdfUrl: notePdf,
        xmlUrl: noteXml,
        cdrUrl: noteCdr,
        number: finalNoteNumber,
        serie: finalNoteSerie,
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error de comunicación con CCOFACT PRO' };
    }
  }

  /**
   * Anulación fiscal oficial con Nota de Crédito en CCOFACT PRO
   */
  async anularFiscal(
    owner: { ccofactUrl?: string | null; ccofactApiKey?: string | null },
    serie: string,
    number: number,
    motivo: string = 'ANULACION DE LA OPERACION',
  ) {
    if (!owner.ccofactUrl || !owner.ccofactApiKey) return { success: false };
    const baseUrl = this.normalizeBaseUrl(owner.ccofactUrl);
    const url = `${baseUrl}/api/v1/documents/by-series-number/${serie}/${number}/anular-fiscal`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': owner.ccofactApiKey,
      },
      body: JSON.stringify({ motivo }),
    });
    return res.json();
  }

  /**
   * Eliminación sincronizada de comprobante en CCOFACT PRO
   */
  async deleteFiscal(
    owner: { ccofactUrl?: string | null; ccofactApiKey?: string | null },
    serie: string,
    number: number,
  ) {
    if (!owner.ccofactUrl || !owner.ccofactApiKey) return { success: false };
    const baseUrl = this.normalizeBaseUrl(owner.ccofactUrl);
    const url = `${baseUrl}/api/v1/documents/by-series-number/${serie}/${number}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-api-key': owner.ccofactApiKey,
      },
    });
    return res.json();
  }

  /**
   * Diagnóstico de conexión en tiempo real con CCOFACT PRO Engine
   */
  async testConnection(owner: { ccofactUrl?: string | null; ccofactApiKey?: string | null }) {
    if (!owner.ccofactUrl || !owner.ccofactApiKey) {
      return {
        connected: false,
        online: false,
        message: 'Credenciales de CCOFACT PRO (URL o API Key) no configuradas.',
      };
    }

    const baseUrl = this.normalizeBaseUrl(owner.ccofactUrl);
    const statusUrl = `${baseUrl}/api/v1/ccofact/status`;

    try {
      const resp = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'x-api-key': owner.ccofactApiKey,
        },
      });

      if (!resp.ok) {
        return {
          connected: false,
          online: false,
          message: `CCOFACT PRO respondió con código HTTP ${resp.status}`,
        };
      }

      const data = await resp.json();
      return {
        connected: true,
        online: true,
        engine: data.engine || 'CCOFACT PRO Enterprise',
        version: data.version || '2.0.0-ENTERPRISE',
        company: data.company,
        message: 'Conexión con CCOFACT PRO verificada exitosamente.',
      };
    } catch (err: any) {
      return {
        connected: false,
        online: false,
        message: `No se pudo contactar a CCOFACT PRO en ${baseUrl}: ${err.message}`,
      };
    }
  }
}
