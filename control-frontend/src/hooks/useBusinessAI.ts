import { useMemo } from 'react';

interface PendingStats {
  payable: number;
  receivable: number;
  urgent: any[];
}

interface BusinessAIProps {
  activeTx: any[];
  mIncome: number[];
  mExpense: number[];
  mBalance: number[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  pendingStats: PendingStats;
}



export function useBusinessAI({
  activeTx,
  mIncome,
  mExpense,
  mBalance,
  totalIncome,
  totalExpense,
  totalBalance,
  pendingStats,
}: BusinessAIProps) {
  
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();

    // 1. Capital de Trabajo (Working Capital)
    // Fórmula simple: Activos Circulantes (Caja + Por Cobrar) - Pasivos Circulantes (Por Pagar)
    const workingCapital = totalBalance + pendingStats.receivable - pendingStats.payable;
    
    // 2. Margen de Ganancia (Profit Margin)
    const profitMargin = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // 3. Análisis de Flujo de Caja (Dinero que entra y sale)
    const cashFlowAnalysis = {
      inflow: totalIncome, // Dinero que entra
      outflow: totalExpense, // Dinero que sale
      netCashFlow: totalIncome - totalExpense, // Dinero que queda
      isPositive: totalIncome > totalExpense,
      growth: 0, // Tendencia del flujo
    };

    const calculateTrend = (data: number[]) => {
      const past = data.slice(0, Math.max(0, currentMonth + 1 - 3));
      const recent = data.slice(Math.max(0, currentMonth + 1 - 3), currentMonth + 1);
      if (past.length === 0 || past.reduce((a, b) => a + b, 0) === 0) return 0;
      return ((recent.reduce((a, b) => a + b, 0) / past.reduce((a, b) => a + b, 0)) - 1) * 100;
    };

    cashFlowAnalysis.growth = calculateTrend(mBalance);

    // 4. Cuentas por Cobrar y Pagar (Clientela y Proveedores)
    const accountsAnalysis = {
      toCollect: pendingStats.receivable, // Dinero que nos deben los clientes
      toPay: pendingStats.payable, // Dinero que debemos a proveedores
      urgentToPay: pendingStats.urgent.filter(u => u.type === 'PAYABLE' && u.dueInfo?.status === 'EXPIRED').length,
      urgentToCollect: pendingStats.urgent.filter(u => u.type === 'RECEIVABLE' && u.dueInfo?.status === 'EXPIRED').length,
    };

    // 5. Análisis de Inventario y Ventas (Simulado o Inferido)
    // Simulamos que algunos gastos son "Mercadería" y algunos ingresos son "Ventas"
    let sales = 0;
    let suppliesCost = 0;
    
    activeTx.forEach((t) => {
      const amount = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
      const cat = (t.category?.name || t.category || "").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      
      if (t.type === "INCOME" && (cat.includes("venta") || desc.includes("venta") || cat.includes("cliente"))) {
        sales += amount;
      }
      if (t.type === "EXPENSE" && (cat.includes("mercadería") || cat.includes("inventario") || cat.includes("proveedor") || desc.includes("mercadería"))) {
        suppliesCost += amount;
      }
    });

    // Si no detectó por nombres, asumimos que un gran porcentaje de ingresos son ventas y gastos son mercadería/costos
    if (sales === 0 && totalIncome > 0) sales = totalIncome * 0.8;
    if (suppliesCost === 0 && totalExpense > 0) suppliesCost = totalExpense * 0.6;

    const inventoryAnalysis = {
      estimatedSales: sales,
      estimatedSuppliesCost: suppliesCost,
      inventoryTurnoverRatio: suppliesCost > 0 ? sales / suppliesCost : 0, // Veces que se rotó la mercadería
    };

    // 6. Riesgos y Alertas SIMPLIFICADAS
    const riskAnalysis = {
      critical: [] as any[],
      warnings: [] as any[],
      opportunities: [] as any[],
    };

    if (workingCapital < 0) {
      riskAnalysis.critical.push({
        type: "Capital Negativo",
        severity: "high",
        message: "Las deudas del negocio superan el dinero en caja y lo que te deben.",
        action: "Urge renegociar con proveedores o incentivar ventas rápidas.",
      });
    }

    if (!cashFlowAnalysis.isPositive) {
      riskAnalysis.critical.push({
        type: "Pérdida de Dinero",
        severity: "high",
        message: "El negocio está gastando más de lo que ingresa.",
        action: "Revisa los gastos innecesarios inmediatamente.",
      });
    }

    if (accountsAnalysis.toCollect > totalBalance) {
      riskAnalysis.warnings.push({
        type: "Mucho Fiado",
        message: "Tus clientes te deben más dinero del que tienes en el banco.",
        action: "Mejora tus procesos de cobranza para tener el dinero a mano.",
      });
    }

    if (profitMargin > 20) {
      riskAnalysis.opportunities.push({
        type: "Buen Margen",
        message: `El negocio tiene una ganancia sana del ${profitMargin.toFixed(1)}%.`,
        action: "Aprovecha para guardar reservas o invertir en mejoras.",
      });
    }

    // SCORE del Negocio (0-100)
    let score = 50;
    if (cashFlowAnalysis.isPositive) score += 20;
    else score -= 20;

    if (profitMargin >= 30) score += 15;
    else if (profitMargin >= 10) score += 10;

    if (workingCapital > pendingStats.payable) score += 15;
    else if (workingCapital < 0) score -= 15;

    score = Math.max(0, Math.min(100, score));

    return {
      workingCapital,
      profitMargin,
      cashFlowAnalysis,
      accountsAnalysis,
      inventoryAnalysis,
      riskAnalysis,
      score,
    };
  }, [activeTx, mIncome, mExpense, mBalance, totalIncome, totalExpense, totalBalance, pendingStats]);
}
