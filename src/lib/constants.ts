export const FINANCIAL_KEYWORDS = {
  TRIAL_BALANCE: [
    'trial balance', 'tb', 'trial', 'balance',
    'account listing', 'general ledger', 'gl balance',
    'account balance', 'ledger balance'
  ],
  BALANCE_SHEET: [
    'balance sheet', 'statement of financial position', 'financial position',
    'assets and liabilities', 'net assets', 'financial statement',
    'statement of position', 'bs', 'position statement'
  ],
  INCOME_STATEMENT: [
    'income statement', 'profit and loss', 'p&l', 'statement of comprehensive income',
    'earnings statement', 'operating statement', 'statement of operations',
    'profit & loss', 'income and expenditure', 'revenue statement'
  ],
  HIERARCHICAL: {
    ASSETS: {
      CURRENT_ASSETS: {
        CASH: ['cash', 'bank', 'money market', 'petty cash'],
        RECEIVABLES: ['accounts receivable', 'trade debtors', 'due from'],
        INVENTORY: ['inventory', 'stock', 'goods', 'merchandise'],
        PREPAYMENTS: ['prepaid', 'advance payment', 'deposit']
      },
      NON_CURRENT_ASSETS: {
        FIXED_ASSETS: ['property', 'plant', 'equipment', 'ppe'],
        INVESTMENTS: ['investment', 'shares', 'bonds', 'securities'],
        INTANGIBLES: ['goodwill', 'patent', 'trademark', 'license']
      }
    },
    LIABILITIES: {
      CURRENT_LIABILITIES: {
        PAYABLES: ['accounts payable', 'trade creditors', 'due to'],
        SHORT_TERM_LOANS: ['short term loan', 'overdraft', 'current borrowing'],
        ACCRUALS: ['accrued', 'accrual', 'provision']
      },
      NON_CURRENT_LIABILITIES: {
        LONG_TERM_LOANS: ['long term loan', 'mortgage', 'bond payable'],
        DEFERRED_TAX: ['deferred tax', 'future tax']
      }
    },
    EQUITY: {
      CAPITAL: ['share capital', 'common stock', 'issued capital'],
      RESERVES: ['reserve', 'surplus', 'accumulated'],
      RETAINED_EARNINGS: ['retained earning', 'accumulated profit']
    },
    REVENUE: {
      OPERATING_REVENUE: {
        SALES: ['sales revenue', 'service revenue', 'fee income'],
        COMMISSION: ['commission earned', 'brokerage']
      },
      OTHER_REVENUE: {
        INTEREST: ['interest income', 'interest earned'],
        DIVIDEND: ['dividend income', 'dividend received']
      }
    },
    EXPENSES: {
      OPERATING_EXPENSES: {
        EMPLOYEE: ['salary', 'wage', 'payroll', 'employee benefit'],
        OFFICE: ['rent', 'utility', 'insurance', 'maintenance'],
        SELLING: ['advertising', 'marketing', 'promotion']
      },
      FINANCIAL_EXPENSES: {
        INTEREST: ['interest expense', 'finance cost'],
        BANK_CHARGES: ['bank charge', 'bank fee']
      }
    }
  }
} as const;