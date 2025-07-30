
import * as XLSX from 'xlsx';

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

// Helper function to parse Excel using xlsx library
const parseExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read with header on row 3 (index 2) - skip first two header rows
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          range: 2,  // Start from row 3 (0-indexed)
          defval: '' 
        });
        
        console.log('Parsed Excel data:', jsonData);
        resolve(jsonData);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
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
    console.log('Raw risk data:', riskData);
    
    // Remove any summary or 'CLIENTS' rows and drop rows without UCC
    let filteredRiskData = riskData.filter(row => {
      const name = String(row.Name || '').trim();
      const ucc = String(row.UCC || '').trim();
      return name !== 'CLIENTS' && ucc && ucc !== '';
    });

    console.log('Filtered risk data:', filteredRiskData);

    // Extract relevant columns - handle the specific column names from Flask code
    const processedRiskData = filteredRiskData.map(row => {
      return {
        UCC: String(row.UCC || '').trim(),
        Name: String(row.Name || ''),
        MCX_Balance: parseFloat(row['MCX_x000D_\nBalance'] || row['MCX Balance'] || 0) || 0,
        NSE_CM_Balance: parseFloat(row['NSE-CM_x000D_\nBalance'] || row['NSE-CM Balance'] || 0) || 0,
        NSE_FO_Balance: parseFloat(row['NSE-F&O_x000D_\nBalance'] || row['NSE-F&O Balance'] || 0) || 0,
        NSE_CDS_Balance: parseFloat(row['NSE-CDS_x000D_\nBalance'] || row['NSE-CDS Balance'] || 0) || 0,
      };
    });

    console.log('Processed risk data:', processedRiskData);

    // Process NSE CSV file
    let nseAllocations: { [key: string]: { FO: number; CM: number; CD: number } } = {};
    if (files.nse) {
      const nseText = await files.nse.text();
      const nseData = parseCSV(nseText);
      console.log('NSE CSV data:', nseData);
      
      // Filter and process NSE data
      const validNseData = nseData.filter(row => row.Clicode && row.Clicode.trim());
      
      validNseData.forEach(row => {
        const ucc = String(row.Clicode).trim();
        const segment = String(row.Segments || '').trim();
        const allocated = parseFloat(row.Allocated) || 0;
        
        if (!nseAllocations[ucc]) {
          nseAllocations[ucc] = { FO: 0, CM: 0, CD: 0 };
        }
        
        if (segment === 'FO') nseAllocations[ucc].FO += allocated;
        if (segment === 'CM') nseAllocations[ucc].CM += allocated;
        if (segment === 'CD') nseAllocations[ucc].CD += allocated;
      });
    }

    console.log('NSE allocations:', nseAllocations);

    // Process MCX CSV file
    let mcxAllocations: { [key: string]: { CO: number } } = {};
    if (files.mcx) {
      const mcxText = await files.mcx.text();
      const mcxData = parseCSV(mcxText);
      console.log('MCX CSV data:', mcxData);
      
      // Filter and process MCX data
      const validMcxData = mcxData.filter(row => row.Clicode && row.Clicode.trim());
      
      validMcxData.forEach(row => {
        const ucc = String(row.Clicode).trim();
        const allocated = parseFloat(row.Allocated) || 0;
        
        if (!mcxAllocations[ucc]) {
          mcxAllocations[ucc] = { CO: 0 };
        }
        
        mcxAllocations[ucc].CO += allocated;
      });
    }

    console.log('MCX allocations:', mcxAllocations);

    // Process each risk record following Flask logic exactly
    const processedData: RiskData[] = processedRiskData.map(riskRow => {
      const ucc = riskRow.UCC;
      
      // Calculate LED TOTAL as sum of negative balances made positive
      const balances = [
        riskRow.MCX_Balance,
        riskRow.NSE_CM_Balance,
        riskRow.NSE_FO_Balance,
        riskRow.NSE_CDS_Balance
      ];
      
      // Sum of negative balances, then make positive (Flask logic: -total_neg)
      const totalNeg = balances.filter(balance => balance < 0).reduce((sum, balance) => sum + balance, 0);
      const ledTotal = -totalNeg; // make positive

      // Get allocations
      const nseAlloc = nseAllocations[ucc] || { FO: 0, CM: 0, CD: 0 };
      const mcxAlloc = mcxAllocations[ucc] || { CO: 0 };

      // Calculate ALLOC TOTAL
      const allocTotal = nseAlloc.FO + nseAlloc.CM + nseAlloc.CD + mcxAlloc.CO;

      // Calculate DIFF (ALLOC TOTAL minus LED TOTAL)
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

    console.log('Final processed data:', processedData);

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
