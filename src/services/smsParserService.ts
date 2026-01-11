// src/services/smsParserService.ts
import { Timestamp } from 'firebase/firestore';

export interface ParsedTransaction {
  amount: number;
  type: 'debit' | 'credit';
  merchant?: string;
  date: Date;
  description: string;
  category?: string;
  rawText: string;
}

export interface BankPattern {
  name: string;
  patterns: RegExp[];
  amountPattern: RegExp;
  merchantPattern?: RegExp;
  datePattern?: RegExp;
}

// Bank-specific SMS patterns
const BANK_PATTERNS: BankPattern[] = [
  {
    name: 'HDFC',
    patterns: [/HDFC/i, /HDFCBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
  },
  {
    name: 'SBI',
    patterns: [/SBI/i, /State Bank/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
  },
  {
    name: 'ICICI',
    patterns: [/ICICI/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
  },
  {
    name: 'Axis',
    patterns: [/AXIS/i, /AXISBANK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
  },
  {
    name: 'Kotak',
    patterns: [/KOTAK/i],
    amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    merchantPattern: /(?:at|to)\s+([A-Z][A-Z0-9\s&'-]+?)(?:\s+on|\s+dated|\.|$)/i,
    datePattern: /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
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
  ],
  creditKeywords: ['credited', 'received', 'deposited', 'refund', 'cashback'],
  amountPattern: /(?:Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
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

      return {
        amount,
        type,
        merchant,
        date,
        description: this.cleanDescription(smsText),
        rawText: smsText,
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
    const pattern = bank?.amountPattern || GENERIC_PATTERNS.amountPattern;
    const match = smsText.match(pattern);

    if (match && match[1]) {
      // Remove commas and parse
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      return isNaN(amount) ? null : amount;
    }

    return null;
  }

  /**
   * Detect if transaction is debit or credit
   */
  private static detectTransactionType(
    smsText: string
  ): 'debit' | 'credit' {
    const lowerText = smsText.toLowerCase();

    // Check for credit keywords
    const hasCredit = GENERIC_PATTERNS.creditKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    // Check for debit keywords
    const hasDebit = GENERIC_PATTERNS.debitKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    // Default to debit if unclear (most common case)
    return hasCredit && !hasDebit ? 'credit' : 'debit';
  }

  /**
   * Extract merchant/payee name
   */
  private static extractMerchant(
    smsText: string,
    bank: BankPattern | null
  ): string | undefined {
    if (bank?.merchantPattern) {
      const match = smsText.match(bank.merchantPattern);
      if (match && match[1]) {
        return this.cleanMerchantName(match[1]);
      }
    }

    // Generic merchant extraction
    const genericPattern = /(?:at|to|from)\s+([A-Z][A-Z0-9\s&'-]{2,30})/i;
    const match = smsText.match(genericPattern);
    if (match && match[1]) {
      return this.cleanMerchantName(match[1]);
    }

    return undefined;
  }

  /**
   * Clean and format merchant name
   */
  private static cleanMerchantName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9\s&'-]/g, '')
      .slice(0, 50);
  }

  /**
   * Extract transaction date
   */
  private static extractDate(
    smsText: string,
    bank: BankPattern | null
  ): Date | null {
    if (bank?.datePattern) {
      const match = smsText.match(bank.datePattern);
      if (match && match[1]) {
        return this.parseDate(match[1]);
      }
    }

    // Generic date pattern
    const genericPattern = /(\d{2}[-\/]\d{2}[-\/]\d{2,4})/;
    const match = smsText.match(genericPattern);
    if (match && match[1]) {
      return this.parseDate(match[1]);
    }

    return null;
  }

  /**
   * Parse date string to Date object
   */
  private static parseDate(dateStr: string): Date | null {
    try {
      // Handle DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        let [day, month, year] = parts.map(Number);

        // Handle 2-digit year
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }

        return new Date(year, month - 1, day);
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return null;
  }

  /**
   * Clean SMS description
   */
  private static cleanDescription(smsText: string): string {
    // Remove bank name prefixes
    let cleaned = smsText.replace(/^[A-Z]+:\s*/i, '');

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned.slice(0, 200); // Limit length
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
    ].some((keyword) => lowerText.includes(keyword));

    // Check for amount pattern
    const hasAmount = GENERIC_PATTERNS.amountPattern.test(smsText);

    return (hasBankKeyword || hasTransactionKeyword) && hasAmount;
  }
}

// Example usage:
/*
const sms = "HDFC Bank: Rs.1,250.00 debited from A/c **1234 on 21-12-2024 at SWIGGY BANGALORE";
const transaction = SMSParserService.parseSMS(sms);
console.log(transaction);
// Output: {
//   amount: 1250,
//   type: 'debit',
//   merchant: 'SWIGGY BANGALORE',
//   date: Date(2024-12-21),
//   description: 'Rs.1,250.00 debited from A/c **1234 on 21-12-2024 at SWIGGY BANGALORE'
// }
*/