
export interface RiskData {
  ucc: string;
  ledTotal: number;
  allocTotal: number;
  diff: number;
  status: 'NIL' | 'EXCESS' | 'SHORT';
  exchange: string;
  segment: string;
  clientName?: string;
  riskAmount?: number;
}

export interface ProcessedData {
  data: RiskData[];
  summary: {
    totalRecords: number;
    nilCount: number;
    excessCount: number;
    shortCount: number;
    totalLedger: number;
    totalAllocation: number;
  };
}

// Mock data processing function - in real app, this would parse actual Excel/CSV files
export const processFiles = async (files: {
  risk: File | null;
  nse: File | null;
  mcx: File | null;
}): Promise<ProcessedData> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Generate mock data that would typically come from parsing the actual files
  const mockData: RiskData[] = [
    {
      ucc: 'UCC001',
      ledTotal: 150000,
      allocTotal: 148000,
      diff: -2000,
      status: 'SHORT',
      exchange: 'NSE',
      segment: 'EQUITY',
      clientName: 'Client A',
      riskAmount: 150000,
    },
    {
      ucc: 'UCC002',
      ledTotal: 200000,
      allocTotal: 205000,
      diff: 5000,
      status: 'EXCESS',
      exchange: 'NSE',
      segment: 'DERIVATIVE',
      clientName: 'Client B',
      riskAmount: 200000,
    },
    {
      ucc: 'UCC003',
      ledTotal: 75000,
      allocTotal: 75000,
      diff: 0,
      status: 'NIL',
      exchange: 'MCX',
      segment: 'COMMODITY',
      clientName: 'Client C',
      riskAmount: 75000,
    },
    {
      ucc: 'UCC004',
      ledTotal: 300000,
      allocTotal: 295000,
      diff: -5000,
      status: 'SHORT',
      exchange: 'NSE',
      segment: 'EQUITY',
      clientName: 'Client D',
      riskAmount: 300000,
    },
    {
      ucc: 'UCC005',
      ledTotal: 125000,
      allocTotal: 130000,
      diff: 5000,
      status: 'EXCESS',
      exchange: 'MCX',
      segment: 'COMMODITY',
      clientName: 'Client E',
      riskAmount: 125000,
    },
  ];

  // Calculate summary
  const summary = {
    totalRecords: mockData.length,
    nilCount: mockData.filter(item => item.status === 'NIL').length,
    excessCount: mockData.filter(item => item.status === 'EXCESS').length,
    shortCount: mockData.filter(item => item.status === 'SHORT').length,
    totalLedger: mockData.reduce((sum, item) => sum + item.ledTotal, 0),
    totalAllocation: mockData.reduce((sum, item) => sum + item.allocTotal, 0),
  };

  return { data: mockData, summary };
};

export const exportToExcel = (data: RiskData[]): void => {
  // Mock Excel export - in real app, this would use a library like xlsx
  const csvContent = [
    'UCC,LED TOTAL,ALLOC TOTAL,DIFF,STATUS,EXCHANGE,SEGMENT,CLIENT NAME',
    ...data.map(row => 
      `${row.ucc},${row.ledTotal},${row.allocTotal},${row.diff},${row.status},${row.exchange},${row.segment},${row.clientName || ''}`
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'risk_analysis_output.csv';
  link.click();
  window.URL.revokeObjectURL(url);
};
