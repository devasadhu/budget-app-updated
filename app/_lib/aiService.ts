// SmartBudget/app/_lib/aiService.ts
import { Transaction } from './useTransactionStore';

// ============================================
// ADVANCED TRANSACTION ANALYSIS
// ============================================

interface SpendingPattern {
  category: string;
  amount: number;
  count: number;
  avgPerTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentage: number;
}

interface FinancialInsight {
  type: 'warning' | 'tip' | 'achievement' | 'prediction';
  title: string;
  message: string;
  priority: number;
}

const analyzeSpendingPatterns = (transactions: Transaction[]): SpendingPattern[] => {
  const expenses = transactions.filter(t => t.type === 'debit' || t.amount < 0);
  const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const categoryData = expenses.reduce((acc: Record<string, { amount: number, count: number, dates: Date[] }>, t) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) {
      acc[cat] = { amount: 0, count: 0, dates: [] };
    }
    acc[cat].amount += Math.abs(t.amount);
    acc[cat].count += 1;
    acc[cat].dates.push(new Date(t.date));
    return acc;
  }, {});

  return Object.entries(categoryData).map(([category, data]) => {
    // Calculate trend based on recent vs older transactions
    const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
    const midpoint = Math.floor(sortedDates.length / 2);
    const recentCount = sortedDates.slice(midpoint).length;
    const olderCount = sortedDates.slice(0, midpoint).length;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentCount > olderCount * 1.3) trend = 'increasing';
    else if (recentCount < olderCount * 0.7) trend = 'decreasing';

    return {
      category,
      amount: data.amount,
      count: data.count,
      avgPerTransaction: data.amount / data.count,
      trend,
      percentage: (data.amount / totalSpent) * 100
    };
  }).sort((a, b) => b.amount - a.amount);
};

const generateProactiveInsights = (
  transactions: Transaction[], 
  balance: number
): FinancialInsight[] => {
  const insights: FinancialInsight[] = [];
  const patterns = analyzeSpendingPatterns(transactions);
  const expenses = transactions.filter(t => t.type === 'debit' || t.amount < 0);
  const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Low balance warning
  if (balance < 1000 && balance > 0) {
    insights.push({
      type: 'warning',
      title: 'Low Balance Alert',
      message: `Your balance is running low at ₹${balance.toLocaleString('en-IN')}. Consider holding off on non-essential purchases.`,
      priority: 10
    });
  }

  // Overspending in category
  patterns.forEach(pattern => {
    if (pattern.percentage > 40 && pattern.trend === 'increasing') {
      insights.push({
        type: 'warning',
        title: `High ${pattern.category} Spending`,
        message: `${pattern.category} is ${pattern.percentage.toFixed(0)}% of your spending and increasing! You could save ₹${Math.round(pattern.amount * 0.25).toLocaleString('en-IN')} by cutting back 25%.`,
        priority: 8
      });
    }
  });

  // Positive trend recognition
  patterns.forEach(pattern => {
    if (pattern.trend === 'decreasing' && pattern.amount > 1000) {
      insights.push({
        type: 'achievement',
        title: `Great Progress on ${pattern.category}!`,
        message: `You've been spending less on ${pattern.category} lately. Keep it up! 🎉`,
        priority: 5
      });
    }
  });

  // Budget prediction
  if (expenses.length >= 5) {
    const avgDaily = totalSpent / 30;
    const projectedMonthly = avgDaily * 30;
    insights.push({
      type: 'prediction',
      title: 'Monthly Projection',
      message: `At your current rate, you'll spend ₹${Math.round(projectedMonthly).toLocaleString('en-IN')} this month. ${
        projectedMonthly > balance ? '⚠️ This exceeds your current balance!' : '✅ This seems manageable.'
      }`,
      priority: 7
    });
  }

  // Achievement for good spending
  if (totalSpent < 5000 && expenses.length > 5) {
    insights.push({
      type: 'achievement',
      title: 'Mindful Spender!',
      message: `You're doing great! Your spending is under control at ₹${totalSpent.toLocaleString('en-IN')}. 🌟`,
      priority: 4
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
};

// ============================================
// ENHANCED NATURAL LANGUAGE PROCESSING
// ============================================

const detectIntent = (message: string): string => {
  const lowerMsg = message.toLowerCase();
  
  // Greetings
  if (/^(hi|hello|hey|hola|sup|yo|good morning|good evening)/.test(lowerMsg)) return 'greeting';
  
  // Balance queries
  if (/(balance|money left|how much do i have|remaining|funds)/.test(lowerMsg)) return 'balance';
  
  // Spending queries
  if (/(spend|spent|expense|paid|cost)/.test(lowerMsg)) return 'spending';
  
  // Category specific
  if (/(food|travel|shopping|bills|entertainment|transport)/.test(lowerMsg)) return 'category';
  
  // Insights/Analysis
  if (/(insight|analysis|pattern|trend|habit)/.test(lowerMsg)) return 'analysis';
  
  // Savings/Tips
  if (/(save|tip|advice|suggest|help|reduce|cut)/.test(lowerMsg)) return 'savings';
  
  // Predictions
  if (/(predict|forecast|will i|projection|future)/.test(lowerMsg)) return 'prediction';
  
  // Comparison
  if (/(compare|versus|vs|better|worse)/.test(lowerMsg)) return 'comparison';
  
  // Achievement/Status
  if (/(how am i doing|doing good|progress|achievement)/.test(lowerMsg)) return 'status';
  
  // Summary
  if (/(summary|overview|report|breakdown)/.test(lowerMsg)) return 'summary';
  
  return 'unknown';
};

const extractTimeframe = (message: string): 'today' | 'week' | 'month' | 'all' => {
  const lowerMsg = message.toLowerCase();
  if (/today|this day/.test(lowerMsg)) return 'today';
  if (/week|weekly|this week|past week/.test(lowerMsg)) return 'week';
  if (/month|monthly|this month/.test(lowerMsg)) return 'month';
  return 'all';
};

const filterByTimeframe = (transactions: Transaction[], timeframe: string): Transaction[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeframe) {
    case 'today':
      return transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= today;
      });
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return transactions.filter(t => new Date(t.date) >= weekAgo);
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return transactions.filter(t => new Date(t.date) >= monthAgo);
    default:
      return transactions;
  }
};

// ============================================
// CONTEXT-AWARE RESPONSE GENERATION
// ============================================

export const generateBuddyResponse = (
  userMessage: string, 
  transactions: Transaction[], 
  currentBalance: number,
  conversationHistory: { role: 'user' | 'ai', message: string }[] = []
): string => {
  const intent = detectIntent(userMessage);
  const timeframe = extractTimeframe(userMessage);
  const filteredTransactions = filterByTimeframe(transactions, timeframe);
  
  const expenses = filteredTransactions.filter(t => t.type === 'debit' || t.amount < 0);
  const income = filteredTransactions.filter(t => t.type === 'credit' || t.amount > 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const patterns = analyzeSpendingPatterns(filteredTransactions);
  const insights = generateProactiveInsights(transactions, currentBalance);

  // Time context prefix
  const timeContext = timeframe === 'all' ? '' : 
    timeframe === 'today' ? 'today ' :
    timeframe === 'week' ? 'this week ' :
    'this month ';

  // ==================== INTENT HANDLERS ====================

  switch (intent) {
    case 'greeting':
      const hasData = transactions.length > 0;
      const topInsight = insights[0];
      
      if (hasData && topInsight) {
        return `Hey there! 👋 I've been analyzing your finances. Quick heads up: ${topInsight.message}\n\nWhat would you like to know today?`;
      }
      return `Hey there! 👋 I'm Buddy, your AI financial companion. I'm here to help you understand your spending, find savings, and make smarter money decisions. What's on your mind?`;

    case 'balance':
      const balanceStatus = currentBalance < 1000 ? '⚠️ Running low' :
                           currentBalance < 5000 ? '📊 Moderate' :
                           currentBalance < 20000 ? '✅ Good' :
                           '🌟 Excellent';
      
      const projectedDays = totalExpenses > 0 ? Math.floor(currentBalance / (totalExpenses / 30)) : 999;
      
      return `💰 **Current Balance: ₹${currentBalance.toLocaleString('en-IN')}**\nStatus: ${balanceStatus}\n\n${
        projectedDays < 30 && projectedDays > 0
          ? `⏰ At your current spending rate, your balance will last about ${projectedDays} days. Consider cutting back!`
          : projectedDays >= 30
          ? `✅ You're in good shape! Your balance can sustain your spending for ${Math.floor(projectedDays)} days.`
          : `💡 Start tracking expenses to see how long your balance will last.`
      }`;

    case 'spending':
      if (expenses.length === 0) {
        return `You haven't recorded any expenses ${timeContext}yet. Start tracking to get personalized insights! 📝`;
      }

      const avgTransaction = totalExpenses / expenses.length;
      const topSpendCategory = patterns[0];
      
      return `📊 **Spending ${timeContext.toUpperCase()}**\n\n💸 Total: ₹${totalExpenses.toLocaleString('en-IN')} (${expenses.length} transactions)\n📈 Average: ₹${Math.round(avgTransaction).toLocaleString('en-IN')} per transaction\n🎯 Top Category: ${topSpendCategory.category} (₹${Math.round(topSpendCategory.amount).toLocaleString('en-IN')})\n\n${
        topSpendCategory.trend === 'increasing' 
          ? `📈 Your ${topSpendCategory.category} spending is increasing. Consider reviewing this!`
          : topSpendCategory.trend === 'decreasing'
          ? `📉 Great! Your ${topSpendCategory.category} spending is decreasing.`
          : `➡️ Your spending is stable.`
      }`;

    case 'category':
      const categoryMatch = userMessage.match(/food|travel|shopping|bills|entertainment|other/i);
      if (!categoryMatch) return generateDefaultResponse();
      
      const requestedCat = categoryMatch[0];
      const catData = patterns.find(p => p.category.toLowerCase() === requestedCat.toLowerCase());
      
      if (!catData) {
        return `You haven't spent anything on ${requestedCat} ${timeContext}yet. 📝`;
      }

      const catTrendEmoji = catData.trend === 'increasing' ? '📈' :
                            catData.trend === 'decreasing' ? '📉' : '➡️';
      
      return `${getCategoryEmoji(catData.category)} **${catData.category} Spending ${timeContext.toUpperCase()}**\n\n💰 Total: ₹${Math.round(catData.amount).toLocaleString('en-IN')}\n📝 Transactions: ${catData.count}\n📊 Average: ₹${Math.round(catData.avgPerTransaction).toLocaleString('en-IN')} each\n${catTrendEmoji} Trend: ${catData.trend}\n📈 ${catData.percentage.toFixed(1)}% of total spending\n\n${getCategoryAdvice(catData)}`;

    case 'analysis':
      if (transactions.length < 3) {
        return `I need more data to provide meaningful analysis. Add at least 3 transactions to see patterns! 📊`;
      }

      const topPatterns = patterns.slice(0, 3);
      const analysisText = topPatterns.map(p => 
        `• **${p.category}**: ₹${Math.round(p.amount).toLocaleString('en-IN')} (${p.percentage.toFixed(0)}%) - ${p.trend}`
      ).join('\n');

      return `🔍 **Spending Pattern Analysis**\n\n${analysisText}\n\n💡 **Insights:**\n${insights.slice(0, 2).map(i => `• ${i.message}`).join('\n')}`;

    case 'savings':
      const savingsTips = generateContextualSavingsTips(patterns, currentBalance, totalExpenses);
      return `💡 **Personalized Savings Tips**\n\n${savingsTips}`;

    case 'prediction':
      if (expenses.length < 5) {
        return `I need more transaction history to make accurate predictions. Keep tracking! 📊`;
      }

      const dailyAvg = totalExpenses / 30;
      const weeklyProjection = dailyAvg * 7;
      const monthlyProjection = dailyAvg * 30;

      return `🔮 **Financial Forecast**\n\n📅 Next 7 days: ₹${Math.round(weeklyProjection).toLocaleString('en-IN')}\n📅 Next 30 days: ₹${Math.round(monthlyProjection).toLocaleString('en-IN')}\n\n${
        monthlyProjection > currentBalance
          ? `⚠️ Warning: Projected spending exceeds your balance by ₹${Math.round(monthlyProjection - currentBalance).toLocaleString('en-IN')}!`
          : `✅ Your balance should cover your projected spending.`
      }\n\n💡 Tip: ${getProjectionTip(monthlyProjection, currentBalance)}`;

    case 'comparison':
      return generateComparisonResponse(patterns, expenses, timeframe);

    case 'status':
      const score = calculateFinancialScore(transactions, currentBalance);
      const statusEmoji = score > 80 ? '🌟' : score > 60 ? '✅' : score > 40 ? '⚠️' : '🚨';
      
      return `${statusEmoji} **Financial Health Score: ${score}/100**\n\n${getScoreBreakdown(score, patterns, currentBalance)}\n\n${insights.slice(0, 2).map(i => `${getInsightEmoji(i.type)} ${i.message}`).join('\n\n')}`;

    case 'summary':
      return generateComprehensiveSummary(transactions, currentBalance, patterns, insights);

    default:
      return generateSmartDefaultResponse(userMessage, patterns, insights);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    'Food': '🍽️',
    'Travel': '✈️',
    'Shopping': '🛍️',
    'Bills': '📄',
    'Entertainment': '🎮',
    'Other': '📦'
  };
  return emojiMap[category] || '📊';
};

const getCategoryAdvice = (pattern: SpendingPattern): string => {
  if (pattern.trend === 'increasing' && pattern.percentage > 30) {
    return `💡 Your ${pattern.category} spending is high and increasing. Consider:\n• Setting a weekly limit of ₹${Math.round(pattern.amount * 0.6 / 4).toLocaleString('en-IN')}\n• Finding cheaper alternatives\n• Tracking each purchase more carefully`;
  }
  
  if (pattern.trend === 'decreasing') {
    return `✅ Great job reducing ${pattern.category} expenses! Keep it up!`;
  }
  
  return `💡 Try to maintain or reduce this spending level.`;
};

const generateContextualSavingsTips = (
  patterns: SpendingPattern[],
  balance: number,
  totalSpent: number
): string => {
  const tips: string[] = [];
  
  // Category-specific tips
  const topPattern = patterns[0];
  if (topPattern) {
    const savingAmount = Math.round(topPattern.amount * 0.2);
    tips.push(`1. **Cut ${topPattern.category} by 20%**\n   Save ₹${savingAmount.toLocaleString('en-IN')}/month by ${getCategorySavingAction(topPattern.category)}`);
  }

  // Balance-based tips
  if (balance < 5000) {
    tips.push(`2. **Emergency Fund Priority**\n   Build your balance to ₹10,000 for better financial security.`);
  } else {
    tips.push(`2. **50-30-20 Rule**\n   Try allocating: 50% needs, 30% wants, 20% savings.`);
  }

  // Pattern-based tips
  if (patterns.some(p => p.trend === 'increasing')) {
    tips.push(`3. **Freeze Spending Growth**\n   Some categories are increasing. Set weekly limits to control them.`);
  }

  return tips.join('\n\n');
};

const getCategorySavingAction = (category: string): string => {
  const actions: Record<string, string> = {
    'Food': 'cooking at home more often',
    'Travel': 'using public transport or carpooling',
    'Shopping': 'waiting 24hrs before impulse purchases',
    'Bills': 'reviewing subscriptions and switching providers',
    'Entertainment': 'finding free or low-cost alternatives',
    'Other': 'tracking and eliminating unnecessary expenses'
  };
  return actions[category] || 'being more mindful';
};

const getProjectionTip = (projection: number, balance: number): string => {
  if (projection > balance * 0.9) {
    return `Cut non-essential spending immediately to avoid running out of money!`;
  }
  if (projection > balance * 0.7) {
    return `You're spending a large portion of your balance. Consider reducing expenses.`;
  }
  return `Your spending rate is sustainable. Keep up the good work!`;
};

const calculateFinancialScore = (transactions: Transaction[], balance: number): number => {
  const expenses = transactions.filter(t => t.type === 'debit' || t.amount < 0);
  const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  let score = 100;
  
  // Balance factor
  if (balance < 1000) score -= 30;
  else if (balance < 5000) score -= 15;
  else if (balance > 20000) score += 5;
  
  // Spending factor
  if (totalSpent > 20000) score -= 25;
  else if (totalSpent > 10000) score -= 15;
  else if (totalSpent < 5000) score += 10;
  
  // Transaction count factor (regular tracking is good)
  if (transactions.length > 20) score += 5;
  
  return Math.max(0, Math.min(100, score));
};

const getScoreBreakdown = (score: number, patterns: SpendingPattern[], balance: number): string => {
  if (score > 80) return `Excellent! You're managing your finances really well. 🌟`;
  if (score > 60) return `Good job! You're on the right track. Keep it up! ✅`;
  if (score > 40) return `You're doing okay, but there's room for improvement. ⚠️`;
  return `Your finances need attention. Let's work together to improve! 🚨`;
};

const getInsightEmoji = (type: string): string => {
  const emojiMap: Record<string, string> = {
    'warning': '⚠️',
    'tip': '💡',
    'achievement': '🎉',
    'prediction': '🔮'
  };
  return emojiMap[type] || '📊';
};

const generateComparisonResponse = (
  patterns: SpendingPattern[],
  expenses: Transaction[],
  timeframe: string
): string => {
  if (patterns.length < 2) {
    return `I need more spending categories to make comparisons. Keep tracking! 📊`;
  }

  const top2 = patterns.slice(0, 2);
  const difference = top2[0].amount - top2[1].amount;
  
  return `📊 **Category Comparison**\n\n🥇 ${top2[0].category}: ₹${Math.round(top2[0].amount).toLocaleString('en-IN')}\n🥈 ${top2[1].category}: ₹${Math.round(top2[1].amount).toLocaleString('en-IN')}\n\n📈 Difference: ₹${Math.round(difference).toLocaleString('en-IN')}\n\n💡 You're spending ${(top2[0].percentage / top2[1].percentage).toFixed(1)}x more on ${top2[0].category} than ${top2[1].category}.`;
};

const generateComprehensiveSummary = (
  transactions: Transaction[],
  balance: number,
  patterns: SpendingPattern[],
  insights: FinancialInsight[]
): string => {
  const expenses = transactions.filter(t => t.type === 'debit' || t.amount < 0);
  const income = transactions.filter(t => t.type === 'credit' || t.amount > 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const score = calculateFinancialScore(transactions, balance);

  const topCategories = patterns.slice(0, 3).map(p => 
    `   • ${p.category}: ₹${Math.round(p.amount).toLocaleString('en-IN')} (${p.percentage.toFixed(0)}%)`
  ).join('\n');

  return `📊 **Complete Financial Overview**\n\n💰 Balance: ₹${balance.toLocaleString('en-IN')}\n📉 Expenses: ₹${totalExpenses.toLocaleString('en-IN')} (${expenses.length} transactions)\n📈 Income: ₹${totalIncome.toLocaleString('en-IN')}\n💯 Health Score: ${score}/100\n\n🎯 **Top Spending Categories:**\n${topCategories}\n\n💡 **Key Insights:**\n${insights.slice(0, 2).map((i, idx) => `${idx + 1}. ${i.message}`).join('\n')}\n\n${
    totalIncome > 0 && totalExpenses > totalIncome
      ? `⚠️ You're spending more than you earn. Consider budgeting!`
      : totalIncome > 0
      ? `✅ You're spending within your means. Great job!`
      : `💡 Add income transactions for better insights!`
  }`;
};

const generateSmartDefaultResponse = (
  message: string,
  patterns: SpendingPattern[],
  insights: FinancialInsight[]
): string => {
  // Try to find relevant keywords and provide context
  if (message.toLowerCase().includes('help')) {
    return `I'm here to help! 🤗 I can:\n\n• Analyze your spending patterns\n• Predict future expenses\n• Give personalized savings tips\n• Track category-wise spending\n• Show your financial health score\n\nTry: "Show my summary" or "Give me savings tips"`;
  }

  // Proactive insight
  if (insights.length > 0) {
    return `I'm not quite sure what you mean, but here's something important: ${insights[0].message}\n\nTry asking:\n• "What's my spending?"\n• "Give me tips"\n• "Show summary"`;
  }

  return `Hmm, I didn't quite catch that. 🤔 Try asking:\n\n• "What did I spend this week?"\n• "Predict my expenses"\n• "Compare my spending"\n• "How am I doing?"\n• "Give me savings tips"`;
};

const generateDefaultResponse = () => {
  return `I'm not sure about that. Try asking me about your spending, balance, or savings tips! 💡`;
};

// ============================================
// EXPORTS
// ============================================

export const getBuddyAnalysis = (transactions: Transaction[]) => {
  const expenses = transactions.filter(t => t.type === 'debit' || t.amount < 0);
  const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (expenses.length === 0) {
    return {
      title: "Buddy is Waiting! 🐾",
      message: "I don't see any spends yet. Start logging your expenses so I can help you save!",
      score: 100,
      status: "neutral",
    };
  }

  const patterns = analyzeSpendingPatterns(transactions);
  const topCategory = patterns[0]?.category || 'Other';
  const score = calculateFinancialScore(transactions, 0);
  const savingsPotential = Math.round(patterns[0]?.amount * 0.15 || 0);

  let status = totalSpent > 5000 ? "sad" : "happy";
  let advice = `You've spent ₹${totalSpent.toLocaleString()} recently. Your biggest spend is "${topCategory}". Buddy suggests cutting this by 15% to save ₹${savingsPotential.toLocaleString()}!`;

  if (score < 40) {
    status = "sad";
    advice = `Warning: Spending is high! Your spending in "${topCategory}" is driving this. Try skipping non-essential purchases this week.`;
  }

  return {
    title: status === "happy" ? "Buddy is Impressed! ✨" : "Buddy's Observations 💡",
    message: advice,
    score: score,
    status: status
  };
};

export const generateAIInsights = getBuddyAnalysis;