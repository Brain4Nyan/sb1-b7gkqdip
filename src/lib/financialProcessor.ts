import { read, utils, WorkSheet } from 'xlsx';
import { Decimal } from 'decimal.js';
import { findBestMatch } from 'string-similarity';
import type { 
  FinancialEntry, 
  TrialBalance, 
  AccountClassification,
  DetectedTable,
  ProcessingLog,
  ClassificationResult,
  UnmatchedEntry,
  TotalSummary
} from './types';
import { FINANCIAL_KEYWORDS } from './constants';
import type { FinancialLabel } from './jigsawApi';

// Enhanced classification mapping with more detailed patterns
const classificationMap: Record<string, AccountClassification> = {
  // Assets
  "1000": {
    primary: "Assets",
    secondary: "Current Assets",
    tertiary: "Cash and Cash Equivalents",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "1100": {
    primary: "Assets",
    secondary: "Current Assets",
    tertiary: "Accounts Receivable",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "1200": {
    primary: "Assets",
    secondary: "Current Assets",
    tertiary: "Inventory",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "1500": {
    primary: "Assets",
    secondary: "Non-Current Assets",
    tertiary: "Property, Plant and Equipment",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  
  // Liabilities
  "2000": {
    primary: "Liabilities",
    secondary: "Current Liabilities", 
    tertiary: "Accounts Payable",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "2100": {
    primary: "Liabilities",
    secondary: "Current Liabilities",
    tertiary: "Short-term Loans",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "2500": {
    primary: "Liabilities",
    secondary: "Non-Current Liabilities",
    tertiary: "Long-term Loans",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },

  // Equity
  "3000": {
    primary: "Equity",
    secondary: "Capital",
    tertiary: "Share Capital",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "3100": {
    primary: "Equity",
    secondary: "Retained Earnings",
    tertiary: "Accumulated Profits",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },

  // Revenue
  "4000": {
    primary: "Revenue",
    secondary: "Operating Revenue",
    tertiary: "Sales Revenue",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "4100": {
    primary: "Revenue",
    secondary: "Other Revenue",
    tertiary: "Interest Income",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },

  // Expenses
  "5000": {
    primary: "Expenses",
    secondary: "Operating Expenses",
    tertiary: "Cost of Sales",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "5100": {
    primary: "Expenses",
    secondary: "Operating Expenses",
    tertiary: "Employee Benefits",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  },
  "5200": {
    primary: "Expenses",
    secondary: "Operating Expenses",
    tertiary: "Office Expenses",
    confidence: 1,
    reasoning: "Direct match with standard chart of accounts"
  }
};

export class FinancialProcessor {
  private static readonly SIMILARITY_THRESHOLD = 0.6;
  private static readonly MIN_TABLE_ROWS = 2;
  private static readonly MIN_FINANCIAL_KEYWORDS = 2;
  private static processingLogs: ProcessingLog[] = [];
  private static processedEntries: Map<string, FinancialEntry> = new Map();
  private static unmatchedEntries: UnmatchedEntry[] = [];

  private static log(level: ProcessingLog['level'], message: string, details?: Record<string, unknown>) {
    const log: ProcessingLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    this.processingLogs.push(log);
    if (level === 'ERROR') {
      console.error(message, details);
    } else {
      console.log(message, details);
    }
  }

  private static findSimilarEntries(accountName: string): FinancialEntry[] {
    const similarEntries: FinancialEntry[] = [];
    const words = accountName.toLowerCase().split(' ');

    this.processedEntries.forEach(entry => {
      const entryWords = entry.accountName.toLowerCase().split(' ');
      const commonWords = words.filter(word => entryWords.includes(word));
      if (commonWords.length > 0) {
        similarEntries.push(entry);
      }
    });

    return similarEntries;
  }

  private static findSimilarAccountCode(accountCode: string): string | null {
    const codes = Object.keys(classificationMap);
    const { bestMatch } = findBestMatch(accountCode, codes);
    return bestMatch.rating >= this.SIMILARITY_THRESHOLD ? bestMatch.target : null;
  }

  private static classifyByKeywords(accountName: string): ClassificationResult[] {
    const results: ClassificationResult[] = [];
    const accountNameLower = accountName.toLowerCase();

    // Check for matches in each category
    Object.entries(FINANCIAL_KEYWORDS.HIERARCHICAL).forEach(([primary, secondaryGroups]) => {
      Object.entries(secondaryGroups).forEach(([secondary, tertiaryGroups]) => {
        Object.entries(tertiaryGroups).forEach(([tertiary, keywords]) => {
          if (Array.isArray(keywords)) {
            const matches = keywords.filter(keyword => accountNameLower.includes(keyword.toLowerCase()));
            if (matches.length > 0) {
              const confidence = matches.length / keywords.length;
              results.push({
                classification: {
                  primary,
                  secondary,
                  tertiary,
                  confidence: Math.min(0.8, confidence + 0.3),
                  reasoning: `Matched keywords: ${matches.join(', ')}`
                },
                matchedTerms: matches
              });
            }
          }
        });
      });
    });

    return results.sort((a, b) => b.classification.confidence - a.classification.confidence);
  }

  private static classifyAccount(accountCode: string, accountName: string): {
    classification: AccountClassification;
    alternatives: AccountClassification[];
  } {
    // First try exact match with account code
    if (classificationMap[accountCode]) {
      return {
        classification: classificationMap[accountCode],
        alternatives: []
      };
    }

    const alternatives: AccountClassification[] = [];
    let bestMatch: AccountClassification | null = null;
    let bestConfidence = 0;

    // Try fuzzy matching for account code
    const similarCode = this.findSimilarAccountCode(accountCode);
    if (similarCode && classificationMap[similarCode]) {
      const confidence = 0.7; // Lower confidence for fuzzy matches
      alternatives.push({
        ...classificationMap[similarCode],
        confidence,
        reasoning: `Similar to account code ${similarCode}`
      });
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = alternatives[alternatives.length - 1];
      }
    }

    // Try to find matches based on account code patterns
    Object.entries(classificationMap).forEach(([code, classification]) => {
      if (accountCode.startsWith(code.substring(0, 2))) {
        const confidence = 0.8;
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = {
            ...classification,
            confidence,
            reasoning: `Account code prefix matches standard classification ${code}`
          };
        }
        alternatives.push({
          ...classification,
          confidence,
          reasoning: `Account code prefix matches standard classification ${code}`
        });
      }
    });

    // Check for similar entries in already processed data
    const similarEntries = this.findSimilarEntries(accountName);
    if (similarEntries.length > 0) {
      const mostCommonClassification = similarEntries[0].classification;
      alternatives.push({
        ...mostCommonClassification,
        confidence: 0.7,
        reasoning: `Similar to previously classified entry: ${similarEntries[0].accountName}`
      });
    }

    // Try keyword-based classification
    const keywordResults = this.classifyByKeywords(accountName);
    keywordResults.forEach(result => {
      if (result.classification.confidence > bestConfidence) {
        bestConfidence = result.classification.confidence;
        bestMatch = result.classification;
      }
      alternatives.push(result.classification);
    });

    // If still no match found, return a low-confidence classification
    if (!bestMatch) {
      bestMatch = {
        primary: this.determineBasicCategory(accountName),
        secondary: "Needs Review",
        tertiary: "Unclassified",
        confidence: 0.3,
        reasoning: `Basic category determined from account name: ${accountName}`
      };

      // Add to unmatched entries for review
      this.unmatchedEntries.push({
        accountCode,
        accountName,
        possibleClassifications: alternatives,
        reason: "No confident match found"
      });
    }

    // Store the entry for future reference
    this.processedEntries.set(accountCode, {
      accountCode,
      accountName,
      debit: 0,
      credit: 0,
      classification: bestMatch,
      sourceTable: '',
      rowIndex: 0
    });

    return {
      classification: bestMatch,
      alternatives: alternatives
        .filter(alt => alt !== bestMatch)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3) // Return top 3 alternatives
    };
  }

  private static determineBasicCategory(accountName: string): string {
    const nameLower = accountName.toLowerCase();
    
    // Check against hierarchical structure
    for (const [category, patterns] of Object.entries(FINANCIAL_KEYWORDS.HIERARCHICAL)) {
      for (const [, subPatterns] of Object.entries(patterns)) {
        for (const keywords of Object.values(subPatterns)) {
          if (Array.isArray(keywords) && keywords.some(keyword => nameLower.includes(keyword.toLowerCase()))) {
            return category;
          }
        }
      }
    }

    // Fallback basic checks
    if (nameLower.includes('asset') || nameLower.includes('cash') || nameLower.includes('receivable')) {
      return 'Assets';
    }
    if (nameLower.includes('liabilit') || nameLower.includes('payable')) {
      return 'Liabilities';
    }
    if (nameLower.includes('revenue') || nameLower.includes('income') || nameLower.includes('sale')) {
      return 'Revenue';
    }
    if (nameLower.includes('expense') || nameLower.includes('cost')) {
      return 'Expenses';
    }
    if (nameLower.includes('capital') || nameLower.includes('equity') || nameLower.includes('earnings')) {
      return 'Equity';
    }
    
    return 'Uncategorized';
  }

  private static detectTables(workbook: WorkSheet, labels: FinancialLabel[]): DetectedTable[] {
    const tables: DetectedTable[] = [];
    const range = utils.decode_range(workbook['!ref'] || 'A1');
    
    // Use JigsawStack labels to enhance table detection
    const labelTypes = new Set(labels.map(l => l.type));
    const hasRequiredLabels = labelTypes.has('account_description') && 
                            labelTypes.has('debit') && 
                            labelTypes.has('credit');

    if (hasRequiredLabels) {
      this.log('INFO', 'Found required column labels via JigsawStack');
    }
    
    // Scan through all rows to find potential table headers
    for (let row = range.s.r; row <= range.e.r; row++) {
      const headerCells: string[] = [];
      let hasHeaders = false;
      let headerCount = 0;
      
      // Read potential header row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = utils.encode_cell({ r: row, c: col });
        const cell = workbook[cellAddress];
        
        if (cell && typeof cell.v === 'string') {
          headerCells.push(cell.v.toLowerCase());
          hasHeaders = true;
          headerCount++;
        }
      }

      // Check if we have enough headers and data rows
      if (hasHeaders && headerCount >= 2) {
        // Count data rows
        let dataRowCount = 0;
        for (let dataRow = row + 1; dataRow <= range.e.r; dataRow++) {
          let hasData = false;
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = utils.encode_cell({ r: dataRow, c: col });
            if (workbook[cellAddress]) {
              hasData = true;
              break;
            }
          }
          if (hasData) dataRowCount++;
        }

        if (dataRowCount >= this.MIN_TABLE_ROWS) {
          // Check for financial keywords in headers
          const financialKeywordCount = this.countFinancialKeywords(headerCells);
          
          // Boost confidence if JigsawStack found the required labels
          const confidenceBoost = hasRequiredLabels ? 0.2 : 0;
          
          if (financialKeywordCount >= this.MIN_FINANCIAL_KEYWORDS || hasRequiredLabels) {
            const tableType = this.determineTableType(headerCells);
            const tableName = this.generateTableName(tableType, tables.length);
            const tableRange = `${utils.encode_cell({ r: row, c: range.s.c })}:${utils.encode_cell({ r: row + dataRowCount, c: range.e.c })}`;
            
            tables.push({
              name: tableName,
              sheetName: workbook['!ref'] ? workbook['!ref'].split('!')[0] : 'Sheet1',
              range: tableRange,
              headers: headerCells,
              rowCount: dataRowCount,
              confidence: Math.min(1, this.calculateTableConfidence(headerCells, tableType) + confidenceBoost),
              type: tableType
            });

            this.log('INFO', `Detected table: ${tableName}`, {
              type: tableType,
              headers: headerCells,
              range: tableRange,
              rowCount: dataRowCount,
              jigsawLabelsFound: hasRequiredLabels
            });
          }
        }
      }
    }

    if (tables.length === 0) {
      // If no tables found, try a more lenient approach
      this.log('WARNING', 'No tables detected with strict criteria, attempting lenient detection');
      return this.detectTablesLenient(workbook, labels);
    }

    return tables;
  }

  private static detectTablesLenient(workbook: WorkSheet, labels: FinancialLabel[]): DetectedTable[] {
    const range = utils.decode_range(workbook['!ref'] || 'A1');
    const allData = utils.sheet_to_json(workbook, { header: 1 });
    
    // Use JigsawStack labels to help with lenient detection
    const labelTypes = new Set(labels.map(l => l.type));
    const hasRequiredLabels = labelTypes.has('account_description') && 
                            labelTypes.has('debit') && 
                            labelTypes.has('credit');
    
    // Look for any row with multiple cells that could be headers
    for (let row = 0; row < allData.length; row++) {
      const potentialHeaders = allData[row].filter(cell => cell && typeof cell === 'string');
      
      if (potentialHeaders.length >= 2 || hasRequiredLabels) {
        const headerCells = potentialHeaders.map(h => String(h).toLowerCase());
        const tableType = 'UNKNOWN';
        const tableName = `table_${row + 1}`;
        const dataRowCount = allData.length - row - 1;
        
        if (dataRowCount >= this.MIN_TABLE_ROWS) {
          const table: DetectedTable = {
            name: tableName,
            sheetName: workbook['!ref'] ? workbook['!ref'].split('!')[0] : 'Sheet1',
            range: `${utils.encode_cell({ r: row, c: range.s.c })}:${utils.encode_cell({ r: range.e.r, c: range.e.c })}`,
            headers: headerCells,
            rowCount: dataRowCount,
            confidence: hasRequiredLabels ? 0.7 : 0.5, // Higher confidence if JigsawStack found labels
            type: tableType
          };
          
          this.log('INFO', `Detected table with lenient criteria: ${tableName}`, {
            headers: headerCells,
            rowCount: dataRowCount,
            jigsawLabelsFound: hasRequiredLabels
          });
          
          return [table];
        }
      }
    }
    
    return [];
  }

  private static countFinancialKeywords(headers: string[]): number {
    const allKeywords = [
      ...FINANCIAL_KEYWORDS.TRIAL_BALANCE,
      ...FINANCIAL_KEYWORDS.BALANCE_SHEET,
      ...FINANCIAL_KEYWORDS.INCOME_STATEMENT
    ];
    
    return headers.reduce((count, header) => {
      return count + (allKeywords.some(keyword => header.includes(keyword)) ? 1 : 0);
    }, 0);
  }

  private static determineTableType(headers: string[]): DetectedTable['type'] {
    const headerStr = headers.join(' ');
    
    // Check for Trial Balance indicators
    if (FINANCIAL_KEYWORDS.TRIAL_BALANCE.some(keyword => headerStr.includes(keyword)) ||
        (headers.includes('debit') && headers.includes('credit'))) {
      return 'TRIAL_BALANCE';
    }
    
    // Check for Balance Sheet indicators
    if (FINANCIAL_KEYWORDS.BALANCE_SHEET.some(keyword => headerStr.includes(keyword)) ||
        (headers.includes('assets') && headers.includes('liabilities'))) {
      return 'BALANCE_SHEET';
    }
    
    // Check for Income Statement indicators
    if (FINANCIAL_KEYWORDS.INCOME_STATEMENT.some(keyword => headerStr.includes(keyword)) ||
        (headers.includes('revenue') && headers.includes('expenses'))) {
      return 'INCOME_STATEMENT';
    }

    return 'UNKNOWN';
  }

  private static generateTableName(type: DetectedTable['type'], index: number): string {
    return `${type.toLowerCase().replace('_', ' ')}_${index + 1}`;
  }

  private static calculateTableConfidence(headers: string[], type: DetectedTable['type']): number {
    let confidence = 0;
    const relevantKeywords = FINANCIAL_KEYWORDS[type] || [];
    
    // Check for essential financial columns
    if (headers.includes('debit') && headers.includes('credit')) confidence += 0.4;
    if (headers.includes('account') || headers.includes('description')) confidence += 0.3;
    
    // Check for keyword matches
    const keywordMatches = relevantKeywords.filter(keyword => 
      headers.some(header => header.includes(keyword))
    ).length;
    
    confidence += (keywordMatches / relevantKeywords.length) * 0.3;
    
    return Math.min(1, confidence);
  }

  private static isEmptyRow(row: any): boolean {
    return Object.values(row).every(value => 
      value === undefined || value === null || value === ''
    );
  }

  private static isHeaderRow(row: any): boolean {
    const headerKeywords = [
      'assets', 'liabilities', 'equity', 'revenue', 'expenses',
      'current', 'non-current', 'operating', 'financing'
    ];
    
    // Convert row values to string and check for header keywords
    const rowValues = Object.values(row).map(val => String(val).toLowerCase());
    return headerKeywords.some(keyword => 
      rowValues.some(value => value.includes(keyword))
    );
  }

  private static isTotalRow(row: any): boolean {
    const accountName = String(row.AccountName || '').toLowerCase();
    return accountName.includes('total') || accountName.startsWith('total');
  }

  private static extractTotalSummary(row: any): TotalSummary | null {
    if (!this.isTotalRow(row)) return null;

    const name = row.AccountName || '';
    const debit = new Decimal(row.Debit || 0);
    const credit = new Decimal(row.Credit || 0);
    
    // Determine category from the total name
    const nameLower = name.toLowerCase();
    let category = 'Other';
    if (nameLower.includes('asset')) category = 'Assets';
    else if (nameLower.includes('liabilit')) category = 'Liabilities';
    else if (nameLower.includes('equity')) category = 'Equity';
    else if (nameLower.includes('revenue')) category = 'Revenue';
    else if (nameLower.includes('expense')) category = 'Expenses';

    // Return the larger of debit or credit
    if (debit.greaterThan(credit)) {
      return {
        name,
        amount: debit.toNumber(),
        type: 'DEBIT',
        category
      };
    } else {
      return {
        name,
        amount: credit.toNumber(),
        type: 'CREDIT',
        category
      };
    }
  }

  static async processFile(file: File, jigsawLabels: FinancialLabel[]): Promise<TrialBalance> {
    this.processingLogs = [];
    this.processedEntries.clear();
    this.unmatchedEntries = [];
    this.log('INFO', 'Starting file processing', { fileName: file.name });

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const detectedTables = this.detectTables(worksheet, jigsawLabels);
    
    if (detectedTables.length === 0) {
      this.log('ERROR', 'No financial tables detected in the file');
      throw new Error('No financial tables detected in the file');
    }

    const rawData = utils.sheet_to_json(worksheet);
    if (rawData.length === 0) {
      this.log('ERROR', 'No data found in the worksheet');
      throw new Error('No data found in the worksheet');
    }

    const entries: FinancialEntry[] = [];
    const uncertainClassifications: TrialBalance['uncertainClassifications'] = [];
    const totalsSummary: TotalSummary[] = [];

    rawData.forEach((row: any, index) => {
      // Skip empty rows
      if (this.isEmptyRow(row)) {
        this.log('INFO', `Skipping empty row at index ${index}`);
        return;
      }

      // Skip header rows
      if (this.isHeaderRow(row)) {
        this.log('INFO', `Skipping header row at index ${index}`, { row });
        return;
      }

      // Handle total rows separately
      if (this.isTotalRow(row)) {
        const totalSummary = this.extractTotalSummary(row);
        if (totalSummary) {
          totalsSummary.push(totalSummary);
          this.log('INFO', `Extracted total summary: ${totalSummary.name}`, totalSummary);
        }
        return;
      }

      const accountCode = row.AccountCode?.toString() || '';
      const accountName = row.AccountName || '';
      
      const { classification, alternatives } = this.classifyAccount(accountCode, accountName);
      
      const debit = new Decimal(row.Debit || 0);
      const credit = new Decimal(row.Credit || 0);

      const entry: FinancialEntry = {
        accountCode,
        accountName,
        debit: debit.toNumber(),
        credit: credit.toNumber(),
        classification,
        sourceTable: detectedTables[0].name,
        rowIndex: index
      };

      entries.push(entry);

      if (classification.confidence < 0.8 || alternatives.length > 0) {
        uncertainClassifications.push({
          entry,
          possibleClassifications: [classification, ...alternatives]
        });
      }
    });

    const totalDebits = new Decimal(
      entries.reduce((sum, entry) => sum.plus(entry.debit), new Decimal(0))
    );
    
    const totalCredits = new Decimal(
      entries.reduce((sum, entry) => sum.plus(entry.credit), new Decimal(0))
    );

    const isBalanced = totalDebits.equals(totalCredits);
    if (!isBalanced) {
      this.log('WARNING', 'Trial balance is not balanced', {
        totalDebits: totalDebits.toString(),
        totalCredits: totalCredits.toString(),
        difference: totalDebits.minus(totalCredits).toString()
      });
    }

    // Sort totals summary by category and amount
    const sortedTotalsSummary = totalsSummary.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return b.amount - a.amount;
    });

    return {
      entries,
      totalDebits: totalDebits.toNumber(),
      totalCredits: totalCredits.toNumber(),
      isBalanced,
      detectedTables,
      processingLogs: this.processingLogs,
      uncertainClassifications,
      unmatchedEntries: this.unmatchedEntries,
      totalsSummary: sortedTotalsSummary
    };
  }
}