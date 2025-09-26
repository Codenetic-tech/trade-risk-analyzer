import * as XLSX from 'xlsx';

export interface SegregationData {
  UCC: string;
  ClientName: string;
  Currencies: number;
  Derivative: number;
  Equities: number;
  MCX: number;
  Total: number;
  NSECM: number;
  NSEFO: number;
  MCXFile: number;
  Remaining: number;
  AllocationTotal: number;
  FODiff: number;
  CMDiff: number;
  MCXDiff: number;
  Status: 'OK' | 'Not OK';
}

export interface LedgerSegregationData {
  [ucc: string]: {
    clientName: string;
    currencies: number;
    derivative: number;
    equities: number;
    mcx: number;
    total: number;
  };
}

export const parseLedgerExcel = async (file: File): Promise<LedgerSegregationData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with raw values to handle large numbers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true,
          dateNF: 'YYYY-MM-DD'
        });
        
        console.log('Raw Excel data preview:', jsonData.slice(0, 5));
        
        const ledgerData: LedgerSegregationData = {};
        
        // Find header row - try multiple rows as headers can be in different positions
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          // Convert row to strings and clean up
          const potentialHeaders = row.map((cell: any) => {
            if (cell === null || cell === undefined) return '';
            return String(cell).replace(/\s+/g, ' ').trim().toLowerCase();
          });
          
          console.log(`Row ${i} potential headers:`, potentialHeaders);
          
          // Check if this row contains header-like content
          const hasUccHeader = potentialHeaders.some(h => 
            h.includes('ucc') || h === 'ucc'
          );
          const hasSegmentHeader = potentialHeaders.some(h => 
            h.includes('segment') || h.includes('system')
          );
          const hasBalanceHeader = potentialHeaders.some(h => 
            h.includes('ledger') || h.includes('balance') || h.includes('epay')
          );
          
          if (hasUccHeader && (hasSegmentHeader || hasBalanceHeader)) {
            headerRowIndex = i;
            headers = potentialHeaders;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          console.warn('Header row not found automatically, using fallback logic');
          // Fallback: assume headers are in row 1 (index 1)
          headerRowIndex = 1;
          if (headerRowIndex < jsonData.length) {
            const row = jsonData[headerRowIndex] as any[];
            headers = (row || []).map((cell: any) => {
              if (cell === null || cell === undefined) return '';
              return String(cell).replace(/\s+/g, ' ').trim().toLowerCase();
            });
          }
        }
        
        console.log(`Using header row index: ${headerRowIndex}`);
        console.log('Final headers:', headers);
        
        if (headers.length === 0) {
          throw new Error('Could not identify headers in the Excel file');
        }
        
        // Find column indices with flexible matching
        const uccIndex = headers.findIndex(h => h === 'ucc' || h.includes('ucc'));
        
        const clientIndex = headers.findIndex(h => 
          h.includes('client') && !h.includes('ucc')
        );
        
        const segmentIndex = headers.findIndex(h => 
          h.includes('segment') || h.includes('system')
        );
        
        // For balance, look for the specific column mentioned in your requirements
        const balanceIndex = headers.findIndex(h => 
          h.includes('pure ledger bal') && h.includes('include epay') && h.includes('[a1]')
        );
        
        // If specific balance column not found, try alternatives
        let finalBalanceIndex = balanceIndex;
        if (finalBalanceIndex === -1) {
          finalBalanceIndex = headers.findIndex(h => 
            h.includes('pure ledger bal') || (h.includes('ledger') && h.includes('bal'))
          );
        }
        
        // If still not found, try column E (index 4) as per your specification
        if (finalBalanceIndex === -1) {
          finalBalanceIndex = 4; // Column E
        }
        
        console.log('Column indices:');
        console.log('UCC:', uccIndex, '(Column A)');
        console.log('Client:', clientIndex, '(Column B)'); 
        console.log('Segment:', segmentIndex, '(Column D)');
        console.log('Balance:', finalBalanceIndex, '(Column E)');
        
        if (uccIndex === -1) {
          throw new Error('UCC column not found in the Excel file');
        }
        
        // Process data rows
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          // Get UCC value
          const uccCell = row[uccIndex];
          if (!uccCell) continue;
          
          const ucc = String(uccCell).trim();
          if (!ucc || ucc === 'ucc' || ucc.toLowerCase().includes('grand total')) continue;
          
          // Get other values
          const clientName = clientIndex !== -1 && row[clientIndex] ? 
            String(row[clientIndex]).trim() : '';
          
          const segment = segmentIndex !== -1 && row[segmentIndex] ? 
            String(row[segmentIndex]).trim().toLowerCase() : '';
          
          // Parse balance with better number handling
          let balance = 0;
          if (finalBalanceIndex < row.length && row[finalBalanceIndex] !== null && row[finalBalanceIndex] !== undefined) {
            const balanceValue = row[finalBalanceIndex];
            if (typeof balanceValue === 'number') {
              balance = Math.abs(balanceValue);
            } else {
              const balanceStr = String(balanceValue).replace(/[#,\s]/g, '');
              if (balanceStr && !isNaN(parseFloat(balanceStr))) {
                balance = Math.abs(parseFloat(balanceStr));
              }
            }
          }
          
          console.log(`Processing row ${i}:`, { ucc, clientName, segment, balance });
          
          // Skip rows with invalid data
          if (!ucc || balance === 0) continue;
          
          // Initialize UCC entry if not exists
          if (!ledgerData[ucc]) {
            ledgerData[ucc] = {
              clientName: clientName,
              currencies: 0,
              derivative: 0,
              equities: 0,
              mcx: 0,
              total: 0
            };
          } else if (clientName && !ledgerData[ucc].clientName) {
            // Update client name if it was empty
            ledgerData[ucc].clientName = clientName;
          }
          
          // Map segment to appropriate field with flexible matching
          if (segment.includes('currenc') || segment.includes('cnfo')) {
            ledgerData[ucc].currencies += balance;
          } else if (segment.includes('deriv') || segment.includes('nfo') || segment.includes('f&o')) {
            ledgerData[ucc].derivative += balance;
          } else if (segment.includes('equit') || segment.includes('nse') || segment.includes('cash')) {
            ledgerData[ucc].equities += balance;
          } else if (segment.includes('mcx') || segment.includes('mcfo')) {
            ledgerData[ucc].mcx += balance;
          } else {
            console.warn(`Unknown segment type: "${segment}" for UCC: ${ucc}, adding to equities`);
            // Default unknown segments to equities
            ledgerData[ucc].equities += balance;
          }
        }
        
        // Calculate totals for each UCC
        Object.keys(ledgerData).forEach(ucc => {
          const data = ledgerData[ucc];
          data.total = data.currencies + data.derivative + data.equities + data.mcx;
        });
        
        console.log('Successfully parsed ledger data:', ledgerData);
        console.log('Total UCCs processed:', Object.keys(ledgerData).length);
        
        resolve(ledgerData);
      } catch (error) {
        console.error('Error parsing Ledger Excel:', error);
        reject(new Error(`Failed to parse Ledger Excel: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Ledger file'));
    reader.readAsArrayBuffer(file);
  });
};

// Updated NSE CSV parser for your specific format
export const parseNSECSV = (csvText: string): {[key: string]: number} => {
  const lines = csvText.split('\n');
  const data: {[key: string]: number} = {};
  
  console.log('Parsing NSE CSV, total lines:', lines.length);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma (your files are comma-separated)
    const values = line.split(',').map(v => v.trim()).filter(v => v !== '');
    
    if (values.length >= 5) {
      const ucc = values[0]?.trim();
      const amountStr = values[4]?.trim(); // Column E (index 4) is amount
      
      if (ucc && ucc.length > 1 && ucc !== 'UCC' && amountStr) {
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          data[ucc] = (data[ucc] || 0) + Math.abs(amount);
        }
      }
    }
  }
  
  console.log('NSE CSV parsed data sample:', Object.keys(data).slice(0, 5));
  return data;
};

// Updated MCX CSV parser for your specific format
export const parseMCXCSV = async (file: File): Promise<{[key: string]: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data: {[key: string]: number} = {};
        const lines = text.split('\n');
        
        console.log('Parsing MCX CSV, total lines:', lines.length);
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          // Split by comma
          const values = trimmedLine.split(',').map(v => v.trim()).filter(v => v !== '');
          
          if (values.length >= 17) {
            const ucc = values[2]?.trim(); // Column C (index 2) is UCC
            const amountStr = values[16]?.trim(); // Column Q (index 16) is amount
            
            if (ucc && ucc !== 'UCC' && amountStr) {
              const amount = parseFloat(amountStr);
              if (!isNaN(amount)) {
                data[ucc] = (data[ucc] || 0) + amount;
              }
            }
          }
        }
        
        console.log('MCX CSV parsed data sample:', Object.keys(data).slice(0, 5));
        resolve(data);
      } catch (error) {
        console.error('Error parsing MCX CSV:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read MCX CSV file'));
    reader.readAsText(file);
  });
};

export const parseRemainingExcel = async (file: File): Promise<{[key: string]: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: true
        });
        
        console.log('Remaining Excel raw data preview:', jsonData.slice(0, 5));
        
        const remainingData: {[key: string]: number} = {};
        
        // Find header row to identify UCC column
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const potentialHeaders = row.map((cell: any) => {
            if (cell === null || cell === undefined) return '';
            return String(cell).replace(/\s+/g, ' ').trim().toLowerCase();
          });
          
          console.log(`Remaining file row ${i}:`, potentialHeaders.slice(0, 10)); // Show first 10 columns
          
          // Look for UCC column
          const hasUccHeader = potentialHeaders.some(h => h.includes('ucc'));
          
          if (hasUccHeader) {
            headerRowIndex = i;
            headers = potentialHeaders;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          console.warn('Header row not found in remaining file, using row 0 as fallback');
          headerRowIndex = 0;
          if (headerRowIndex < jsonData.length) {
            const row = jsonData[headerRowIndex] as any[];
            headers = (row || []).map((cell: any) => {
              if (cell === null || cell === undefined) return '';
              return String(cell).replace(/\s+/g, ' ').trim().toLowerCase();
            });
          }
        }
        
        console.log(`Using header row index: ${headerRowIndex}`);
        console.log('Remaining file headers (first 15):', headers.slice(0, 15));
        
        // Find UCC column index
        let uccIndex = headers.findIndex(h => h.includes('ucc'));
        if (uccIndex === -1) {
          // Based on your sample data, UCC appears to be in column C (index 2)
          uccIndex = 2;
          console.warn(`UCC column not found in headers, defaulting to index ${uccIndex} (Column C)`);
        }
        
        // Fixed: Always use column AK (index 36) for remaining values as per your specification
        const remainingIndex = 36; // Column AK
        
        console.log('Column indices:');
        console.log('UCC:', uccIndex, '(Column', String.fromCharCode(65 + uccIndex) + ')');
        console.log('Remaining:', remainingIndex, '(Column AK)');
        
        // Process data rows - only extract values where remaining > 0
        let processedCount = 0;
        let remainingCount = 0;
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          // Get UCC value
          const uccCell = row[uccIndex];
          if (!uccCell) continue;
          
          const ucc = String(uccCell).trim();
          
          // Skip invalid rows
          if (!ucc || 
              ucc === 'segment' || 
              ucc === 'ucc' ||
              ucc.toLowerCase().includes('grand total') ||
              ucc.toLowerCase().includes('total')) {
            continue;
          }
          
          processedCount++;
          
          // Extract remaining value from column AK (index 36)
          let remainingValue = 0;
          if (remainingIndex < row.length && row[remainingIndex] !== null && row[remainingIndex] !== undefined) {
            const balanceValue = row[remainingIndex];
            if (typeof balanceValue === 'number') {
              remainingValue = Math.abs(balanceValue);
            } else {
              const balanceStr = String(balanceValue).replace(/[#,\s]/g, '');
              if (balanceStr && balanceStr !== '' && !isNaN(parseFloat(balanceStr))) {
                remainingValue = Math.abs(parseFloat(balanceStr));
              }
            }
          }
          
          // Only store UCC entries that have a remaining value > 0
          if (remainingValue > 0) {
            remainingData[ucc] = remainingValue;
            remainingCount++;
            console.log(`Row ${i}: UCC=${ucc}, Remaining=${remainingValue}`);
          } else {
            // Log rows with zero remaining for debugging
            console.log(`Row ${i}: UCC=${ucc}, No remaining value (${row[remainingIndex]})`);
          }
        }
        
        console.log('Remaining file processing summary:');
        console.log('Total rows processed:', processedCount);
        console.log('UCCs with remaining values:', remainingCount);
        console.log('Sample remaining data:', Object.entries(remainingData).slice(0, 5));
        
        resolve(remainingData);
      } catch (error) {
        console.error('Error parsing Remaining Excel:', error);
        reject(new Error(`Failed to parse Remaining Excel: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Remaining file'));
    reader.readAsArrayBuffer(file);
  });
};

export const processSegregationData = async (files: File[]): Promise<SegregationData[]> => {
  if (!files || files.length === 0) {
    throw new Error("Please select all required files");
  }

  let ledgerData: LedgerSegregationData = {};
  let nseCMData: {[key: string]: number} = {};
  let nseFOData: {[key: string]: number} = {};
  let mcxData: {[key: string]: number} = {};
  let remainingData: {[key: string]: number} = {};
  
  console.log('Processing files:', files.map(f => f.name));
  
  // Process each file
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    
    try {
      if (fileName.includes('ledger')) {
        console.log('Processing Ledger file...');
        ledgerData = await parseLedgerExcel(file);
      } else if (fileName.includes('c_cc01')) {
        console.log('Processing NSE CM file...');
        const text = await file.text();
        nseCMData = parseNSECSV(text);
      } else if (fileName.includes('f_cc01')) {
        console.log('Processing NSE FO file...');
        const text = await file.text();
        nseFOData = parseNSECSV(text);
      } else if (fileName.includes('mcx_weballocation')) {
        console.log('Processing MCX file...');
        mcxData = await parseMCXCSV(file);
      } else if (fileName.includes('remaining')) {
        console.log('Processing Remaining file...');
        remainingData = await parseRemainingExcel(file);
      }
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
      throw new Error(`Failed to process ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Combine all data
  const allUCCs = new Set([
    ...Object.keys(ledgerData),
    ...Object.keys(nseCMData),
    ...Object.keys(nseFOData),
    ...Object.keys(mcxData),
    ...Object.keys(remainingData)
  ]);
  
  console.log('Total unique UCCs found:', allUCCs.size);
  
  const segregationData: SegregationData[] = [];
  
  for (const ucc of allUCCs) {
    const ledger = ledgerData[ucc] || {
      clientName: '',
      currencies: 0,
      derivative: 0,
      equities: 0,
      mcx: 0,
      total: 0
    };
    
    const nseCM = nseCMData[ucc] || 0;
    const nseFO = nseFOData[ucc] || 0;
    const mcxFile = mcxData[ucc] || 0;
    const remaining = remainingData[ucc] || 0;

    // Calculate differences
    const foDiff = ledger.derivative - nseFO;
    const cmDiff = ledger.equities - nseCM;
    const mcxDiff = ledger.mcx - mcxFile;
    const allocationTotal = nseCM + nseFO + mcxFile + remaining;
    
    // Calculate status based on comparison (allow small rounding differences)
    const totalFromFiles = nseCM + nseFO + mcxFile + remaining;
    const difference = Math.abs(ledger.total - totalFromFiles);
    const status: 'OK' | 'Not OK' = difference < 1.00 ? 'OK' : 'Not OK';
    
    segregationData.push({
      UCC: ucc,
      ClientName: ledger.clientName,
      Currencies: ledger.currencies,
      Derivative: ledger.derivative,
      Equities: ledger.equities,
      MCX: ledger.mcx,
      Total: ledger.total,
      NSECM: nseCM,
      NSEFO: nseFO,
      MCXFile: mcxFile,
      Remaining: remaining,
      AllocationTotal: allocationTotal,
      FODiff: foDiff,
      CMDiff: cmDiff,
      MCXDiff: mcxDiff,
      Status: status
    });
  }
  
  // Sort by UCC
  segregationData.sort((a, b) => a.UCC.localeCompare(b.UCC));
  
  console.log('Final segregation data:', segregationData.length, 'records');
  return segregationData;
};

export const exportSegregationData = (segregationData: SegregationData[]) => {
  const exportData = segregationData.map(row => ({
    UCC: row.UCC,
    'Client Name': row.ClientName,
    Currencies: row.Currencies,
    Derivative: row.Derivative,
    Equities: row.Equities,
    'MCX Ledger': row.MCX,
    Total: row.Total,
    'NSE CM': row.NSECM,
    'NSE FO': row.NSEFO,
    'MCX File': row.MCXFile,
    Remaining: row.Remaining,
    'Allocation Total': row.AllocationTotal,
    'FO Diff': row.FODiff,
    'CM Diff': row.CMDiff,
    'MCX Diff': row.MCXDiff
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Segregation Data');
  XLSX.writeFile(wb, 'segregation_data.xlsx');
};

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};