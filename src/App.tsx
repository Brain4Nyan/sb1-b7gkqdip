import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Toaster } from 'react-hot-toast';
import type { TrialBalance } from './lib/types';
import { FileText, AlertCircle, Info, Download } from 'lucide-react';
import { exportToExcel } from './lib/exportUtils';

function App() {
  const [processedData, setProcessedData] = useState<TrialBalance | null>(null);

  const handleDataProcessed = (data: TrialBalance) => {
    setProcessedData(data);
  };

  const handleDownload = () => {
    if (processedData) {
      exportToExcel(processedData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Financial Data Processor</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-8">
          <FileUploader onDataProcessed={handleDataProcessed} />

          {processedData && (
            <div className="w-full max-w-4xl space-y-6">
              {/* Download Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Download Results
                </button>
              </div>

              {/* Detected Tables */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Financial Tables</h3>
                <div className="space-y-4">
                  {processedData.detectedTables.map((table, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{table.name}</h4>
                        <span className="text-sm text-gray-500">
                          Confidence: {Math.round(table.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {table.rowCount} rows • {table.headers.length} columns
                      </p>
                      <div className="mt-2 text-xs text-gray-400">
                        Headers: {table.headers.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trial Balance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Debits</p>
                    <p className="text-xl font-semibold">${processedData.totalDebits.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Credits</p>
                    <p className="text-xl font-semibold">${processedData.totalCredits.toLocaleString()}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${processedData.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-2">
                      {!processedData.isBalanced && <AlertCircle className="h-5 w-5 text-red-500" />}
                      <p className={`text-sm ${processedData.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {processedData.isBalanced ? 'Balanced' : 'Not Balanced'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals Summary */}
              {processedData.totalsSummary.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Totals</h3>
                  <div className="space-y-4">
                    {Object.entries(
                      processedData.totalsSummary.reduce((acc, total) => {
                        if (!acc[total.category]) acc[total.category] = [];
                        acc[total.category].push(total);
                        return acc;
                      }, {} as Record<string, typeof processedData.totalsSummary>)
                    ).map(([category, totals]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-gray-700">{category}</h4>
                        <div className="space-y-1">
                          {totals.map((total, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded"
                            >
                              <span className="text-gray-600">{total.name}</span>
                              <span className={`font-medium ${
                                total.type === 'DEBIT' ? 'text-blue-600' : 'text-green-600'
                              }`}>
                                ${total.amount.toLocaleString()}
                                <span className="text-xs ml-1 text-gray-500">
                                  ({total.type})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uncertain Classifications */}
              {processedData.uncertainClassifications.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Classifications Needing Review</h3>
                  <div className="space-y-4">
                    {processedData.uncertainClassifications.map((item, index) => (
                      <div key={index} className="p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-yellow-500 mt-1" />
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {item.entry.accountCode} - {item.entry.accountName}
                            </h4>
                            <div className="mt-2 space-y-2">
                              {item.possibleClassifications.map((classification, cIndex) => (
                                <div key={cIndex} className="text-sm">
                                  <div className="text-gray-700">
                                    {classification.primary} → {classification.secondary} → {classification.tertiary}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    Confidence: {Math.round(classification.confidence * 100)}% • 
                                    Reasoning: {classification.reasoning}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Logs */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Processing Logs</h3>
                </div>
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {processedData.processingLogs.map((log, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${
                            log.level === 'ERROR' ? 'bg-red-50' :
                            log.level === 'WARNING' ? 'bg-yellow-50' : ''
                          }`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                                log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {log.level}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {log.message}
                              {log.details && (
                                <pre className="mt-1 text-xs text-gray-500">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Detailed Entries</h3>
                </div>
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classification</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {processedData.entries.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.accountCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {entry.accountName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-col">
                                <span className="text-gray-900">{entry.classification.primary}</span>
                                <span className="text-gray-500 text-xs">
                                  {entry.classification.secondary} → {entry.classification.tertiary}
                                </span>
                                <span className="text-gray-400 text-xs">
                                  Confidence: {Math.round(entry.classification.confidence * 100)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;