// SmartBudget/src/services/smartInsightsEngine.ts
// 🧠 SMART INSIGHTS ENGINE - UPDATED WITH PROPER EXPORTS
// Combines ML, anomaly detection, and financial health for intelligent recommendations

import { Transaction } from '../../app/_lib/useTransactionStore';

// Import Budget type - you may need to adjust this import based on your actual Budget interface
interface Budget {
  id: string;
  category: string;
  limit: number;
  spent?: number;
  period?: 'monthly' | 'weekly';
}

// ============================================================================
// TYPES & INTERFACES - PROPERLY EXPORTED
// ============================================================================

export interface SmartInsight {
  id: string;
  type: InsightType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: string;
  actionable: boolean;
  action?: {
    label: string;
    handler: string; // Function name to call
    params?: any;
  };
  data?: any;
  timestamp: Date;
}

export enum InsightType {
  ANOMALY = 'anomaly',
  BUDGET_WARNING = 'budget_warning',
  SAVINGS_OPPORTUNITY = 'savings_opportunity',
  SPENDING_PATTERN = 'spending_pattern',
  PREDICTION = 'prediction',
  MILESTONE = 'milestone',
  TIP = 'tip',
}

export interface SpendingPattern {
  pattern: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  averageAmount: number;
  category: string;
  confidence: number;
}

export interface SavingsOpportunity {
  category: string;
  currentSpending: number;
  suggestedBudget: number;
  potentialSavings: number;
  confidence: number;
  reasoning: string;
}

export interface BudgetPrediction {
  category: string;
  currentMonth: number;
  predictedNextMonth: number;
  suggestedBudget: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// ============================================================================
// SMART INSIGHTS ENGINE
// ============================================================================

class SmartInsightsEngine {
  private insights: SmartInsight[] = [];
  private isInitialized: boolean = false;

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  async initialize(
    transactions: Transaction[],
    budgets: Budget[],
    monthlyIncome: number,
    currentBalance: number
  ): Promise<void> {
    console.log('🧠 Initializing Smart Insights Engine...');

    try {
      // Note: ML services are optional for now
      // If you want to use them, uncomment these lines after implementing:
      // await mlCategorizationService.initialize();
      // await anomalyDetectionService.initialize(transactions);

      // Generate all insights
      await this.generateAllInsights(transactions, budgets, monthlyIncome, currentBalance);

      this.isInitialized = true;
      console.log('✅ Smart Insights Engine ready');
    } catch (error) {
      console.error('❌ Failed to initialize insights engine:', error);
      // Don't throw - gracefully degrade
      this.insights = [];
      this.isInitialized = false;
    }
  }

  // --------------------------------------------------------------------------
  // INSIGHT GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate comprehensive insights
   */
  private async generateAllInsights(
    transactions: Transaction[],
    budgets: Budget[],
    monthlyIncome: number,
    currentBalance: number
  ): Promise<void> {
    this.insights = [];

    try {
      // 1. Budget Warning Insights (works without ML)
      const budgetInsights = this.generateBudgetInsights(transactions, budgets);
      this.insights.push(...budgetInsights);

      // 2. Spending Pattern Insights (works without ML)
      const patternInsights = this.generatePatternInsights(transactions);
      this.insights.push(...patternInsights);

      // 3. Savings Opportunity Insights (works without ML)
      const savingsInsights = this.generateSavingsInsights(transactions, monthlyIncome);
      this.insights.push(...savingsInsights);

      // 4. Prediction Insights (works without ML)
      const predictionInsights = this.generatePredictionInsights(transactions, budgets);
      this.insights.push(...predictionInsights);

      // 5. Milestone Insights (works without ML)
      const milestoneInsights = this.generateMilestoneInsights(transactions);
      this.insights.push(...milestoneInsights);

      // Sort by priority
      this.sortInsightsByPriority();
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  }

  /**
   * Generate budget warning insights
   */
  private generateBudgetInsights(
    transactions: Transaction[],
    budgets: Budget[]
  ): SmartInsight[] {
    const insights: SmartInsight[] = [];

    if (budgets.length === 0) {
      return insights;
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Calculate spending per category this month
    const categorySpending = new Map<string, number>();
    transactions
      .filter(t => {
        const txDate = t.date instanceof Date ? t.date : new Date(t.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === currentMonth && t.type === 'debit';
      })
      .forEach(t => {
        categorySpending.set(t.category, (categorySpending.get(t.category) || 0) + Math.abs(t.amount));
      });

    budgets.forEach(budget => {
      const spent = categorySpending.get(budget.category) || 0;
      const percentUsed = (spent / budget.limit) * 100;

      if (percentUsed >= 90) {
        insights.push({
          id: `budget-critical-${budget.id}`,
          type: InsightType.BUDGET_WARNING,
          priority: 'critical',
          title: `🔴 ${budget.category} Budget Critical`,
          description: `You've used ${percentUsed.toFixed(0)}% (₹${spent.toFixed(0)}/₹${budget.limit.toFixed(0)}) of your ${budget.category} budget`,
          icon: 'alert-triangle',
          actionable: true,
          action: {
            label: 'Adjust Budget',
            handler: 'navigateToBudget',
            params: { budgetId: budget.id },
          },
          data: { budget, spent, percentUsed },
          timestamp: new Date(),
        });
      } else if (percentUsed >= 75) {
        insights.push({
          id: `budget-warning-${budget.id}`,
          type: InsightType.BUDGET_WARNING,
          priority: 'high',
          title: `🟡 ${budget.category} Budget Alert`,
          description: `You've used ${percentUsed.toFixed(0)}% of your ${budget.category} budget. ₹${(budget.limit - spent).toFixed(0)} remaining`,
          icon: 'warning',
          actionable: false,
          data: { budget, spent, percentUsed },
          timestamp: new Date(),
        });
      }
    });

    return insights;
  }

  /**
   * Generate spending pattern insights
   */
  private generatePatternInsights(transactions: Transaction[]): SmartInsight[] {
    const insights: SmartInsight[] = [];

    if (transactions.length === 0) {
      return insights;
    }

    // Detect weekend vs weekday spending
    const weekendSpending = transactions.filter(t => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      const day = date.getDay();
      return (day === 0 || day === 6) && t.type === 'debit';
    });

    const weekdaySpending = transactions.filter(t => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      const day = date.getDay();
      return (day !== 0 && day !== 6) && t.type === 'debit';
    });

    const avgWeekend =
      weekendSpending.reduce((sum, t) => sum + Math.abs(t.amount), 0) / Math.max(weekendSpending.length, 1);
    const avgWeekday =
      weekdaySpending.reduce((sum, t) => sum + Math.abs(t.amount), 0) / Math.max(weekdaySpending.length, 1);

    if (avgWeekend > avgWeekday * 1.5 && weekendSpending.length > 5) {
      insights.push({
        id: 'pattern-weekend-spending',
        type: InsightType.SPENDING_PATTERN,
        priority: 'medium',
        title: '📊 Weekend Spending Pattern',
        description: `You spend ${((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% more on weekends (avg ₹${avgWeekend.toFixed(0)} vs ₹${avgWeekday.toFixed(0)})`,
        icon: 'trending-up',
        actionable: true,
        action: {
          label: 'Set Weekend Budget',
          handler: 'createWeekendBudget',
        },
        data: { avgWeekend, avgWeekday },
        timestamp: new Date(),
      });
    }

    // Detect late-night spending
    const lateNightTransactions = transactions.filter(t => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      const hour = date.getHours();
      return (hour >= 22 || hour <= 4) && t.type === 'debit';
    });

    if (lateNightTransactions.length > 5) {
      const avgLateNight =
        lateNightTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) /
        lateNightTransactions.length;

      insights.push({
        id: 'pattern-late-night',
        type: InsightType.SPENDING_PATTERN,
        priority: 'low',
        title: '🌙 Late Night Spending',
        description: `You've made ${lateNightTransactions.length} late-night purchases (avg ₹${avgLateNight.toFixed(0)}). Consider if these are necessary.`,
        icon: 'moon',
        actionable: false,
        data: { count: lateNightTransactions.length, avgAmount: avgLateNight },
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate savings opportunity insights
   */
  private generateSavingsInsights(
    transactions: Transaction[],
    monthlyIncome: number
  ): SmartInsight[] {
    const insights: SmartInsight[] = [];

    if (transactions.length === 0 || monthlyIncome === 0) {
      return insights;
    }

    // Calculate category spending
    const categoryTotals = new Map<string, number>();
    transactions
      .filter(t => t.type === 'debit')
      .forEach(t => {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + Math.abs(t.amount));
      });

    // Find top spending categories
    const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);

    // Suggest reduction in top category
    if (sortedCategories.length > 0) {
      const [topCategory, topAmount] = sortedCategories[0];
      const daysSpan = this.getDaysSpan(transactions);
      const monthlyAvg = (topAmount / daysSpan) * 30;
      const potentialSavings = monthlyAvg * 0.15; // 15% reduction

      if (monthlyAvg > monthlyIncome * 0.2) {
        insights.push({
          id: `savings-${topCategory}`,
          type: InsightType.SAVINGS_OPPORTUNITY,
          priority: 'medium',
          title: `💰 Savings Opportunity in ${topCategory}`,
          description: `Reducing ${topCategory} by 15% could save ₹${potentialSavings.toFixed(0)}/month`,
          icon: 'piggy-bank',
          actionable: true,
          action: {
            label: 'Create Savings Goal',
            handler: 'createSavingsGoal',
            params: { category: topCategory, amount: potentialSavings },
          },
          data: { category: topCategory, potentialSavings },
          timestamp: new Date(),
        });
      }
    }

    return insights;
  }

  /**
   * Generate prediction insights
   */
  private generatePredictionInsights(
    transactions: Transaction[],
    budgets: Budget[]
  ): SmartInsight[] {
    const insights: SmartInsight[] = [];

    if (transactions.length === 0) {
      return insights;
    }

    // Predict end-of-month spending
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay;

    if (daysRemaining > 0) {
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthSpending = transactions
        .filter(t => {
          const txDate = t.date instanceof Date ? t.date : new Date(t.date);
          const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          return txMonth === currentMonth && t.type === 'debit';
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const dailyAvg = monthSpending / currentDay;
      const predictedTotal = monthSpending + dailyAvg * daysRemaining;

      insights.push({
        id: 'prediction-month-end',
        type: InsightType.PREDICTION,
        priority: 'low',
        title: '🔮 Month-End Prediction',
        description: `At current pace, you'll spend ₹${predictedTotal.toFixed(0)} this month (₹${monthSpending.toFixed(0)} so far)`,
        icon: 'trending-up',
        actionable: false,
        data: { current: monthSpending, predicted: predictedTotal },
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Generate milestone insights
   */
  private generateMilestoneInsights(transactions: Transaction[]): SmartInsight[] {
    const insights: SmartInsight[] = [];

    // Transaction count milestone
    if (transactions.length === 100 || transactions.length === 500 || transactions.length === 1000) {
      insights.push({
        id: `milestone-transactions-${transactions.length}`,
        type: InsightType.MILESTONE,
        priority: 'low',
        title: `🎉 ${transactions.length} Transactions!`,
        description: `You've tracked ${transactions.length} transactions. Great job staying on top of your finances!`,
        icon: 'award',
        actionable: false,
        data: { count: transactions.length },
        timestamp: new Date(),
      });
    }

    // Spending reduction milestone
    const lastMonth = this.getLastMonthSpending(transactions);
    const thisMonth = this.getThisMonthSpending(transactions);

    if (lastMonth > 0 && thisMonth < lastMonth * 0.9) {
      const reduction = ((1 - thisMonth / lastMonth) * 100).toFixed(0);
      insights.push({
        id: 'milestone-spending-reduction',
        type: InsightType.MILESTONE,
        priority: 'low',
        title: `🌟 Spending Down ${reduction}%!`,
        description: `You've reduced spending by ${reduction}% compared to last month. Keep it up!`,
        icon: 'trending-down',
        actionable: false,
        data: { reduction, lastMonth, thisMonth },
        timestamp: new Date(),
      });
    }

    return insights;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Get all insights
   */
  getInsights(): SmartInsight[] {
    return this.insights;
  }

  /**
   * Get insights by type
   */
  getInsightsByType(type: InsightType): SmartInsight[] {
    return this.insights.filter(i => i.type === type);
  }

  /**
   * Get high priority insights
   */
  getHighPriorityInsights(): SmartInsight[] {
    return this.insights.filter(i => i.priority === 'critical' || i.priority === 'high');
  }

  /**
   * Dismiss insight
   */
  dismissInsight(insightId: string): void {
    this.insights = this.insights.filter(i => i.id !== insightId);
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private sortInsightsByPriority(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private getDaysSpan(transactions: Transaction[]): number {
    if (transactions.length === 0) return 1;
    const dates = transactions.map(t => {
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      return date.getTime();
    });
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;
  }

  private getLastMonthSpending(transactions: Transaction[]): number {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    return transactions
      .filter(t => {
        const txDate = t.date instanceof Date ? t.date : new Date(t.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === lastMonthStr && t.type === 'debit';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private getThisMonthSpending(transactions: Transaction[]): number {
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return transactions
      .filter(t => {
        const txDate = t.date instanceof Date ? t.date : new Date(t.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === thisMonthStr && t.type === 'debit';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const smartInsightsEngine = new SmartInsightsEngine();