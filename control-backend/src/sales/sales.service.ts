import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CcofactService } from '../ccofact/ccofact.service';
import { CashShiftService } from '../cash-shift/cash-shift.service';
import { FiscalStatus } from '@prisma/client';

function parseStartDateFilter(val?: string): Date | undefined {
  if (!val) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return new Date(`${val}T00:00:00.000-05:00`);
  }
  return new Date(val);
}

function parseEndDateFilter(val?: string): Date | undefined {
  if (!val) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return new Date(`${val}T23:59:59.999-05:00`);
  }
  return new Date(val);
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ccofactService: CcofactService,
    private readonly cashShiftService: CashShiftService,
  ) { }

  async listSalesFiltered(options: {
    ownerId: string;
    workerId?: string;
    workspace?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    advisorId?: string;
  }) {
    const { ownerId, workerId, workspace, startDate, endDate, branchId, advisorId } = options;

    const where: any = {
      workspace,
    };

    if (workerId) {
      where.userId = workerId;
    } else {
      where.OR = [{ userId: ownerId }, { user: { parentId: ownerId } }];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = parseStartDateFilter(startDate);
      if (endDate) where.date.lte = parseEndDateFilter(endDate);
    }

    if (branchId) where.branchId = branchId;
    if (advisorId) where.advisorId = advisorId;

    await this.syncNotesFromCcofact(ownerId).catch(() => {});

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, name: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        advisor: { select: { id: true, name: true } },
        items: true,
        fiscalDocument: true,
      },
    });

    const notes = await this.prisma.fiscalDocument.findMany({
      where: {
        userId: ownerId,
        docType: { in: ['CREDIT_NOTE' as any, 'DEBIT_NOTE' as any] },
      },
      orderBy: { correlative: 'desc' },
    });

    return sales.map((sale) => {
      if (!sale.billingSerie || !sale.billingNumber) {
        return {
          ...sale,
          billingNotes: [],
          netAmount: sale.amount,
          baseAmount: sale.amount,
          isAnnulledByNote: false,
          totalCreditNotes: 0,
          totalDebitNotes: 0,
          hasNotes: false,
        };
      }

      const fullTag = `[REF:${sale.billingSerie}-${String(sale.billingNumber).padStart(8, '0')}]`;
      const fallbackTag = `${sale.billingSerie}-${String(sale.billingNumber).padStart(8, '0')}`;
      const linkedNotes = notes.filter(
        (n) => n.sunatDescription?.includes(fullTag) || n.sunatDescription?.includes(fallbackTag),
      );

      let sumCredits = 0;
      let sumDebits = 0;
      let isAnnulled = sale.fiscalDocument?.status === 'CANCELLED';

      for (const ln of linkedNotes) {
        const descUpper = (ln.sunatDescription || '').toUpperCase();
        const isFormalAnnul =
          descUpper.includes('ANULACIÓN DE LA OPERACIÓN') ||
          descUpper.includes('ANULACION DE LA OPERACION') ||
          descUpper.includes('ANULACIÓN POR ERROR EN EL RUC') ||
          descUpper.includes('ANULACION POR ERROR EN EL RUC') ||
          descUpper.includes('MOTIVO: 01') ||
          descUpper.includes('MOTIVO 01') ||
          descUpper.includes('MOTIVO: 02') ||
          descUpper.includes('MOTIVO 02');

        if (ln.docType === ('CREDIT_NOTE' as any)) {
          sumCredits += Number(ln.totalAmount || 0);
          if (isFormalAnnul) {
            isAnnulled = true;
          }
        } else if (ln.docType === ('DEBIT_NOTE' as any)) {
          sumDebits += Number(ln.totalAmount || 0);
        }
      }

      const baseAmount = Number(sale.amount) || 0;
      const netAmount = isAnnulled
        ? 0
        : Math.max(0, Number((baseAmount - sumCredits + sumDebits).toFixed(2)));

      const finalBillingStatus = isAnnulled
        ? 'CANCELLED'
        : sale.billingStatus === 'CANCELLED' && sale.fiscalDocument?.status !== 'CANCELLED'
        ? 'SUCCESS'
        : sale.billingStatus;

      return {
        ...sale,
        billingStatus: finalBillingStatus,
        isAnnulledByNote: isAnnulled,
        baseAmount,
        netAmount,
        totalCreditNotes: sumCredits,
        totalDebitNotes: sumDebits,
        hasNotes: linkedNotes.length > 0,
        billingNotes: linkedNotes.map((n) => ({
          id: n.id,
          docType: n.docType,
          serie: n.serie,
          correlative: n.correlative,
          fullNumber: n.fullNumber,
          totalAmount: Number(n.totalAmount),
          status: n.status,
          description: n.sunatDescription,
          pdfUrl: n.pdfUrl,
          xmlUrl: n.xmlUrl,
          cdrUrl: n.cdrUrl,
          createdAt: n.createdAt,
        })),
      };
    });
  }

  async getSaleDetails(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, name: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        advisor: { select: { id: true, name: true } },
        commissions: true,
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async retryBilling(ownerId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
      },
    });

    if (!sale) {
      return { success: false, error: 'Venta no encontrada en el sistema' };
    }

    if (sale.billingStatus === 'SUCCESS' && sale.billingSerie && sale.billingNumber) {
      return { success: true, message: 'El comprobante ya fue aceptado formalmente por SUNAT previamente' };
    }

    await this.prisma.sale.update({
      where: { id },
      data: { billingStatus: 'PENDING', billingError: null },
    });

    const result = await this.ccofactService.sendInvoice(id);

    const targetBillingStatus =
      (result as any).status ||
      ((result as any).isRejected
        ? 'REJECTED'
        : (result as any).isQueued
        ? 'QUEUED'
        : result.success
        ? 'SUCCESS'
        : 'ERROR');

    if (result.success || (result as any).isQueued) {
      await this.prisma.sale.update({
        where: { id },
        data: {
          billingStatus: targetBillingStatus,
          billingNumber: result.number,
          billingSerie: result.serie,
          billingPdfUrl: result.pdfUrl,
          billingXmlUrl: result.xmlUrl,
          billingCdrUrl: result.cdrUrl,
          billingError: result.error || null,
        },
      });
    } else {
      await this.prisma.sale.update({
        where: { id },
        data: {
          billingStatus: targetBillingStatus,
          billingSerie: result.serie || undefined,
          billingNumber: result.number || undefined,
          billingPdfUrl: result.pdfUrl || undefined,
          billingXmlUrl: result.xmlUrl || undefined,
          billingCdrUrl: result.cdrUrl || undefined,
          billingError: result.error || 'Comprobante rechazado por SUNAT',
        },
      });
    }
    return result;
  }

  async issueCreditNote(
    ownerId: string,
    id: string,
    reasonCode: number,
    reasonText: string,
    amount?: number,
  ) {
    const originalSale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
        billingStatus: 'SUCCESS',
      },
    });

    if (!originalSale) {
      return { success: false, error: 'Venta no encontrada o no facturada' };
    }

    const result = await this.ccofactService.sendNote(
      originalSale.id,
      originalSale.id,
      'CREDIT',
      reasonCode,
      reasonText,
    );

    if (result.success) {
      await this.prisma.sale.create({
        data: {
          userId: originalSale.userId,
          branchId: originalSale.branchId,
          workspace: originalSale.workspace,
          date: new Date(),
          cashShiftId: originalSale.cashShiftId,
          paymentMethod: originalSale.paymentMethod,
          amount: amount || originalSale.amount,
          currency: originalSale.currency,
          exchangeRate: originalSale.exchangeRate,
          amountSoles: originalSale.amountSoles,
          billingType: 'NOTA_CREDITO',
          billingStatus: 'SUCCESS',
          billingNumber: result.number,
          billingSerie: result.serie,
          billingPdfUrl: result.pdfUrl,
          billingXmlUrl: result.xmlUrl,
          billingCdrUrl: result.cdrUrl,
          clientDocumentType: originalSale.clientDocumentType,
          clientDocumentNumber: originalSale.clientDocumentNumber,
          clientDenomination: originalSale.clientDenomination,
          clientAddress: originalSale.clientAddress,
          clientEmail: originalSale.clientEmail,
        },
      });
    }

    return result;
  }

  async issueDebitNote(
    ownerId: string,
    id: string,
    reasonCode: number,
    reasonText: string,
    amount?: number,
  ) {
    const originalSale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
        billingStatus: 'SUCCESS',
      },
    });

    if (!originalSale) {
      return { success: false, error: 'Venta no encontrada o no facturada' };
    }

    const result = await this.ccofactService.sendNote(
      originalSale.id,
      originalSale.id,
      'DEBIT',
      reasonCode,
      reasonText,
    );

    if (result.success) {
      await this.prisma.sale.create({
        data: {
          userId: originalSale.userId,
          branchId: originalSale.branchId,
          workspace: originalSale.workspace,
          date: new Date(),
          cashShiftId: originalSale.cashShiftId,
          paymentMethod: originalSale.paymentMethod,
          amount: amount || originalSale.amount,
          currency: originalSale.currency,
          exchangeRate: originalSale.exchangeRate,
          amountSoles: originalSale.amountSoles,
          billingType: 'NOTA_DEBITO',
          billingStatus: 'SUCCESS',
          billingNumber: result.number,
          billingSerie: result.serie,
          billingPdfUrl: result.pdfUrl,
          billingXmlUrl: result.xmlUrl,
          billingCdrUrl: result.cdrUrl,
          clientDocumentType: originalSale.clientDocumentType,
          clientDocumentNumber: originalSale.clientDocumentNumber,
          clientDenomination: originalSale.clientDenomination,
          clientAddress: originalSale.clientAddress,
          clientEmail: originalSale.clientEmail,
        },
      });
    }

    return result;
  }

  async deleteSale(
    ownerId: string,
    id: string,
    options?: {
      method?: 'COMUNICACION_BAJA' | 'NOTA_CREDITO';
      motivo?: string;
      deliveredToClient?: boolean;
    },
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
      },
      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Restore stock based on OUT inventory movements of this sale
      const movements = await tx.inventoryMovement.findMany({
        where: { documentId: sale.id, type: 'OUT', reason: 'SALE' },
      });

      for (const mov of movements) {
        if (mov.branchId) {
          // Increment branch stock
          const bStock = await tx.branchStock.findUnique({
            where: {
              productId_branchId: {
                productId: mov.productId,
                branchId: mov.branchId,
              },
            },
          });
          if (bStock) {
            await tx.branchStock.update({
              where: { id: bStock.id },
              data: { stock: { increment: mov.quantity } },
            });
          }
        }

        // Increment global product stock
        await tx.product.update({
          where: { id: mov.productId },
          data: { stock: { increment: mov.quantity } },
        });

        // Create return movement
        await tx.inventoryMovement.create({
          data: {
            productId: mov.productId,
            quantity: mov.quantity,
            type: 'IN',
            reason: 'SALE_RETURN',
            presentationId: mov.presentationId,
            presentationName: mov.presentationName,
            presentationQty: mov.presentationQty,
            userId: sale.userId,
            unitCost: mov.unitCost,
            totalCost: mov.totalCost,
            stockResult: 0,
            documentId: sale.id,
            branchId: mov.branchId,
          },
        });
      }

      // 2. Sincronización con Facturación Electrónica CCOFACT PRO:
      // Conforme a normativa SUNAT UBL 2.1 (CERO BAJAS): Todo comprobante aceptado se anula con Nota de Crédito (Tipo 01)
      if (sale.billingSerie && sale.billingNumber) {
        let anularResult: any = null;
        const owner = await tx.user.findUnique({
          where: { id: ownerId },
        });

        const reasonText = options?.motivo || 'ANULACION DE OPERACION';

        if (owner?.ccofactUrl && owner?.ccofactApiKey) {
          try {
            anularResult = await this.ccofactService.anularFiscal(
              owner,
              sale.billingSerie,
              sale.billingNumber,
              reasonText,
            );
          } catch (billingErr: any) {
            console.warn(`[Sincronización CCOFACT PRO] Error al anular comprobante ${sale.billingSerie}-${sale.billingNumber}:`, billingErr?.message);
          }
        }

        const ncFullNumber = anularResult?.nota_credito?.full_number;
        const annulDescription = ncFullNumber
          ? `Comprobante anulado formalmente ante SUNAT mediante Nota de Crédito ${ncFullNumber} (Catálogo 09 Motivo 01: Anulación de la operación). Motivo: ${reasonText}`
          : `Comprobante anulado formalmente ante SUNAT conforme a Ley (Catálogo 09 Motivo 01). Motivo: ${reasonText}`;

        // Sincronizar comprobante fiscal centralizado (garantizar que permanezca como CANCELLED)
        await tx.fiscalDocument.updateMany({
          where: {
            userId: ownerId,
            OR: [
              { saleId: sale.id },
              { serie: sale.billingSerie, correlative: sale.billingNumber },
            ],
          },
          data: {
            status: 'CANCELLED',
            sunatDescription: annulDescription,
          },
        }).catch(() => {});

        // Si CCOFACT generó la Nota de Crédito oficial, registrarla en FiscalDocument
        if (ncFullNumber && anularResult?.nota_credito) {
          const parts = ncFullNumber.split('-');
          const ncSerie = parts[0];
          const ncCorrelative = parseInt(parts[1], 10) || 1;
          const owner = await tx.user.findUnique({ where: { id: ownerId } });

          await tx.fiscalDocument.upsert({
            where: {
              userId_docType_serie_correlative: {
                userId: ownerId,
                docType: 'CREDIT_NOTE',
                serie: ncSerie,
                correlative: ncCorrelative,
              },
            },
            update: {
              status: 'ACCEPTED',
              sunatDescription: `Nota de Crédito oficial por anulación de ${sale.billingSerie}-${String(sale.billingNumber).padStart(8, '0')}`,
            },
            create: {
              docType: 'CREDIT_NOTE',
              serie: ncSerie,
              correlative: ncCorrelative,
              fullNumber: ncFullNumber,
              status: 'ACCEPTED',
              issuerRuc: owner?.businessRuc || '20000000001',
              customerDocType: sale.clientDocumentType || '0',
              customerDocNum: sale.clientDocumentNumber || '00000000',
              customerName: sale.clientDenomination || 'CLIENTES VARIOS',
              customerAddress: sale.clientAddress || null,
              totalOpGravada: (sale as any).totalGravada || 0,
              totalOpExonerada: (sale as any).totalExonerada || (sale.amount && !(sale as any).totalGravada ? sale.amount : 0),
              totalOpInafecta: (sale as any).totalInafecta || 0,
              totalIgv: (sale as any).totalIgv || 0,
              totalAmount: sale.amount,
              currency: sale.currency || 'PEN',
              sunatResponseCode: '0',
              sunatDescription: `Nota de Crédito por anulación de comprobante ${sale.billingSerie}-${String(sale.billingNumber).padStart(8, '0')}`,
              userId: ownerId,
              branchId: sale.branchId || null,
            },
          }).catch((err) => console.warn(`[FiscalDocument CreditNote Upsert] Warn: ${err.message}`));
        }
      }

      // 3. Marcar la venta como CANCELLED en base de datos (preservar auditoría histórica conforme a SUNAT)
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          billingStatus: 'CANCELLED',
          billingError: `Venta anulada formalmente: ${options?.motivo || 'Anulación de operación'}`,
        },
      });

      return { success: true, cashShiftId: sale.cashShiftId };
    });

    if (result.cashShiftId) {
      await this.cashShiftService.recalculateShiftTotals(result.cashShiftId).catch(() => {});
    }

    return { success: true };
  }

  /**
   * MODIFICAR VENTA Y SINCRONIZAR CON FACTURACIÓN ELECTRÓNICA CCOFACT PRO
   */
  async updateSale(ownerId: string, id: string, dto: any) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
      },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    if (sale.cashShiftId) {
      const shift = await this.prisma.cashShift.findUnique({
        where: { id: sale.cashShiftId },
      });
      if (shift && shift.status === 'CLOSED') {
        throw new BadRequestException(
          'No se puede modificar una venta perteneciente a un cierre de caja ya cerrado.',
        );
      }
    }

    const isBilled = sale.billingStatus === 'SUCCESS' && sale.billingSerie && sale.billingNumber;

    // Si ya está facturada con éxito en SUNAT
    if (isBilled) {
      const sensitiveChanged =
        (dto.clientDocumentNumber && dto.clientDocumentNumber !== sale.clientDocumentNumber) ||
        (dto.amount && Number(dto.amount) !== sale.amount) ||
        (dto.items && dto.items.length > 0);

      if (sensitiveChanged) {
        if (!dto.rectifyAccepted) {
          throw new BadRequestException(
            `Esta venta ya cuenta con el comprobante fiscal ${sale.billingSerie}-${sale.billingNumber} ACEPTADO por SUNAT. Para modificar ítems, cliente o montos, debe activar la rectificación oficial (rectifyAccepted: true), la cual anulará el comprobante actual con Nota de Crédito conforme a Ley y emitirá el comprobante de reemplazo.`,
          );
        }

        // Rectificación:
        // 1. Anular comprobante original con Nota de Crédito en CCOFACT
        const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
        if (owner?.ccofactUrl && owner?.ccofactApiKey) {
          try {
            await this.ccofactService.anularFiscal(
              owner,
              sale.billingSerie,
              sale.billingNumber,
              dto.rectifyReason || 'ANULACION POR MODIFICACION Y RECTIFICACION DE VENTA',
            );
          } catch (e: any) {
            console.warn(`Error anulando en CCOFACT PRO: ${e.message}`);
          }
        }

        // 2. Marcar comprobante anterior en FiscalDocument como CANCELLED
        await this.prisma.fiscalDocument.updateMany({
          where: {
            userId: ownerId,
            serie: sale.billingSerie,
            correlative: sale.billingNumber,
          },
          data: {
            status: 'CANCELLED',
            sunatDescription: `Comprobante anulado formalmente por modificación de venta (rectificación).`,
          },
        }).catch(() => {});
      }
    }

    // Actualizar campos de cliente y venta
    const updateData: any = {};
    if (dto.clientDocumentType !== undefined) updateData.clientDocumentType = dto.clientDocumentType;
    if (dto.clientDocumentNumber !== undefined) updateData.clientDocumentNumber = dto.clientDocumentNumber;
    if (dto.clientDenomination !== undefined) updateData.clientDenomination = dto.clientDenomination;
    if (dto.clientAddress !== undefined) updateData.clientAddress = dto.clientAddress;
    if (dto.clientEmail !== undefined) updateData.clientEmail = dto.clientEmail;
    if (dto.paymentMethod !== undefined) updateData.paymentMethod = dto.paymentMethod;
    if (dto.advisorId !== undefined) updateData.advisorId = dto.advisorId;

    // Si se enviaron nuevos items y montos
    if (dto.items && Array.isArray(dto.items)) {
      // Revertir movimientos de inventario anteriores
      const oldMovements = await this.prisma.inventoryMovement.findMany({
        where: { documentId: sale.id, type: 'OUT', reason: 'SALE' },
      });
      for (const mov of oldMovements) {
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
      }

      await this.prisma.inventoryMovement.deleteMany({
        where: { documentId: sale.id, type: 'OUT', reason: 'SALE' },
      });
      await this.prisma.saleItem.deleteMany({
        where: { saleId: sale.id },
      });

      let newTotal = 0;
      for (const it of dto.items) {
        const itemTotal = Number((it.quantity * it.price).toFixed(2));
        newTotal += itemTotal;
        await this.prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productId: it.productId,
            name: it.name,
            quantity: Number(it.quantity),
            price: Number(it.price),
          },
        });

        // Registrar nuevo movimiento OUT
        await this.prisma.inventoryMovement.create({
          data: {
            productId: it.productId,
            quantity: Number(it.quantity),
            type: 'OUT',
            reason: 'SALE',
            userId: sale.userId,
            unitCost: Number(it.price),
            totalCost: itemTotal,
            stockResult: 0,
            documentId: sale.id,
            branchId: sale.branchId,
          },
        });

        // Descontar stock
        await this.prisma.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: Number(it.quantity) } },
        });
        if (sale.branchId) {
          const bStock = await this.prisma.branchStock.findUnique({
            where: { productId_branchId: { productId: it.productId, branchId: sale.branchId } },
          });
          if (bStock) {
            await this.prisma.branchStock.update({
              where: { id: bStock.id },
              data: { stock: { decrement: Number(it.quantity) } },
            });
          }
        }
      }
      updateData.amount = Number(newTotal.toFixed(2));
    }

    // Si se rectificó o se solicitó re-emisión
    if (isBilled && dto.rectifyAccepted) {
      updateData.billingStatus = 'PENDING';
      updateData.billingError = null;
    }

    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    // Si se requiere reemitir el comprobante a CCOFACT tras la modificación
    if ((isBilled && dto.rectifyAccepted) || dto.reemitBilling) {
      const billingRes = await this.ccofactService.sendInvoice(updatedSale.id);
      if (billingRes.success) {
        await this.prisma.sale.update({
          where: { id: updatedSale.id },
          data: {
            billingStatus: 'SUCCESS',
            billingNumber: billingRes.number,
            billingSerie: billingRes.serie,
            billingPdfUrl: billingRes.pdfUrl,
            billingXmlUrl: billingRes.xmlUrl,
            billingCdrUrl: billingRes.cdrUrl,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Venta actualizada exitosamente.',
      sale: await this.prisma.sale.findUnique({ where: { id }, include: { items: true } }),
    };
  }

  /**
   * EDICIÓN INTELIGENTE DE VENTA CON MOTOR DIFF Y SINCRONIZACIÓN TRIBUTARIA
   */
  async smartEditSale(ownerId: string, id: string, dto: any) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
      },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    if (sale.cashShiftId) {
      const shift = await this.prisma.cashShift.findUnique({
        where: { id: sale.cashShiftId },
      });
      if (shift && shift.status === 'CLOSED') {
        throw new BadRequestException(
          'No se puede modificar una venta perteneciente a un cierre de caja ya cerrado.',
        );
      }
    }

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Usuario propietario no encontrado');

    const isBilled = sale.billingStatus === 'SUCCESS' && sale.billingSerie && sale.billingNumber;

    const clientDocNum =
      (dto.client_doc_number || dto.clientDocumentNumber || sale.clientDocumentNumber || '').trim() ||
      '00000000';
    const clientDocType =
      dto.client_doc_type ||
      dto.clientDocumentType ||
      sale.clientDocumentType ||
      (clientDocNum.length === 11 ? '6' : clientDocNum.length === 8 ? '1' : '0');
    const clientName =
      (dto.client_name || dto.clientDenomination || sale.clientDenomination || '').trim() ||
      'CLIENTES VARIOS';
    const clientAddress =
      dto.client_address !== undefined ? dto.client_address : (sale.clientAddress || '');
    const clientEmail =
      dto.client_email !== undefined ? dto.client_email : (sale.clientEmail || '');

    const originalAffectation = sale.igvAffectation || '20';

    const normalizedItems =
      dto.items && Array.isArray(dto.items) && dto.items.length > 0
        ? dto.items.map((it: any, idx: number) => ({
            code: it.code || it.productId || `PROD-${idx + 1}`,
            description: String(it.description || it.name || 'Detalle del producto').trim(),
            quantity: Number(it.quantity || 1),
            unit_price: Number(
              it.unit_price !== undefined ? it.unit_price : (it.price ?? it.salePrice ?? 0),
            ),
            unit_measure: it.unit_measure || it.unit || 'NIU',
            igv_affectation_type:
              it.igv_affectation_type || it.igvAffectation || originalAffectation,
            productId: it.productId,
          }))
        : sale.items.map((it: any, idx: number) => ({
            code: it.productId || `PROD-${idx + 1}`,
            description: String(it.name || 'Detalle del producto').trim(),
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.price || 0),
            unit_measure: 'NIU',
            igv_affectation_type: originalAffectation,
            productId: it.productId,
          }));

    const normalizedSmartEditDto = {
      client_doc_type: clientDocType,
      client_doc_number: clientDocNum,
      client_name: clientName,
      client_address: clientAddress,
      client_email: clientEmail,
      currency: dto.currency || sale.currency || 'PEN',
      payment_type: dto.payment_type || dto.payment_method || sale.paymentMethod || 'Contado',
      issue_date: dto.issue_date || undefined,
      custom_reason: dto.custom_reason || undefined,
      items: normalizedItems,
    };

    let diffResult: any = null;

    if (isBilled && owner.ccofactUrl && owner.ccofactApiKey) {
      diffResult = await this.ccofactService.smartEditDocument(
        owner,
        sale.billingSerie,
        sale.billingNumber,
        normalizedSmartEditDto,
      );
    }

    // Gestionar inventario y productos si se enviaron nuevos items
    if (dto.items && Array.isArray(dto.items)) {
      const oldMovements = await this.prisma.inventoryMovement.findMany({
        where: { documentId: sale.id, type: 'OUT', reason: 'SALE' },
      });
      for (const mov of oldMovements) {
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
      }

      await this.prisma.inventoryMovement.deleteMany({
        where: { documentId: sale.id, type: 'OUT', reason: 'SALE' },
      });
      await this.prisma.saleItem.deleteMany({
        where: { saleId: sale.id },
      });

      let newTotal = 0;
      for (const it of dto.items) {
        const itemPrice = Number(it.unit_price !== undefined ? it.unit_price : (it.price ?? 0));
        const itemTotal = Number((it.quantity * itemPrice).toFixed(2));
        newTotal += itemTotal;
        await this.prisma.saleItem.create({
          data: {
            saleId: sale.id,
            productId: it.productId,
            name: it.name || it.description || 'Producto',
            quantity: Number(it.quantity),
            price: itemPrice,
          },
        });

        await this.prisma.inventoryMovement.create({
          data: {
            productId: it.productId,
            quantity: Number(it.quantity),
            type: 'OUT',
            reason: 'SALE',
            userId: sale.userId,
            unitCost: itemPrice,
            totalCost: itemTotal,
            stockResult: 0,
            documentId: sale.id,
            branchId: sale.branchId,
          },
        });

        await this.prisma.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: Number(it.quantity) } },
        });
        if (sale.branchId) {
          const bStock = await this.prisma.branchStock.findUnique({
            where: { productId_branchId: { productId: it.productId, branchId: sale.branchId } },
          });
          if (bStock) {
            await this.prisma.branchStock.update({
              where: { id: bStock.id },
              data: { stock: { decrement: Number(it.quantity) } },
            });
          }
        }
      }
      sale.amount = Number(newTotal.toFixed(2));
    }

    const updateData: any = {};
    if (dto.client_doc_type !== undefined) updateData.clientDocumentType = dto.client_doc_type;
    if (dto.client_doc_number !== undefined) updateData.clientDocumentNumber = dto.client_doc_number;
    if (dto.client_name !== undefined) updateData.clientDenomination = dto.client_name;
    if (dto.client_address !== undefined) updateData.clientAddress = dto.client_address;
    if (dto.client_email !== undefined) updateData.clientEmail = dto.client_email;
    if (dto.payment_method !== undefined) updateData.paymentMethod = dto.payment_method;
    if (dto.issue_date) updateData.date = new Date(`${dto.issue_date}T12:00:00.000-05:00`);
    if (dto.items) updateData.amount = sale.amount;

    if (diffResult?.caso === 'CASE_A') {
      if (diffResult.nota_credito) {
        await this.recordNoteInFiscalDocument(ownerId, diffResult.nota_credito, {
          refSerie: sale.billingSerie,
          refCorrelative: sale.billingNumber,
          branchId: sale.branchId,
          docType: 'CREDIT_NOTE',
          customerDocType: clientDocType,
          customerDocNum: clientDocNum,
          customerName: clientName,
          customerAddress: clientAddress,
        });
      }
      if (diffResult.nuevo_comprobante) {
        const parts = (diffResult.nuevo_comprobante.full_number || '').split('-');
        updateData.billingSerie = parts[0] || sale.billingSerie;
        updateData.billingNumber =
          parseInt(parts[1], 10) ||
          Number(diffResult.nuevo_comprobante.number) ||
          sale.billingNumber;
        updateData.billingStatus = 'SUCCESS';
        updateData.billingPdfUrl = diffResult.recursos_nuevo?.pdf_url || sale.billingPdfUrl;
        updateData.billingXmlUrl = diffResult.recursos_nuevo?.xml_url || sale.billingXmlUrl;
        updateData.billingCdrUrl = diffResult.recursos_nuevo?.cdr_url || sale.billingCdrUrl;
      }
    } else if (diffResult?.caso === 'CASE_B' && diffResult.nota_credito) {
      await this.recordNoteInFiscalDocument(ownerId, diffResult.nota_credito, {
        refSerie: sale.billingSerie,
        refCorrelative: sale.billingNumber,
        branchId: sale.branchId,
        docType: 'CREDIT_NOTE',
        customerDocType: clientDocType,
        customerDocNum: clientDocNum,
        customerName: clientName,
        customerAddress: clientAddress,
      });
    } else if (diffResult?.caso === 'CASE_C' && diffResult.nota_debito) {
      await this.recordNoteInFiscalDocument(ownerId, diffResult.nota_debito, {
        refSerie: sale.billingSerie,
        refCorrelative: sale.billingNumber,
        branchId: sale.branchId,
        docType: 'DEBIT_NOTE',
        customerDocType: clientDocType,
        customerDocNum: clientDocNum,
        customerName: clientName,
        customerAddress: clientAddress,
      });
    } else if (diffResult?.caso === 'CASE_D' && diffResult.nota_credito) {
      await this.recordNoteInFiscalDocument(ownerId, diffResult.nota_credito, {
        refSerie: sale.billingSerie,
        refCorrelative: sale.billingNumber,
        branchId: sale.branchId,
        docType: 'CREDIT_NOTE',
        customerDocType: clientDocType,
        customerDocNum: clientDocNum,
        customerName: clientName,
        customerAddress: clientAddress,
      });
    }

    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return {
      success: true,
      message: 'Venta y comprobante procesados exitosamente con el motor inteligente.',
      sale: updatedSale,
      diffResult,
    };
  }

  /**
   * EMISIÓN MANUAL DE NOTA DE CRÉDITO O DÉBITO PARA UNA VENTA
   */
  async emitManualNoteForSale(ownerId: string, id: string, dto: any) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
      },
      include: { items: true },
    });

    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (!sale.billingSerie || !sale.billingNumber) {
      throw new BadRequestException('Esta venta no cuenta con comprobante fiscal emitido.');
    }

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Usuario propietario no encontrado');

    const reqAmount = dto.amount !== undefined ? Number(dto.amount) : undefined;
    const normalizedDto = {
      note_type: dto.note_type || dto.noteType || '07',
      reason_code: String(dto.reason_code || dto.reasonCode || '01').padStart(2, '0'),
      reason_description: String(dto.reason_description || dto.reasonText || dto.reason_text || 'Anulación de la operación').trim(),
      amount: reqAmount,
      issue_date: dto.issue_date || dto.issueDate,
      items: (Array.isArray(dto.items) && dto.items.length > 0)
        ? dto.items
            .map((it: any) => {
              const qty = Number(it.quantity || it.returnQty) || 1;
              let uPrice = Number(it.unit_price ?? it.price ?? 0);
              if (uPrice <= 0 && reqAmount && reqAmount > 0) {
                uPrice = Number((reqAmount / qty).toFixed(2));
              }
              return {
                code: it.code || it.productId || 'PROD',
                description: it.description || it.name || 'Ítem',
                quantity: qty,
                unit_price: uPrice,
                unit_measure: it.unit_measure || it.unit || 'NIU',
                igv_affectation_type: it.igv_affectation_type || it.igvAffectation || sale.igvAffectation || '20',
              };
            })
            .filter((it: any) => it.description && it.unit_price >= 0)
        : undefined,
    };

    const result = await this.ccofactService.emitManualNote(
      owner,
      sale.billingSerie,
      sale.billingNumber,
      normalizedDto,
    );

    if (result.nota) {
      await this.recordNoteInFiscalDocument(ownerId, result.nota, {
        refSerie: sale.billingSerie,
        refCorrelative: sale.billingNumber,
        branchId: sale.branchId,
        docType: normalizedDto.note_type === '08' ? 'DEBIT_NOTE' : 'CREDIT_NOTE',
        customerDocType: sale.clientDocumentType || '0',
        customerDocNum: sale.clientDocumentNumber || '00000000',
        customerName: sale.clientDenomination || 'CLIENTES VARIOS',
        customerAddress: sale.clientAddress,
      });
    }

    // Si la nota es de Crédito y anula formalmente ante SUNAT (01 Anulación de la operación, 02 Error en RUC), restaurar stock y marcar anulado
    if (normalizedDto.note_type === '07' && ['01', '02'].includes(normalizedDto.reason_code)) {
      for (const item of sale.items) {
        if (item.productId) {
          if (sale.branchId) {
            const bStock = await this.prisma.branchStock.findUnique({
              where: { productId_branchId: { productId: item.productId, branchId: sale.branchId } },
            });
            if (bStock) {
              await this.prisma.branchStock.update({
                where: { id: bStock.id },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await this.prisma.inventoryMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: 'IN',
              reason: 'SALE_RETURN',
              userId: sale.userId,
              unitCost: item.price,
              totalCost: Number((item.quantity * item.price).toFixed(2)),
              stockResult: 0,
              documentId: sale.id,
              branchId: sale.branchId,
            },
          });
        }
      }

      await this.prisma.sale.update({
        where: { id: sale.id },
        data: { billingStatus: 'CANCELLED' },
      });

      await this.prisma.fiscalDocument.updateMany({
        where: { serie: sale.billingSerie, correlative: sale.billingNumber },
        data: {
          status: FiscalStatus.CANCELLED,
        },
      });
    } else if (normalizedDto.note_type === '07' && ['06', '07'].includes(normalizedDto.reason_code)) {
      // Devolución total o por ítem de mercadería: restablecer stock de ítems devueltos sin anular comprobante fiscal
      if (normalizedDto.reason_code === '06') {
        for (const item of sale.items) {
          if (item.productId) {
            if (sale.branchId) {
              const bStock = await this.prisma.branchStock.findUnique({
                where: { productId_branchId: { productId: item.productId, branchId: sale.branchId } },
              });
              if (bStock) {
                await this.prisma.branchStock.update({
                  where: { id: bStock.id },
                  data: { stock: { increment: item.quantity } },
                });
              }
            }
            await this.prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });

            await this.prisma.inventoryMovement.create({
              data: {
                productId: item.productId,
                quantity: item.quantity,
                type: 'IN',
                reason: 'SALE_RETURN',
                userId: sale.userId,
                unitCost: item.price,
                totalCost: Number((item.quantity * item.price).toFixed(2)),
                stockResult: 0,
                documentId: sale.id,
                branchId: sale.branchId,
              },
            });
          }
        }
      } else if (normalizedDto.reason_code === '07' && Array.isArray(normalizedDto.items)) {
        for (const it of normalizedDto.items) {
          const matchingItem = sale.items.find(si => si.productId === it.code || si.name === it.description);
          const returnQty = Number(it.quantity) || 0;
          if (matchingItem && matchingItem.productId && returnQty > 0) {
            if (sale.branchId) {
              const bStock = await this.prisma.branchStock.findUnique({
                where: { productId_branchId: { productId: matchingItem.productId, branchId: sale.branchId } },
              });
              if (bStock) {
                await this.prisma.branchStock.update({
                  where: { id: bStock.id },
                  data: { stock: { increment: returnQty } },
                });
              }
            }
            await this.prisma.product.update({
              where: { id: matchingItem.productId },
              data: { stock: { increment: returnQty } },
            });

            await this.prisma.inventoryMovement.create({
              data: {
                productId: matchingItem.productId,
                quantity: returnQty,
                type: 'IN',
                reason: 'SALE_RETURN',
                userId: sale.userId,
                unitCost: matchingItem.price,
                totalCost: Number((returnQty * matchingItem.price).toFixed(2)),
                stockResult: 0,
                documentId: sale.id,
                branchId: sale.branchId,
              },
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * REGISTRO Y PERSISTENCIA DE NOTAS FISCALES EN CONTROL FINANZAS
   */
  async recordNoteInFiscalDocument(
    ownerId: string,
    noteData: any,
    options: {
      refSerie: string;
      refCorrelative: number;
      branchId?: string | null;
      docType?: 'CREDIT_NOTE' | 'DEBIT_NOTE';
      customerDocType?: string;
      customerDocNum?: string;
      customerName?: string;
      customerAddress?: string | null;
    },
  ) {
    if (!noteData) return null;
    const fullNumber =
      noteData.full_number ||
      `${noteData.serie || noteData.series}-${String(noteData.number || 1).padStart(8, '0')}`;
    const parts = fullNumber.split('-');
    const serie = parts[0];
    const correlative = parseInt(parts[1], 10) || Number(noteData.number) || 1;
    const docType: any =
      options.docType === 'DEBIT_NOTE' || serie.includes('D') ? 'DEBIT_NOTE' : 'CREDIT_NOTE';

    const totalAmount = Number(noteData.total_amount || noteData.amount || 0);
    const totalExonerada = Number(noteData.total_exonerada || 0);
    const totalGravada = Number(noteData.total_gravada || 0);
    const totalIgv = Number(noteData.total_igv || 0);
    const totalInafecta = Number(noteData.total_inafecta || 0);

    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const refTag =
      options.refSerie && options.refCorrelative > 0
        ? `[REF:${options.refSerie}-${String(options.refCorrelative).padStart(8, '0')}]`
        : '';
    const noteReason =
      noteData.ref_reason_desc ||
      noteData.sunat_description ||
      noteData.motivo ||
      'Nota oficial SUNAT';
    const desc = `${refTag} ${noteReason}`.trim();

    const pdfUrl =
      noteData.recursos?.pdf_url ||
      noteData.recursos?.pdf_a4 ||
      noteData.enlaces?.pdf ||
      noteData.pdfUrl ||
      null;
    const xmlUrl =
      noteData.recursos?.xml_url ||
      noteData.recursos?.xml_firmado ||
      noteData.enlaces?.xml ||
      noteData.xmlUrl ||
      null;
    const cdrUrl =
      noteData.recursos?.cdr_url ||
      noteData.recursos?.cdr_sunat ||
      noteData.enlaces?.cdr ||
      noteData.cdrUrl ||
      null;

    try {
      return await this.prisma.fiscalDocument.upsert({
        where: {
          userId_docType_serie_correlative: {
            userId: ownerId,
            docType,
            serie,
            correlative,
          },
        },
        update: {
          status: 'ACCEPTED',
          totalAmount,
          totalOpGravada: totalGravada,
          totalOpExonerada: totalExonerada,
          totalOpInafecta: totalInafecta,
          totalIgv,
          pdfUrl: pdfUrl || undefined,
          xmlUrl: xmlUrl || undefined,
          cdrUrl: cdrUrl || undefined,
          sunatDescription: desc,
        },
        create: {
          userId: ownerId,
          docType,
          serie,
          correlative,
          fullNumber,
          status: 'ACCEPTED',
          issuerRuc: owner?.businessRuc || '20000000001',
          customerDocType: options.customerDocType || noteData.client_doc_type || '0',
          customerDocNum: options.customerDocNum || noteData.client_doc_number || '00000000',
          customerName: options.customerName || noteData.client_name || 'CLIENTES VARIOS',
          customerAddress: options.customerAddress || noteData.client_address || null,
          totalAmount,
          totalOpGravada: totalGravada,
          totalOpExonerada: totalExonerada,
          totalOpInafecta: totalInafecta,
          totalIgv,
          currency: (noteData.currency || 'PEN') as any,
          sunatResponseCode: '0',
          sunatDescription: desc,
          branchId: options.branchId || null,
          saleId: null,
          pdfUrl,
          xmlUrl,
          cdrUrl,
          hash: noteData.hash || null,
        },
      });
    } catch (err: any) {
      console.warn(`[salesService.recordNoteInFiscalDocument] Upsert error: ${err.message}`);
      return null;
    }
  }

  /**
   * SINCRONIZACIÓN AUTOMÁTICA DE NOTAS DESDE CCOFACT PRO HACIA CONTROL FINANZAS
   */
  async syncNotesFromCcofact(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { ccofactUrl: true, ccofactApiKey: true, businessRuc: true },
    });
    if (!owner?.ccofactUrl || !owner?.ccofactApiKey) return;

    try {
      const [creditNotes, debitNotes] = await Promise.all([
        this.ccofactService.fetchDocumentsFromCcofact(owner, { document_type: '07' }),
        this.ccofactService.fetchDocumentsFromCcofact(owner, { document_type: '08' }),
      ]);

      const allNotes = [...creditNotes, ...debitNotes];
      for (const note of allNotes) {
        if (!note.series || !note.number) continue;
        const refSerie = note.ref_series || '';
        const refNumber = Number(note.ref_number || 0);

        await this.recordNoteInFiscalDocument(ownerId, note, {
          refSerie,
          refCorrelative: refNumber,
          docType: note.document_type === '08' ? 'DEBIT_NOTE' : 'CREDIT_NOTE',
          customerDocType: note.client_doc_type,
          customerDocNum: note.client_doc_number,
          customerName: note.client_name,
          customerAddress: note.client_address,
        });

        if (note.document_type === '07' && refSerie && refNumber > 0) {
          const reasonCode = String(note.ref_reason_code || '');
          if (['01', '02', '06'].includes(reasonCode)) {
            await this.prisma.fiscalDocument.updateMany({
              where: {
                userId: ownerId,
                serie: refSerie,
                correlative: refNumber,
              },
              data: {
                status: 'CANCELLED' as any,
                sunatDescription: `Comprobante anulado formalmente ante SUNAT mediante Nota de Crédito ${note.series}-${note.number}. Motivo: ${note.ref_reason_description || 'Anulación'}`,
              },
            }).catch(() => {});

            // Buscar y actualizar las ventas afectadas
            const affectedSales = await this.prisma.sale.findMany({
              where: {
                user: { OR: [{ id: ownerId }, { parentId: ownerId }] },
                billingSerie: refSerie,
                billingNumber: refNumber,
              },
              include: { items: true },
            });

            for (const affSale of affectedSales) {
              await this.prisma.sale.update({
                where: { id: affSale.id },
                data: {
                  billingStatus: 'CANCELLED',
                  billingError: `Anulada ante SUNAT mediante Nota de Crédito ${note.series}-${note.number}`,
                },
              }).catch(() => {});

              // 1. Restaurar inventario/kardex si no se había restaurado ya
              const alreadyRestored = await this.prisma.inventoryMovement.findFirst({
                where: { documentId: affSale.id, reason: 'SALE_RETURN' },
              });

              if (!alreadyRestored && affSale.items && affSale.items.length > 0) {
                for (const item of affSale.items) {
                  if (item.productId) {
                    if (affSale.branchId) {
                      const bStock = await this.prisma.branchStock.findUnique({
                        where: { productId_branchId: { productId: item.productId, branchId: affSale.branchId } },
                      });
                      if (bStock) {
                        await this.prisma.branchStock.update({
                          where: { id: bStock.id },
                          data: { stock: { increment: item.quantity } },
                        });
                      }
                    }
                    await this.prisma.product.update({
                      where: { id: item.productId },
                      data: { stock: { increment: item.quantity } },
                    });
                    await this.prisma.inventoryMovement.create({
                      data: {
                        productId: item.productId,
                        quantity: item.quantity,
                        type: 'IN',
                        reason: 'SALE_RETURN',
                        userId: affSale.userId,
                        unitCost: item.price,
                        totalCost: Number((item.quantity * item.price).toFixed(2)),
                        stockResult: 0,
                        documentId: affSale.id,
                        branchId: affSale.branchId,
                      },
                    }).catch(() => {});
                  }
                }
              }

              // 2. Recalcular turno de caja (incluso si la caja ya fue cerrada)
              if (affSale.cashShiftId) {
                await this.cashShiftService.recalculateShiftTotals(affSale.cashShiftId).catch(() => {});
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`[salesService.syncNotesFromCcofact] Sync error: ${e.message}`);
    }
  }
}
