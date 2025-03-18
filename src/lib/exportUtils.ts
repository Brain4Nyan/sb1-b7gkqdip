import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';
import type { TrialBalance } from './types';

export function exportToExcel(data: TrialBalance) {
  const workbook = utils.book_new();

  // Create Trial Balance sheet
  const trialBalanceData = data.entries.map(entry => ({
    'Account Code': entry.accountCode,
    'Account Name': entry.accountName,
    'Classification': `${entry.classification.primary} > ${entry.classification.secondary} > ${entry.classification.tertiary}`,
    'Confidence': `${Math.round(entry.classification.confidence * 100)}%`,
    'Debit': entry.debit || '',
    'Credit': entry.credit || '',
  }));

  const trialBalanceSheet = utils.json_to_sheet(trialBalanceData);
  utils.book_append_sheet(workbook, trialBalanceSheet, 'Trial Balance');

  // Add totals row
  const totalRow = {
    'Account Code': '',
    'Account Name': 'TOTAL',
    'Classification': '',
    'Confidence': '',
    'Debit': data.totalDebits,
    'Credit': data.totalCredits,
  };
  utils.sheet_add_json(trialBalanceSheet, [totalRow], { skipHeader: true, origin: -1 });

  // Create Uncertain Classifications sheet
  if (data.uncertainClassifications.length > 0) {
    const uncertainData = data.uncertainClassifications.map(uc => ({
      'Account Code': uc.entry.accountCode,
      'Account Name': uc.entry.accountName,
      'Current Classification': `${uc.entry.classification.primary} > ${uc.entry.classification.secondary} > ${uc.entry.classification.tertiary}`,
      'Confidence': `${Math.round(uc.entry.classification.confidence * 100)}%`,
      'Alternative Classifications': uc.possibleClassifications
        .slice(1)
        .map(c => `${c.primary} > ${c.secondary} > ${c.tertiary} (${Math.round(c.confidence * 100)}%)`)
        .join('\n'),
    }));
    const uncertainSheet = utils.json_to_sheet(uncertainData);
    utils.book_append_sheet(workbook, uncertainSheet, 'Uncertain Classifications');
  }

  // Create Summary sheet
  if (data.totalsSummary.length > 0) {
    const summaryData = data.totalsSummary.map(summary => ({
      'Category': summary.category,
      'Name': summary.name,
      'Amount': summary.amount,
      'Type': summary.type,
    }));
    const summarySheet = utils.json_to_sheet(summaryData);
    utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }

  // Create Processing Logs sheet
  const logsData = data.processingLogs.map(log => ({
    'Timestamp': new Date(log.timestamp).toLocaleString(),
    'Level': log.level,
    'Message': log.message,
    'Details': log.details ? JSON.stringify(log.details) : '',
  }));
  const logsSheet = utils.json_to_sheet(logsData);
  utils.book_append_sheet(workbook, logsSheet, 'Processing Logs');

  // Generate Excel file
  const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `financial-analysis-${timestamp}.xlsx`;
  
  saveAs(blob, filename);
}