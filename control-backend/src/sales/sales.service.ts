import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NubefactService } from '../nubefact/nubefact.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nubefactService: NubefactService,
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
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
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

    const result = await this.nubefactService.sendInvoice(id);

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

    const result = await this.nubefactService.sendNote(
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

    const result = await this.nubefactService.sendNote(
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

  async deleteSale(ownerId: string, id: string) {
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

      // 2. Delete the Sale (cascade will delete items and commissions)
      await tx.sale.delete({
        where: { id: sale.id },
      });

      return { success: true };
    });
  }
}
