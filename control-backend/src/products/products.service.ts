import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
        throw new BadRequestException('La equivalencia de la presentación debe ser mayor a cero.');
      }
      if (pres.price < 0) {
        throw new BadRequestException('El precio de la presentación no puede ser negativo.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          stock,
          minStock,
          costPrice,
          salePrice,
          unit: unit || 'UNIDAD',
          userId,
        },
      });

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
        include: { presentations: true },
      });
    });
  }

  async findAll(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      include: { presentations: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: { presentations: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(userId: string, id: string, data: any) {
    const product = await this.findOne(userId, id);

    const { presentations, unit, ...productData } = data;

    // Cast floats
    const updateData: any = { ...productData };
    if (updateData.stock !== undefined) updateData.stock = parseFloat(updateData.stock);
    if (updateData.minStock !== undefined) updateData.minStock = parseFloat(updateData.minStock);
    if (updateData.costPrice !== undefined) updateData.costPrice = parseFloat(updateData.costPrice);
    if (updateData.salePrice !== undefined) updateData.salePrice = parseFloat(updateData.salePrice);
    if (unit !== undefined) updateData.unit = unit;

    return this.prisma.$transaction(async (tx) => {
      // If presentations are provided, manage upserts/deletions
      if (presentations !== undefined) {
        const presentationsList = presentations || [];
        for (const pres of presentationsList) {
          if (pres.equivalence <= 0) {
            throw new BadRequestException('La equivalencia de la presentación debe ser mayor a cero.');
          }
          if (pres.price < 0) {
            throw new BadRequestException('El precio de la presentación no puede ser negativo.');
          }
        }

        // Handle deletions of omitted presentations
        const existingPres = product.presentations;
        const incomingIds = presentationsList.map((p: any) => p.id).filter(Boolean);
        const toDelete = existingPres.filter((p) => !incomingIds.includes(p.id));

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

      await tx.product.update({
        where: { id },
        data: updateData,
      });

      return tx.product.findUnique({
        where: { id },
        include: { presentations: true },
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

    return this.prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Secure restock (purchase) flow
   */
  async restock(userId: string, productId: string, restockDto: any) {
    const { quantity, presentationId, totalCost, categoryId, paymentMethod } = restockDto;

    if (quantity <= 0) {
      throw new BadRequestException('La cantidad a reponer debe ser mayor a cero.');
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Product Stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stock: product.stock + mainUnitsQty,
        },
      });

      // 2. Create Inventory Movement
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
        },
      });

      // 3. Create General Contable Transaction
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

      return {
        product: updatedProduct,
        transaction,
      };
    });
  }

  /**
   * Secure transactional POS checkout flow
   */
  async checkout(userId: string, checkoutDto: any) {
    const { items, paymentMethod, categoryId, receiptUrl } = checkoutDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('El carrito de compras está vacío.');
    }

    return this.prisma.$transaction(async (tx) => {
      const salesDetails: string[] = [];
      let totalAmount = 0;

      for (const item of items) {
        if (item.isCustom) {
          // Free/Custom item (no stock subtraction, just adds to financial total)
          const qty = parseFloat(item.quantity);
          const price = parseFloat(item.salePrice);
          totalAmount += qty * price;
          salesDetails.push(`${qty}x ${item.name} (Libre)`);
          continue;
        }

        // Real product
        const product = await tx.product.findFirst({
          where: { id: item.id, userId },
          include: { presentations: true },
        });
        if (!product) {
          throw new NotFoundException(`Producto "${item.name || item.id}" no encontrado.`);
        }

        let equivalence = 1;
        let presentationName = product.unit;
        let salePrice = product.salePrice;

        if (item.presentationId) {
          const pres = product.presentations.find((p) => p.id === item.presentationId);
          if (!pres) {
            throw new NotFoundException(
              `Presentación no encontrada en el producto "${product.name}".`,
            );
          }
          equivalence = pres.equivalence;
          presentationName = pres.name;
          salePrice = pres.price;
        }

        const requiredQty = parseFloat(item.quantity);
        const mainUnitsQty = requiredQty * equivalence;

        // Verify stock sufficiency
        if (product.stock < mainUnitsQty) {
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Disponible: ${product.stock} ${product.unit}, Requerido: ${mainUnitsQty} ${product.unit}.`,
          );
        }

        // Subtract stock
        await tx.product.update({
          where: { id: item.id },
          data: {
            stock: product.stock - mainUnitsQty,
          },
        });

        // Log inventory movement
        await tx.inventoryMovement.create({
          data: {
            productId: item.id,
            quantity: mainUnitsQty,
            type: 'OUT',
            reason: 'SALE',
            presentationId: item.presentationId || null,
            presentationName,
            presentationQty: requiredQty,
            userId,
          },
        });

        totalAmount += requiredQty * salePrice;
        salesDetails.push(`${requiredQty}x ${product.name} [${presentationName}]`);
      }

      // Create Financial Transaction (Income)
      const transaction = await tx.transaction.create({
        data: {
          name: 'Venta en Caja',
          type: 'INCOME',
          amount: parseFloat(totalAmount.toFixed(2)),
          categoryId,
          subCategoryId: null,
          date: new Date(),
          status: 'PAID',
          currency: 'PEN',
          paymentMethod,
          description: `Venta en POS: ${salesDetails.join(', ')}`,
          workspace: 'BUSINESS',
          receiptUrl: receiptUrl || null,
          userId,
        },
      });

      return {
        transactionId: transaction.id,
        amount: totalAmount,
        details: salesDetails,
      };
    });
  }
}
