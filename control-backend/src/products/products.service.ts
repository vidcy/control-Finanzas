import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  async create(userId: string, data: any) {
    const { presentations, unit, ...productData } = data;

    // Standardize stock and minStock to float
    const stock = parseFloat(productData.stock || 0);
    const minStock = parseFloat(productData.minStock || 5);
    const costPrice = parseFloat(productData.costPrice || 0);
    const salePrice = parseFloat(productData.salePrice || 0);

    // Validate presentations
    const presentationsList = presentations || [];
    for (const pres of presentationsList) {
      if (pres.equivalence <= 0) {
        throw new BadRequestException(
          'La equivalencia de la presentación debe ser mayor a cero.',
        );
      }
      if (pres.price < 0) {
        throw new BadRequestException(
          'El precio de la presentación no puede ser negativo.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const brandId = productData.brandId ? productData.brandId : null;
      const familyId = productData.familyId ? productData.familyId : null;

      // Find the maximum customCode for this user
      const maxProduct = await tx.product.findFirst({
        where: { userId },
        orderBy: { customCode: 'desc' },
      });
      const nextCode =
        maxProduct && maxProduct.customCode ? maxProduct.customCode + 1 : 1;

      // Find the first branch of the user to initialize its stock
      const firstBranch = await tx.branch.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      const product = await tx.product.create({
        data: {
          ...productData,
          customCode: nextCode,
          brandId,
          familyId,
          stock,
          minStock,
          costPrice,
          salePrice,
          unit: unit || 'UNIDAD',
          userId,
        },
      });

      if (firstBranch) {
        await tx.branchStock.create({
          data: {
            productId: product.id,
            branchId: firstBranch.id,
            stock: stock,
          },
        });
      }

      // If initial stock is greater than 0, create an initial inventory movement
      if (stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            quantity: stock,
            type: 'IN',
            reason: 'ADJUSTMENT',
            presentationId: null,
            presentationName: unit || 'UNIDAD',
            presentationQty: stock,
            userId,
            unitCost: costPrice,
            totalCost: stock * costPrice,
            stockResult: stock,
            branchId: firstBranch ? firstBranch.id : null,
          },
        });
      }

      // If no presentations were sent, create a default one for the main unit
      if (presentationsList.length === 0) {
        await tx.presentation.create({
          data: {
            name: unit || 'UNIDAD',
            equivalence: 1,
            price: salePrice,
            productId: product.id,
          },
        });
      } else {
        for (const pres of presentationsList) {
          await tx.presentation.create({
            data: {
              name: pres.name,
              equivalence: parseFloat(pres.equivalence),
              price: parseFloat(pres.price),
              productId: product.id,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          presentations: true,
          brand: true,
          family: true,
          branchStocks: {
            include: {
              branch: true,
            },
          },
        },
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      include: {
        presentations: true,
        brand: true,
        family: true,
        branchStocks: {
          include: {
            branch: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: {
        presentations: true,
        brand: true,
        family: true,
        branchStocks: {
          include: {
            branch: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(userId: string, id: string, data: any) {
    const product = await this.findOne(userId, id);

    const { presentations, unit, ...productData } = data;

    // Cast floats
    const updateData: any = { ...productData };
    if (updateData.stock !== undefined)
      updateData.stock = parseFloat(updateData.stock);
    if (updateData.minStock !== undefined)
      updateData.minStock = parseFloat(updateData.minStock);
    if (updateData.costPrice !== undefined)
      updateData.costPrice = parseFloat(updateData.costPrice);
    if (updateData.salePrice !== undefined)
      updateData.salePrice = parseFloat(updateData.salePrice);
    if (unit !== undefined) updateData.unit = unit;

    if (updateData.brandId !== undefined) {
      updateData.brandId = updateData.brandId ? updateData.brandId : null;
    }
    if (updateData.familyId !== undefined) {
      updateData.familyId = updateData.familyId ? updateData.familyId : null;
    }

    return this.prisma.$transaction(async (tx) => {
      // If presentations are provided, manage upserts/deletions
      if (presentations !== undefined) {
        const presentationsList = presentations || [];
        for (const pres of presentationsList) {
          if (pres.equivalence <= 0) {
            throw new BadRequestException(
              'La equivalencia de la presentación debe ser mayor a cero.',
            );
          }
          if (pres.price < 0) {
            throw new BadRequestException(
              'El precio de la presentación no puede ser negativo.',
            );
          }
        }

        // Handle deletions of omitted presentations
        const existingPres = product.presentations;
        const incomingIds = presentationsList
          .map((p: any) => p.id)
          .filter(Boolean);
        const toDelete = existingPres.filter(
          (p) => !incomingIds.includes(p.id),
        );

        for (const p of toDelete) {
          // Verify if presentation has movements in DB
          const movementsCount = await tx.inventoryMovement.count({
            where: { presentationId: p.id },
          });
          if (movementsCount > 0) {
            throw new BadRequestException(
              `No se puede eliminar la presentación "${p.name}" porque está asociada a movimientos de inventario.`,
            );
          }
        }

        // Delete the presentations not present in incoming list
        if (toDelete.length > 0) {
          await tx.presentation.deleteMany({
            where: { id: { in: toDelete.map((p) => p.id) } },
          });
        }

        // Upsert incoming presentations
        for (const pres of presentationsList) {
          if (pres.id) {
            await tx.presentation.update({
              where: { id: pres.id },
              data: {
                name: pres.name,
                equivalence: parseFloat(pres.equivalence),
                price: parseFloat(pres.price),
              },
            });
          } else {
            await tx.presentation.create({
              data: {
                name: pres.name,
                equivalence: parseFloat(pres.equivalence),
                price: parseFloat(pres.price),
                productId: id,
              },
            });
          }
        }
      }

      // If stock is changing, log adjustment
      if (
        updateData.stock !== undefined &&
        updateData.stock !== product.stock
      ) {
        const diff = updateData.stock - product.stock;
        const type = diff > 0 ? 'IN' : 'OUT';
        const quantity = Math.abs(diff);

        await tx.inventoryMovement.create({
          data: {
            productId: id,
            quantity,
            type,
            reason: 'ADJUSTMENT',
            presentationId: null,
            presentationName: product.unit,
            presentationQty: quantity,
            userId,
            unitCost: product.costPrice,
            totalCost: quantity * product.costPrice,
            stockResult: parseFloat(updateData.stock),
          },
        });
      }

      if (
        updateData.imageUrl !== undefined &&
        updateData.imageUrl !== product.imageUrl &&
        product.imageUrl
      ) {
        await this.filesService.deleteFile(product.imageUrl);
      }

      await tx.product.update({
        where: { id },
        data: updateData,
      });

      return tx.product.findUnique({
        where: { id },
        include: {
          presentations: true,
          brand: true,
          family: true,
          branchStocks: {
            include: {
              branch: true,
            },
          },
        },
      });
    });
  }

  async remove(userId: string, id: string) {
    const product = await this.findOne(userId, id);

    // Prevent deleting products with movements
    const movementsCount = await this.prisma.inventoryMovement.count({
      where: { productId: id },
    });
    if (movementsCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el producto "${product.name}" porque tiene movimientos de inventario registrados.`,
      );
    }

    const result = await this.prisma.product.delete({
      where: { id },
    });

    if (product.imageUrl) {
      await this.filesService.deleteFile(product.imageUrl);
    }

    return result;
  }

  /**
   * Secure restock (purchase) flow
   */
  async restock(userId: string, productId: string, restockDto: any) {
    const { quantity, presentationId, totalCost, categoryId, paymentMethod } =
      restockDto;

    if (quantity <= 0) {
      throw new BadRequestException(
        'La cantidad a reponer debe ser mayor a cero.',
      );
    }
    if (totalCost < 0) {
      throw new BadRequestException('El costo total no puede ser negativo.');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
      include: { presentations: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    let equivalence = 1;
    let presentationName = product.unit;

    if (presentationId) {
      const pres = product.presentations.find((p) => p.id === presentationId);
      if (!pres) throw new NotFoundException('Presentación no encontrada');
      equivalence = pres.equivalence;
      presentationName = pres.name;
    }

    const mainUnitsQty = quantity * equivalence;

    // Validate liquidity for restock
    const currentLiquidity = await this.getBusinessLiquidity(userId);
    if (parseFloat(totalCost) > currentLiquidity) {
      throw new BadRequestException(
        `Límite de liquidez superado. No tiene suficiente liquidez en caja para realizar esta reposición. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create General Contable Transaction
      const transaction = await tx.transaction.create({
        data: {
          name: `Compra de Mercadería: ${product.name} (${quantity} x ${presentationName})`,
          type: 'EXPENSE',
          amount: parseFloat(totalCost),
          categoryId,
          subCategoryId: null,
          date: new Date(),
          status: 'PAID',
          currency: 'PEN',
          paymentMethod,
          description: `Reposición de stock (inventario). Total unidades: ${mainUnitsQty} ${product.unit}.`,
          workspace: 'BUSINESS',
          userId,
        },
      });

      // 2. Calculate Weighted Average Cost (CPP)
      const purchaseUnitPrice = parseFloat(totalCost) / mainUnitsQty;
      let newCPP = product.costPrice;
      if (product.stock + mainUnitsQty > 0) {
        newCPP =
          (product.stock * product.costPrice + parseFloat(totalCost)) /
          (product.stock + mainUnitsQty);
      }

      // Find the first branch of the user to allocate stock
      const firstBranch = await tx.branch.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      // 3. Update Product Stock and CPP
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stock: product.stock + mainUnitsQty,
          costPrice: newCPP,
        },
      });

      // Update or create BranchStock for the first branch
      if (firstBranch) {
        const bStock = await tx.branchStock.findUnique({
          where: {
            productId_branchId: {
              productId,
              branchId: firstBranch.id,
            },
          },
        });
        if (bStock) {
          await tx.branchStock.update({
            where: { id: bStock.id },
            data: { stock: { increment: mainUnitsQty } },
          });
        } else {
          await tx.branchStock.create({
            data: {
              productId,
              branchId: firstBranch.id,
              stock: mainUnitsQty,
            },
          });
        }
      }

      // 4. Create Inventory Movement (Kardex details populated)
      await tx.inventoryMovement.create({
        data: {
          productId,
          quantity: mainUnitsQty,
          type: 'IN',
          reason: 'PURCHASE',
          presentationId: presentationId || null,
          presentationName,
          presentationQty: parseFloat(quantity),
          userId,
          unitCost: purchaseUnitPrice,
          totalCost: parseFloat(totalCost),
          stockResult: updatedProduct.stock,
          documentId: transaction.id,
          branchId: firstBranch ? firstBranch.id : null,
        },
      });

      return {
        product: updatedProduct,
        transaction,
      };
    });
  }

  /**
   * Secure transactional POS checkout flow
   */
  async checkout(ownerId: string, workerId: string, checkoutDto: any) {
    const { items, paymentMethod, categoryId, subCategoryId, receiptUrl } =
      checkoutDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('El carrito de compras está vacío.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 0. Find active CashShift for the worker
      const activeShift = await tx.cashShift.findFirst({
        where: { userId: workerId, status: 'OPEN' },
      });
      if (!activeShift) {
        throw new BadRequestException(
          'No hay ninguna caja abierta para realizar ventas.',
        );
      }

      let totalAmount = 0;
      const salesDetails: string[] = [];
      const itemsToProcess: Array<{
        product: any;
        item: any;
        mainUnitsQty: number;
        requiredQty: number;
        presentationName: string;
        salePrice: number;
      }> = [];

      for (const item of items) {
        if (item.isCustom) {
          const qty = parseFloat(item.quantity);
          const price = parseFloat(item.salePrice);
          totalAmount += qty * price;
          salesDetails.push(
            `${qty}x ${item.name} (Libre) (S/ ${price.toFixed(2)} c/u)`,
          );
          continue;
        }

        const product = await tx.product.findFirst({
          where: { id: item.id, userId: ownerId },
          include: { presentations: true },
        });
        if (!product) {
          throw new NotFoundException(
            `Producto "${item.name || item.id}" no encontrado.`,
          );
        }

        let equivalence = 1;
        let presentationName = product.unit;
        let salePrice =
          item.salePrice !== undefined && item.salePrice !== null
            ? Number(item.salePrice)
            : product.salePrice;

        if (item.presentationId) {
          const pres = product.presentations.find(
            (p) => p.id === item.presentationId,
          );
          if (!pres) {
            throw new NotFoundException(
              `Presentación no encontrada en el producto "${product.name}".`,
            );
          }
          equivalence = pres.equivalence;
          presentationName = pres.name;
          salePrice =
            item.salePrice !== undefined && item.salePrice !== null
              ? Number(item.salePrice)
              : pres.price;
        }

        const requiredQty = parseFloat(item.quantity);
        const mainUnitsQty = requiredQty * equivalence;

        let availableStock = product.stock;
        let branchStockRecord = null;
        if (activeShift.branchId) {
          branchStockRecord = await tx.branchStock.findUnique({
            where: {
              productId_branchId: {
                productId: product.id,
                branchId: activeShift.branchId,
              },
            },
          });
          availableStock = branchStockRecord ? branchStockRecord.stock : 0;
        }

        if (availableStock < mainUnitsQty) {
          throw new BadRequestException(
            `Stock insuficiente en esta sede para "${product.name}". Disponible: ${availableStock} ${product.unit}, Requerido: ${mainUnitsQty} ${product.unit}.`,
          );
        }

        totalAmount += requiredQty * salePrice;
        salesDetails.push(
          `${requiredQty}x ${product.name} [${presentationName}] (S/ ${salePrice.toFixed(2)} c/u)`,
        );

        itemsToProcess.push({
          product,
          item,
          mainUnitsQty,
          requiredQty,
          presentationName,
          salePrice,
          branchStockRecord,
        });
      }

      // 1. Create Financial Transaction (Income)
      const transaction = await tx.transaction.create({
        data: {
          name: 'Venta en Caja',
          type: 'INCOME',
          amount: parseFloat(totalAmount.toFixed(2)),
          categoryId,
          subCategoryId: subCategoryId || null,
          date: new Date(),
          status: 'PAID',
          currency: 'PEN',
          paymentMethod,
          description: `Venta en POS: ${salesDetails.join(', ')}`,
          workspace: 'BUSINESS',
          receiptUrl: receiptUrl || null,
          userId: workerId,
          cashShiftId: activeShift.id,
          isPosSale: true,
          branchId: activeShift.branchId || null,
        },
      });

      // 2. Process stock adjustments and movements
      for (const proc of itemsToProcess) {
        const { product, item, mainUnitsQty, requiredQty, presentationName, branchStockRecord } =
          proc;

        // Subtract stock from branch-specific stock
        if (activeShift.branchId) {
          if (branchStockRecord) {
            await tx.branchStock.update({
              where: { id: branchStockRecord.id },
              data: {
                stock: { decrement: mainUnitsQty },
              },
            });
          } else {
            await tx.branchStock.create({
              data: {
                productId: product.id,
                branchId: activeShift.branchId,
                stock: -mainUnitsQty,
              },
            });
          }
        }

        // Subtract stock globally
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stock: { decrement: mainUnitsQty },
          },
        });

        // Log inventory movement (populated with Kardex fields)
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            quantity: mainUnitsQty,
            type: 'OUT',
            reason: 'SALE',
            presentationId: item.presentationId || null,
            presentationName,
            presentationQty: requiredQty,
            userId: workerId,
            unitCost: product.costPrice, // CPP unit cost at sale
            totalCost: mainUnitsQty * product.costPrice,
            stockResult: activeShift.branchId
              ? (branchStockRecord ? branchStockRecord.stock - mainUnitsQty : -mainUnitsQty)
              : updatedProduct.stock,
            documentId: transaction.id,
            branchId: activeShift.branchId || null,
          },
        });
      }

      return {
        transactionId: transaction.id,
        amount: totalAmount,
        details: salesDetails,
      };
    });
  }

  async getLowStockAnalysis(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const allProducts = await this.prisma.product.findMany({
      where: { userId },
      include: { presentations: true },
      orderBy: { name: 'asc' },
    });

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.minStock);

    const productIds = lowStockProducts.map((p) => p.id);
    if (productIds.length === 0) return [];

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        productId: { in: productIds },
        type: 'OUT',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const salesVelocityMap = new Map<string, number>();
    for (const mov of movements) {
      const current = salesVelocityMap.get(mov.productId) || 0;
      salesVelocityMap.set(mov.productId, current + mov.quantity);
    }

    return lowStockProducts.map((p) => {
      const soldQty = salesVelocityMap.get(p.id) || 0;
      const deficit = Math.max(0, p.minStock - p.stock);
      return {
        ...p,
        soldQty,
        deficit,
      };
    });
  }

  async getOwnerId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentId: true },
    });
    return user?.parentId || userId;
  }

  async getBusinessLiquidity(userId: string, tx?: any): Promise<number> {
    const prisma = tx || this.prisma;
    const ownerId = await this.getOwnerId(userId);
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ userId: ownerId }, { user: { parentId: ownerId } }],
        workspace: 'BUSINESS',
        isPosSale: false,
        status: 'PAID',
      },
      select: {
        type: true,
        amountSoles: true,
        amount: true,
        status: true,
        description: true,
      },
    });

    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      const amt = t.amountSoles !== null && t.amountSoles !== undefined ? t.amountSoles : t.amount;
      if (t.type === 'INCOME') {
        income += amt;
      } else {
        expense += amt;
      }
    }

    return income - expense;
  }


  async createPurchaseOrder(userId: string, body: any) {
    const {
      items,
      totalCost,
      paymentMethod,
      categoryId,
      subCategoryId,
      receiptUrl,
      receiveImmediately,
      confirmPayment,
    } = body;

    if (!items || items.length === 0) {
      throw new BadRequestException('El pedido de compras está vacío.');
    }
    if (totalCost < 0) {
      throw new BadRequestException('El costo total no puede ser negativo.');
    }

    const isPaid = !!receiptUrl || !!confirmPayment || !!receiveImmediately;

    // Check liquidity if paid immediately
    if (isPaid) {
      const currentLiquidity = await this.getBusinessLiquidity(userId);
      if (parseFloat(totalCost) > currentLiquidity) {
        throw new BadRequestException(
          `Límite de liquidez superado. No tiene suficiente liquidez en caja para realizar esta compra. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create PurchaseOrder and items
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          totalCost: parseFloat(totalCost),
          status: receiveImmediately ? 'RECEIVED' : isPaid ? 'PAID' : 'PENDING',
          paymentMethod,
          categoryId,
          subCategoryId: subCategoryId || null,
          receiptUrl: receiptUrl || null,
          userId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              equivalence: parseFloat(item.equivalence || 1.0),
              presentationId: item.presentationId || null,
              presentationName: item.presentationName || null,
              costPrice: parseFloat(item.costPrice),
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 2. Fetch product details for descriptions
      const productIds = items.map((item: any) => item.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productNames = dbProducts.map((p) => p.name).join(', ');
      const itemDetails = items
        .map((item: any) => {
          const prod = dbProducts.find((p) => p.id === item.productId);
          const name = prod ? prod.name : 'Producto';
          const presName =
            item.presentationName || (prod ? prod.unit : 'Unidad');
          return `${item.quantity}x ${name} [${presName}]`;
        })
        .join(', ');

      // 3. Create General Contable Transaction (Expense)
      if (isPaid) {
        await tx.transaction.create({
          data: {
            name: `Compra de Mercadería: ${productNames.substring(0, 50)}${productNames.length > 50 ? '...' : ''}`,
            type: 'EXPENSE',
            amount: parseFloat(totalCost),
            categoryId,
            subCategoryId: subCategoryId || null,
            date: new Date(),
            status: 'PAID',
            currency: 'PEN',
            paymentMethod,
            description: `Pedido de Compra. ID: ${purchaseOrder.id}. Ítems: ${itemDetails}. Estado: Pagado. ${receiveImmediately ? 'Recibido en Almacén.' : 'En Tránsito (Pedido).'}`,
            workspace: 'BUSINESS',
            receiptUrl: receiptUrl || null,
            userId,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            name: `Compra de Mercadería: ${productNames.substring(0, 50)}${productNames.length > 50 ? '...' : ''}`,
            type: 'EXPENSE',
            amount: parseFloat(totalCost),
            categoryId,
            subCategoryId: subCategoryId || null,
            date: new Date(),
            status: 'PENDING',
            currency: 'PEN',
            paymentMethod,
            description: `Pedido de Compra. ID: ${purchaseOrder.id}. Ítems: ${itemDetails}. Estado: Pendiente de Pago.`,
            workspace: 'BUSINESS',
            receiptUrl: null,
            userId,
          },
        });
      }

      // 4. Update Stock & Movements if received immediately
      if (receiveImmediately) {
        for (const item of items) {
          const prod = dbProducts.find((p) => p.id === item.productId);
          if (prod) {
            const equivalence = parseFloat(item.equivalence || 1.0);
            const mainUnitsQty = parseFloat(item.quantity) * equivalence;
            const presentationName = item.presentationName || prod.unit;
            const itemCostPricePerBaseUnit =
              parseFloat(item.costPrice) / equivalence;

            // Calculate CPP
            let newCPP = prod.costPrice;
            if (prod.stock + mainUnitsQty > 0) {
              newCPP =
                (prod.stock * prod.costPrice +
                  mainUnitsQty * itemCostPricePerBaseUnit) /
                (prod.stock + mainUnitsQty);
            }

            // Update stock and CPP
            const updatedProduct = await tx.product.update({
              where: { id: prod.id },
              data: {
                stock: { increment: mainUnitsQty },
                costPrice: newCPP,
              },
            });

            // Log inventory movement (populated with Kardex fields)
            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                quantity: mainUnitsQty,
                type: 'IN',
                reason: 'PURCHASE',
                presentationId: item.presentationId || null,
                presentationName,
                presentationQty: parseFloat(item.quantity),
                userId,
                unitCost: itemCostPricePerBaseUnit,
                totalCost: mainUnitsQty * itemCostPricePerBaseUnit,
                stockResult: updatedProduct.stock,
                documentId: purchaseOrder.id,
              },
            });
          }
        }
      }

      return purchaseOrder;
    });
  }

  /**
   * Get all purchase orders for the user
   */
  async getPurchaseOrders(userId: string, status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        userId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Receive/complete a purchase order, moving items to stock
   */
  async receivePurchaseOrder(userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === 'RECEIVED') {
      throw new BadRequestException('El pedido ya ha sido ingresado a stock');
    }
    if (order.status === 'PENDING') {
      throw new BadRequestException(
        'Debe registrar primero el pago del pedido antes de ingresarlo a stock.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
      });

      // 1.1 Find associated Treasury transaction and update status to PAID (Completado/Finalizado)
      const transaction = await tx.transaction.findFirst({
        where: {
          userId,
          description: {
            contains: `Pedido de Compra. ID: ${id}`,
          },
        },
      });

      if (transaction) {
        let newDesc = transaction.description;
        if (newDesc) {
          newDesc = newDesc.replace(
            'Estado: En Tránsito (Pedido)',
            'Estado: Recibido en Almacén',
          );
        }
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'PAID',
            description: newDesc,
          },
        });
      }

      // Find the first branch of the user to allocate stock
      const firstBranch = await tx.branch.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      // 2. Loop through items to increment stock & log inventory movement
      for (const item of order.items) {
        const equivalence = item.equivalence || 1.0;
        const mainUnitsQty = item.quantity * equivalence;
        const presentationName = item.presentationName || item.product.unit;
        const itemCostPricePerBaseUnit = item.costPrice / equivalence;

        // Calculate CPP
        let newCPP = item.product.costPrice;
        if (item.product.stock + mainUnitsQty > 0) {
          newCPP =
            (item.product.stock * item.product.costPrice +
              mainUnitsQty * itemCostPricePerBaseUnit) /
            (item.product.stock + mainUnitsQty);
        }

        // Update stock and CPP
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: mainUnitsQty },
            costPrice: newCPP,
          },
        });

        // Update or create BranchStock for the first branch
        if (firstBranch) {
          const bStock = await tx.branchStock.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: firstBranch.id,
              },
            },
          });
          if (bStock) {
            await tx.branchStock.update({
              where: { id: bStock.id },
              data: { stock: { increment: mainUnitsQty } },
            });
          } else {
            await tx.branchStock.create({
              data: {
                productId: item.productId,
                branchId: firstBranch.id,
                stock: mainUnitsQty,
              },
            });
          }
        }

        // Log inventory movement (populated with Kardex fields)
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            quantity: mainUnitsQty,
            type: 'IN',
            reason: 'PURCHASE',
            presentationId: item.presentationId || null,
            presentationName,
            presentationQty: item.quantity,
            userId,
            unitCost: itemCostPricePerBaseUnit,
            totalCost: mainUnitsQty * itemCostPricePerBaseUnit,
            stockResult: updatedProduct.stock,
            documentId: order.id,
            branchId: firstBranch ? firstBranch.id : null,
          },
        });
      }

      return updatedOrder;
    });
  }

  /**
   * Cancel/delete a pending purchase order
   */
  async payPurchaseOrder(userId: string, id: string, body: any) {
    const { paymentMethod, categoryId, subCategoryId, receiptUrl } = body;

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('El pedido ya ha sido pagado o recibido.');
    }

    // Check liquidity
    const currentLiquidity = await this.getBusinessLiquidity(userId);
    if (order.totalCost > currentLiquidity) {
      throw new BadRequestException(
        `Límite de liquidez superado. No tiene suficiente liquidez en caja para realizar este pago. Liquidez disponible: S/ ${currentLiquidity.toFixed(2)}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update status to PAID, wasPaid to true, and save subCategoryId
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'PAID',
          paymentMethod,
          categoryId,
          subCategoryId: subCategoryId || null,
          receiptUrl: receiptUrl || null,
          wasPaid: true,
        },
      });

      // 2. Locate or transition the PENDING transaction to PAID
      const existingPendingTx = await tx.transaction.findFirst({
        where: {
          userId,
          description: {
            contains: `Pedido de Compra. ID: ${id}`,
          },
          status: 'PENDING',
        },
      });

      if (existingPendingTx) {
        await tx.transaction.update({
          where: { id: existingPendingTx.id },
          data: {
            status: 'PAID',
            paymentMethod,
            categoryId,
            subCategoryId: subCategoryId || null,
            receiptUrl: receiptUrl || null,
            date: new Date(),
            description: existingPendingTx.description
              ? existingPendingTx.description.replace(
                  'Estado: Pendiente de Pago.',
                  'Estado: Pagado. En Tránsito (Pedido).',
                )
              : `Pedido de Compra. ID: ${order.id}. Estado: Pagado. En Tránsito (Pedido).`,
          },
        });
      } else {
        const productNames = order.items
          .map((item) => item.product.name)
          .join(', ');
        const itemDetails = order.items
          .map((item) => `${item.quantity}x ${item.product.name}`)
          .join(', ');

        await tx.transaction.create({
          data: {
            name: `Compra de Mercadería: ${productNames.substring(0, 50)}${productNames.length > 50 ? '...' : ''}`,
            type: 'EXPENSE',
            amount: order.totalCost,
            categoryId,
            subCategoryId: subCategoryId || null,
            date: new Date(),
            status: 'PAID',
            currency: 'PEN',
            paymentMethod,
            description: `Pedido de Compra. ID: ${order.id}. Ítems: ${itemDetails}. Estado: Pagado. En Tránsito (Pedido).`,
            workspace: 'BUSINESS',
            receiptUrl: receiptUrl || null,
            userId,
          },
        });
      }

      return updatedOrder;
    });
  }

  async deletePurchaseOrder(userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    // Si el pedido ya fue ingresado a stock (RECEIVED) → no se puede eliminar
    if (order.status === 'RECEIVED') {
      throw new BadRequestException(
        'No se puede eliminar un pedido que ya fue ingresado al almacén (estado: Recibido). Si cometió un error, primero revierta el ingreso de stock y luego cancele el pedido.',
      );
    }

    if (order.wasPaid) {
      throw new BadRequestException(
        'No se puede eliminar un pedido que ya ha sido pagado previamente. Al haber sido pagado, ya generó movimientos y conciliación contable. Para anularlo, debe cancelarlo usando la opción de Cancelar.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Si el pedido ya tiene un registro de pago CONFIRMADO (PAID) en Tesorería, no se puede eliminar
      const paidTreasuryRecord = await tx.transaction.findFirst({
        where: {
          userId,
          description: {
            contains: `Pedido de Compra. ID: ${id}`,
          },
          status: 'PAID',
        },
      });

      if (paidTreasuryRecord) {
        throw new BadRequestException(
          `TREASURY_RECORD_EXISTS|${paidTreasuryRecord.id}|Este pedido ya tiene un pago confirmado registrado en Tesorería. No se puede eliminar, sólo cancelar. Al cancelarlo, se anulará el registro y regresará el saldo.`,
        );
      }

      // Si existe un registro PENDING (Cuenta por Pagar), lo eliminamos junto al pedido
      const pendingTreasuryRecord = await tx.transaction.findFirst({
        where: {
          userId,
          description: {
            contains: `Pedido de Compra. ID: ${id}`,
          },
          status: 'PENDING',
        },
      });

      if (pendingTreasuryRecord) {
        await tx.transaction.delete({
          where: { id: pendingTreasuryRecord.id },
        });
      }

      // Eliminar el pedido de compra
      return tx.purchaseOrder.delete({
        where: { id },
      });
    });
  }

  /**
   * Cancelar un pedido de compra.
   * - Si status=PENDING sin registro en Tesorería: elimina directamente (ya estaba cubierto por deletePurchaseOrder)
   * - Si status=PAID con registro en Tesorería: cancela el pedido y anula el registro de Tesorería
   * - Si status=RECEIVED: no se puede cancelar directamente, primero revertir el ingreso
   */
  async cancelPurchaseOrder(userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (order.status === 'RECEIVED') {
      throw new BadRequestException(
        'No se puede cancelar un pedido que ya fue ingresado al almacén. Primero debe revertir el ingreso de stock usando el botón "Revertir Ingreso", y luego cancelar el pedido.',
      );
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Este pedido ya está cancelado.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Cancelar el pedido
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Buscar y anular el registro en Tesorería si existe
      const treasuryRecord = await tx.transaction.findFirst({
        where: {
          userId,
          description: {
            contains: `Pedido de Compra. ID: ${id}`,
          },
          status: {
            in: ['PAID', 'PENDING'],
          },
        },
      });

      if (treasuryRecord) {
        await tx.transaction.update({
          where: { id: treasuryRecord.id },
          data: {
            status: 'CANCELLED',
            description: treasuryRecord.description
              ? treasuryRecord.description + ' [CANCELADO]'
              : '[CANCELADO]',
          },
        });
      }

      return updatedOrder;
    });
  }

  /**
   * Revert a received purchase order back to pending (ORDERED), subtracting items from stock
   */
  async revertPurchaseOrder(userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Solo se pueden revertir pedidos que ya han sido ingresados a stock (RECEIVED)',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Order Status back to PAID (since it was paid)
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'PAID' },
      });

      // 1.1 Find associated Treasury transaction and update back to PENDING (En Proceso)
      const transaction = await tx.transaction.findFirst({
        where: {
          userId,
          description: {
            contains: `Pedido de Compra. ID: ${id}`,
          },
        },
      });

      if (transaction) {
        let newDesc = transaction.description;
        if (newDesc) {
          newDesc = newDesc.replace(
            'Estado: Recibido en Almacén',
            'Estado: En Tránsito (Pedido)',
          );
        }
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'PENDING',
            description: newDesc,
          },
        });
      }

      // Find the first branch of the user to deduct stock from
      const firstBranch = await tx.branch.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      // 2. Loop through items to decrement stock & log inventory movement (OUT)
      for (const item of order.items) {
        const equivalence = item.equivalence || 1.0;
        const mainUnitsQty = item.quantity * equivalence;
        const presentationName = item.presentationName || item.product.unit;
        const itemCostPricePerBaseUnit = item.costPrice / equivalence;

        // Revert Weighted Average Cost (CPP) algebraically
        const stockNew = item.product.stock;
        const currentCPP = item.product.costPrice;
        const stockActual = stockNew - mainUnitsQty;

        let revertedCPP = currentCPP;
        if (stockActual > 0) {
          revertedCPP =
            (currentCPP * stockNew - mainUnitsQty * itemCostPricePerBaseUnit) /
            stockActual;
        }

        // Update stock and CPP
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: mainUnitsQty },
            costPrice: revertedCPP,
          },
        });

        // Decrement BranchStock for the first branch
        if (firstBranch) {
          const bStock = await tx.branchStock.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: firstBranch.id,
              },
            },
          });
          if (bStock) {
            await tx.branchStock.update({
              where: { id: bStock.id },
              data: { stock: { decrement: mainUnitsQty } },
            });
          }
        }

        // Log movement (OUT) (populated with Kardex fields)
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            quantity: mainUnitsQty,
            type: 'OUT',
            reason: 'REVERT_PURCHASE',
            presentationId: item.presentationId || null,
            presentationName,
            presentationQty: item.quantity,
            userId,
            unitCost: itemCostPricePerBaseUnit,
            totalCost: mainUnitsQty * itemCostPricePerBaseUnit,
            stockResult: updatedProduct.stock,
            documentId: order.id,
            branchId: firstBranch ? firstBranch.id : null,
          },
        });
      }

      return updatedOrder;
    });
  }

  /**
   * Update / Edit a purchase order (reverting stock if RECEIVED, changing items, then re-applying if RECEIVED)
   */
  async updatePurchaseOrder(userId: string, id: string, body: any) {
    const { items, totalCost, paymentMethod, categoryId, subCategoryId, receiptUrl } = body;

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const isReceived = order.status === 'RECEIVED';

      if (isReceived) {
        // Revert stock from old items
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            const equivalence = item.equivalence || 1.0;
            const mainUnitsQty = item.quantity * equivalence;
            const itemCostPricePerBaseUnit = item.costPrice / equivalence;

            const stockNew = product.stock;
            const currentCPP = product.costPrice;
            const stockActual = stockNew - mainUnitsQty;

            let revertedCPP = currentCPP;
            if (stockActual > 0) {
              revertedCPP =
                (currentCPP * stockNew -
                  mainUnitsQty * itemCostPricePerBaseUnit) /
                stockActual;
            }

            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: mainUnitsQty },
                costPrice: revertedCPP,
              },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                quantity: mainUnitsQty,
                type: 'OUT',
                reason: 'REVERT_PURCHASE',
                presentationId: item.presentationId || null,
                presentationName: item.presentationName || product.unit,
                presentationQty: item.quantity,
                userId,
                unitCost: itemCostPricePerBaseUnit,
                totalCost: mainUnitsQty * itemCostPricePerBaseUnit,
                stockResult: updatedProduct.stock,
                documentId: order.id,
              },
            });
          }
        }
      }

      // Delete old items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Update purchase order metadata and recreate items
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          totalCost: parseFloat(totalCost),
          paymentMethod,
          categoryId,
          subCategoryId: subCategoryId || null,
          receiptUrl: receiptUrl || null,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: parseFloat(item.quantity),
              equivalence: parseFloat(item.equivalence || 1.0),
              presentationId: item.presentationId || null,
              presentationName: item.presentationName || null,
              costPrice: parseFloat(item.costPrice),
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (isReceived) {
        // Apply stock of new items
        for (const item of updatedOrder.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            const equivalence = item.equivalence || 1.0;
            const mainUnitsQty = item.quantity * equivalence;
            const presentationName = item.presentationName || product.unit;
            const itemCostPricePerBaseUnit = item.costPrice / equivalence;

            let newCPP = product.costPrice;
            if (product.stock + mainUnitsQty > 0) {
              newCPP =
                (product.stock * product.costPrice +
                  mainUnitsQty * itemCostPricePerBaseUnit) /
                (product.stock + mainUnitsQty);
            }

            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: mainUnitsQty },
                costPrice: newCPP,
              },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                quantity: mainUnitsQty,
                type: 'IN',
                reason: 'PURCHASE',
                presentationId: item.presentationId || null,
                presentationName,
                presentationQty: item.quantity,
                userId,
                unitCost: itemCostPricePerBaseUnit,
                totalCost: mainUnitsQty * itemCostPricePerBaseUnit,
                stockResult: updatedProduct.stock,
                documentId: order.id,
              },
            });
          }
        }
      }

      // Update associated general ledger transaction
      const orderNames = updatedOrder.items
        .map((item) => item.product?.name || 'Producto')
        .join(', ');
      const orderDetails = updatedOrder.items
        .map((item) => {
          const presName =
            item.presentationName || item.product?.unit || 'Unidad';
          return `${item.quantity}x ${item.product?.name || 'Producto'} [${presName}]`;
        })
        .join(', ');

      const existingTx = await tx.transaction.findFirst({
        where: {
          userId,
          description: { contains: order.id },
        },
      });

      if (existingTx) {
        await tx.transaction.update({
          where: { id: existingTx.id },
          data: {
            name: `Compra de Mercadería: ${orderNames.substring(0, 50)}${orderNames.length > 50 ? '...' : ''}`,
            amount: parseFloat(totalCost),
            categoryId,
            subCategoryId: subCategoryId || null,
            paymentMethod,
            receiptUrl: receiptUrl || null,
            description: `Pedido de Compra. ID: ${order.id}. Ítems: ${orderDetails}. Estado: ${isReceived ? 'Recibido en Almacén' : 'En Tránsito (Pedido)'}.`,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            name: `Compra de Mercadería: ${orderNames.substring(0, 50)}${orderNames.length > 50 ? '...' : ''}`,
            type: 'EXPENSE',
            amount: parseFloat(totalCost),
            categoryId,
            subCategoryId: subCategoryId || null,
            date: new Date(),
            status: 'PAID',
            currency: 'PEN',
            paymentMethod,
            description: `Pedido de Compra. ID: ${order.id}. Ítems: ${orderDetails}. Estado: ${isReceived ? 'Recibido en Almacén' : 'En Tránsito (Pedido)'}.`,
            workspace: 'BUSINESS',
            receiptUrl: receiptUrl || null,
            userId,
          },
        });
      }

      return updatedOrder;
    });
  }

  // --- BRANDS CRUD ---
  async getBrands(userId: string) {
    return this.prisma.brand.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(userId: string, data: { name: string }) {
    if (!data.name) {
      throw new BadRequestException('El nombre de la marca es requerido');
    }
    return this.prisma.brand.create({
      data: {
        name: data.name,
        userId,
      },
    });
  }

  async updateBrand(userId: string, id: string, data: { name: string }) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, userId },
    });
    if (!brand) {
      throw new NotFoundException('Marca no encontrada');
    }
    return this.prisma.brand.update({
      where: { id },
      data,
    });
  }

  async deleteBrand(userId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, userId },
    });
    if (!brand) {
      throw new NotFoundException('Marca no encontrada');
    }
    return this.prisma.brand.delete({
      where: { id },
    });
  }

  // --- FAMILIES CRUD ---
  async getFamilies(userId: string) {
    return this.prisma.family.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async createFamily(userId: string, data: { name: string }) {
    if (!data.name) {
      throw new BadRequestException('El nombre de la familia es requerido');
    }
    return this.prisma.family.create({
      data: {
        name: data.name,
        userId,
      },
    });
  }

  async updateFamily(userId: string, id: string, data: { name: string }) {
    const family = await this.prisma.family.findFirst({
      where: { id, userId },
    });
    if (!family) {
      throw new NotFoundException('Familia no encontrada');
    }
    return this.prisma.family.update({
      where: { id },
      data,
    });
  }

  async deleteFamily(userId: string, id: string) {
    const family = await this.prisma.family.findFirst({
      where: { id, userId },
    });
    if (!family) {
      throw new NotFoundException('Familia no encontrada');
    }
    return this.prisma.family.delete({
      where: { id },
    });
  }
}
