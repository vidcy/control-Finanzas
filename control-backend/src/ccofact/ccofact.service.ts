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
    isQueued?: boolean;
    pdfUrl?: string;
    xmlUrl?: string;
    cdrUrl?: string;
    hash?: string;
    qrCode?: string;
    fullNumber?: string;
    error?: string;
    number?: number;
    serie?: string;
    sunatResponseCode?: string;
    sunatDescription?: string;
    totalGravada?: number;
    totalExonerada?: number;
    totalInafecta?: number;
    totalIgv?: number;
    igvAffectation?: string;
    igvRate?: number;
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
      const serie = isFactura
        ? (sale.billingSerie || owner.billingSerieInvoice || 'F001')
        : (sale.billingSerie || owner.billingSerieBoleta || 'B001');

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
      const isExonerado = owner.taxRegime === 'AMAZONIA_EXONERADO' || (owner.igvRate !== undefined && owner.igvRate === 0);
      const isInafecto = owner.taxRegime === 'INAFECTO_TOTAL';
      const defaultAffectation = isExonerado ? '20' : isInafecto ? '30' : '10';

      const affectation =
        options?.igvAffectation ||
        (sale as any).igvAffectation ||
        defaultAffectation;

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

      const peruDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(sale.date ? new Date(sale.date) : new Date());
      const peruTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(sale.date ? new Date(sale.date) : new Date());

      // PAYLOAD OFICIAL CCOFACT PRO UBL 2.1
      const payload = {
        idempotency_key: `sale_${sale.id}`,
        tipo_comprobante: isFactura ? '01' : '03',
        serie: serie,
        fecha_emision: peruDate,
        hora_emision: peruTime,
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
      
      // EVALUACIÓN ESTRICTA DEL ESTADO VERDADERO DEVUELTO POR SUNAT
      const sunatData = responseData.sunat || {};
      const sunatStatusRaw = String(sunatData.estado || '').toUpperCase();
      const isSunatAccepted =
        sunatData.aceptada_por_sunat === true ||
        sunatStatusRaw === 'ACCEPTED' ||
        sunatStatusRaw === 'ACCEPTED_OBSERVED';
      const isSunatQueued =
        sunatStatusRaw === 'QUEUED' ||
        sunatStatusRaw === 'SENDING' ||
        sunatStatusRaw === 'PROCESSING' ||
        sunatStatusRaw === '0140';
      const isSunatRejected =
        sunatStatusRaw === 'REJECTED' || (!isSunatAccepted && !isSunatQueued);

      let targetFiscalStatus: FiscalStatus = FiscalStatus.ACCEPTED;
      let targetBillingStatus: string = 'SUCCESS';

      if (isSunatRejected) {
        targetFiscalStatus = FiscalStatus.REJECTED;
        targetBillingStatus = 'REJECTED';
      } else if (isSunatQueued) {
        targetFiscalStatus = FiscalStatus.QUEUED_OUTBOX;
        targetBillingStatus = 'QUEUED';
      }

      const sunatResponseCode = String(
        sunatData.codigo_respuesta || (isSunatAccepted ? '0' : isSunatQueued ? '0140' : 'ERROR'),
      );
      const sunatDesc =
        sunatData.descripcion ||
        (isSunatAccepted
          ? 'Comprobante emitido y aceptado por SUNAT satisfactoriamente'
          : isSunatQueued
          ? 'Comprobante en proceso de validación en SUNAT (Cola de reintentos)'
          : 'Comprobante rechazado por SUNAT');

      // Sincronización en modelo FiscalDocument
      try {
        await this.prisma.fiscalDocument.upsert({
          where: { saleId: sale.id },
          update: {
            serie: finalSerie,
            correlative: finalNumber,
            fullNumber,
            status: targetFiscalStatus,
            pdfUrl: finalPdf,
            xmlUrl: finalXml,
            cdrUrl: finalCdr,
            hash: finalHash,
            sunatResponseCode,
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
            status: targetFiscalStatus,
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
            sunatResponseCode,
            sunatDescription: sunatDesc,
            saleId: sale.id,
            userId: ownerId,
            branchId: sale.branchId || null,
          },
        });

        // Asegurar que la venta almacene el estado fiscal exacto y desglose
        await this.prisma.sale.update({
          where: { id: sale.id },
          data: {
            billingStatus: targetBillingStatus,
            billingSerie: finalSerie,
            billingNumber: finalNumber,
            billingPdfUrl: finalPdf,
            billingXmlUrl: finalXml,
            billingCdrUrl: finalCdr,
            billingError: isSunatRejected ? sunatDesc : null,
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

      if (isSunatAccepted) {
        this.logger.log(`Comprobante ${fullNumber} emitido y aceptado por SUNAT exitosamente.`);
      } else if (isSunatQueued) {
        this.logger.warn(`Comprobante ${fullNumber} encolado para transmisión asíncrona a SUNAT.`);
      } else {
        this.logger.error(`Comprobante ${fullNumber} rechazado formalmente por SUNAT: ${sunatDesc}`);
      }

      return {
        success: isSunatAccepted,
        isQueued: isSunatQueued,
        error: isSunatRejected ? sunatDesc : undefined,
        number: finalNumber,
        serie: finalSerie,
        pdfUrl: finalPdf,
        xmlUrl: finalXml,
        cdrUrl: finalCdr,
        hash: finalHash,
        sunatResponseCode,
        sunatDescription: sunatDesc,
        totalGravada,
        totalExonerada,
        totalInafecta,
        totalIgv,
        igvAffectation: affectation,
        igvRate: affectation === '10' ? effectiveIgvRate : 0,
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

      const apiUrl = owner?.ccofactUrl;
      const apiKey = owner?.ccofactApiKey;

      if (!owner || !owner.hasElectronicBilling || !apiUrl || !apiKey) {
        return { success: false, error: 'Credenciales de CCOFACT PRO no configuradas para emisión de notas' };
      }

      const isCredit = noteType === 'CREDIT';
      const isOriginalFactura = originalSale.billingType === 'FACTURA';
      const origSerie = originalSale.billingSerie || (isOriginalFactura ? 'F001' : 'B001');
      const serie = isOriginalFactura
        ? (isCredit ? (origSerie.startsWith('F') && origSerie.length === 4 ? `FC${origSerie.substring(2)}` : 'FC01') : 'FD01')
        : (isCredit ? (origSerie.startsWith('B') && origSerie.length === 4 ? `BC${origSerie.substring(2)}` : 'BC01') : 'BD01');

      // Afectación idéntica a la venta original
      const isExonerado = owner.taxRegime === 'AMAZONIA_EXONERADO' || (owner.igvRate !== undefined && owner.igvRate === 0);
      const isInafecto = owner.taxRegime === 'INAFECTO_TOTAL';
      const defaultAffectation = isExonerado ? '20' : isInafecto ? '30' : '10';
      const affectation = (originalSale as any).igvAffectation || defaultAffectation;

      const totalAmount = sale.amount;
      let totalGravada = 0;
      let totalExonerada = 0;
      let totalInafecta = 0;
      let totalIgv = 0;

      if (affectation === '20') {
        totalExonerada = parseFloat(totalAmount.toFixed(2));
      } else if (affectation === '30') {
        totalInafecta = parseFloat(totalAmount.toFixed(2));
      } else {
        const rate = Number((originalSale as any).igvRate) || Number(owner.igvRate) || 18.0;
        const divisor = 1 + (rate / 100);
        totalGravada = parseFloat((totalAmount / divisor).toFixed(2));
        totalIgv = parseFloat((totalAmount - totalGravada).toFixed(2));
      }

      const formattedReasonCode = String(reasonCode || (isCredit ? 1 : 2)).padStart(2, '0');
      const formattedReasonDesc = (reasonText || (isCredit ? 'ANULACION DE LA OPERACION' : 'AUMENTO EN EL VALOR')).toUpperCase();

      const docType = isOriginalFactura ? '6' : (originalSale.clientDocumentType === '-' || !originalSale.clientDocumentType ? '0' : originalSale.clientDocumentType);
      const docNum = isOriginalFactura ? (originalSale.clientDocumentNumber || '20000000001') : (originalSale.clientDocumentNumber && originalSale.clientDocumentNumber !== '-' ? originalSale.clientDocumentNumber : '00000000');
      const docDenom = originalSale.clientDenomination || (isOriginalFactura ? 'CLIENTE CON RUC' : 'CLIENTES VARIOS');

      const peruDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(sale.date ? new Date(sale.date) : new Date());
      const peruTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(sale.date ? new Date(sale.date) : new Date());

      const payload = {
        idempotency_key: `note_${sale.id}_${Date.now()}`,
        tipo_comprobante: isCredit ? '07' : '08',
        serie: serie,
        fecha_emision: peruDate,
        hora_emision: peruTime,
        moneda: sale.currency === 'USD' ? 'USD' : 'PEN',
        forma_pago: 'Contado',
        cliente: {
          tipo_documento: docType,
          numero_documento: docNum,
          razon_social: docDenom,
          direccion: originalSale.clientAddress || '',
          email: originalSale.clientEmail || '',
        },
        items: sale.items.map((item, idx) => {
          const itemPrice = Number(item.price);
          const valorUnitario = (affectation === '20' || affectation === '30') ? itemPrice : parseFloat((itemPrice / 1.18).toFixed(4));
          return {
            codigo: item.product?.sku || item.product?.customCode?.toString() || `PROD-${idx + 1}`,
            descripcion: item.name || item.product?.name || 'PRODUCTO O SERVICIO',
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
        observaciones: affectation === '20' ? 'BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037' : undefined,
        ref_documento: {
          tipo: isOriginalFactura ? '01' : '03',
          serie: originalSale.billingSerie,
          numero: originalSale.billingNumber,
          motivo_codigo: formattedReasonCode,
          motivo_descripcion: formattedReasonDesc,
        },
        referencia_tipo_comprobante: isOriginalFactura ? '01' : '03',
        referencia_serie: originalSale.billingSerie,
        referencia_numero: originalSale.billingNumber,
        referencia_codigo_motivo: formattedReasonCode,
        referencia_motivo_descripcion: formattedReasonDesc,
        enviar_a_sunat_inmediato: true,
      };

      const emitEndpoint = this.normalizeEmitUrl(apiUrl);
      const response = await fetch(emitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
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
    const apiUrl = owner.ccofactUrl;
    const apiKey = owner.ccofactApiKey;
    if (!apiUrl || !apiKey) return { success: false };
    const baseUrl = this.normalizeBaseUrl(apiUrl);
    const url = `${baseUrl}/api/v1/documents/by-series-number/${serie}/${number}/anular-fiscal`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ motivo }),
    });
    return res.json();
  }

  /**
   * Comunicación de Baja oficial en CCOFACT PRO (Anulación directa sin emisión de Nota de Crédito)
   * Resolución de Superintendencia N.° 097-2012/SUNAT
   */
  async comunicacionBaja(
    owner: { ccofactUrl?: string | null; ccofactApiKey?: string | null },
    serie: string,
    number: number,
    motivo: string = 'ERROR EN EMISION O COMPROBANTE NO ENTREGADO',
    deliveredToClient: boolean = false,
  ) {
    const apiUrl = owner.ccofactUrl;
    const apiKey = owner.ccofactApiKey;
    if (!apiUrl || !apiKey) return { success: false };
    const baseUrl = this.normalizeBaseUrl(apiUrl);
    const url = `${baseUrl}/api/v1/documents/by-series-number/${serie}/${number}/comunicacion-baja`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ motivo, deliveredToClient }),
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

  /**
   * Ejecuta el Diff Engine inteligente en CCOFACT PRO para rectificar comprobante
   */
  async smartEditDocument(
    owner: { ccofactUrl?: string | null; ccofactApiKey?: string | null },
    serie: string,
    number: number,
    dto: any,
  ) {
    if (!owner.ccofactUrl || !owner.ccofactApiKey) {
      throw new Error('Credenciales de CCOFACT PRO no configuradas en el perfil de empresa.');
    }
    const baseUrl = this.normalizeBaseUrl(owner.ccofactUrl);
    const url = `${baseUrl}/api/v1/documents/by-series-number/${serie}/${number}/smart-edit`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': owner.ccofactApiKey,
      },
      body: JSON.stringify(dto),
    });

    const data: any = await res.json();
    if (!res.ok || data.statusCode >= 400 || data.exito === false) {
      throw new Error(data.message || data.mensaje || data.error || 'Error al ejecutar edición inteligente en CCOFACT');
    }
    return data;
  }

  /**
   * Emite Nota de Crédito o Débito manual seleccionando motivo de Catálogo 09 o 10 en CCOFACT PRO
   */
  async emitManualNote(
    owner: { ccofactUrl?: string | null; ccofactApiKey?: string | null },
    serie: string,
    number: number,
    dto: any,
  ) {
    if (!owner.ccofactUrl || !owner.ccofactApiKey) {
      throw new Error('Credenciales de CCOFACT PRO no configuradas en el perfil de empresa.');
    }
    const baseUrl = this.normalizeBaseUrl(owner.ccofactUrl);
    const url = `${baseUrl}/api/v1/documents/by-series-number/${serie}/${number}/manual-note`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': owner.ccofactApiKey,
      },
      body: JSON.stringify(dto),
    });

    const data: any = await res.json();
    if (!res.ok || data.statusCode >= 400 || data.exito === false) {
      throw new Error(data.message || data.mensaje || data.error || 'Error al emitir nota manual en CCOFACT');
    }
    return data;
  }
}
