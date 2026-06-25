import { useMemo } from "react";

export const useFinancialStats = (transactions: any[]) => {
  return useMemo(() => {
    // Aquí mueves la lógica de cálculo que ya tienes en el Dashboard
    const totalIncome = transactions
      .filter((t: any) => t.type === "INCOME")
      .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
    const totalExpense = transactions
      .filter((t: any) => t.type === "EXPENSE")
      .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
    return {
      totalBalance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
    };
  }, [transactions]);
};
