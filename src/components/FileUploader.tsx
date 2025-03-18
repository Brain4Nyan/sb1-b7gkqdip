import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FinancialProcessor } from '../lib/financialProcessor';
import type { TrialBalance } from '../lib/types';

interface FileUploaderProps {
  onDataProcessed: (data: TrialBalance) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel' // .xls
];

export function FileUploader({ onDataProcessed }: FileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit');
      toast.error('File size exceeds 10MB limit');
      return false;
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return false;
    }

    return true;
  };

  const processFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    setIsProcessing(true);
    setError(null);

    try {
      const trialBalance = await FinancialProcessor.processFile(file);
      
      // Show warnings for uncertain classifications
      if (trialBalance.uncertainClassifications.length > 0) {
        toast(`${trialBalance.uncertainClassifications.length} accounts need classification review`, {
          icon: '⚠️',
          duration: 5000
        });
      }

      // Show warning for unmatched entries
      if (trialBalance.unmatchedEntries.length > 0) {
        toast(`${trialBalance.unmatchedEntries.length} entries could not be confidently classified`, {
          icon: '❓',
          duration: 5000
        });
      }
      
      // Show warning for unbalanced trial balance
      if (!trialBalance.isBalanced) {
        toast.error('Warning: Trial balance is not balanced!');
      }
      
      onDataProcessed(trialBalance);
      toast.success('File processed successfully!');
    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error processing file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onDataProcessed]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  return (
    <div className="w-full max-w-xl">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors ${
          isProcessing 
            ? 'border-gray-400 bg-gray-50' 
            : error 
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="text-red-500" size={48} />
            <div>
              <h3 className="text-lg font-semibold text-red-700">Upload Error</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="mb-2 text-lg font-semibold">Upload Financial Data</h3>
            <p className="mb-4 text-sm text-gray-500">
              Upload your Trial Balance, Balance Sheet, or other financial statements in XLSX format
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
            >
              Select File
            </label>
          </>
        )}
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>Supported file types: .xlsx, .xls</p>
        <p>Maximum file size: 10MB</p>
      </div>
    </div>
  );
}