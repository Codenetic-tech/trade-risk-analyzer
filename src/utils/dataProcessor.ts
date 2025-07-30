
export interface RiskData {
  ucc: string;
  mcxBalance: number;
  nseCmBalance: number;
  nseFoBalance: number;
  nseCdsBalance: number;
  ledTotal: number;
  fo: number;
  cm: number;
  cd: number;
  co: number;
  allocTotal: number;
  diff: number;
  status: 'NIL' | 'EXCESS' | 'SHORT';
  clientName?: string;
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

// Helper function to parse CSV
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  
  return data;
};

// Helper function to parse Excel (simplified - in real app would use xlsx library)
const parseExcel = async (file: File): Promise<any[]> => {
  // For demo purposes, we'll simulate Excel parsing
  // In real implementation, you'd use libraries like xlsx or exceljs
  console.log('Parsing Excel file:', file.name);
  
  // Mock Excel data structure based on the Python code expectations
  return [
    {
      UCC: 'UCC001',
      Name: 'Client A',
      'MCX_x000D_\nBalance': -150000,
      'NSE-CM_x000D_\nBalance': -50000,
      'NSE-F&O_x000D_\nBalance': -100000,
      'NSE-CDS_x000D_\nBalance': 0,
    },
    {
      UCC: 'UCC002',
      Name: 'Client B',
      'MCX_x000D_\nBalance': 0,
      'NSE-CM_x000D_\nBalance': -80000,
      'NSE-F&O_x000D_\nBalance': -120000,
      'NSE-CDS_x000D_\nBalance': 0,
    },
    {
      UCC: 'UCC003',
      Name: 'Client C',
      'MCX_x000D_\nBalance': -75000,
      'NSE-CM_x000D_\nBalance': 0,
      'NSE-F&O_x000D_\nBalance': 0,
      'NSE-CDS_x000D_\nBalance': 0,
    },
  ];
};

export const processFiles = async (files: {
  risk: File | null;
  nse: File | null;
  mcx: File | null;
}): Promise<ProcessedData> => {
  if (!files.risk) {
    throw new Error('Risk file is required');
  }

  try {
    // Process Risk Excel file
    const riskData = await parseExcel(files.risk);
    
    // Filter out CLIENTS summary rows and rows without UCC
    const filteredRiskData = riskData
      .filter(row => row.Name !== 'CLIENTS' && row.UCC)
      .map(row => ({
        UCC: String(row.UCC).trim(),
        Name: row.Name || '',
        MCX_Balance: parseFloat(row['MCX_x000D_\nBalance']) || 0,
        NSE_CM_Balance: parseFloat(row['NSE-CM_x000D_\nBalance']) || 0,
        NSE_FO_Balance: parseFloat(row['NSE-F&O_x000D_\nBalance']) || 0,
        NSE_CDS_Balance: parseFloat(row['NSE-CDS_x000D_\nBalance']) || 0,
      }));

    // Process NSE CSV file
    let nseAllocations: { [key: string]: { FO: number; CM: number; CD: number } } = {};
    if (files.nse) {
      const nseText = await files.nse.text();
      const nseData = parseCSV(nseText);
      
      nseData
        .filter(row => row.Clicode)
        .forEach(row => {
          const ucc = String(row.Clicode).trim();
          const segment = row.Segments;
          const allocated = parseFloat(row.Allocated) || 0;
          
          if (!nseAllocations[ucc]) {
            nseAllocations[ucc] = { FO: 0, CM: 0, CD: 0 };
          }
          
          if (segment === 'FO') nseAllocations[ucc].FO += allocated;
          if (segment === 'CM') nseAllocations[ucc].CM += allocated;
          if (segment === 'CD') nseAllocations[ucc].CD += allocated;
        });
    }

    // Process MCX CSV file
    let mcxAllocations: { [key: string]: { CO: number } } = {};
    if (files.mcx) {
      const mcxText = await files.mcx.text();
      const mcxData = parseCSV(mcxText);
      
      mcxData
        .filter(row => row.Clicode)
        .forEach(row => {
          const ucc = String(row.Clicode).trim();
          const allocated = parseFloat(row.Allocated) || 0;
          
          if (!mcxAllocations[ucc]) {
            mcxAllocations[ucc] = { CO: 0 };
          }
          
          mcxAllocations[ucc].CO += allocated;
        });
    }

    // Process each risk record
    const processedData: RiskData[] = filteredRiskData.map(riskRow => {
      const ucc = riskRow.UCC;
      
      // Calculate LED TOTAL (sum of negative balances made positive)
      const balances = [
        riskRow.MCX_Balance,
        riskRow.NSE_CM_Balance,
        riskRow.NSE_FO_Balance,
        riskRow.NSE_CDS_Balance
      ];
      const ledTotal = balances
        .filter(balance => balance < 0)
        .reduce((sum, balance) => sum + Math.abs(balance), 0);

      // Get allocations
      const nseAlloc = nseAllocations[ucc] || { FO: 0, CM: 0, CD: 0 };
      const mcxAlloc = mcxAllocations[ucc] || { CO: 0 };

      // Calculate ALLOC TOTAL
      const allocTotal = nseAlloc.FO + nseAlloc.CM + nseAlloc.CD + mcxAlloc.CO;

      // Calculate DIFF
      const diff = allocTotal - ledTotal;

      // Determine STATUS
      let status: 'NIL' | 'EXCESS' | 'SHORT';
      if (ledTotal === allocTotal) {
        status = 'NIL';
      } else if (ledTotal < allocTotal) {
        status = 'EXCESS';
      } else {
        status = 'SHORT';
      }

      return {
        ucc,
        mcxBalance: riskRow.MCX_Balance,
        nseCmBalance: riskRow.NSE_CM_Balance,
        nseFoBalance: riskRow.NSE_FO_Balance,
        nseCdsBalance: riskRow.NSE_CDS_Balance,
        ledTotal,
        fo: nseAlloc.FO,
        cm: nseAlloc.CM,
        cd: nseAlloc.CD,
        co: mcxAlloc.CO,
        allocTotal,
        diff,
        status,
        clientName: riskRow.Name,
      };
    });

    // Calculate summary
    const summary = {
      totalRecords: processedData.length,
      nilCount: processedData.filter(item => item.status === 'NIL').length,
      excessCount: processedData.filter(item => item.status === 'EXCESS').length,
      shortCount: processedData.filter(item => item.status === 'SHORT').length,
      totalLedger: processedData.reduce((sum, item) => sum + item.ledTotal, 0),
      totalAllocation: processedData.reduce((sum, item) => sum + item.allocTotal, 0),
    };

    return { data: processedData, summary };

  } catch (error) {
    console.error('Error processing files:', error);
    throw new Error('Failed to process files. Please check file formats and try again.');
  }
};

export const exportToExcel = (data: RiskData[]): void => {
  // Create CSV content with proper column names matching the Flask output
  const headers = [
    'UCC',
    'MCX Balance',
    'NSE-CM Balance',
    'NSE-F&O Balance',
    'NSE-CDS Balance',
    'LED TOTAL',
    'FO',
    'CM',
    'CD',
    'CO',
    'ALLOC TOTAL',
    'STATUS',
    'DIFF'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.ucc,
      row.mcxBalance,
      row.nseCmBalance,
      row.nseFoBalance,
      row.nseCdsBalance,
      row.ledTotal,
      row.fo,
      row.cm,
      row.cd,
      row.co,
      row.allocTotal,
      row.status,
      row.diff
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'output.xlsx';
  link.click();
  window.URL.revokeObjectURL(url);
};
