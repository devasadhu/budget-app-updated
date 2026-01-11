// src/services/csvParserService.ts
import Papa from 'papaparse';

export interface CSVTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  category?: string;
}

export interface BankCSVConfig {
  name: string;
  dateColumn: string | string[]; // Column name or possible names
  descriptionColumn: string | string[];
  amountColumn?: string | string[]; // Single amount column (optional)
  debitColumn?: string | string[]; // Or separate debit column
  creditColumn?: string | string[]; // And credit column
  balanceColumn?: string | string[];
  dateFormat?: string; // e.g., 'DD/MM/YYYY'
  skipRows?: number; // Rows to skip at start
}

// Common bank CSV configurations
const BANK_CONFIGS: BankCSVConfig[] = [
  {
    name: 'HDFC',
    dateColumn: ['Date', 'Transaction Date', 'Txn Date'],
    descriptionColumn: ['Narration', 'Description', 'Transaction Details'],
    debitColumn: ['Withdrawal Amt', 'Debit Amount', 'Debit'],
    creditColumn: ['Deposit Amt', 'Credit Amount', 'Credit'],
    balanceColumn: ['Balance', 'Closing Balance'],
    dateFormat: 'DD/MM/YYYY',
    skipRows: 0,
  },
  {
    name: 'SBI',
    dateColumn: ['Txn Date', 'Transaction Date', 'Date'],
    descriptionColumn: ['Description', 'Narration', 'Particulars'],
    debitColumn: ['Debit', 'Dr'],
    creditColumn: ['Credit', 'Cr'],
    balanceColumn: ['Balance'],
    dateFormat: 'DD MMM YYYY',
    skipRows: 1,
  },
  {
    name: 'ICICI',
    dateColumn: ['Transaction Date', 'Date', 'Value Date'],
    descriptionColumn: ['Transaction Remarks', 'Description', 'Narration'],
    debitColumn: ['Withdrawal Amount (INR)', 'Debit'],
    creditColumn: ['Deposit Amount (INR)', 'Credit'],
    balanceColumn: ['Balance (INR)', 'Balance'],
    dateFormat: 'DD/MM/YYYY',
    skipRows: 0,
  },
  {
    name: 'Axis',
    dateColumn: ['Tran Date', 'Transaction Date', 'Date'],
    descriptionColumn: ['Particulars', 'Description', 'Narration'],
    debitColumn: ['Debit', 'Dr Amount'],
    creditColumn: ['Credit', 'Cr Amount'],
    balanceColumn: ['Balance'],
    dateFormat: 'DD-MM-YYYY',
    skipRows: 0,
  },
  {
    name: 'Kotak',
    dateColumn: ['Transaction Date', 'Date'],
    descriptionColumn: ['Description', 'Transaction Remarks'],
    debitColumn: ['Debit'],
    creditColumn: ['Credit'],
    balanceColumn: ['Balance'],
    dateFormat: 'DD/MM/YYYY',
    skipRows: 0,
  },
];

export class CSVParserService {
  /**
   * Parse CSV file content to transactions
   */
  static async parseCSV(
    csvContent: string,
    bankName?: string
  ): Promise<CSVTransaction[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const config = bankName
              ? this.findBankConfig(bankName)
              : this.detectBankConfig(results.data[0]);

            if (!config) {
              reject(new Error('Could not detect bank format'));
              return;
            }

            const transactions = this.processRows(
              results.data,
              config
            );
            resolve(transactions);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Find bank configuration by name
   */
  private static findBankConfig(bankName: string): BankCSVConfig | null {
    return (
      BANK_CONFIGS.find((config) =>
        config.name.toLowerCase().includes(bankName.toLowerCase())
      ) || null
    );
  }

  /**
   * Auto-detect bank format from CSV headers
   */
  private static detectBankConfig(sampleRow: any): BankCSVConfig | null {
    const headers = Object.keys(sampleRow).map((h) => h.toLowerCase());

    for (const config of BANK_CONFIGS) {
      const hasDateColumn = this.findMatchingColumn(
        headers,
        config.dateColumn
      );
      const hasDescColumn = this.findMatchingColumn(
        headers,
        config.descriptionColumn
      );

      if (hasDateColumn && hasDescColumn) {
        return config;
      }
    }

    // Fallback: generic config
    return this.createGenericConfig(Object.keys(sampleRow));
  }

  /**
   * Find matching column name from possibilities
   */
  private static findMatchingColumn(
    headers: string[],
    possibleNames: string | string[]
  ): string | null {
    const names = Array.isArray(possibleNames)
      ? possibleNames
      : [possibleNames];

    for (const name of names) {
      const found = headers.find((h) =>
        h.toLowerCase().includes(name.toLowerCase())
      );
      if (found) return found;
    }

    return null;
  }

  /**
   * Create generic CSV config when bank not recognized
   */
  private static createGenericConfig(headers: string[]): BankCSVConfig {
    return {
      name: 'Generic',
      dateColumn: headers.filter((h) =>
        /date|txn|transaction/i.test(h)
      )[0] || headers[0],
      descriptionColumn: headers.filter((h) =>
        /desc|narration|particular|remark/i.test(h)
      )[0] || headers[1],
      debitColumn: headers.filter((h) => /debit|withdrawal|dr/i.test(h))[0],
      creditColumn: headers.filter((h) => /credit|deposit|cr/i.test(h))[0],
      balanceColumn: headers.filter((h) => /balance/i.test(h))[0],
    };
  }

  /**
   * Process CSV rows into transactions
   */
  private static processRows(
    rows: any[],
    config: BankCSVConfig
  ): CSVTransaction[] {
    const transactions: CSVTransaction[] = [];

    // Skip header rows if configured
    const startIndex = config.skipRows || 0;
    const dataRows = rows.slice(startIndex);

    for (const row of dataRows) {
      const transaction = this.parseRow(row, config);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  /**
   * Parse a single CSV row
   */
  private static parseRow(
    row: any,
    config: BankCSVConfig
  ): CSVTransaction | null {
    try {
      // Extract date
      const dateStr = this.getColumnValue(row, config.dateColumn);
      if (!dateStr) return null;
      const date = this.parseDate(dateStr, config.dateFormat);
      if (!date) return null;

      // Extract description
      const description = this.getColumnValue(row, config.descriptionColumn) || 'Unknown';

      // Extract amount and type
      let amount = 0;
      let type: 'debit' | 'credit' = 'debit';

      if (config.debitColumn && config.creditColumn) {
        // Separate debit/credit columns
        const debitStr = this.getColumnValue(row, config.debitColumn);
        const creditStr = this.getColumnValue(row, config.creditColumn);

        if (debitStr && this.parseAmount(debitStr) > 0) {
          amount = this.parseAmount(debitStr);
          type = 'debit';
        } else if (creditStr && this.parseAmount(creditStr) > 0) {
          amount = this.parseAmount(creditStr);
          type = 'credit';
        } else {
          return null; // No valid amount
        }
      } else if (config.amountColumn) {
        // Single amount column
        const amountStr = this.getColumnValue(row, config.amountColumn);
        if (!amountStr) return null;

        amount = Math.abs(this.parseAmount(amountStr));
        // Determine type from sign or description
        type = amountStr.includes('-') || description.toLowerCase().includes('debit')
          ? 'debit'
          : 'credit';
      }

      // Extract balance (optional)
      const balanceStr = config.balanceColumn
        ? this.getColumnValue(row, config.balanceColumn)
        : null;
      const balance = balanceStr ? this.parseAmount(balanceStr) : undefined;

      return {
        date,
        description,
        amount,
        type,
        balance,
      };
    } catch (error) {
      console.error('Error parsing row:', error);
      return null;
    }
  }

  /**
   * Get column value from row
   */
  private static getColumnValue(
    row: any,
    columnNames: string | string[]
  ): string | null {
    const names = Array.isArray(columnNames) ? columnNames : [columnNames];

    for (const name of names) {
      // Try exact match first
      if (row[name]) return String(row[name]).trim();

      // Try case-insensitive match
      const key = Object.keys(row).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      if (key && row[key]) return String(row[key]).trim();
    }

    return null;
  }

  /**
   * Parse amount string to number
   */
  private static parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // Remove currency symbols, commas, and extra spaces
    const cleaned = amountStr
      .replace(/[^\d.,-]/g, '')
      .replace(/,/g, '')
      .trim();

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : Math.abs(amount);
  }

  /**
   * Parse date string to Date object
   */
  private static parseDate(
    dateStr: string,
    format?: string
  ): Date | null {
    try {
      // Common date formats
      const formats = [
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\s+([A-Za-z]+)\s+(\d{4})/, // DD MMM YYYY
      ];

      for (const regex of formats) {
        const match = dateStr.match(regex);
        if (match) {
          if (match[0].includes('-') && match[1].length === 4) {
            // YYYY-MM-DD
            return new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3])
            );
          } else if (match[2] && /[A-Za-z]/.test(match[2])) {
            // DD MMM YYYY
            const monthMap: { [key: string]: number } = {
              jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
              jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
            };
            const month = monthMap[match[2].toLowerCase().slice(0, 3)];
            return new Date(parseInt(match[3]), month, parseInt(match[1]));
          } else {
            // DD/MM/YYYY or DD-MM-YYYY
            return new Date(
              parseInt(match[3]),
              parseInt(match[2]) - 1,
              parseInt(match[1])
            );
          }
        }
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }
    return null;
  }

  /**
   * Validate CSV content
   */
  static validateCSV(csvContent: string): {
    valid: boolean;
    error?: string;
    rowCount?: number;
  } {
    try {
      const result = Papa.parse(csvContent, { header: true });

      if (result.errors.length > 0) {
        return {
          valid: false,
          error: result.errors[0].message,
        };
      }

      if (result.data.length === 0) {
        return {
          valid: false,
          error: 'CSV file is empty',
        };
      }

      return {
        valid: true,
        rowCount: result.data.length,
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid CSV format',
      };
    }
  }
}

// Example usage:
/*
const csvContent = `Transaction Date,Description,Debit,Credit,Balance
21/12/2024,SWIGGY BANGALORE,1250.00,,45000.00
20/12/2024,SALARY CREDIT,,50000.00,46250.00`;

const transactions = await CSVParserService.parseCSV(csvContent, 'HDFC');
console.log(transactions);
*/