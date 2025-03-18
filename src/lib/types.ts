import { z } from 'zod';

export const AccountClassificationSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  tertiary: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

export const FinancialEntrySchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.number().default(0),
  credit: z.number().default(0),
  classification: AccountClassificationSchema,
  sourceTable: z.string(),
  rowIndex: z.number()
});

export const DetectedTableSchema = z.object({
  name: z.string(),
  sheetName: z.string(),
  range: z.string(),
  headers: z.array(z.string()),
  rowCount: z.number(),
  confidence: z.number().min(0).max(1),
  type: z.enum(['TRIAL_BALANCE', 'BALANCE_SHEET', 'INCOME_STATEMENT', 'UNKNOWN'])
});

export const ProcessingLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['INFO', 'WARNING', 'ERROR']),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});

export const ClassificationResultSchema = z.object({
  classification: AccountClassificationSchema,
  matchedTerms: z.array(z.string())
});

export const UnmatchedEntrySchema = z.object({
  accountCode: z.string(),
  accountName: z.string(),
  possibleClassifications: z.array(AccountClassificationSchema),
  reason: z.string()
});

export const TotalSummarySchema = z.object({
  name: z.string(),
  amount: z.number(),
  type: z.enum(['DEBIT', 'CREDIT']),
  category: z.string()
});

export const TrialBalanceSchema = z.object({
  entries: z.array(FinancialEntrySchema),
  totalDebits: z.number(),
  totalCredits: z.number(),
  isBalanced: z.boolean(),
  detectedTables: z.array(DetectedTableSchema),
  processingLogs: z.array(ProcessingLogSchema),
  uncertainClassifications: z.array(z.object({
    entry: FinancialEntrySchema,
    possibleClassifications: z.array(AccountClassificationSchema)
  })),
  unmatchedEntries: z.array(UnmatchedEntrySchema),
  totalsSummary: z.array(TotalSummarySchema)
});

export type AccountClassification = z.infer<typeof AccountClassificationSchema>;
export type FinancialEntry = z.infer<typeof FinancialEntrySchema>;
export type DetectedTable = z.infer<typeof DetectedTableSchema>;
export type ProcessingLog = z.infer<typeof ProcessingLogSchema>;
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;
export type UnmatchedEntry = z.infer<typeof UnmatchedEntrySchema>;
export type TotalSummary = z.infer<typeof TotalSummarySchema>;
export type TrialBalance = z.infer<typeof TrialBalanceSchema>;