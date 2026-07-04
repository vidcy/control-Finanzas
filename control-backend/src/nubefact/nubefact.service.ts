import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NubefactService {
  private readonly logger = new Logger(NubefactService.name);

  constructor(private readonly prisma: PrismaService) { }

  async sendInvoice(saleId: string): Promise<{
    success: boolean;
    pdfUrl?: string;
    xmlUrl?: string;
    cdrUrl?: string;
    error?: string;
    number?: number;
    serie?: string;
  }> {
    try {
      // 1. Obtener venta con items e información de usuario
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
        return { success: false, error: 'Venta no encontrada' };
      }

      // Si el tipo de comprobante no es boleta o factura, no procesar
      if (sale.billingType !== 'BOLETA' && sale.billingType !== 'FACTURA') {
        return { success: false, error: 'Tipo de comprobante no requiere facturación electrónica' };
      }

      // Las credenciales de facturación están en el dueño del negocio (patrón) o en el propio usuario
      const ownerId = sale.user.parentId || sale.user.id;
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
      });

      if (!owner) {
        return { success: false, error: 'Dueño de negocio no encontrado' };
      }

      if (!owner.hasElectronicBilling) {
        return { success: false, error: 'La facturación electrónica no está habilitada para este negocio' };
      }

      if (!owner.nubefactUrl || !owner.nubefactToken) {
        return { success: false, error: 'Credenciales de NubeFacT no configuradas en el negocio' };
      }

      // 2. Determinar correlativo y serie
      const isFactura = sale.billingType === 'FACTURA';
      const serie = isFactura ? 'FFF1' : 'BBB1';

      // Encontrar la última venta exitosa del mismo tipo para calcular el siguiente correlativo
      const lastTx = await this.prisma.sale.findFirst({
        where: {
          user: {
            OR: [
              { id: ownerId },
              { parentId: ownerId }
            ]
          },
          billingType: sale.billingType,
          billingStatus: 'SUCCESS',
        },
        orderBy: {
          billingNumber: 'desc',
        },
      });

      const nextNumber = lastTx?.billingNumber ? lastTx.billingNumber + 1 : 1;

      // 3. Construir el JSON para NubeFacT
      const issueDate = new Date(sale.date);
      const day = String(issueDate.getDate()).padStart(2, '0');
      const month = String(issueDate.getMonth() + 1).padStart(2, '0');
      const year = issueDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      const currencyCode = sale.currency === 'USD' ? 2 : 1; // 1 = Soles, 2 = Dólares

      let docType = sale.clientDocumentType || '-';
      let docNum = sale.clientDocumentNumber || '00000000';
      let docDenom = sale.clientDenomination || 'CLIENTE VARIOS';

      if (isFactura) {
        docType = '6'; // Factura requiere RUC obligatoriamente
        if (!sale.clientDocumentNumber) {
          return { success: false, error: 'El RUC del cliente es obligatorio para emitir Factura' };
        }
        if (!sale.clientDenomination) {
          return { success: false, error: 'La Razón Social del cliente es obligatoria para emitir Factura' };
        }
      }

      // Mapear items de la venta
      const itemsPayload = sale.items.map((item, idx) => {
        const qty = item.quantity;
        const precioUnitario = item.price; // precio de venta con IGV (18%)
        const valorUnitario = parseFloat((precioUnitario / 1.18).toFixed(10));
        const subtotal = parseFloat((valorUnitario * qty).toFixed(10));
        const igv = parseFloat((subtotal * 0.18).toFixed(10));
        const total = parseFloat((precioUnitario * qty).toFixed(10));

        const code = item.product?.sku || item.product?.customCode?.toString() || `PROD-${idx + 1}`;

        return {
          unidad_de_medida: 'NIU',
          codigo: code,
          descripcion: item.name || item.product?.name || 'PRODUCTO',
          cantidad: qty,
          valor_unitario: valorUnitario,
          precio_unitario: precioUnitario,
          subtotal: subtotal,
          tipo_de_igv: 1, // Gravado - Operación Onerosa
          igv: igv,
          total: total,
          anticipo_regularizacion: false,
          anticipo_documento_serie: '',
          anticipo_documento_numero: '',
        };
      });

      // Totales generales
      const totalAmount = sale.amount;
      const totalGravada = parseFloat((totalAmount / 1.18).toFixed(2));
      const totalIgv = parseFloat((totalAmount - totalGravada).toFixed(2));

      const payload = {
        operacion: 'generar_comprobante',
        tipo_de_comprobante: isFactura ? 1 : 2,
        serie: serie,
        numero: nextNumber,
        sunat_transaction: 1, // Venta Interna
        cliente_tipo_de_documento: docType,
        cliente_numero_de_documento: docNum,
        cliente_denominacion: docDenom,
        cliente_direccion: sale.clientAddress || '',
        cliente_email: sale.clientEmail || '',
        fecha_de_emision: formattedDate,
        fecha_de_vencimiento: '',
        moneda: currencyCode,
        porcentaje_de_igv: 18.00,
        total_gravada: totalGravada,
        total_igv: totalIgv,
        total: totalAmount,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        items: itemsPayload,
      };

      this.logger.log(`Enviando comprobante ${serie}-${nextNumber} a NubeFacT...`);

      // 4. Hacer POST a NubeFacT
      const response = await fetch(owner.nubefactUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${owner.nubefactToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json();

      if (!response.ok || responseData.errors) {
        const errorMsg = responseData.errors || 'Error en la respuesta de NubeFacT';
        this.logger.error(`Error de NubeFacT: ${JSON.stringify(errorMsg)}`);
        return { success: false, error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) };
      }

      this.logger.log(`Comprobante ${serie}-${nextNumber} enviado con éxito.`);
      return {
        success: true,
        pdfUrl: responseData.enlace_del_pdf || responseData.enlace || '',
        xmlUrl: responseData.enlace_del_xml || '',
        cdrUrl: responseData.enlace_del_cdr || '',
        number: nextNumber,
        serie: serie,
      };
    } catch (e: any) {
      this.logger.error(`Excepción enviando a NubeFacT: ${e.message}`);
      return { success: false, error: e.message || 'Error de conexión con NubeFacT' };
    }
  }

  async sendNote(
    saleId: string,
    originalSaleId: string,
    noteType: 'CREDIT' | 'DEBIT',
    reasonCode: number,
    reasonText?: string
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
        return { success: false, error: 'Venta no encontrada' };
      }

      if (originalSale.billingStatus !== 'SUCCESS' || !originalSale.billingSerie || !originalSale.billingNumber) {
        return { success: false, error: 'La venta original no fue facturada correctamente.' };
      }

      const ownerId = sale.user.parentId || sale.user.id;
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });

      if (!owner || !owner.hasElectronicBilling || !owner.nubefactUrl || !owner.nubefactToken) {
        return { success: false, error: 'Credenciales de NubeFacT no configuradas' };
      }

      const isCredit = noteType === 'CREDIT';
      const isOriginalFactura = originalSale.billingType === 'FACTURA';
      const serie = isOriginalFactura
        ? (isCredit ? 'FF11' : 'FD11')
        : (isCredit ? 'BB11' : 'BD11');

      const lastNote = await this.prisma.sale.findFirst({
        where: {
          user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
          billingType: noteType === 'CREDIT' ? 'NOTA_CREDITO' : 'NOTA_DEBITO',
          billingSerie: serie,
          billingStatus: 'SUCCESS',
        },
        orderBy: { billingNumber: 'desc' },
      });

      const nextNumber = lastNote?.billingNumber ? lastNote.billingNumber + 1 : 1;

      const issueDate = new Date(sale.date);
      const formattedDate = `${String(issueDate.getDate()).padStart(2, '0')}-${String(issueDate.getMonth() + 1).padStart(2, '0')}-${issueDate.getFullYear()}`;
      const currencyCode = sale.currency === 'USD' ? 2 : 1;

      const itemsPayload = sale.items.map((item, idx) => {
        const qty = item.quantity;
        const precioUnitario = item.price;
        const valorUnitario = parseFloat((precioUnitario / 1.18).toFixed(10));
        const subtotal = parseFloat((valorUnitario * qty).toFixed(10));
        const igv = parseFloat((subtotal * 0.18).toFixed(10));
        const total = parseFloat((precioUnitario * qty).toFixed(10));
        return {
          unidad_de_medida: 'NIU',
          codigo: item.product?.sku || `PROD-${idx + 1}`,
          descripcion: item.name || 'PRODUCTO',
          cantidad: qty,
          valor_unitario: valorUnitario,
          precio_unitario: precioUnitario,
          subtotal: subtotal,
          tipo_de_igv: 1,
          igv: igv,
          total: total,
          anticipo_regularizacion: false,
        };
      });

      const totalAmount = sale.amount;
      const totalGravada = parseFloat((totalAmount / 1.18).toFixed(2));
      const totalIgv = parseFloat((totalAmount - totalGravada).toFixed(2));

      const payload: any = {
        operacion: 'generar_comprobante',
        tipo_de_comprobante: noteType === 'CREDIT' ? 3 : 4,
        serie: serie,
        numero: nextNumber,
        sunat_transaction: 1,
        cliente_tipo_de_documento: isOriginalFactura ? '6' : (originalSale.clientDocumentType || '-'),
        cliente_numero_de_documento: originalSale.clientDocumentNumber || '00000000',
        cliente_denominacion: originalSale.clientDenomination || 'CLIENTE VARIOS',
        cliente_direccion: originalSale.clientAddress || '',
        cliente_email: originalSale.clientEmail || '',
        fecha_de_emision: formattedDate,
        moneda: currencyCode,
        porcentaje_de_igv: 18.00,
        total_gravada: totalGravada,
        total_igv: totalIgv,
        total: totalAmount,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        documento_que_se_modifica_tipo: isOriginalFactura ? 1 : 2,
        documento_que_se_modifica_serie: originalSale.billingSerie,
        documento_que_se_modifica_numero: originalSale.billingNumber,
        items: itemsPayload,
      };

      if (noteType === 'CREDIT') {
        payload.tipo_de_nota_de_credito = reasonCode;
      } else {
        payload.tipo_de_nota_de_debito = reasonCode;
      }
      if (reasonText) {
        payload.observaciones = reasonText;
      }

      const response = await fetch(owner.nubefactUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${owner.nubefactToken}` },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json();
      if (!response.ok || responseData.errors) {
        return { success: false, error: typeof responseData.errors === 'string' ? responseData.errors : JSON.stringify(responseData.errors) };
      }

      return {
        success: true,
        pdfUrl: responseData.enlace_del_pdf || responseData.enlace,
        xmlUrl: responseData.enlace_del_xml,
        cdrUrl: responseData.enlace_del_cdr,
        number: nextNumber,
        serie: serie,
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
