// SmartBudget/app/_lib/financialHealthService.ts
interface HealthScore {
  overall: number;
  grade: string;
  trends: {
    improving: boolean;
    direction: string;
  };
  insights: string[];
  breakdown: {
    budgetAdherence: number;
    savingsRate: number;
    debtRatio: number;
    emergencyFund: number;
  };
}

class FinancialHealthService {
  async analyzeFinancialHealth(
    transactions: any[],
    budgets: any[],
    monthlyIncome: number,
    currentBalance: number
  ): Promise<HealthScore> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter transactions for this month
    const thisMonthTxns = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= thisMonth;
    });

    const lastMonthTxns = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= lastMonth && txDate < thisMonth;
    });

    // Calculate metrics
    const totalExpenseThisMonth = thisMonthTxns
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpenseLastMonth = lastMonthTxns
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalIncomeThisMonth = thisMonthTxns
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Budget adherence score (0-100)
    let budgetAdherence = 100;
    if (budgets.length > 0) {
      const overBudgetCategories = budgets.filter(b => b.spent > b.limit);
      budgetAdherence = Math.max(0, 100 - (overBudgetCategories.length / budgets.length) * 100);
    }

    // Savings rate (0-100)
    const actualIncome = totalIncomeThisMonth || monthlyIncome;
    const savingsRate = actualIncome > 0 
      ? Math.min(100, ((actualIncome - totalExpenseThisMonth) / actualIncome) * 100)
      : 0;

    // Debt ratio (lower is better, inverted for scoring)
    const debtRatio = Math.max(0, 100 - (totalExpenseThisMonth / actualIncome) * 100);

    // Emergency fund score (assuming 3 months of expenses is ideal)
    const idealEmergencyFund = totalExpenseThisMonth * 3;
    const emergencyFund = idealEmergencyFund > 0
      ? Math.min(100, (currentBalance / idealEmergencyFund) * 100)
      : 100;

    // Overall score (weighted average)
    const overall = Math.round(
      budgetAdherence * 0.3 +
      savingsRate * 0.3 +
      debtRatio * 0.2 +
      emergencyFund * 0.2
    );

    // Determine grade
    let grade = 'F';
    if (overall >= 90) grade = 'A+';
    else if (overall >= 85) grade = 'A';
    else if (overall >= 80) grade = 'A-';
    else if (overall >= 75) grade = 'B+';
    else if (overall >= 70) grade = 'B';
    else if (overall >= 65) grade = 'C+';
    else if (overall >= 60) grade = 'C';
    else if (overall >= 55) grade = 'D+';
    else if (overall >= 50) grade = 'D';

    // Check if improving
    const improving = totalExpenseThisMonth < totalExpenseLastMonth;
    const direction = improving ? 'up' : 'down';

    // Generate insights
    const insights: string[] = [];

    if (budgetAdherence < 70) {
      insights.push('You\'re exceeding budgets in several categories');
    } else if (budgetAdherence >= 90) {
      insights.push('Excellent budget management!');
    }

    if (savingsRate < 20) {
      insights.push('Try to save at least 20% of your income');
    } else if (savingsRate >= 30) {
      insights.push('Great savings rate! Keep it up!');
    }

    if (emergencyFund < 50) {
      insights.push('Build up your emergency fund to 3 months of expenses');
    }

    if (totalExpenseThisMonth > totalExpenseLastMonth) {
      const increase = ((totalExpenseThisMonth - totalExpenseLastMonth) / totalExpenseLastMonth) * 100;
      insights.push(`Spending increased by ${increase.toFixed(1)}% from last month`);
    } else if (totalExpenseLastMonth > 0) {
      const decrease = ((totalExpenseLastMonth - totalExpenseThisMonth) / totalExpenseLastMonth) * 100;
      insights.push(`Great! Spending decreased by ${decrease.toFixed(1)}% from last month`);
    }

    if (insights.length === 0) {
      insights.push('Keep tracking your expenses regularly');
    }

    return {
      overall,
      grade,
      trends: { improving, direction },
      insights,
      breakdown: {
        budgetAdherence: Math.round(budgetAdherence),
        savingsRate: Math.round(savingsRate),
        debtRatio: Math.round(debtRatio),
        emergencyFund: Math.round(emergencyFund)
      }
    };
  }
}

export const financialHealthService = new FinancialHealthService();