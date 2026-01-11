// SmartBudget/src/services/receiptScannerService.ts
// 📸 RECEIPT SCANNER - Enhanced & Versatile (All Receipt Types)

export interface LineItem {
  name: string;
  amount: number;
  tax: number;
  taxRate: number;
  totalAmount: number;
  category: string;
}

export interface ReceiptData {
  merchant: string;
  date: Date;
  lineItems: LineItem[];
  totalAmount: number;
  confidence: number;
  rawText?: string;
}

export interface ScanResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
}

class ReceiptScannerService {
  private readonly OCR_API_KEY = 'K87899142388957';
  private readonly OCR_API_URL = 'https://api.ocr.space/parse/image';

  async scanReceipt(imageUri: string): Promise<ScanResult> {
    console.log('📸 Starting receipt scan...');

    try {
      console.log('🔍 Running OCR...');
      const ocrText = await this.performOCRSpaceOCR(imageUri);

      if (!ocrText || ocrText.trim().length === 0) {
        return { success: false, error: 'No text found in image' };
      }

      console.log('📝 OCR completed');
      const receiptData = this.parseReceiptSimple(ocrText);

      return { success: true, data: receiptData };
    } catch (error) {
      console.error('❌ Receipt scan failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async performOCRSpaceOCR(imageUri: string): Promise<string> {
    try {
      const formData = new FormData();
      
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      } as any;
      
      formData.append('file', imageFile);
      formData.append('apikey', this.OCR_API_KEY);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      const response = await fetch(this.OCR_API_URL, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.OCRExitCode === 1 && result.ParsedResults?.[0]?.ParsedText) {
        return result.ParsedResults[0].ParsedText;
      }

      if (result.ErrorMessage) {
        throw new Error(result.ErrorMessage[0] || 'OCR failed');
      }

      throw new Error('No text detected in image');
    } catch (error) {
      console.error('❌ OCR failed:', error);
      throw new Error('OCR processing failed');
    }
  }

  private parseReceiptSimple(text: string): ReceiptData {
    console.log('🔍 Parsing receipt...');

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const merchant = this.extractMerchant(lines);
    const date = new Date();
    console.log(`📅 Using today's date: ${date.toLocaleDateString('en-GB')}`);

    const total = this.extractTotal(lines, text);
    const category = this.guessCategory(merchant, '');
    
    const lineItem: LineItem = {
      name: `${merchant} Receipt`,
      amount: total,
      tax: 0,
      taxRate: 0,
      totalAmount: total,
      category: category,
    };

    console.log('✅ Extracted receipt data:');
    console.log(`   Merchant: ${merchant}`);
    console.log(`   Date: ${date.toLocaleDateString('en-GB')}`);
    console.log(`   Total: ₹${total.toFixed(2)}`);

    return {
      merchant,
      date,
      lineItems: [lineItem],
      totalAmount: total,
      confidence: 90,
      rawText: text,
    };
  }

  /**
   * Enhanced total extraction with better heuristics
   */
  private extractTotal(lines: string[], fullText: string): number {
    let bestTotal = 0;
    const candidates: Array<{amount: number, score: number, source: string}> = [];

    console.log('🔍 Searching for total amount...');

    // Strategy 1: Look for explicit TOTAL keywords (prioritized by importance)
    const highPriorityKeywords = [
      'bill amount', 'total amount', 'amount payable', 'total payable', 
      'pay by date', 'amount due', 'net payable', 'total amount payable',
      'total bill', 'bill total', 'final amount', 'payment amount'
    ];
    
    const mediumPriorityKeywords = [
      'grand total', 'net amount', 'net total', 'total:', 'payable'
    ];
    
    const lowPriorityKeywords = [
      'total ', 'amount:', 'amount '
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      // Skip obvious non-prices
      if (this.isLikelyNotPrice(lineLower)) {
        continue;
      }

      // Check for total keywords with priority scoring
      let matchScore = 0;
      let matchedKeyword = '';
      
      // High priority keywords (200 points)
      for (const keyword of highPriorityKeywords) {
        if (lineLower.includes(keyword)) {
          matchScore = 200;
          matchedKeyword = keyword;
          break;
        }
      }
      
      // Medium priority keywords (120 points)
      if (matchScore === 0) {
        for (const keyword of mediumPriorityKeywords) {
          if (lineLower.includes(keyword)) {
            matchScore = 120;
            matchedKeyword = keyword;
            break;
          }
        }
      }
      
      // Low priority keywords (80 points)
      if (matchScore === 0) {
        for (const keyword of lowPriorityKeywords) {
          if (lineLower.includes(keyword)) {
            matchScore = 80;
            matchedKeyword = keyword;
            break;
          }
        }
      }

      // Extract amount from this line and surrounding context
      const searchText = [
        i > 0 ? lines[i-1] : '',
        line,
        i < lines.length - 1 ? lines[i+1] : '',
        i < lines.length - 2 ? lines[i+2] : ''
      ].join(' ');

      const amount = this.extractAmount(searchText);

      if (amount >= 10) {
        // Calculate score based on various factors
        let score = matchScore;
        
        // Boost for being in latter half of receipt
        if (i > lines.length / 2) score += 30;
        
        // Boost for being near the end
        if (i > lines.length * 0.75) score += 20;
        
        // Penalty for being too early (likely item price)
        if (i < lines.length * 0.3) score -= 40;
        
        // Big penalty for "subtotal" or "total units"
        if (lineLower.includes('subtotal') || lineLower.includes('total units') || 
            lineLower.includes('total consumption')) {
          score -= 100;
        }

        // Log all candidates
        if (matchScore > 0 || score > 20) {
          const sourceInfo = matchedKeyword ? 
            `keyword "${matchedKeyword}"` : 
            `line ${i} (score: ${score})`;
          
          console.log(`💰 Candidate: ₹${amount} - ${sourceInfo} - "${line.substring(0, 50)}"`);
          
          candidates.push({ amount, score, source: sourceInfo });
        }
      }
    }

    // Strategy 2: If no strong candidates, look for largest reasonable amount
    if (candidates.length === 0 || Math.max(...candidates.map(c => c.score)) < 100) {
      console.log('🔍 No strong keyword match found, analyzing all amounts...');
      
      const allAmounts: Array<{amount: number, line: number, text: string}> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();
        
        if (this.isLikelyNotPrice(lineLower)) {
          continue;
        }
        
        const amount = this.extractAmount(line);
        
        // Accept a wide range for utility bills
        if (amount >= 10 && amount <= 500000) {
          // Extra filtering for amounts that look suspicious
          let suspicious = false;
          
          // Skip if line contains year patterns (2015, 2014, etc.)
          if (/20[0-2]\d/.test(line)) {
            console.log(`⚠️  Skipping ₹${amount} - looks like a year in: "${line}"`);
            suspicious = true;
          }
          
          // Skip if next to letter-number codes (K92946, PE10764)
          if (/[A-Z]\d{4,}/.test(line)) {
            console.log(`⚠️  Skipping ₹${amount} - looks like an ID code: "${line}"`);
            suspicious = true;
          }
          
          if (!suspicious) {
            allAmounts.push({ amount, line: i, text: line });
            console.log(`💵 Found amount: ₹${amount} at line ${i}: "${line.substring(0, 40)}"`);
          }
        }
      }
      
      // If we found amounts, use intelligent selection
      if (allAmounts.length > 0) {
        // Sort by amount descending
        allAmounts.sort((a, b) => b.amount - a.amount);
        
        // Strategy: For utility bills, the largest amount is usually the bill total
        // especially if it's significantly larger than others
        const largest = allAmounts[0];
        const secondLargest = allAmounts.length > 1 ? allAmounts[1] : null;
        
        // If largest is at least 2x the second largest, it's likely the total
        if (!secondLargest || largest.amount >= secondLargest.amount * 1.5) {
          console.log(`💡 Largest amount (₹${largest.amount}) is significantly higher - likely the bill total`);
          candidates.push({
            amount: largest.amount,
            score: 150, // High score for being the clear winner
            source: `largest amount (line ${largest.line})`
          });
        } else {
          // Multiple similar large amounts - use position scoring
          for (const item of allAmounts.slice(0, 5)) { // Top 5 amounts
            let score = 30;
            
            // Prefer amounts in top 20% (header area for bills)
            if (item.line < lines.length * 0.2) score += 60;
            
            // Prefer amounts in latter half
            if (item.line > lines.length / 2) score += 40;
            
            // Prefer amounts near the end
            if (item.line > lines.length * 0.75) score += 30;
            
            candidates.push({
              amount: item.amount,
              score,
              source: `position-based (line ${item.line})`
            });
          }
        }
      }
    }

    // Select best candidate
    if (candidates.length > 0) {
      // Sort by score, then by amount (larger is better for ties)
      candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.amount - a.amount;
      });
      
      bestTotal = candidates[0].amount;
      console.log(`✅ Selected total: ₹${bestTotal} from ${candidates[0].source}`);
    }

    // Fallback
    if (bestTotal === 0) {
      console.log('⚠️ No valid total found, using ₹100 as default');
      bestTotal = 100;
    }

    return bestTotal;
  }

  private isLikelyNotPrice(line: string): boolean {
    const lower = line.toLowerCase();
    
    // Skip address-related content
    if (lower.includes('phone') || lower.includes('mobile') || 
        lower.includes('address') || lower.includes('street') ||
        lower.includes('road') || lower.includes('gstin') || 
        lower.includes('gst :') || lower.includes('bill no') || 
        lower.includes('invoice no') || lower.includes('consumer no') ||
        lower.includes('meter') || lower.includes('account') ||
        lower.includes('mrb') || lower.includes('page') ||
        lower.includes('serial')) {
      return true;
    }
    
    // Phone numbers
    if (/(\+91|0)?[6-9]\d{9}/.test(line)) return true;
    
    // Pincodes (exactly 6 digits)
    if (/^\d{6}$/.test(line.trim())) return true;
    
    // GSTIN
    if (/^[A-Z0-9]{15}$/.test(line.trim())) return true;
    
    // Account/consumer numbers (long digit sequences)
    if (/^\d{8,}$/.test(line.trim().replace(/[:\-\s]/g, ''))) return true;
    
    return false;
  }

  /**
   * Enhanced amount extraction
   */
  private extractAmount(line: string): number {
    // Remove currency symbols
    const cleaned = line.replace(/[₹\$€£₴]/g, '').replace(/rs\.?/gi, '');
    
    // Match various number formats - prioritize larger, more complete formats first
    const patterns = [
      /(\d{1,3}(?:,\d{3})+\.\d{1,2})/,        // With commas and decimals: 176,550.00
      /(\d{5,}\.\d{1,2})/,                     // Large with decimals: 176550.00
      /(\d{1,3}(?:,\d{3})+)/,                  // With commas: 176,550
      /(\d{4,})/,                              // Large numbers: 176550
      /(\d{1,3}\.\d{1,2})/,                    // Decimal amounts: 968.00
      /(\d{2,})/                               // Simple numbers: 968
    ];
    
    for (const pattern of patterns) {
      const matches = cleaned.match(pattern);
      if (matches) {
        const matchedStr = matches[0];
        const amountStr = matchedStr.replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        // Check if original match had decimals
        const hasDecimals = matchedStr.includes('.');
        
        // Filter out pincodes (100000-999999, whole numbers only, NO decimals)
        if (amount >= 100000 && amount <= 999999 && amount % 1 === 0 && !hasDecimals) {
          console.log(`⛔ Rejected ₹${amount} - likely pincode (6-digit whole number without decimals)`);
          continue;
        }
        
        // Filter out phone numbers (10-digit whole numbers, NO decimals)
        if (amount >= 1000000000 && amount <= 9999999999 && amount % 1 === 0 && !hasDecimals) {
          console.log(`⛔ Rejected ₹${amount} - likely phone number (10-digit whole number)`);
          continue;
        }
        
        if (amount >= 10 && amount <= 500000) {
          return amount;
        }
      }
    }
    
    return 0;
  }

  private extractMerchant(lines: string[]): string {
    if (lines.length === 0) return 'Unknown Merchant';

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      if (/^(bill|invoice|receipt|tax|gstin|phone|date)/i.test(line)) {
        continue;
      }
      
      const cleaned = line
        .replace(/bill/i, '')
        .replace(/invoice/i, '')
        .replace(/receipt/i, '')
        .trim();

      if (cleaned.length >= 3 && cleaned.length <= 50 && /[a-zA-Z]{3,}/.test(cleaned)) {
        console.log(`🏪 Found merchant: ${cleaned}`);
        return cleaned;
      }
    }

    return lines[0]?.trim() || 'Unknown Merchant';
  }

  private guessCategory(merchant: string, itemName: string): string {
    const lowerMerchant = merchant.toLowerCase();
    const lowerItem = itemName.toLowerCase();
    const combined = `${lowerMerchant} ${lowerItem}`;

    const categories = [
      {
        name: 'Bills & Utilities',
        keywords: [
          'electric', 'electricity', 'water', 'gas', 'municipal', 'council',
          'internet', 'broadband', 'mobile', 'recharge', 'airtel', 'jio', 
          'vodafone', 'bill', 'utility', 'power', 'bses', 'ndmc', 'tata power'
        ],
      },
      {
        name: 'Groceries',
        keywords: [
          'mart', 'grocery', 'supermarket', 'bazar', 'bigbasket',
          'departmental', 'provision', 'kirana', 'reliance fresh', 
          'more', 'dmart', 'sleek', 'vijay'
        ],
      },
      {
        name: 'Food & Dining',
        keywords: [
          'restaurant', 'cafe', 'coffee', 'hotel', 'food', 'swiggy', 'zomato',
          'domino', 'pizza', 'burger', 'kitchen', 'dhaba', 'biryani',
          'mcdonald', 'kfc', 'subway', 'starbucks',
        ],
      },
      {
        name: 'Shopping',
        keywords: [
          'amazon', 'flipkart', 'mall', 'store', 'shop', 'fashion',
          'clothing', 'electronics', 'myntra', 'ajio',
        ],
      },
      {
        name: 'Transportation',
        keywords: [
          'uber', 'ola', 'petrol', 'fuel', 'diesel', 'taxi',
          'transport', 'parking', 'metro', 'railway',
        ],
      },
      {
        name: 'Entertainment',
        keywords: [
          'cinema', 'pvr', 'inox', 'movie', 'netflix', 'spotify', 'prime',
        ],
      },
      {
        name: 'Health & Fitness',
        keywords: [
          'pharmacy', 'hospital', 'clinic', 'medical', 'doctor', 'medicine',
          'apollo', 'medplus', 'gym', 'fitness',
        ],
      },
      {
        name: 'Education',
        keywords: [
          'school', 'college', 'university', 'tuition', 'books', 'stationery',
        ],
      },
    ];

    for (const category of categories) {
      for (const keyword of category.keywords) {
        if (combined.includes(keyword)) {
          return category.name;
        }
      }
    }

    return 'Shopping';
  }
}

export const receiptScannerService = new ReceiptScannerService();