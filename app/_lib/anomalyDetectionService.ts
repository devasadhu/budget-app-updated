// SmartBudget/app/_lib/anomalyDetectionService.ts
interface AnomalyResult {
  isAnomaly: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
  suggestion?: string;
}

class AnomalyDetectionService {
  private transactionHistory: any[] = [];

  setTransactionHistory(transactions: any[]) {
    this.transactionHistory = transactions;
  }

  async detectAnomaly(transaction: any): Promise<AnomalyResult> {
    // Filter transactions of the same category and type
    const similarTransactions = this.transactionHistory.filter(t => 
      t.category === transaction.category && 
      t.type === transaction.type &&
      t.id !== transaction.id
    );

    if (similarTransactions.length < 3) {
      // Not enough data to detect anomalies
      return { isAnomaly: false };
    }

    // Calculate statistics
    const amounts = similarTransactions.map(t => Math.abs(t.amount));
    const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
    
    // Calculate standard deviation
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const currentAmount = Math.abs(transaction.amount);

    // Check for anomalies
    
    // 1. Amount significantly higher than average (>2 standard deviations)
    if (currentAmount > average + (2 * stdDev)) {
      const percentageHigher = ((currentAmount - average) / average) * 100;
      return {
        isAnomaly: true,
        reason: `${percentageHigher.toFixed(0)}% higher than your usual ${transaction.category} spending`,
        severity: percentageHigher > 200 ? 'high' : percentageHigher > 100 ? 'medium' : 'low',
        suggestion: `Your average ${transaction.category} expense is ₹${average.toFixed(0)}`
      };
    }

    // 2. Unusually large single transaction (>3x median)
    if (currentAmount > median * 3) {
      return {
        isAnomaly: true,
        reason: `This is unusually high for ${transaction.category}`,
        severity: 'high',
        suggestion: `Typical ${transaction.category} transaction is around ₹${median.toFixed(0)}`
      };
    }

    // 3. Check for duplicate transactions (same amount, category, within 24 hours)
    const oneDayAgo = new Date(transaction.date);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const possibleDuplicate = this.transactionHistory.find(t =>
      t.id !== transaction.id &&
      t.category === transaction.category &&
      Math.abs(t.amount) === currentAmount &&
      new Date(t.date) >= oneDayAgo &&
      new Date(t.date) <= new Date(transaction.date)
    );

    if (possibleDuplicate) {
      return {
        isAnomaly: true,
        reason: 'Possible duplicate transaction detected',
        severity: 'medium',
        suggestion: 'Check if this transaction was already recorded'
      };
    }

    // 4. Unusual spending frequency
    const last7Days = new Date(transaction.date);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentSimilar = this.transactionHistory.filter(t =>
      t.category === transaction.category &&
      t.type === transaction.type &&
      new Date(t.date) >= last7Days &&
      new Date(t.date) <= new Date(transaction.date)
    );

    if (recentSimilar.length >= 10) {
      return {
        isAnomaly: true,
        reason: `${recentSimilar.length} ${transaction.category} transactions in the last 7 days`,
        severity: 'low',
        suggestion: 'You might be spending frequently in this category'
      };
    }

    return { isAnomaly: false };
  }

  // Detect patterns across all transactions
  async detectPatterns(transactions: any[]): Promise<{
    highFrequencyCategories: string[];
    unusualSpendingDays: string[];
    suggestions: string[];
  }> {
    const categoryCounts: { [key: string]: number } = {};
    const dayOfWeekSpending: { [key: number]: number } = {};

    transactions.forEach(txn => {
      if (txn.type === 'debit') {
        // Count by category
        categoryCounts[txn.category] = (categoryCounts[txn.category] || 0) + 1;
        
        // Count by day of week
        const day = new Date(txn.date).getDay();
        dayOfWeekSpending[day] = (dayOfWeekSpending[day] || 0) + Math.abs(txn.amount);
      }
    });

    // Find high frequency categories
    const avgCount = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0) / Object.keys(categoryCounts).length;
    const highFrequencyCategories = Object.entries(categoryCounts)
      .filter(([_, count]) => count > avgCount * 2)
      .map(([category]) => category);

    // Find unusual spending days
    const avgDaySpending = Object.values(dayOfWeekSpending).reduce((sum, amt) => sum + amt, 0) / 7;
    const unusualSpendingDays = Object.entries(dayOfWeekSpending)
      .filter(([_, amount]) => amount > avgDaySpending * 1.5)
      .map(([day]) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)]);

    // Generate suggestions
    const suggestions: string[] = [];
    
    if (highFrequencyCategories.length > 0) {
      suggestions.push(`You have frequent transactions in: ${highFrequencyCategories.join(', ')}`);
    }
    
    if (unusualSpendingDays.length > 0) {
      suggestions.push(`You tend to spend more on: ${unusualSpendingDays.join(', ')}`);
    }

    return { highFrequencyCategories, unusualSpendingDays, suggestions };
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();