// src/services/smsParserService.ts

export interface ParsedTransaction {
  id?: string;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  date: Date;
  description: string;
  category?: string;
  rawText: string;
  source: 'sms' | 'csv' | 'manual';
  balance?: number;
  paymentMethod: string;
  isValid: boolean;
  userId?: string;
  createdAt?: Date;
}

export interface BankPattern {
  name: string;
  patterns: RegExp[];
  amountPattern: RegExp;
  merchantPattern?: RegExp;
  datePattern?: RegExp;
  paymentMethodPattern?: RegExp;
  balancePattern?: RegExp | null;
}

export interface SMSImportResult {
  success: boolean;
  parsedTransactions: ParsedTransaction[];
  failedCount: number;
  totalCount: number;
  duplicates: number;
}

// Bank-specific SMS patterns for Indian banks
const BANK_PATTERNS: BankPattern[] = [
  {
    name: 'HDFC',
    patterns: [/HDFC/i, /HDFCBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
    paymentMethodPattern: /(?:via|using)\s+(UPI|Card|ATM|Net Banking)/i,
    balancePattern: /(?:Avl\s+bal|available\s+balance)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  },
  {
    name: 'SBI',
    patterns: [/SBI/i, /State Bank/i, /STATEBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to|for)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /(?:on|dated)\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
    paymentMethodPattern: /(?:via|using)\s+(UPI|Card|ATM|Net Banking)/i,
    balancePattern: /(?:Avl\s+Bal|Available\s+Balance)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  },
  {
    name: 'SBI UPI',
    patterns: [/Dear UPI user/i, /trf to/i],
    amountPattern: /debited\s+by\s+(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /trf\s+to\s+([A-Z][A-Z\s]+?)(?:\s+Refno|\s+If|\s*$)/i,
    datePattern: /on\s+date\s+(\d{2}[A-Za-z]{3}\d{2})/i,
    paymentMethodPattern: /UPI/i,
    balancePattern: null,
  },
  {
    name: 'ICICI',
    patterns: [/ICICI/i, /ICICIBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:to|for|at)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    paymentMethodPattern: /(?:via|using)\s+(UPI|Card|ATM|Net Banking)/i,
    balancePattern: /(?:available\s+balance|Avl\s+Bal)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  },
  {
    name: 'Axis',
    patterns: [/AXIS/i, /AXISBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
    paymentMethodPattern: /(?:via|using)\s+(UPI|Card|ATM)/i,
    balancePattern: /(?:Avl\s+bal|available\s+balance)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  },
  {
    name: 'Kotak',
    patterns: [/KOTAK/i, /KOTAKBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
    paymentMethodPattern: /(?:via|using)\s+(UPI|Card|ATM)/i,
    balancePattern: /(?:Avl\s+bal|available\s+balance)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  },
  {
    name: 'Paytm Payments Bank',
    patterns: [/Paytm/i, /PAYTM/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:to|paid\s+to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
    paymentMethodPattern: /(?:via|using)\s+(UPI|Wallet)/i,
    balancePattern: /(?:balance|Balance)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  },
];

// Generic patterns for unknown banks
const GENERIC_PATTERNS = {
  debitKeywords: [
    'debited',
    'deducted',
    'spent',
    'withdrawn',
    'paid',
    'purchase',
    'payment',
    'charged',
    'withdrawal',
  ],
  creditKeywords: [
    'credited',
    'received',
    'deposited',
    'refund',
    'cashback',
    'credited back',
    'added',
  ],
  amountPattern: /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
  merchantPattern: /(?:at|to|from|paid\s+to|trf\s+to)\s+([A-Z][A-Z0-9\s&'.\-]+?)(?:\s+on|\s+dated|\.|,|$)/i,
  datePattern: /(?:on|dated)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
  upiPatterns: [/UPI/i, /BHIM/i, /PhonePe/i, /Google Pay/i, /GPay/i, /Paytm/i],
  cardPatterns: [/card/i, /Visa/i, /MasterCard/i, /Mastercard/i, /Rupay/i, /Credit Card/i, /Debit Card/i],
  atmPatterns: [/ATM/i, /cash withdrawal/i],
};

export class SMSParserService {
  /**
   * Parse a bank SMS message and extract transaction details
   */
  static parseSMS(smsText: string): ParsedTransaction | null {
    try {
      // Identify bank
      const bank = this.identifyBank(smsText);

      // Extract amount
      const amount = this.extractAmount(smsText, bank);
      if (!amount) return null;

      // Determine transaction type
      const type = this.detectTransactionType(smsText);

      // Extract merchant/description
      const merchant = this.extractMerchant(smsText, bank);

      // Extract or estimate date
      const date = this.extractDate(smsText, bank) || new Date();

      // Extract payment method
      const paymentMethod = this.extractPaymentMethod(smsText, bank);

      // Extract balance if available
      const balance = this.extractBalance(smsText, bank);

      // Clean description
      const description = this.cleanDescription(smsText);

      return {
        amount,
        type,
        merchant,
        date,
        description,
        rawText: smsText,
        source: 'sms',
        isValid: true,
        paymentMethod,
        balance,
      };
    } catch (error) {
      console.error('Error parsing SMS:', error);
      return null;
    }
  }

  /**
   * Identify which bank sent the SMS
   */
  private static identifyBank(smsText: string): BankPattern | null {
    for (const bank of BANK_PATTERNS) {
      if (bank.patterns.some((pattern) => pattern.test(smsText))) {
        return bank;
      }
    }
    return null;
  }

  /**
   * Extract amount from SMS
   */
  private static extractAmount(
    smsText: string,
    bank: BankPattern | null
  ): number | null {
    // Try bank-specific pattern first
    if (bank?.amountPattern) {
      const match = smsText.match(bank.amountPattern);
      if (match && match[1]) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        return isNaN(amount) ? null : amount;
      }
    }

    // Try generic patterns
    const amountPatterns = [
      /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /debited\s+by\s+(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /credited\s+by\s+(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /spent\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /paid\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = smsText.match(pattern);
      if (match && match[1]) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) return amount;
      }
    }

    return null;
  }

  /**
   * Detect if transaction is debit or credit
   */
  private static detectTransactionType(smsText: string): 'debit' | 'credit' {
    const lowerText = smsText.toLowerCase();

    // Check for credit keywords
    const hasCredit = GENERIC_PATTERNS.creditKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    // Check for debit keywords
    const hasDebit = GENERIC_PATTERNS.debitKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    // Special case: "credited" usually means money added to account (credit for receiver)
    if (lowerText.includes('credited') && !lowerText.includes('debited')) {
      return 'credit';
    }

    // Default to debit if unclear (most common case for expenses)
    return hasCredit && !hasDebit ? 'credit' : 'debit';
  }

  /**
   * Extract merchant/payee name
   */
  private static extractMerchant(
    smsText: string,
    bank: BankPattern | null
  ): string {
    // Try bank-specific pattern first
    if (bank?.merchantPattern) {
      const match = smsText.match(bank.merchantPattern);
      if (match && match[1]) {
        return this.cleanMerchantName(match[1]);
      }
    }

    // Try generic patterns
    const merchantPatterns = [
      /(?:at|to|from|paid\s+to|trf\s+to)\s+([A-Z][A-Z0-9\s&'.\-]+?)(?:\s+on|\s+dated|\.|,|$)/i,
      /purchase\s+at\s+([A-Z][A-Z0-9\s&'-]+)/i,
      /paid\s+to\s+([A-Z][A-Z0-9\s&'-]+)/i,
      /transaction\s+at\s+([A-Z][A-Z0-9\s&'-]+)/i,
      /trf\s+to\s+([A-Z][A-Z\s]+?)(?:\s+Refno|\s+If|\s*$)/i,
      /for\s+([A-Z][A-Z0-9\s&'-]+)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = smsText.match(pattern);
      if (match && match[1]) {
        return this.cleanMerchantName(match[1]);
      }
    }

    // Try to extract from description
    if (smsText.includes('at')) {
      const parts = smsText.split('at');
      if (parts.length > 1) {
        const possibleMerchant = parts[1].split(/[.,\s]/)[0].trim();
        if (possibleMerchant && possibleMerchant.length > 2) {
          return this.cleanMerchantName(possibleMerchant);
        }
      }
    }

    return "Unknown";
  }

  /**
   * Clean and format merchant name
   */
  private static cleanMerchantName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'.-]/g, '')
      .replace(/\b(?:PVT|LTD|INC|LLP|BANK|ATM|Refno|If|not|u|call)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50);
  }

  /**
   * Extract transaction date
   */
  private static extractDate(
    smsText: string,
    bank: BankPattern | null
  ): Date | null {
    // Try bank-specific pattern first
    if (bank?.datePattern) {
      const match = smsText.match(bank.datePattern);
      if (match && match[1]) {
        const date = this.parseDate(match[1]);
        if (date) return date;
      }
    }

    // Try generic patterns
    const datePatterns = [
      /(?:on|dated)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /on\s+date\s+(\d{2}[A-Za-z]{3}\d{2})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(\d{2}[A-Za-z]{3}\d{2})/,
    ];

    for (const pattern of datePatterns) {
      const match = smsText.match(pattern);
      if (match && match[1]) {
        const date = this.parseDate(match[1]);
        if (date) return date;
      }
    }

    return null;
  }

  /**
   * Parse date string to Date object
   */
  private static parseDate(dateStr: string): Date | null {
    try {
      // Handle DD-MM-YYYY, DD/MM/YYYY, DD-MM-YY, DD/MM/YY
      const dashSlashMatch = dateStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
      if (dashSlashMatch) {
        const [, dayStr, monthStr, yearStr] = dashSlashMatch;
        let day = parseInt(dayStr, 10);
        let month = parseInt(monthStr, 10);
        let year = parseInt(yearStr, 10);
        
        // Handle 2-digit year
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }

        // Validate date
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        const date = new Date(year, month - 1, day);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return null;
        }

        // Don't allow future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) {
          return null;
        }

        return date;
      }
      
      // Handle 07Jan26 format
      const shortDateMatch = dateStr.match(/^(\d{2})([A-Za-z]{3})(\d{2})$/i);
      if (shortDateMatch) {
        const [, dayStr, monthStr, yearStr] = shortDateMatch;
        const day = parseInt(dayStr, 10);
        let year = parseInt(yearStr, 10);
        
        // Convert month name to number (Jan=0, Feb=1, etc.)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthStr.slice(0, 3);
        const monthIndex = monthNames.findIndex(m => 
          m.toLowerCase() === monthName.toLowerCase()
        );
        
        if (monthIndex === -1) {
          return null;
        }
        
        // Handle 2-digit year (assuming 20xx for dates 00-50, 19xx for 51-99)
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        // Validate date
        if (day < 1 || day > 31) {
          return null;
        }
        
        const date = new Date(year, monthIndex, day);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return null;
        }
        
        // Don't allow future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) {
          return null;
        }
        
        return date;
      }
      
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return null;
  }

  /**
   * Extract payment method
   */
  private static extractPaymentMethod(
    smsText: string,
    bank: BankPattern | null
  ): string {
    const lowerText = smsText.toLowerCase();

    // Try bank-specific pattern
    if (bank?.paymentMethodPattern) {
      const match = smsText.match(bank.paymentMethodPattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    // Check for UPI
    if (GENERIC_PATTERNS.upiPatterns.some(pattern => pattern.test(smsText)) || 
        smsText.includes('Dear UPI user')) {
      return 'UPI';
    }

    // Check for Card
    if (GENERIC_PATTERNS.cardPatterns.some(pattern => pattern.test(smsText))) {
      return 'CARD';
    }

    // Check for ATM
    if (GENERIC_PATTERNS.atmPatterns.some(pattern => pattern.test(smsText))) {
      return 'ATM';
    }

    // Check for Net Banking
    if (lowerText.includes('net banking') || lowerText.includes('internet banking')) {
      return 'NET BANKING';
    }

    return 'UNKNOWN';
  }

  /**
   * Extract balance from SMS
   */
  private static extractBalance(
    smsText: string,
    bank: BankPattern | null
  ): number | undefined {
    // Try bank-specific pattern
    if (bank?.balancePattern) {
      const match = smsText.match(bank.balancePattern);
      if (match && match[1]) {
        const balanceStr = match[1].replace(/,/g, '');
        const balance = parseFloat(balanceStr);
        return isNaN(balance) ? undefined : balance;
      }
    }

    // Try generic balance patterns
    const balancePatterns = [
      /bal\s*Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /balance\s*Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /Avl\s+bal\s*Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /Available\s+Balance\s*Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = smsText.match(pattern);
      if (match && match[1]) {
        const balanceStr = match[1].replace(/,/g, '');
        const balance = parseFloat(balanceStr);
        return isNaN(balance) ? undefined : balance;
      }
    }

    return undefined;
  }

  /**
   * Clean SMS description
   */
  private static cleanDescription(smsText: string): string {
    // Remove bank name prefixes and common patterns
    let cleaned = smsText
      .replace(/^[A-Z]+:\s*/i, '') // Remove "HDFC: " prefix
      .replace(/^[A-Z]+\s+Bank:\s*/i, '') // Remove "HDFC Bank: " prefix
      .replace(/Dear\s+(?:Customer|UPI user)[,\s]*/i, '') // Remove "Dear Customer" or "Dear UPI user"
      .replace(/Thank you.*$/i, '') // Remove "Thank you" messages
      .replace(/For queries.*$/i, '') // Remove "For queries" messages
      .replace(/If not u\?.*$/i, '') // Remove "If not u?" messages
      .replace(/call[-\d\s]+/gi, '') // Remove phone numbers
      .replace(/https?:\/\/\S+/g, '') // Remove URLs
      .replace(/\*\d+/g, 'XXXX') // Mask account numbers
      .replace(/[A-Z]{4}\d{4,}/g, 'XXXX') // Mask card numbers
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .trim();

    // Truncate if too long
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 197) + '...';
    }

    return cleaned || "Bank Transaction";
  }

  /**
   * Batch parse multiple SMS messages
   */
  static batchParseSMS(smsMessages: string[]): ParsedTransaction[] {
    return smsMessages
      .map((sms) => this.parseSMS(sms))
      .filter((t): t is ParsedTransaction => t !== null);
  }

  /**
   * Import transactions from SMS messages
   */
  static async importFromSMS(
    smsMessages: string[],
    userId: string,
    existingTransactionHashes?: Set<string>
  ): Promise<SMSImportResult> {
    const result: SMSImportResult = {
      success: true,
      parsedTransactions: [],
      failedCount: 0,
      totalCount: smsMessages.length,
      duplicates: 0,
    };

    for (const sms of smsMessages) {
      if (this.isBankSMS(sms)) {
        const transaction = this.parseSMS(sms);
        if (transaction) {
          // Generate unique ID
          const transactionId = this.generateTransactionId(transaction);
          
          // Check for duplicates
          const transactionHash = this.generateTransactionHash(transaction);
          if (existingTransactionHashes?.has(transactionHash)) {
            result.duplicates++;
            continue;
          }

          // Add user ID and timestamp
          const enhancedTransaction: ParsedTransaction = {
            ...transaction,
            id: transactionId,
            userId,
            createdAt: new Date(),
          };

          result.parsedTransactions.push(enhancedTransaction);
        } else {
          result.failedCount++;
        }
      } else {
        result.failedCount++;
      }
    }

    return result;
  }

  /**
   * Generate unique transaction ID
   */
  private static generateTransactionId(transaction: ParsedTransaction): string {
    const dateStr = transaction.date.getTime().toString();
    const amountStr = Math.round(transaction.amount * 100).toString();
    const merchantStr = transaction.merchant?.substring(0, 10) || 'unknown';
    const hash = `${dateStr}_${amountStr}_${merchantStr}`.replace(/[^a-zA-Z0-9]/g, '_');
    return `sms_${hash}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Generate hash for duplicate detection
   */
  private static generateTransactionHash(transaction: ParsedTransaction): string {
    const dateStr = transaction.date.toISOString().split('T')[0];
    const amountStr = Math.round(transaction.amount * 100).toString();
    const merchantStr = transaction.merchant || '';
    return `${dateStr}_${amountStr}_${merchantStr}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Validate if SMS is likely a bank transaction message
   */
  static isBankSMS(smsText: string): boolean {
    const lowerText = smsText.toLowerCase();

    // Check for bank-related keywords
    const hasBankKeyword = BANK_PATTERNS.some((bank) =>
      bank.patterns.some((pattern) => pattern.test(smsText))
    );

    // Check for transaction keywords
    const hasTransactionKeyword = [
      ...GENERIC_PATTERNS.debitKeywords,
      ...GENERIC_PATTERNS.creditKeywords,
      'transaction',
      'purchase',
      'payment',
      'withdrawal',
      'deposit',
      'trf to',
      'debited by',
      'credited by',
    ].some((keyword) => lowerText.includes(keyword));

    // Check for amount pattern
    const amountPatterns = [
      /(?:Rs\.?|INR|₹)\s*\d+/i,
      /debited\s+by\s+\d+/i,
      /credited\s+by\s+\d+/i,
    ];
    
    const hasAmount = amountPatterns.some(pattern => pattern.test(smsText));

    // Check for Indian bank SMS patterns
    const hasIndianPattern = 
      lowerText.includes('rs.') ||
      lowerText.includes('inr') ||
      lowerText.includes('avl bal') ||
      lowerText.includes('available balance') ||
      lowerText.includes('a/c') ||
      lowerText.includes('debited by') ||
      lowerText.includes('credited by');

    return (hasBankKeyword || hasTransactionKeyword || hasIndianPattern) && hasAmount;
  }

  /**
   * Group transactions by date
   */
  static groupTransactionsByDate(
    transactions: ParsedTransaction[]
  ): Record<string, ParsedTransaction[]> {
    const groups: Record<string, ParsedTransaction[]> = {};
    
    transactions.forEach((transaction) => {
      const date = transaction.date.toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });
    
    return groups;
  }

  /**
   * Get statistics about parsed transactions
   */
  static getTransactionStats(transactions: ParsedTransaction[]) {
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const debitCount = transactions.filter(t => t.type === 'debit').length;
    const creditCount = transactions.filter(t => t.type === 'credit').length;
    const debitAmount = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    const creditAmount = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalAmount,
      debitCount,
      creditCount,
      debitAmount,
      creditAmount,
      transactionCount: transactions.length,
    };
  }

  /**
   * Get sample SMS for testing
   */
  static getSampleSMS(): string[] {
    return [
      "HDFC Bank: Rs.1,250.00 debited from A/c **1234 on 21-12-2024 at SWIGGY BANGALORE. Avl bal Rs.45,678.90",
      "SBI: INR 4,500.00 withdrawn from ATM on 20/12/2024. Available balance is Rs.32,100.50",
      "ICICI Bank: Rs.899.00 paid to AMAZON INDIA via UPI. Thank you for banking with us.",
      "Axis Bank: Rs.2,300.00 credited to your account **5678 on 19-12-2024. Avl bal Rs.78,900.00",
      "Paytm Payments Bank: Rs.500.00 debited for mobile recharge on 18-12-2024. Balance Rs.2,450.00",
      "Kotak Mahindra Bank: Rs.1,899.00 spent on Flipkart using Credit Card on 17-12-2024. Avl bal Rs.12,345.67",
      "Dear UPI user A/C X0084 debited by 30 on date 07Jan26 trf to VAJA KAVISHA KET Refno 953014541626 If not u? call-1800111109 for other services-18001234-SBI",
    ];
  }
}