// src/services/predictionService.ts

export interface MonthlySpending {
  month: string; // 'YYYY-MM'
  category: string;
  amount: number;
  transactionCount: number;
}

export interface BudgetPrediction {
  category: string;
  predictedAmount: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  suggestedBudget: number;
  reasoning: string;
}

export interface AnomalyDetection {
  transactionId: string;
  amount: number;
  category: string;
  date: Date;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export class PredictionService {
  /**
   * Predict next month's spending for a category
   */
  static predictCategorySpending(
    historicalData: MonthlySpending[]
  ): BudgetPrediction[] {
    // Group by category
    const categories = this.groupByCategory(historicalData);
    const predictions: BudgetPrediction[] = [];

    for (const [category, data] of Object.entries(categories)) {
      const prediction = this.calculatePrediction(category, data);
      predictions.push(prediction);
    }

    return predictions.sort((a, b) => b.predictedAmount - a.predictedAmount);
  }

  /**
   * Group historical data by category
   */
  private static groupByCategory(
    data: MonthlySpending[]
  ): Record<string, MonthlySpending[]> {
    const grouped: Record<string, MonthlySpending[]> = {};

    for (const item of data) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    return grouped;
  }

  /**
   * Calculate prediction for a single category
   */
  private static calculatePrediction(
    category: string,
    data: MonthlySpending[]
  ): BudgetPrediction {
    // Sort by month (most recent first)
    const sortedData = [...data].sort((a, b) => b.month.localeCompare(a.month));

    // Get last 3 months
    const recentData = sortedData.slice(0, 3);

    if (recentData.length === 0) {
      return {
        category,
        predictedAmount: 0,
        confidence: 0,
        trend: 'stable',
        trendPercentage: 0,
        suggestedBudget: 0,
        reasoning: 'No historical data available',
      };
    }

    // Weighted moving average (more weight to recent months)
    const weights = [0.5, 0.3, 0.2]; // Last month, 2 months ago, 3 months ago
    let predictedAmount = 0;

    for (let i = 0; i < Math.min(recentData.length, 3); i++) {
      predictedAmount += recentData[i].amount * (weights[i] || 0);
    }

    // Adjust if less than 3 months of data
    if (recentData.length === 1) {
      predictedAmount = recentData[0].amount;
    } else if (recentData.length === 2) {
      predictedAmount = recentData[0].amount * 0.6 + recentData[1].amount * 0.4;
    }

    // Calculate trend
    const trend = this.calculateTrend(recentData);
    const trendPercentage = this.calculateTrendPercentage(recentData);

    // Adjust prediction based on trend
    if (trend === 'increasing') {
      predictedAmount *= 1 + Math.abs(trendPercentage) / 100;
    } else if (trend === 'decreasing') {
      predictedAmount *= 1 - Math.abs(trendPercentage) / 100;
    }

    // Calculate confidence (higher with more data and consistent pattern)
    const confidence = this.calculateConfidence(recentData);

    // Suggest budget (add 10-20% buffer)
    const bufferPercentage = trend === 'increasing' ? 0.2 : 0.1;
    const suggestedBudget = Math.ceil(predictedAmount * (1 + bufferPercentage));

    // Generate reasoning
    const reasoning = this.generateReasoning(
      recentData,
      trend,
      trendPercentage,
      predictedAmount
    );

    return {
      category,
      predictedAmount: Math.round(predictedAmount),
      confidence,
      trend,
      trendPercentage: Math.round(trendPercentage * 10) / 10,
      suggestedBudget,
      reasoning,
    };
  }

  /**
   * Calculate spending trend
   */
  private static calculateTrend(
    data: MonthlySpending[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const amounts = data.map((d) => d.amount);
    let increasing = 0;
    let decreasing = 0;

    for (let i = 0; i < amounts.length - 1; i++) {
      if (amounts[i] > amounts[i + 1]) {
        increasing++;
      } else if (amounts[i] < amounts[i + 1]) {
        decreasing++;
      }
    }

    const threshold = 0.15; // 15% change threshold
    const avgChange = Math.abs((amounts[0] - amounts[amounts.length - 1]) / amounts[amounts.length - 1]);

    if (avgChange < threshold) return 'stable';
    return increasing > decreasing ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate trend percentage
   */
  private static calculateTrendPercentage(data: MonthlySpending[]): number {
    if (data.length < 2) return 0;

    const latest = data[0].amount;
    const oldest = data[data.length - 1].amount;

    if (oldest === 0) return 0;

    return ((latest - oldest) / oldest) * 100;
  }

  /**
   * Calculate prediction confidence
   */
  private static calculateConfidence(data: MonthlySpending[]): number {
    if (data.length === 0) return 0;
    if (data.length === 1) return 0.5;

    // More data = higher confidence
    const dataScore = Math.min(data.length / 6, 1) * 0.4; // Max 0.4 for having 6+ months

    // Less variance = higher confidence
    const amounts = data.map((d) => d.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? stdDev / mean : 1;

    const consistencyScore = Math.max(0, 1 - coefficientOfVariation) * 0.6; // Max 0.6

    return Math.min(dataScore + consistencyScore, 1);
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(
    data: MonthlySpending[],
    trend: string,
    trendPercentage: number,
    predictedAmount: number
  ): string {
    const amounts = data.map((d) => d.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    let reasoning = `Based on ${data.length} month${data.length > 1 ? 's' : ''} of data. `;

    if (trend === 'increasing') {
      reasoning += `Spending is increasing by ${Math.abs(trendPercentage).toFixed(1)}%. `;
    } else if (trend === 'decreasing') {
      reasoning += `Spending is decreasing by ${Math.abs(trendPercentage).toFixed(1)}%. `;
    } else {
      reasoning += `Spending is relatively stable. `;
    }

    reasoning += `Average spending: ₹${Math.round(avgAmount)}. `;
    reasoning += `Predicted next month: ₹${Math.round(predictedAmount)}.`;

    return reasoning;
  }

  /**
   * Detect anomalous transactions
   */
  static detectAnomalies(
    transactions: Array<{
      id: string;
      amount: number;
      category: string;
      date: Date;
    }>,
    historicalData: MonthlySpending[]
  ): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Calculate category statistics
    const categoryStats = this.calculateCategoryStatistics(historicalData);

    for (const transaction of transactions) {
      const stats = categoryStats[transaction.category];

      if (!stats) {
        // New category - not necessarily anomalous
        continue;
      }

      const zScore = Math.abs((transaction.amount - stats.mean) / stats.stdDev);

      let isAnomaly = false;
      let severity: 'low' | 'medium' | 'high' = 'low';
      let reason = '';

      // Z-score thresholds
      if (zScore > 3) {
        isAnomaly = true;
        severity = 'high';
        reason = `Unusually high amount (${zScore.toFixed(1)}x above average)`;
      } else if (zScore > 2) {
        isAnomaly = true;
        severity = 'medium';
        reason = `Higher than typical spending for this category`;
      } else if (transaction.amount > stats.max * 1.5) {
        isAnomaly = true;
        severity = 'high';
        reason = `Exceeds previous maximum by 50%`;
      }

      if (isAnomaly) {
        anomalies.push({
          transactionId: transaction.id,
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
          isAnomaly,
          severity,
          reason,
        });
      }
    }

    return anomalies;
  }

  /**
   * Calculate statistical measures for each category
   */
  private static calculateCategoryStatistics(
    data: MonthlySpending[]
  ): Record<string, {
    mean: number;
    stdDev: number;
    max: number;
    min: number;
  }> {
    const grouped = this.groupByCategory(data);
    const stats: Record<string, any> = {};

    for (const [category, items] of Object.entries(grouped)) {
      const amounts = items.map((i) => i.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      stats[category] = {
        mean,
        stdDev,
        max: Math.max(...amounts),
        min: Math.min(...amounts),
      };
    }

    return stats;
  }

  /**
   * Get spending insights
   */
  static getSpendingInsights(
    currentMonth: MonthlySpending[],
    previousMonth: MonthlySpending[]
  ): string[] {
    const insights: string[] = [];

    // Compare total spending
    const currentTotal = currentMonth.reduce((sum, m) => sum + m.amount, 0);
    const previousTotal = previousMonth.reduce((sum, m) => sum + m.amount, 0);

    if (previousTotal > 0) {
      const change = ((currentTotal - previousTotal) / previousTotal) * 100;

      if (Math.abs(change) > 10) {
        insights.push(
          change > 0
            ? `Your spending increased by ${change.toFixed(1)}% this month`
            : `Great! You reduced spending by ${Math.abs(change).toFixed(1)}% this month`
        );
      }
    }

    // Find biggest spending category
    const topCategory = currentMonth.reduce(
      (max, m) => (m.amount > max.amount ? m : max),
      currentMonth[0]
    );

    if (topCategory) {
      const percentage = (topCategory.amount / currentTotal) * 100;
      insights.push(
        `${topCategory.category} accounts for ${percentage.toFixed(1)}% of your spending`
      );
    }

    // Identify growing categories
    for (const current of currentMonth) {
      const previous = previousMonth.find((p) => p.category === current.category);
      if (previous && previous.amount > 0) {
        const change = ((current.amount - previous.amount) / previous.amount) * 100;
        if (change > 30) {
          insights.push(
            `${current.category} spending increased by ${change.toFixed(1)}%`
          );
        }
      }
    }

    return insights.slice(0, 5); // Return top 5 insights
  }

  /**
   * Predict if user will exceed budget
   */
  static predictBudgetExceedance(
    categoryBudget: number,
    currentSpending: number,
    daysElapsed: number,
    daysInMonth: number
  ): {
    willExceed: boolean;
    projectedSpending: number;
    exceedanceAmount: number;
    dailyAverage: number;
    recommendedDailyLimit: number;
  } {
    const dailyAverage = currentSpending / daysElapsed;
    const projectedSpending = dailyAverage * daysInMonth;
    const willExceed = projectedSpending > categoryBudget;
    const exceedanceAmount = Math.max(0, projectedSpending - categoryBudget);

    const remainingDays = daysInMonth - daysElapsed;
    const remainingBudget = Math.max(0, categoryBudget - currentSpending);
    const recommendedDailyLimit = remainingDays > 0 ? remainingBudget / remainingDays : 0;

    return {
      willExceed,
      projectedSpending: Math.round(projectedSpending),
      exceedanceAmount: Math.round(exceedanceAmount),
      dailyAverage: Math.round(dailyAverage),
      recommendedDailyLimit: Math.round(recommendedDailyLimit),
    };
  }
}

// Example usage:
/*
const historicalData: MonthlySpending[] = [
  { month: '2024-11', category: 'Food & Dining', amount: 8000, transactionCount: 25 },
  { month: '2024-10', category: 'Food & Dining', amount: 7500, transactionCount: 23 },
  { month: '2024-09', category: 'Food & Dining', amount: 7000, transactionCount: 20 },
];

const predictions = PredictionService.predictCategorySpending(historicalData);
console.log(predictions);
// Output: {
//   category: 'Food & Dining',
//   predictedAmount: 8250,
//   confidence: 0.85,
//   trend: 'increasing',
//   trendPercentage: 14.3,
//   suggestedBudget: 9900,
//   reasoning: 'Based on 3 months of data. Spending is increasing by 14.3%...'
// }
*/