const JIGSAWSTACK_API_KEY = 'pk_96e03b0b9d8b0db417b84a7c63e7f924bf77422b18f2aad6ebda323e32b6e31bf40cc858869267718fe277a864d941e94f157aa6e91c2b4848a8574d925f591e024bxNtmR1itbOLkaDTrF';
const JIGSAWSTACK_API_URL = 'https://api.jigsawstack.com/v1/vocr';

interface JigsawStackResponse {
  success: boolean;
  message?: string;
  data?: {
    text: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
}

export interface FinancialLabel {
  text: string;
  confidence: number;
  type: 'account_description' | 'debit' | 'credit' | 'unknown';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function extractTextFromExcel(excelData: ArrayBuffer): Promise<FinancialLabel[]> {
  try {
    // Convert Excel data to base64
    const base64Data = arrayBufferToBase64(excelData);

    // Log request details for debugging
    console.log('Sending request to JigsawStack API...');

    const response = await fetch(JIGSAWSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': JIGSAWSTACK_API_KEY,
      },
      body: JSON.stringify({
        data: base64Data,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        options: {
          language: 'en',
          detect_orientation: true,
          detect_tables: true,
        },
      }),
    });

    // Log response status for debugging
    console.log('JigsawStack API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JigsawStack API error response:', errorText);
      throw new Error(`JigsawStack API error: ${response.statusText}`);
    }

    const result: JigsawStackResponse = await response.json();

    // Log API response for debugging
    console.log('JigsawStack API response:', result);

    if (!result.success || !result.data) {
      throw new Error(result.message || 'Failed to process Excel file');
    }

    const processedLabels = processExtractedText(result.data);
    console.log('Processed financial labels:', processedLabels);

    return processedLabels;
  } catch (error) {
    console.error('Error processing Excel with JigsawStack:', error);
    throw new Error(`Failed to process Excel file with JigsawStack API: ${error.message}`);
  }
}

function processExtractedText(data: JigsawStackResponse['data']): FinancialLabel[] {
  if (!data) return [];

  const financialKeywords = {
    account_description: [
      'account',
      'description',
      'particulars',
      'details',
      'name',
      'item',
      'acc',
      'a/c',
      'ledger',
    ],
    debit: [
      'debit',
      'dr',
      'dr.',
      'debit amount',
      'charges',
      'debits',
      'debit bal',
      'debit balance',
    ],
    credit: [
      'credit',
      'cr',
      'cr.',
      'credit amount',
      'payments',
      'credits',
      'credit bal',
      'credit balance',
    ],
  };

  return data.map(item => {
    const text = item.text.toLowerCase().trim();
    let type: FinancialLabel['type'] = 'unknown';
    let confidence = item.confidence;

    // Check for exact matches first (higher confidence)
    for (const [labelType, keywords] of Object.entries(financialKeywords)) {
      if (keywords.includes(text)) {
        type = labelType as 'account_description' | 'debit' | 'credit';
        confidence *= 0.95; // High confidence for exact matches
        break;
      }
    }

    // If no exact match, check for partial matches
    if (type === 'unknown') {
      // Check for account description keywords
      if (financialKeywords.account_description.some(keyword => text.includes(keyword))) {
        type = 'account_description';
        confidence *= 0.9;
      }
      // Check for debit keywords
      else if (financialKeywords.debit.some(keyword => text.includes(keyword))) {
        type = 'debit';
        confidence *= 0.9;
      }
      // Check for credit keywords
      else if (financialKeywords.credit.some(keyword => text.includes(keyword))) {
        type = 'credit';
        confidence *= 0.9;
      }
      // Check if it's a number (potential amount)
      else if (/^[\d,.-]+$/.test(text)) {
        // If it's in a typical amount format, could be debit or credit
        type = 'unknown';
        confidence *= 0.7;
      }
    }

    return {
      text: item.text,
      confidence,
      type,
    };
  });
}

export function findFinancialLabels(labels: FinancialLabel[]): {
  headers: string[];
  confidence: number;
} {
  const headerGroups = {
    account_description: labels.filter(l => l.type === 'account_description'),
    debit: labels.filter(l => l.type === 'debit'),
    credit: labels.filter(l => l.type === 'credit'),
  };

  // Calculate overall confidence based on presence and confidence of required fields
  const confidence = (
    Math.min(
      headerGroups.account_description.length > 0 ? Math.max(...headerGroups.account_description.map(l => l.confidence)) : 0,
      headerGroups.debit.length > 0 ? Math.max(...headerGroups.debit.map(l => l.confidence)) : 0,
      headerGroups.credit.length > 0 ? Math.max(...headerGroups.credit.map(l => l.confidence)) : 0
    ) || 0
  );

  // Get the highest confidence label for each type
  const headers = [
    headerGroups.account_description[0]?.text || '',
    headerGroups.debit[0]?.text || '',
    headerGroups.credit[0]?.text || '',
  ].filter(Boolean);

  return {
    headers,
    confidence,
  };
}