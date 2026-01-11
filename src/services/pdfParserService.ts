import { File, Paths } from 'expo-file-system';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  confidence: number;
}

export interface PDFParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  bankName?: string;
  accountNumber?: string;
  statementPeriod?: string;
  error?: string;
  parseMethod: 'pdf-text' | 'ocr';
  processingTime: number;
}

class PDFParserService {
  private readonly OCR_API_KEY = 'K87899142388957';
  private readonly OCR_API_URL = 'https://api.ocr.space/parse/image';

  async parseBankStatement(
    pdfUri: string,
    onProgress?: (message: string) => void
  ): Promise<PDFParseResult> {
    const startTime = Date.now();

    try {
      if (onProgress) onProgress('📁 Accessing file...');
      
      console.log('📄 Source PDF URI:', pdfUri);
      
      // Create source file from the provided URI
      const sourceFile = new File(pdfUri);
      
      if (!sourceFile.exists) {
        throw new Error('Source PDF file does not exist');
      }

      // Create temp file in cache directory
      const tempFileName = `temp_statement_${Date.now()}.pdf`;
      const tempFile = new File(Paths.cache, tempFileName);
      
      console.log('📄 Temp file path:', tempFile.uri);

      // Copy file to cache
      await sourceFile.copy(tempFile);
      console.log('✅ File copied successfully');

      let extractedText = '';
      let parseMethod: 'pdf-text' | 'ocr' = 'pdf-text';

      // STEP 1: Try PDF text extraction first
      try {
        if (onProgress) onProgress('📖 Attempting text extraction...');
        console.log('📖 Trying PDF text extraction...');
        
        extractedText = await this.extractTextFromPDF(tempFile);
        
        if (extractedText && extractedText.trim().length > 100) {
          console.log('✅ PDF text extraction successful, length:', extractedText.length);
          parseMethod = 'pdf-text';
        } else {
          throw new Error('Insufficient text extracted from PDF');
        }
      } catch (pdfError) {
        console.log('⚠️ PDF text extraction failed:', pdfError);
        
        // STEP 2: Fallback to OCR
        if (onProgress) onProgress('⚙️ Processing, Please wait...');
        console.log('🔄 Falling back to OCR...');
        
        const base64Data = await tempFile.base64();
        console.log('📄 File read as base64, length:', base64Data.length);
        
        extractedText = await this.performOCR(base64Data);
        parseMethod = 'ocr';
        console.log('✅ OCR successful');
      }

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('Could not extract sufficient text from PDF');
      }

      if (onProgress) onProgress('📊 Filtering transactions...');
      const transactions = this.parseTransactions(extractedText, parseMethod);

      // Cleanup temp file
      try {
        await tempFile.delete();
      } catch (e) {
        console.log('⚠️ Could not delete temp file:', e);
      }

      return {
        success: true,
        transactions,
        bankName: this.detectBankName(extractedText),
        parseMethod,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('❌ PDF parse failed:', error);
      return {
        success: false,
        transactions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        parseMethod: 'ocr',
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    // Since pdf-lib doesn't support text extraction well,
    // and pdfjs-dist is complex to set up in React Native,
    // we'll just throw an error to trigger OCR fallback
    // You can implement proper PDF text extraction later if needed
    throw new Error('PDF text extraction not yet implemented - using OCR');
  }

  private async performOCR(base64Data: string): Promise<string> {
    try {
      const formData = new FormData();
      
      formData.append('base64Image', `data:application/pdf;base64,${base64Data}`);
      formData.append('apikey', this.OCR_API_KEY);
      formData.append('OCREngine', '2');
      formData.append('isTable', 'true');

      console.log('🌐 Sending OCR request...');

      // DON'T set Content-Type header - let the browser/fetch set it automatically for FormData
      const response = await fetch(this.OCR_API_URL, {
        method: 'POST',
        body: formData,
      });

      console.log('✅ OCR response received, status:', response.status);

      const result = await response.json();

      if (result.OCRExitCode === 1 && result.ParsedResults?.[0]?.ParsedText) {
        return result.ParsedResults[0].ParsedText;
      }
      
      throw new Error(result.ErrorMessage?.[0] || 'OCR failed');
    } catch (error) {
      console.error('❌ OCR error:', error);
      throw error;
    }
  }

  private detectBankName(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hdfc')) return 'HDFC Bank';
    if (lowerText.includes('icici')) return 'ICICI Bank';
    if (lowerText.includes('sbi') || lowerText.includes('state bank')) return 'State Bank of India';
    if (lowerText.includes('axis')) return 'Axis Bank';
    if (lowerText.includes('kotak')) return 'Kotak Mahindra Bank';
    if (lowerText.includes('punjab national')) return 'Punjab National Bank';
    if (lowerText.includes('canara')) return 'Canara Bank';
    if (lowerText.includes('bank of baroda')) return 'Bank of Baroda';
    if (lowerText.includes('union bank')) return 'Union Bank of India';
    if (lowerText.includes('idbi')) return 'IDBI Bank';
    
    return 'Detected Bank';
  }

  private parseTransactions(text: string, method: 'pdf-text' | 'ocr'): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const dateMatch = line.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/);
      const numberMatches = line.match(/[\d,]+\.\d{2}/g);

      if (dateMatch && numberMatches && numberMatches.length >= 2) {
        const balanceValue = this.parseAmount(numberMatches[numberMatches.length - 1]);
        const amountCandidate = this.parseAmount(numberMatches[numberMatches.length - 2]);
        const firstValue = numberMatches.length >= 3 ? this.parseAmount(numberMatches[0]) : 0;

        let finalAmount = amountCandidate;
        let type: 'debit' | 'credit' = 'debit';

        if (numberMatches.length >= 3) {
          if (amountCandidate > 0) {
            finalAmount = amountCandidate;
            type = 'credit';
          } else {
            finalAmount = firstValue;
            type = 'debit';
          }
        } else {
          finalAmount = amountCandidate;
          type = this.guessType(line);
        }

        const description = line
          .replace(dateMatch[0], '')
          .replace(/[\d,]+\.\d{2}/g, '')
          .trim();

        if (finalAmount > 0 && finalAmount !== balanceValue && finalAmount < 1000000) {
          transactions.push({
            date: this.cleanDate(dateMatch[1]),
            description: description || 'Bank Transaction',
            amount: finalAmount,
            type,
            category: this.guessCategory(description),
            confidence: method === 'pdf-text' ? 0.98 : 0.95,
          });
        }
      }
    }
    
    console.log(`📊 Parsed ${transactions.length} transactions using ${method}`);
    return transactions;
  }

  private parseAmount(amt: string): number {
    return parseFloat(amt.replace(/[^\d.]/g, '')) || 0;
  }

  private cleanDate(dateStr: string): Date {
    const parts = dateStr.split(/[\/\-]/);
    let day = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day);
  }

  private guessType(line: string): 'debit' | 'credit' {
    const l = line.toLowerCase();
    if (l.includes('credit') || l.includes('cr') || l.includes('refund') || l.includes('salary')) {
      return 'credit';
    }
    return 'debit';
  }

  private guessCategory(desc: string): string {
    const d = desc.toLowerCase();
    if (d.match(/swiggy|zomato|food|dine/)) return 'Food & Dining';
    if (d.match(/uber|ola|fuel|petrol/)) return 'Transportation';
    if (d.match(/amazon|flipkart|shop/)) return 'Shopping';
    if (d.match(/bill|recharge/)) return 'Bills & Utilities';
    return 'Other';
  }
}

export const pdfParserService = new PDFParserService();