import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getBranches(userId: string) {
    let branches = await this.prisma.branch.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-create a default branch if none exist
    if (branches.length === 0) {
      const defaultBranch = await this.prisma.branch.create({
        data: {
          name: 'Almacén Central',
          address: 'Principal / Matriz',
          userId,
        },
      });
      branches = [defaultBranch];
    } else if (branches[0].name === 'Sede Principal') {
      // Automatically migrate Sede Principal to Almacén Central to match the warehouse flow
      const updated = await this.prisma.branch.update({
        where: { id: branches[0].id },
        data: { name: 'Almacén Central', address: 'Principal / Matriz' },
      });
      branches[0] = updated;
    }
    return branches;
  }

  async createBranch(userId: string, data: { name: string; address?: string }) {
    if (!data.name) {
      throw new BadRequestException('El nombre de la sede es requerido');
    }
    return this.prisma.branch.create({
      data: {
        name: data.name,
        address: data.address,
        userId,
      },
    });
  }

  async updateBranch(
    userId: string,
    id: string,
    data: { name?: string; address?: string },
  ) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, userId },
    });
    if (!branch) {
      throw new NotFoundException('Sede no encontrada');
    }
    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }

  async deleteBranch(userId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, userId },
    });
    if (!branch) {
      throw new NotFoundException('Sede no encontrada');
    }
    return this.prisma.branch.delete({
      where: { id },
    });
  }

  async getBranchStocks(userId: string) {
    await this.ensureBranchStocksExist(userId);
    // Get all products of this owner with branch stocks, brand and family
    const products = await this.prisma.product.findMany({
      where: { userId },
      include: {
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
    return products;
  }

  private async ensureBranchStocksExist(userId: string) {
    const firstBranch = await this.prisma.branch.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!firstBranch) return;

    const products = await this.prisma.product.findMany({
      where: { userId },
      include: {
        branchStocks: true,
      },
    });

    const toCreate = [];
    for (const prod of products) {
      const hasFirstBranch = prod.branchStocks.some(
        (bs) => bs.branchId === firstBranch.id,
      );
      if (!hasFirstBranch) {
        const otherStockSum = prod.branchStocks.reduce(
          (sum, bs) => sum + bs.stock,
          0,
        );
        const firstBranchStockVal = Math.max(0, prod.stock - otherStockSum);

        toCreate.push({
          productId: prod.id,
          branchId: firstBranch.id,
          stock: firstBranchStockVal,
        });
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.$transaction(
        toCreate.map((item) =>
          this.prisma.branchStock.create({
            data: item,
          }),
        ),
      );
    }
  }

  async transferStock(
    userId: string,
    data: {
      productId: string;
      fromBranchId: string;
      toBranchId: string;
      quantity: number;
    },
  ) {
    const { productId, fromBranchId, toBranchId, quantity } = data;

    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero');
    }
    if (fromBranchId === toBranchId) {
      throw new BadRequestException('No se puede transferir a la misma sede');
    }

    // Verify product exists and belongs to user
    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verify branches exist and belong to user
    const [fromBranch, toBranch] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: fromBranchId, userId } }),
      this.prisma.branch.findFirst({ where: { id: toBranchId, userId } }),
    ]);
    if (!fromBranch || !toBranch) {
      throw new NotFoundException('Una o ambas sedes no existen');
    }

    // Run in transaction to ensure integrity
    return this.prisma.$transaction(async (tx) => {
      // Find or create BranchStock for fromBranch
      let fromStock = await tx.branchStock.findUnique({
        where: { productId_branchId: { productId, branchId: fromBranchId } },
      });
      if (!fromStock) {
        // If it doesn't exist, we assume it's 0 or we use the product's main stock if it's the default branch
        fromStock = await tx.branchStock.create({
          data: { productId, branchId: fromBranchId, stock: product.stock },
        });
      }

      if (fromStock.stock < quantity) {
        throw new BadRequestException(
          `Stock insuficiente en la sede ${fromBranch.name}. Disponible: ${fromStock.stock}`,
        );
      }

      // Find or create BranchStock for toBranch
      let toStock = await tx.branchStock.findUnique({
        where: { productId_branchId: { productId, branchId: toBranchId } },
      });
      if (!toStock) {
        toStock = await tx.branchStock.create({
          data: { productId, branchId: toBranchId, stock: 0 },
        });
      }

      // Update stocks
      const updatedFrom = await tx.branchStock.update({
        where: { id: fromStock.id },
        data: { stock: fromStock.stock - quantity },
      });

      const updatedTo = await tx.branchStock.update({
        where: { id: toStock.id },
        data: { stock: toStock.stock + quantity },
      });

      // Register inventory movements for each branch
      await tx.inventoryMovement.create({
        data: {
          productId,
          quantity,
          type: 'OUT',
          reason: `TRASLADO_HACIA: ${toBranch.name}`,
          unitCost: product.costPrice,
          totalCost: product.costPrice * quantity,
          stockResult: updatedFrom.stock,
          userId,
          branchId: fromBranchId,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId,
          quantity,
          type: 'IN',
          reason: `TRASLADO_DESDE: ${fromBranch.name}`,
          unitCost: product.costPrice,
          totalCost: product.costPrice * quantity,
          stockResult: updatedTo.stock,
          userId,
          branchId: toBranchId,
        },
      });

      return {
        success: true,
        message: `Se trasladaron ${quantity} unidades del producto ${product.name}`,
      };
    });
  }

  async adjustBranchStock(
    userId: string,
    data: {
      productId: string;
      branchId: string;
      stock: number;
    },
  ) {
    const { productId, branchId, stock } = data;

    if (stock < 0) {
      throw new BadRequestException('El stock no puede ser negativo');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, userId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, userId },
    });
    if (!branch) {
      throw new NotFoundException('La sede no existe');
    }

    return this.prisma.$transaction(async (tx) => {
      let bStock = await tx.branchStock.findUnique({
        where: { productId_branchId: { productId, branchId } },
      });

      const oldStock = bStock ? bStock.stock : 0;
      const diff = stock - oldStock;

      if (diff === 0) {
        return {
          success: true,
          message: 'No hay cambios en el stock de esta sede',
          newStock: stock,
        };
      }

      const type = diff > 0 ? 'IN' : 'OUT';
      const quantity = Math.abs(diff);

      if (bStock) {
        await tx.branchStock.update({
          where: { id: bStock.id },
          data: { stock },
        });
      } else {
        await tx.branchStock.create({
          data: { productId, branchId, stock },
        });
      }

      // Calculate new global stock
      const otherBranchStocks = await tx.branchStock.findMany({
        where: { productId, NOT: { branchId } },
      });
      const otherStocksSum = otherBranchStocks.reduce((sum, bs) => sum + bs.stock, 0);
      const newGlobalStock = otherStocksSum + stock;

      await tx.product.update({
        where: { id: productId },
        data: { stock: newGlobalStock },
      });

      // Log movement in InventoryMovement
      await tx.inventoryMovement.create({
        data: {
          productId,
          quantity,
          type,
          reason: `AJUSTE_SEDE: ${branch.name}`,
          unitCost: product.costPrice,
          totalCost: product.costPrice * quantity,
          stockResult: stock,
          userId,
          branchId,
        },
      });

      return {
        success: true,
        message: `El stock en la sede "${branch.name}" se actualizó de ${oldStock} a ${stock}`,
        newStock: stock,
        globalStock: newGlobalStock,
      };
    });
  }
}

