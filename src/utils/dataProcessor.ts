import * as XLSX from 'xlsx';

export interface RiskData {
  ucc: string;
  mcxBalance: number;
  nseCmBalance: number;
  nseFoBalance: number;
  nseCdsBalance: number;
  ledTotal: number;
  netTotal: number;
  fo: number;
  cm: number;
  cd: number;
  co: number;
  allocTotal: number;
  diff: number;
  netDiff: number;
  status: 'NIL' | 'EXCESS' | 'SHORT';
  netstatus: 'NIL' | 'EXCESS' | 'SHORT';
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
    totalNetExcess: number;
    totalNetShort: number;
    netexcessCount: number;
    netshortCount: number;
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
        
        // Read all data first, then process it manually to handle the specific column positions
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, // Get raw array data
          defval: '',
          raw: false
        });
        
        console.log('Raw Excel data (array format):', jsonData);
        
        // Find the header row (row 3, index 2 in 0-based indexing)
        const headerRowIndex = 2;
        if (jsonData.length <= headerRowIndex) {
          throw new Error('Excel file does not have enough rows');
        }
        
        const headers = jsonData[headerRowIndex] as string[];
        console.log('Headers from row 3:', headers);
        
        // Process data rows starting from row 4 (index 3)
        const processedData = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const rowObj: any = {};
          
          // Map specific columns based on corrected specification:
          // Client Name is in column A (index 0)
          // UCC is in column B (index 1) - this is the client code that matches Clicode
          // MCX Balance is in column C (index 2)
          // NSE-CM Balance is in column E (index 4)
          // NSE-F&O Balance is in column G (index 6)
          // NSE-CDS Balance is in column I (index 8)
          
          rowObj.Name = row[0] ? String(row[0]).trim() : '';
          rowObj.UCC = row[1] ? String(row[1]).trim() : '';
          rowObj.MCX_Balance = row[2] ? parseFloat(row[2]) : 0;
          rowObj.NSE_CM_Balance = row[4] ? parseFloat(row[4]) : 0;
          rowObj.NSE_FO_Balance = row[6] ? parseFloat(row[6]) : 0;
          rowObj.NSE_CDS_Balance = row[8] ? parseFloat(row[8]) : 0;
          
          // Only add rows that have a valid UCC
          if (rowObj.UCC && rowObj.UCC !== '' && rowObj.UCC !== 'undefined') {
            processedData.push(rowObj);
          }
        }
        
        console.log('Processed Excel data with corrected column mapping:', processedData);
        resolve(processedData);
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
      return name !== 'CLIENTS' && ucc && ucc !== '' && ucc !== 'undefined';
    });

    console.log('Filtered risk data:', filteredRiskData);

    // Extract relevant columns - data is already mapped to the correct structure
    const processedRiskData = filteredRiskData.map(row => {
      console.log('Processing risk row:', row);
      
      return {
        UCC: String(row.UCC || '').trim(),
        Name: String(row.Name || ''),
        MCX_Balance: isNaN(row.MCX_Balance) ? 0 : row.MCX_Balance,
        NSE_CM_Balance: isNaN(row.NSE_CM_Balance) ? 0 : row.NSE_CM_Balance,
        NSE_FO_Balance: isNaN(row.NSE_FO_Balance) ? 0 : row.NSE_FO_Balance,
        NSE_CDS_Balance: isNaN(row.NSE_CDS_Balance) ? 0 : row.NSE_CDS_Balance,
      };
    });

    console.log('Processed risk data with balance values:', processedRiskData);

    // Process NSE CSV file
    let nseAllocations: { [key: string]: { FO: number; CM: number; CD: number } } = {};
    if (files.nse) {
      const nseText = await files.nse.text();
      const nseData = parseCSV(nseText);
      console.log('NSE CSV data:', nseData);
      
      // Filter and process NSE data - using pivot logic from Flask
      const validNseData = nseData.filter(row => row.Clicode && row.Clicode.trim());
      
      // Group by Clicode and Segments, sum Allocated values
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
      
      // Filter and process MCX data - using pivot logic from Flask
      const validMcxData = mcxData.filter(row => row.Clicode && row.Clicode.trim());
      
      // Group by Clicode, sum Allocated values for CO segment
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
      // Use UCC from risk data (column B) to match with allocations - this is the client code
      const ucc = riskRow.UCC;
      
      console.log(`Processing UCC: ${ucc}`);
      console.log(`Looking for NSE allocation for ${ucc}:`, nseAllocations[ucc]);
      console.log(`Looking for MCX allocation for ${ucc}:`, mcxAllocations[ucc]);
      
      // Calculate LED TOTAL as sum of negative balances made positive (Flask logic)
      const balances = [
        riskRow.MCX_Balance,
        riskRow.NSE_CM_Balance,
        riskRow.NSE_FO_Balance,
        riskRow.NSE_CDS_Balance
      ];
      
      // Sum of negative balances, then make positive (Flask logic: -total_neg)
      const totalNeg = balances.filter(balance => balance < 0).reduce((sum, balance) => sum + balance, 0);
      const ledTotal = -totalNeg; // make positive

      // Get allocations using the UCC from risk data
      const nseAlloc = nseAllocations[ucc] || { FO: 0, CM: 0, CD: 0 };
      const mcxAlloc = mcxAllocations[ucc] || { CO: 0 };

      console.log(`Final allocations for ${ucc}:`, { nseAlloc, mcxAlloc });

      // Calculate ALLOC TOTAL
      const allocTotal = nseAlloc.FO + nseAlloc.CM + nseAlloc.CD + mcxAlloc.CO;

      // Calculate DIFF (ALLOC TOTAL minus LED TOTAL)
      const diff = allocTotal - ledTotal;
      const tolerance = 0.01;

      // Determine STATUS
      let status: 'NIL' | 'EXCESS' | 'SHORT';
      if (Math.abs(ledTotal - allocTotal) < tolerance) {
        status = 'NIL';
      } else if (allocTotal > ledTotal) {
        status = 'EXCESS';
      } else {
        status = 'SHORT';
      }

      // Calculate NET TOTAL (sum of all balances)
      const fnetTotal = riskRow.MCX_Balance + riskRow.NSE_CM_Balance + 
                      riskRow.NSE_FO_Balance + riskRow.NSE_CDS_Balance;

      const netTotal = Math.max(0, -fnetTotal);
      
      // Calculate NET DIFF (NET TOTAL minus ALLOC TOTAL)
      const netDiff = parseFloat((allocTotal - netTotal).toFixed(2));

      // Determine STATUS
      let netstatus: 'NIL' | 'EXCESS' | 'SHORT';
      if (Math.abs(netDiff) == 0.00) {
        netstatus = 'NIL';
      } else if (netDiff > 0) {
        netstatus = 'EXCESS';
      } else {
        netstatus = 'SHORT';
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
        netTotal,
        netDiff,
        netstatus,
      };
    });

    console.log('Final processed data with correct allocation values:', processedData);

    // Calculate summary
    const summary = {
      totalRecords: processedData.length,
      nilCount: processedData.filter(item => item.status === 'NIL').length,
      excessCount: processedData.filter(item => item.status === 'EXCESS').length,
      shortCount: processedData.filter(item => item.status === 'SHORT').length,
      netexcessCount: processedData.filter(item => item.netstatus === 'EXCESS').length,
      netshortCount: processedData.filter(item => item.netstatus === 'SHORT').length,
      totalLedger: processedData.reduce((sum, item) => sum + item.ledTotal, 0),
      totalAllocation: processedData.reduce((sum, item) => sum + item.allocTotal, 0),
      totalNetExcess: processedData
        .filter(item => item.netstatus === 'EXCESS')
        .reduce((sum, item) => sum + item.netDiff, 0),
      totalNetShort: processedData
        .filter(item => item.netstatus === 'SHORT')
        .reduce((sum, item) => sum + Math.abs(item.netDiff), 0)
    };

    return { data: processedData, summary };

  } catch (error) {
    console.error('Error processing files:', error);
    throw new Error('Failed to process files. Please check file formats and try again.');
  }
};

export const exportToExcel = (data: RiskData[]): void => {
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data.map(row => ({
    'UCC': row.ucc,
    'Client Name': row.clientName,
    'MCX Balance': row.mcxBalance,
    'NSE-CM Balance': row.nseCmBalance,
    'NSE-F&O Balance': row.nseFoBalance,
    'NSE-CDS Balance': row.nseCdsBalance,
    'LED TOTAL': row.ledTotal,
    'NET TOTAL': row.netTotal,
    'FO': row.fo,
    'CM': row.cm,
    'CD': row.cd,
    'CO': row.co,
    'ALLOC TOTAL': row.allocTotal,
    'STATUS': row.status,
    'NETSTATUS': row.netstatus,
    'DIFF': row.diff,
    'NET DIFF': row.netDiff,
  })));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Risk Analysis');

  // Generate Excel file and trigger download
  XLSX.writeFile(wb, 'risk_analysis.xlsx');
};