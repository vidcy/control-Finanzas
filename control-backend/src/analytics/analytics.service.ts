import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates real profit margin based on transactions (incomes vs expenses)
   * and average product inventory margins.
   */
  async getProfitMargin(userId: string) {
    // 1. Transaction-based financial margin
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        status: 'PAID',
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
      }
    }

    const netProfit = totalIncome - totalExpense;
    const profitMarginPercentage =
      totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // 2. Inventory product average margin
    const products = await this.prisma.product.findMany({
      where: { userId },
    });

    let totalProductMargin = 0;
    let productsWithMarginCount = 0;

    for (const p of products) {
      if (p.salePrice > 0) {
        const margin = ((p.salePrice - p.costPrice) / p.salePrice) * 100;
        totalProductMargin += margin;
        productsWithMarginCount++;
      }
    }

    const averageProductMargin =
      productsWithMarginCount > 0
        ? totalProductMargin / productsWithMarginCount
        : 0;

    return {
      financial: {
        totalIncome,
        totalExpense,
        netProfit,
        marginPercentage: parseFloat(profitMarginPercentage.toFixed(2)),
      },
      inventory: {
        productCount: products.length,
        averageMarginPercentage: parseFloat(averageProductMargin.toFixed(2)),
      },
    };
  }

  /**
   * Calculates Inventory Turnover (Rotación de Inventario)
   * Formula: Cost of Goods Sold (COGS) / Average Inventory Value
   */
  async getInventoryTurnover(userId: string) {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get all user products
    const products = await this.prisma.product.findMany({
      where: { userId },
      include: {
        movements: {
          where: {
            createdAt: { gte: thirtyDaysAgo },
            type: 'OUT',
          },
        },
      },
    });

    let costOfGoodsSold = 0; // COGS
    let totalInventoryValue = 0; // Current inventory value

    for (const p of products) {
      // COGS is calculated from outgoing movements
      const totalUnitsSold = p.movements.reduce(
        (sum, mv) => sum + mv.quantity,
        0,
      );
      costOfGoodsSold += totalUnitsSold * p.costPrice;

      // Inventory value is stock * costPrice
      totalInventoryValue += p.stock * p.costPrice;
    }

    // Ratio for the 30-day period (annualized is ratio * 12)
    const averageInventoryValue = totalInventoryValue || 1; // avoid division by zero
    const turnoverRatio = costOfGoodsSold / averageInventoryValue;

    // Days to sell inventory
    const daysInPeriod = 30;
    const daysSalesOutstanding =
      turnoverRatio > 0 ? daysInPeriod / turnoverRatio : 365;

    return {
      costOfGoodsSold: parseFloat(costOfGoodsSold.toFixed(2)),
      currentInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
      turnoverRatio: parseFloat(turnoverRatio.toFixed(2)),
      daysToSell: parseFloat(daysSalesOutstanding.toFixed(1)),
    };
  }

  /**
   * Automatic alert engine. Identifies items with stock <= minStock
   * and auto-creates Notification records in the DB if they don't exist yet.
   */
  async getStockAlerts(userId: string) {
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        userId,
        stock: {
          lte: this.prisma.product.fields.minStock,
        },
      },
    });

    const alerts = [];

    for (const product of lowStockProducts) {
      alerts.push({
        id: product.id,
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
      });

      // Check if alert was recently generated (in the last 24 hours) to avoid spamming notifications
      const oneDayAgo = subDays(new Date(), 1);
      const existingNotif = await this.prisma.notification.findFirst({
        where: {
          userId,
          title: 'Alerta de Stock Mínimo',
          description: {
            contains: product.name,
          },
          createdAt: {
            gte: oneDayAgo,
          },
        },
      });

      if (!existingNotif) {
        try {
          await this.prisma.notification.create({
            data: {
              title: 'Alerta de Stock Mínimo',
              description: `El producto "${product.name}" tiene un stock crítico de ${product.stock} unidades (mínimo requerido: ${product.minStock}).`,
              link: `/business-inventory`,
              userId,
            },
          });
        } catch (e) {
          console.error('Failed to create low stock notification:', e);
        }
      }
    }

    return alerts;
  }

  /**
   * AI Business Advisor.
   * Uses historical transaction records and category spending to generate
   * highly contextual, non-generic, predictive tips.
   */
  async getAiAdvice(userId: string) {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Fetch transactions
    const txs = await this.prisma.transaction.findMany({
      where: { userId, status: 'PAID' },
      include: { category: true },
    });

    if (txs.length === 0) {
      return [
        {
          type: 'INFO',
          category: 'General',
          title: 'Comienza a registrar tus finanzas',
          message:
            'Aún no tienes transacciones registradas. Agrega tus primeros ingresos y egresos para activar los consejos inteligentes de liquidez y márgenes de ganancia.',
          impactPercentage: 0,
        },
      ];
    }

    // Get current balance/liquidity
    let currentBalance = 0;
    let last30DaysExpense = 0;
    let last30DaysIncome = 0;

    const categorySpending: Record<string, { name: string; amount: number }> =
      {};

    for (const tx of txs) {
      const isLast30Days = tx.date >= thirtyDaysAgo;

      if (tx.type === 'INCOME') {
        currentBalance += tx.amount;
        if (isLast30Days) last30DaysIncome += tx.amount;
      } else {
        currentBalance -= tx.amount;
        if (isLast30Days) {
          last30DaysExpense += tx.amount;
          const catId = tx.categoryId;
          if (!categorySpending[catId]) {
            categorySpending[catId] = {
              name: tx.category?.name || 'Otros',
              amount: 0,
            };
          }
          categorySpending[catId].amount += tx.amount;
        }
      }
    }

    const advice = [];

    // 1. High spending alert
    const sortedCategories = Object.values(categorySpending).sort(
      (a, b) => b.amount - a.amount,
    );
    if (sortedCategories.length > 0 && last30DaysExpense > 0) {
      const topExpense = sortedCategories[0];
      const percentOfExpenses = (topExpense.amount / last30DaysExpense) * 100;

      if (percentOfExpenses > 25) {
        const potentialLiquidityDrop =
          (topExpense.amount / (currentBalance || 1)) * 100;
        advice.push({
          type: 'WARNING',
          category: topExpense.name,
          title: `Gasto elevado en ${topExpense.name}`,
          message: `Si sigues gastando en ${
            topExpense.name
          } al mismo ritmo (S/ ${topExpense.amount.toFixed(
            2,
          )} este mes, que representa el ${percentOfExpenses.toFixed(
            0,
          )}% de tus egresos), tu liquidez podría caer un ${potentialLiquidityDrop.toFixed(
            0,
          )}% el próximo mes. Evalúa ajustar el presupuesto en esta categoría.`,
          impactPercentage: Math.min(
            100,
            parseInt(potentialLiquidityDrop.toFixed(0)),
          ),
        });
      }
    }

    // 2. Liquidity Runway (fixed burn rate analysis)
    if (last30DaysExpense > last30DaysIncome) {
      const netDeficit = last30DaysExpense - last30DaysIncome;
      const monthsLeft = currentBalance / netDeficit;

      if (monthsLeft > 0 && monthsLeft < 3) {
        advice.push({
          type: 'DANGER',
          category: 'Liquidez',
          title: 'Riesgo de flujo de caja',
          message: `Tus egresos superaron tus ingresos por S/ ${netDeficit.toFixed(
            2,
          )} en los últimos 30 días. Con tu saldo actual de S/ ${currentBalance.toFixed(
            2,
          )}, tu liquidez se agotará en ${monthsLeft.toFixed(
            1,
          )} meses si no recortas gastos u obtienes ingresos adicionales.`,
          impactPercentage: 100,
        });
      }
    } else if (last30DaysIncome > 0 && last30DaysExpense > 0) {
      // Good health advice
      const savingsRate =
        ((last30DaysIncome - last30DaysExpense) / last30DaysIncome) * 100;
      advice.push({
        type: 'SUCCESS',
        category: 'Ahorro',
        title: 'Tasa de ahorro saludable',
        message: `¡Buen trabajo! En los últimos 30 días has ahorrado el ${savingsRate.toFixed(
          0,
        )}% de tus ingresos. Te sugerimos transferir la mitad de este excedente (S/ ${(
          (last30DaysIncome - last30DaysExpense) *
          0.5
        ).toFixed(2)}) a un fondo de reserva para inversión de alta liquidez.`,
        impactPercentage: parseInt(savingsRate.toFixed(0)),
      });
    }

    // 3. Low stock risk on sales
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        userId,
        stock: {
          lte: this.prisma.product.fields.minStock,
        },
      },
    });

    if (lowStockProducts.length > 0) {
      advice.push({
        type: 'WARNING',
        category: 'Inventario',
        title: 'Riesgo de quiebre de stock',
        message: `Tienes ${lowStockProducts.length} productos con stock mínimo o crítico (incluyendo "${lowStockProducts[0].name}"). Reponer inventario evitará perder ventas estimadas en S/ ${(lowStockProducts[0].salePrice * 10).toFixed(2)} el próximo mes.`,
        impactPercentage: 15,
      });
    }

    // Fallback if we have fewer than 2 advice items
    if (advice.length < 2) {
      advice.push({
        type: 'INFO',
        category: 'Inversión',
        title: 'Planificación de excedentes',
        message:
          'Tu flujo de caja es estable. Considera programar tus egresos recurrentes al inicio de mes para predecir con exactitud tus picos de liquidez.',
        impactPercentage: 5,
      });
    }

    return advice;
  }
}
