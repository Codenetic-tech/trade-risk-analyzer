import * as XLSX from 'xlsx';

export interface PayoutData {
  UCC: string;
  ClientName: string;
  Pay: number;
  AutoPayable: number;
  WebRequest: number;
  WebLogin: string;
  Segment: string;
  LedgerBalance?: number;
  Status?: 'OK' | 'Not OK';
  NSETotal?: number;
  MCXTotal?: number;
  Difference?: number;
  Margin?: number;
  NSESpan?: number; // Added NSE Span field
}

export interface LedgerData {
  [ucc: string]: {
    mcx: number;
    nseCm: number;
    nseFo: number;
    nseCds?: number;      // New field for CDS balance
  };
}

export const parseExcel = async (file: File): Promise<any[]> => {
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
          raw: false
        });
        
        // Find header row
        const headerRowIndex = (jsonData as any[]).findIndex((row: any) => 
          Array.isArray(row) && row.some((cell: any) => 
            String(cell).toLowerCase().includes('ucc') || 
            String(cell).toLowerCase().includes('client')
          )
        );
        
        if (headerRowIndex === -1) {
          throw new Error('Could not find header row in Excel file');
        }
        
        const headers = (jsonData[headerRowIndex] as string[]).map((header: string) => 
          header.replace(/\s+/g, '').replace(/<br>/gi, '')
        );
        
        const processedData = [];
        
        for (let i = headerRowIndex + 1; i < (jsonData as any[]).length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const rowObj: any = {};
          headers.forEach((header: string, index: number) => {
            rowObj[header] = row[index] || '';
          });
          
          processedData.push(rowObj);
        }
        
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

export const parseLedgerExcel = async (file: File): Promise<LedgerData> => {
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
          raw: false
        });
        
        // Find header row
        const headerRowIndex = (jsonData as any[]).findIndex((row: any) => 
          Array.isArray(row) && row.some((cell: any) => 
            String(cell).toLowerCase().includes('ucc') || 
            String(cell).toLowerCase().includes('mcx balance')
          )
        );
        
        if (headerRowIndex === -1) {
          throw new Error('Could not find header row in Ledger file');
        }
        
        const headers = (jsonData[headerRowIndex] as string[]).map((header: string) => 
          header.replace(/\s+/g, '').replace(/"/g, '')
        );
        
        const ledgerData: LedgerData = {};
        
        for (let i = headerRowIndex + 1; i < (jsonData as any[]).length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const ucc = String(row[headers.indexOf('UCC')] || '').trim();
          if (!ucc) continue;
          
          // Extract balances - convert to numbers and take absolute value
          const mcxBalance = Math.abs(parseFloat(String(row[headers.indexOf('MCXBalance')] || '0')));
          const nseCmBalance = Math.abs(parseFloat(String(row[headers.indexOf('NSE-CMBalance')] || '0')));
          const nseFoBalance = Math.abs(parseFloat(String(row[headers.indexOf('NSE-F&OBalance')] || '0')));
          
          // Look for CDS balance column (flexible matching)
          const cdsHeaderIndex = headers.findIndex(h => 
            h.toLowerCase().includes('cds') || 
            h.toLowerCase().includes('nse-cds')
          );
          const nseCdsBalance = cdsHeaderIndex !== -1 
            ? Math.abs(parseFloat(String(row[cdsHeaderIndex] || '0'))): 0;
          
          ledgerData[ucc] = {
            mcx: mcxBalance,
            nseCm: nseCmBalance,
            nseFo: nseFoBalance,
            nseCds: nseCdsBalance
          };
        }
        
        resolve(ledgerData);
      } catch (error) {
        console.error('Error parsing Ledger Excel:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Ledger file'));
    reader.readAsArrayBuffer(file);
  });
};

// Add MRG file parser
export const parseMrgFile = async (file: File): Promise<{[key: string]: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let mrgText = text;
        
        // Remove BOM if present
        if (mrgText.charCodeAt(0) === 0xFEFF) {
          mrgText = mrgText.substring(1);
        }

        const marginMap: {[key: string]: number} = {};
        const lines = mrgText.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          const values = trimmedLine.split(',');
          // Filter for row type 30 and ensure enough columns
          if (values[0] === '30' && values.length >= 13) {
            const ucc = values[3]?.trim();
            // Margin is the 13th column (index 12)
            const margin = parseFloat(values[12]) || 0;
            
            if (ucc) {
              marginMap[ucc] = margin;
            }
          }
        }
        
        resolve(marginMap);
      } catch (error) {
        console.error('Error parsing MRG file:', error);
        reject(new Error('Failed to parse MRG file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read MRG file'));
    reader.readAsText(file);
  });
};

// Add MG13 file parser for NSE Span calculation
export const parseMG13File = async (file: File): Promise<{[key: string]: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let mg13Text = text;
        
        // Remove BOM if present
        if (mg13Text.charCodeAt(0) === 0xFEFF) {
          mg13Text = mg13Text.substring(1);
        }

        const nseSpanMap: {[key: string]: number} = {};
        const lines = mg13Text.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          const values = trimmedLine.split(',');
          if (values.length >= 6) {
            // Extract UCC (column B, index 1)
            const ucc = values[1]?.trim();
            
            // Extract column C (index 2) and column E (index 4)
            const columnC = parseFloat(values[2]) || 0;
            const columnE = parseFloat(values[4]) || 0;
            
            // Calculate NSE Span as sum of column C and E
            const nseSpan = columnC + columnE;
            
            if (ucc) {
              nseSpanMap[ucc] = nseSpan;
            }
          }
        }
        
        resolve(nseSpanMap);
      } catch (error) {
        console.error('Error parsing MG13 file:', error);
        reject(new Error('Failed to parse MG13 file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read MG13 file'));
    reader.readAsText(file);
  });
};

export const processFiles = async (files: File[]) => {
  if (!files || files.length === 0) {
    throw new Error("Please select payout files to process");
  }

  let payoutData: PayoutData[] = [];
  let ledgerData: LedgerData = {};
  let marginData: {[key: string]: number} = {};
  let nseSpanData: {[key: string]: number} = {};
  
  // Process each file
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('ledger')) {
      ledgerData = await parseLedgerExcel(file);
    } else if (fileName.includes('mrg')) {
      // Handle MRG file
      marginData = await parseMrgFile(file);
    } else if (fileName.includes('mg13') || fileName.includes('f_mg13')) {
      // Handle MG13 file for NSE Span
      nseSpanData = await parseMG13File(file);
    } else {
      let segment = '';
      
      // Determine segment based on filename
      if (fileName.includes('mcx')) segment = 'MCX';
      else if (fileName.includes('fo')) segment = 'FO';
      else if (fileName.includes('cm')) segment = 'CM';
      else continue;
      
      const fileData = await parseExcel(file);
      
      const mappedData = fileData.map((row: any) => {
        // Clean and map column names
        const ucc = String(row.UCC || row['UCC'] || '').trim();
        const clientName = String(row.ClientName || row['ClientName'] || '');
        
        const parseNumber = (value: any): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const cleaned = value.replace(/,/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };
        
        return {
          UCC: ucc,
          ClientName: clientName,
          Pay: parseNumber(row.Pay),
          AutoPayable: parseNumber(row.AutoPayable),
          WebRequest: parseNumber(row.WebRequest || row['WebReqest']),
          WebLogin: String(row.WebLogin || row['WebLogin'] || ''),
          Segment: segment
        };
      });
      
      payoutData = [...payoutData, ...mappedData];
    }
  }
  
  // Add margin data and NSE Span data to payout records
  payoutData = payoutData.map(record => ({
    ...record,
    Margin: marginData[record.UCC] || 0,
    NSESpan: nseSpanData[record.UCC] || 0
  }));
    
  return { payoutData, ledgerData };
};

export const exportProcessedData = (processedData: PayoutData[]) => {
  const exportData = processedData.map(row => ({
    UCC: row.UCC,
    'Client Name': row.ClientName,
    Pay: row.Pay,
    'Auto Payable': row.AutoPayable,
    'Web Request': row.WebRequest,
    'Web Login': row.WebLogin,
    Segment: row.Segment,
    'Ledger Balance': row.LedgerBalance,
    'NSE Total': row.NSETotal,
    'MCX Total': row.MCXTotal,
    'NSE Span': row.NSESpan,
    'MRG Margin': row.Margin,
    'Difference': row.Difference,
    Status: row.Status
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payout Data');
  XLSX.writeFile(wb, 'payout_processed_data.xlsx');
};

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const processDataWithLedger = (
  payoutData: PayoutData[], 
  ledgerData: LedgerData
): PayoutData[] => {
  return payoutData.map(payout => {
    const ledgerEntry = ledgerData[payout.UCC];
    let ledgerBalance = 0;
    let status: 'OK' | 'Not OK' = 'Not OK';
    let nseTotal = 0;
    let mcxTotal = 0;
    let difference = 0;

    if (ledgerEntry) {
      // Calculate NSE total (CM + FO + CDS)
      nseTotal = (ledgerEntry.nseCm || 0) + 
                 (ledgerEntry.nseFo || 0) + 
                 (ledgerEntry.nseCds || 0);
      
      // Get MCX total
      mcxTotal = ledgerEntry.mcx || 0;
      
      // Determine segment-specific balance
      switch (payout.Segment) {
        case 'MCX':
          ledgerBalance = Math.abs(ledgerEntry.mcx);
          break;
        case 'CM':
          ledgerBalance = Math.abs(ledgerEntry.nseCm);
          break;
        case 'FO':
          ledgerBalance = Math.abs(ledgerEntry.nseFo);
          break;
      }
      
      // Calculate available balance based on segment
      let availableBalance = ledgerBalance;
      
      if (payout.Segment === 'MCX') {
        // For MCX: available = ledgerBalance - Margin
        availableBalance = ledgerBalance - (payout.Margin || 0);
        difference = Math.round(mcxTotal - payout.Pay);
      } else {
        // For FO/CM: available = ledgerBalance - NSESpan
        availableBalance = nseTotal - (payout.NSESpan || 0);
        difference = Math.round(nseTotal - payout.Pay);

      }
      
      // Set status based on available balance
      status = availableBalance >= payout.Pay ? 'OK' : 'Not OK';
    }

    return {
      ...payout,
      LedgerBalance: ledgerBalance,
      Status: status,
      NSETotal: nseTotal,
      MCXTotal: mcxTotal,
      Difference: difference,
      Margin: payout.Margin, // Preserve margin value
      NSESpan: payout.NSESpan // Preserve NSE Span value
    };
  });
};

export const calculateSummary = (processedData: PayoutData[]) => {
  let okCount = 0;
  let notOkCount = 0;
  let totalPayout = 0;
  let totalLedgerBalance = 0;
  let totalNSESpan = 0;

  processedData.forEach(row => {
    totalPayout += row.Pay;
    if (row.LedgerBalance) totalLedgerBalance += row.LedgerBalance;
    if (row.NSESpan) totalNSESpan += row.NSESpan;
    if (row.Status === 'OK') okCount++;
    else notOkCount++;
  });

  return {
    totalRecords: processedData.length,
    totalPayout,
    totalLedgerBalance,
    totalNSESpan,
    okCount,
    notOkCount
  };
};

export const exportRMSLimitsFile = (processedData: PayoutData[]) => {
  // Filter only OK status records
  const okData = processedData.filter(row => row.Status === 'OK');

  // Sort so COM (MCX) segment comes first
  const sortedData = okData.sort((a, b) => {
    const segA = a.Segment === 'MCX' ? 0 : 1;
    const segB = b.Segment === 'MCX' ? 0 : 1;
    return segA - segB;
  });

  // Create RMS Limits content
  const lines = sortedData.map(row => {
    const segment = row.Segment === 'MCX' ? 'COM' : '';
    const amount = (row.Difference);
    return `${row.UCC}||${segment}||${amount}|||||||||||||no`;
  });

  // Add header at first line
  return ['RMS Limits', ...lines].join('\n');
};

export const exportmcxglobefile = (processedData: PayoutData[]): string => {
  // Filter only MCX segment with OK status
  const mcxOkData = processedData.filter(
    row => row.Segment === 'MCX' && row.Status === 'OK'
  );

  if (mcxOkData.length === 0) return "";

  // Get date for file content (DD-MMM-YYYY)
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');

  // Format each record
  const mcxContent = mcxOkData.map(row => 
    `${currentDate},CO,8090,46365,,${row.UCC},C,${Math.round(row.Pay)},,,,,,,D`
  ).join('\n');

  // Create header
  const header =
    'Current Date,Segment Indicator,Clearing Member Code,Trading Member Code,CP Code,Client Code,Account Type,CASH & CASH EQUIVALENTS AMOUNT,Filler1,Filler2,Filler3,Filler4,Filler5,Filler6,ACTION\n';

  return header + mcxContent + '\n';
};