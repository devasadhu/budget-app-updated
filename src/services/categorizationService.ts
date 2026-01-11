// src/services/categorizationService.ts - WITH ML LEARNING

export interface CategoryRule {
  category: string;
  keywords: string[];
  patterns: RegExp[];
  priority: number;
}

export interface CategoryCorrection {
  id: string;
  userId: string;
  description: string;
  merchant?: string;
  amount?: number;
  originalCategory: string;
  correctedCategory: string;
  timestamp: Date;
}

export interface MLPattern {
  category: string;
  keywords: string[];
  weight: number; // How many times this pattern was confirmed
}

// Base category rules (fallback)
const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Food & Dining',
    keywords: [
      'swiggy', 'zomato', 'ubereats', 'dominos', 'pizza', 'mcdonald',
      'kfc', 'subway', 'starbucks', 'cafe', 'restaurant', 'food',
      'dunkin', 'burger', 'biryani', 'dunkin', 'food court',
    ],
    patterns: [
      /swiggy/i,
      /zomato/i,
      /food.*delivery/i,
      /restaurant/i,
      /cafe|coffee/i,
    ],
    priority: 10,
  },
  {
    category: 'Transportation',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'gas',
      'parking', 'toll', 'fasttag', 'car', 'bike', 'taxi', 'cab',
      'railway', 'irctc', 'bus', 'auto', 'paytm toll', 'diesel',
    ],
    patterns: [
      /uber|ola|rapido/i,
      /fuel|petrol|diesel/i,
      /parking|toll/i,
      /metro|railway|irctc/i,
    ],
    priority: 10,
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa',
      'shopping', 'mall', 'store', 'retail', 'supermarket', 'bigbasket',
      'blinkit', 'instamart', 'jiomart', 'dmart', 'reliance',
    ],
    patterns: [
      /amazon|flipkart|myntra/i,
      /shopping|retail/i,
      /supermarket|grocery/i,
    ],
    priority: 9,
  },
  {
    category: 'Entertainment',
    keywords: [
      'netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'gaana',
      'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'game',
      'playstation', 'xbox', 'steam', 'jio cinema',
    ],
    patterns: [
      /netflix|prime.*video|hotstar/i,
      /spotify|gaana|music/i,
      /movie|cinema|pvr|inox/i,
      /gaming|playstation|xbox/i,
    ],
    priority: 9,
  },
  {
    category: 'Bills & Utilities',
    keywords: [
      'electricity', 'water', 'gas', 'internet', 'broadband', 'wifi',
      'mobile', 'recharge', 'postpaid', 'airtel', 'jio', 'vodafone',
      'bsnl', 'tata', 'bill', 'utility', 'rent', 'maintenance',
    ],
    patterns: [
      /electricity|power.*bill/i,
      /water.*bill/i,
      /internet|broadband|wifi/i,
      /mobile|recharge|postpaid/i,
      /rent|maintenance/i,
    ],
    priority: 8,
  },
  {
    category: 'Healthcare',
    keywords: [
      'hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine',
      'health', 'apollo', 'medplus', 'netmeds', '1mg', 'pharmeasy',
      'lab', 'diagnostic', 'insurance', 'health insurance',
    ],
    patterns: [
      /hospital|clinic|doctor/i,
      /pharmacy|medicine|medical/i,
      /health.*insurance/i,
    ],
    priority: 8,
  },
  {
    category: 'Education',
    keywords: [
      'school', 'college', 'university', 'tuition', 'course', 'udemy',
      'coursera', 'books', 'education', 'fees', 'exam', 'upgrad',
      'byjus', 'unacademy', 'study', 'coaching',
    ],
    patterns: [
      /school|college|university/i,
      /course|tuition|coaching/i,
      /education|study/i,
    ],
    priority: 7,
  },
  {
    category: 'Travel',
    keywords: [
      'flight', 'hotel', 'makemytrip', 'goibibo', 'cleartrip', 'booking',
      'agoda', 'oyo', 'airbnb', 'travel', 'vacation', 'trip', 'tour',
      'indigo', 'air india', 'spicejet', 'vistara',
    ],
    patterns: [
      /flight|airline|air.*india/i,
      /hotel|oyo|airbnb/i,
      /travel|vacation|trip/i,
    ],
    priority: 7,
  },
  {
    category: 'Investment',
    keywords: [
      'mutual fund', 'sip', 'stock', 'zerodha', 'groww', 'upstox',
      'investment', 'equity', 'shares', 'gold', 'crypto', 'fd',
      'deposit', 'savings', 'ppf', 'nps',
    ],
    patterns: [
      /mutual.*fund|sip/i,
      /stock|equity|shares/i,
      /investment|invest/i,
    ],
    priority: 6,
  },
  {
    category: 'Personal Care',
    keywords: [
      'salon', 'spa', 'gym', 'fitness', 'yoga', 'beauty', 'grooming',
      'cult.fit', 'urban company', 'lakme', 'haircut', 'massage',
    ],
    patterns: [
      /salon|spa|beauty/i,
      /gym|fitness|yoga/i,
      /grooming|haircut/i,
    ],
    priority: 6,
  },
  {
    category: 'Insurance',
    keywords: [
      'insurance', 'premium', 'policy', 'lic', 'hdfc.*life', 'icici.*prudential',
      'term.*insurance', 'health.*insurance',
    ],
    patterns: [
      /insurance|premium/i,
      /policy/i,
    ],
    priority: 5,
  },
  {
    category: 'Other',
    keywords: [],
    patterns: [],
    priority: 0,
  },
];

export class MLCategorizationService {
  private static learnedPatterns: Map<string, MLPattern[]> = new Map();
  private static corrections: CategoryCorrection[] = [];
  private static isInitialized = false;

  /**
   * Initialize ML service - load learned patterns from storage
   */
  static async initialize(userId: string): Promise<void> {
    if (this.isInitialized) return;

    console.log('🧠 Initializing ML Categorization Service...');
    
    try {
      // Load learned patterns from Firestore
      const { firestoreService } = await import('./firestoreService');
      
      const patterns = await firestoreService.fetchDocuments<MLPattern>(
        `users/${userId}/ml_patterns`
      );
      
      // Group patterns by category
      patterns.forEach(pattern => {
        if (!this.learnedPatterns.has(pattern.category)) {
          this.learnedPatterns.set(pattern.category, []);
        }
        this.learnedPatterns.get(pattern.category)!.push(pattern);
      });

      console.log(`✅ Loaded ${patterns.length} learned patterns`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ML service:', error);
      this.isInitialized = true; // Continue anyway
    }
  }

  /**
   * Smart categorization using both rules and learned patterns
   */
  static categorize(
    description: string,
    merchant?: string,
    amount?: number
  ): { category: string; confidence: number; method: 'rule' | 'ml' | 'hybrid' } {
    const text = `${description} ${merchant || ''}`.toLowerCase();

    // 1. Check learned ML patterns first (higher priority)
    const mlResult = this.categorizeusingML(text, amount);
    if (mlResult.confidence > 0.7) {
      console.log(`🧠 ML categorization: ${mlResult.category} (${mlResult.confidence.toFixed(2)})`);
      return { ...mlResult, method: 'ml' };
    }

    // 2. Check rule-based patterns
    const ruleResult = this.categorizeUsingRules(text);
    if (ruleResult.confidence > 0.6) {
      console.log(`📋 Rule categorization: ${ruleResult.category} (${ruleResult.confidence.toFixed(2)})`);
      return { ...ruleResult, method: 'rule' };
    }

    // 3. Hybrid: Combine both with weights
    if (mlResult.confidence > 0.3 && ruleResult.confidence > 0.3) {
      const mlWeight = 0.6; // ML patterns weighted higher
      const ruleWeight = 0.4;
      
      if (mlResult.category === ruleResult.category) {
        return {
          category: mlResult.category,
          confidence: mlResult.confidence * mlWeight + ruleResult.confidence * ruleWeight,
          method: 'hybrid'
        };
      }
    }

    // 4. Return best guess
    if (mlResult.confidence > ruleResult.confidence) {
      return { ...mlResult, method: 'ml' };
    } else {
      return { ...ruleResult, method: 'rule' };
    }
  }

  /**
   * ML-based categorization using learned patterns
   */
  private static categorizeusingML(
    text: string,
    amount?: number
  ): { category: string; confidence: number } {
    let bestCategory = 'Other';
    let maxScore = 0;

    for (const [category, patterns] of this.learnedPatterns.entries()) {
      let score = 0;

      for (const pattern of patterns) {
        // Check keyword matches
        const matchedKeywords = pattern.keywords.filter(keyword =>
          text.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          // Score = (matches / total keywords) * weight
          const matchRatio = matchedKeywords.length / pattern.keywords.length;
          score += matchRatio * pattern.weight;
        }
      }

      // Normalize score
      const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
      const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;

      if (normalizedScore > maxScore) {
        maxScore = normalizedScore;
        bestCategory = category;
      }
    }

    return {
      category: bestCategory,
      confidence: Math.min(maxScore, 1)
    };
  }

  /**
   * Rule-based categorization (existing logic)
   */
  private static categorizeUsingRules(text: string): { category: string; confidence: number } {
    const sortedRules = [...CATEGORY_RULES].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.category === 'Other') continue;

      // Check keywords
      const keywordMatches = rule.keywords.filter(keyword =>
        text.includes(keyword.toLowerCase())
      ).length;

      // Check patterns
      const patternMatches = rule.patterns.filter(pattern =>
        pattern.test(text)
      ).length;

      const totalMatches = keywordMatches + patternMatches;
      const possibleMatches = rule.keywords.length + rule.patterns.length;

      if (totalMatches > 0) {
        const confidence = possibleMatches > 0
          ? Math.min((totalMatches / possibleMatches) + (rule.priority / 100), 1)
          : 0.3;

        return { category: rule.category, confidence };
      }
    }

    return { category: 'Other', confidence: 0.2 };
  }

  /**
   * Learn from user correction
   */
  static async learnFromCorrection(
    userId: string,
    correction: Omit<CategoryCorrection, 'id' | 'userId' | 'timestamp'>
  ): Promise<void> {
    console.log('🎓 Learning from correction:', correction);

    try {
      const { firestoreService } = await import('./firestoreService');

      // Save correction to Firestore
      const correctionData: CategoryCorrection = {
        ...correction,
        id: '',
        userId,
        timestamp: new Date()
      };

      await firestoreService.addDocument(
        `users/${userId}/category_corrections`,
        correctionData
      );

      // Extract keywords from description and merchant
      const text = `${correction.description} ${correction.merchant || ''}`.toLowerCase();
      const words = text
        .split(/\s+/)
        .filter(word => word.length > 3) // Only meaningful words
        .filter(word => !/^\d+$/.test(word)); // No pure numbers

      // Update or create learned pattern
      const existingPatterns = this.learnedPatterns.get(correction.correctedCategory) || [];
      
      // Find if we already have a pattern with similar keywords
      let patternUpdated = false;
      for (const pattern of existingPatterns) {
        const overlap = words.filter(w => pattern.keywords.includes(w)).length;
        if (overlap > 0) {
          // Update existing pattern
          pattern.weight += 1;
          pattern.keywords = [...new Set([...pattern.keywords, ...words])]; // Add new keywords
          patternUpdated = true;
          break;
        }
      }

      // Create new pattern if no overlap found
      if (!patternUpdated) {
        const newPattern: MLPattern = {
          category: correction.correctedCategory,
          keywords: words,
          weight: 1
        };
        existingPatterns.push(newPattern);
      }

      this.learnedPatterns.set(correction.correctedCategory, existingPatterns);

      // Save updated patterns to Firestore
      await this.saveLearnedPatterns(userId, correction.correctedCategory);

      console.log(`✅ Learned pattern for ${correction.correctedCategory}`);
    } catch (error) {
      console.error('Failed to learn from correction:', error);
    }
  }

  /**
   * Save learned patterns to Firestore
   */
  private static async saveLearnedPatterns(userId: string, category: string): Promise<void> {
    const patterns = this.learnedPatterns.get(category) || [];
    const { firestoreService } = await import('./firestoreService');

    for (const pattern of patterns) {
      // Use category as document ID to update existing patterns
      await firestoreService.updateDocument(
        `users/${userId}/ml_patterns/${category}`,
        pattern
      );
    }
  }

  /**
   * Get statistics about learned patterns
   */
  static getMLStatistics(): {
    totalPatterns: number;
    categoriesLearned: number;
    averageWeight: number;
  } {
    let totalPatterns = 0;
    let totalWeight = 0;

    for (const patterns of this.learnedPatterns.values()) {
      totalPatterns += patterns.length;
      totalWeight += patterns.reduce((sum, p) => sum + p.weight, 0);
    }

    return {
      totalPatterns,
      categoriesLearned: this.learnedPatterns.size,
      averageWeight: totalPatterns > 0 ? totalWeight / totalPatterns : 0
    };
  }

  /**
   * Get all available categories
   */
  static getAllCategories(): string[] {
    return [...new Set(CATEGORY_RULES.map(r => r.category))];
  }

  /**
   * Batch categorize transactions
   */
  static batchCategorize(
    transactions: Array<{ description: string; merchant?: string; amount?: number }>
  ): Array<{ category: string; confidence: number; method: string }> {
    return transactions.map(t =>
      this.categorize(t.description, t.merchant, t.amount)
    );
  }

  /**
   * Reset learned patterns (for testing)
   */
  static resetLearning(): void {
    this.learnedPatterns.clear();
    this.corrections = [];
    this.isInitialized = false;
    console.log('🔄 ML patterns reset');
  }
}

// Legacy compatibility
export class CategorizationService {
  static categorize(description: string, merchant?: string): string {
    return MLCategorizationService.categorize(description, merchant).category;
  }

  static getConfidence(description: string, category: string, merchant?: string): number {
    const result = MLCategorizationService.categorize(description, merchant);
    return result.category === category ? result.confidence : 0;
  }

  static getCategoryProbabilities(
    description: string,
    merchant?: string
  ): Array<{ category: string; confidence: number }> {
    const categories = MLCategorizationService.getAllCategories();
    return categories.map(cat => ({
      category: cat,
      confidence: this.getConfidence(description, cat, merchant)
    })).filter(p => p.confidence > 0.1);
  }

  static learnFromCorrection(
    description: string,
    originalCategory: string,
    correctedCategory: string,
    merchant?: string
  ): void {
    console.log('⚠️ Use MLCategorizationService.learnFromCorrection with userId');
  }

  static getAllCategories(): string[] {
    return MLCategorizationService.getAllCategories();
  }
}