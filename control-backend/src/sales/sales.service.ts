import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CcofactService } from '../ccofact/ccofact.service';

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

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, name: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        advisor: { select: { id: true, name: true } },
        items: true,
      },
    });

    return sales;
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
        billingStatus: 'ERROR',
      },
    });

    if (!sale) {
      return { success: false, error: 'Venta no encontrada o no tiene errores' };
    }

    await this.prisma.sale.update({
      where: { id },
      data: { billingStatus: 'PENDING', billingError: null },
    });

    const result = await this.ccofactService.sendInvoice(id);

    if (result.success) {
      await this.prisma.sale.update({
        where: { id },
        data: {
          billingStatus: 'SUCCESS',
          billingNumber: result.number,
          billingSerie: result.serie,
          billingPdfUrl: result.pdfUrl,
          billingXmlUrl: result.xmlUrl,
          billingCdrUrl: result.cdrUrl,
        },
      });
    } else {
      await this.prisma.sale.update({
        where: { id },
        data: { billingStatus: 'ERROR', billingError: result.error },
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

    if (sale.cashShiftId) {
      const shift = await this.prisma.cashShift.findUnique({
        where: { id: sale.cashShiftId },
      });
      if (shift && shift.status === 'CLOSED') {
        throw new BadRequestException(
          'No se puede eliminar una venta que pertenece a un cierre de caja ya cerrado.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
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
      // Dos caminos legales SUNAT: Comunicación de Baja (≤ 7 días y no entregada) vs Nota de Crédito (Tipo 01)
      if (sale.billingSerie && sale.billingNumber) {
        let anularResult: any = null;
        const owner = await tx.user.findUnique({
          where: { id: ownerId },
        });

        const saleDateObj = new Date(sale.date);
        const daysElapsed = Math.max(0, Math.floor((Date.now() - saleDateObj.getTime()) / (1000 * 60 * 60 * 24)));
        const isWithin7Days = daysElapsed <= 7;
        const delivered = Boolean(options?.deliveredToClient);
        const chosenMethod = options?.method || (isWithin7Days && !delivered ? 'COMUNICACION_BAJA' : 'NOTA_CREDITO');
        const reasonText = options?.motivo || 'ANULACION DE VENTA EN SISTEMA COMERCIAL';

        if (owner?.ccofactUrl && owner?.ccofactApiKey) {
          try {
            if (chosenMethod === 'COMUNICACION_BAJA') {
              anularResult = await this.ccofactService.comunicacionBaja(
                owner,
                sale.billingSerie,
                sale.billingNumber,
                reasonText,
                delivered,
              );
            } else {
              anularResult = await this.ccofactService.anularFiscal(
                owner,
                sale.billingSerie,
                sale.billingNumber,
                reasonText,
              );
            }
          } catch (billingErr: any) {
            console.warn(`[Sincronización CCOFACT PRO] Error al anular comprobante ${sale.billingSerie}-${sale.billingNumber}:`, billingErr?.message);
          }
        }

        const ncFullNumber = anularResult?.nota_credito?.full_number;
        const ticketBaja = anularResult?.ticket;

        let annulDescription: string;
        if (chosenMethod === 'COMUNICACION_BAJA') {
          annulDescription = ticketBaja
            ? `Comprobante dado de baja formalmente ante SUNAT mediante Comunicación de Baja (Ticket: ${ticketBaja}). Motivo: ${reasonText}`
            : `Comprobante dado de baja formalmente ante SUNAT mediante Comunicación de Baja directa (≤ 7 días). Motivo: ${reasonText}`;
        } else {
          annulDescription = ncFullNumber
            ? `Comprobante anulado formalmente ante SUNAT mediante Nota de Crédito ${ncFullNumber} (Catálogo 09 Motivo 01: Anulación de la operación). Motivo: ${reasonText}`
            : `Comprobante anulado formalmente ante SUNAT conforme a Ley (Catálogo 09 Motivo 01). Motivo: ${reasonText}`;
        }

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

      // 3. Delete the Sale (cascade will delete items and commissions)
      await tx.sale.delete({
        where: { id: sale.id },
      });

      return { success: true };
    });
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
}
