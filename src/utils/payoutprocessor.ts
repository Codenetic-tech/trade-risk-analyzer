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
  Status?: 'OK' | 'Not OK' | 'JV CODE OK' | 'JV CODE Not OK';
  NSETotal?: number;
  MCXTotal?: number;
  Difference?: number;
  Margin?: number;
  NSESpan?: number;
  ManualStatus?: 'OK' | 'Not OK' | 'JV CODE OK' | 'JV CODE Not OK'; // Add this line
}

export interface LedgerData {
  [ucc: string]: {
    mcx: number;
    nseCm: number;
    nseFo: number;
    nseCds?: number;
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

export const parseJVCodeFile = async (file: File): Promise<Set<string>> => {
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
        
        // Find header row containing "UCC"
        const headerRowIndex = (jsonData as any[]).findIndex((row: any) => 
          Array.isArray(row) && row.some((cell: any) => 
            String(cell).toLowerCase().includes('ucc')
          )
        );
        
        if (headerRowIndex === -1) {
          throw new Error('Could not find UCC header in JV code file');
        }
        
        const headers = (jsonData[headerRowIndex] as string[]);
        const uccColumnIndex = headers.findIndex(header => 
          String(header).toLowerCase().includes('ucc')
        );
        
        if (uccColumnIndex === -1) {
          throw new Error('Could not find UCC column in JV code file');
        }
        
        const jvCodes = new Set<string>();
        
        // Process data rows
        for (let i = headerRowIndex + 1; i < (jsonData as any[]).length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const uccValue = String(row[uccColumnIndex] || '').trim();
          if (uccValue) {
            jvCodes.add(uccValue);
          }
        }
        
        console.log(`Parsed ${jvCodes.size} JV codes:`, Array.from(jvCodes));
        resolve(jvCodes);
      } catch (error) {
        console.error('Error parsing JV code file:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read JV code file'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseMrgFile = async (file: File): Promise<{[key: string]: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let mrgText = text;
        
        if (mrgText.charCodeAt(0) === 0xFEFF) {
          mrgText = mrgText.substring(1);
        }

        const marginMap: {[key: string]: number} = {};
        const lines = mrgText.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          const values = trimmedLine.split(',');
          if (values[0] === '30' && values.length >= 13) {
            const ucc = values[3]?.trim();
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

export const parseMG13File = async (file: File): Promise<{[key: string]: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let mg13Text = text;
        
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
            const ucc = values[1]?.trim();
            const columnC = parseFloat(values[2]) || 0;
            const columnE = parseFloat(values[4]) || 0;
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
  let jvCodes: Set<string> = new Set();
  
  // Process each file
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('ledger')) {
      ledgerData = await parseLedgerExcel(file);
    } else if (fileName.includes('jv code') || fileName.includes('jvcode')) {
      jvCodes = await parseJVCodeFile(file);
    } else if (fileName.includes('mrg')) {
      marginData = await parseMrgFile(file);
    } else if (fileName.includes('mg13') || fileName.includes('f_mg13')) {
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
    
 // FIXED: Improved duplicate handling logic
  const uccMap = new Map<string, PayoutData[]>();
  const duplicates: string[] = [];

  // Group records by UCC
  for (const record of payoutData) {
    if (!uccMap.has(record.UCC)) {
      uccMap.set(record.UCC, []);
    }
    uccMap.get(record.UCC)!.push(record);
  }

  // Process each UCC group
  const processedData: PayoutData[] = [];
  
  for (const [ucc, records] of uccMap) {
    if (records.length === 1) {
      processedData.push(records[0]);
      continue;
    }

    // Check segments present
    const hasMCX = records.some(r => r.Segment === 'MCX');
    const hasCM = records.some(r => r.Segment === 'CM');
    const hasFO = records.some(r => r.Segment === 'FO');
    
    console.log(`Processing UCC ${ucc}: MCX=${hasMCX}, CM=${hasCM}, FO=${hasFO}`);
    
    // If we have MCX and any NSE segment, keep them separate
    if (hasMCX && (hasCM || hasFO)) {
      // Keep MCX record as is
      const mcxRecord = records.find(r => r.Segment === 'MCX');
      if (mcxRecord) {
        processedData.push(mcxRecord);
        console.log(`Added MCX record for ${ucc}: Pay=${mcxRecord.Pay}`);
      }
      
      // Handle NSE records (CM and/or FO)
      const nseRecords = records.filter(r => r.Segment === 'CM' || r.Segment === 'FO');
      if (nseRecords.length > 0) {
        if (nseRecords.length === 1) {
          // Only one NSE segment, keep as is
          processedData.push(nseRecords[0]);
          console.log(`Added single NSE record for ${ucc}: ${nseRecords[0].Segment}, Pay=${nseRecords[0].Pay}`);
        } else {
          // Check if CM and FO have the same payout amount
          const cmRecord = nseRecords.find(r => r.Segment === 'CM');
          const foRecord = nseRecords.find(r => r.Segment === 'FO');
          
          if (cmRecord && foRecord && cmRecord.Pay === foRecord.Pay) {
            // Same amount: remove CM, keep FO
            processedData.push(foRecord);
            console.log(`Removed CM record (same amount), kept FO for ${ucc}: Pay=${foRecord.Pay}`);
          } else {
            // Different amounts: combine them
            const combinedRecord = {
              ...nseRecords[0], // Start with first record
              Segment: 'CM+FO',
              Pay: nseRecords.reduce((sum, record) => {
                console.log(`Adding ${record.Segment} Pay: ${record.Pay}`);
                return sum + record.Pay;
              }, 0)
            };
            
            processedData.push(combinedRecord);
            console.log(`Added combined NSE record for ${ucc}: Pay=${combinedRecord.Pay}`);
            duplicates.push(ucc);
          }
        }
      }
    } else if (hasCM && hasFO && !hasMCX) {
      // Check if CM and FO have the same payout amount
      const cmRecord = records.find(r => r.Segment === 'CM');
      const foRecord = records.find(r => r.Segment === 'FO');
      
      if (cmRecord && foRecord && cmRecord.Pay === foRecord.Pay) {
        // Same amount: remove CM, keep FO
        processedData.push(foRecord);
        console.log(`Removed CM record (same amount), kept FO for ${ucc}: Pay=${foRecord.Pay}`);
      } else {
        // Different amounts: combine them
        const combinedRecord = {
          ...records[0], // Start with first record
          Segment: 'CM+FO',
          Pay: records.reduce((sum, record) => {
            console.log(`Combining ${record.Segment} Pay: ${record.Pay}`);
            return sum + record.Pay;
          }, 0)
        };
        
        processedData.push(combinedRecord);
        console.log(`Added CM+FO combined record for ${ucc}: Pay=${combinedRecord.Pay}`);
        duplicates.push(ucc);
      }
    } else {
      // Other cases - this shouldn't happen often, but handle gracefully
      console.log(`Unexpected case for UCC ${ucc}, keeping first record`);
      processedData.push(records[0]);
    }
  }

  console.log(`Final processed data count: ${processedData.length}`);
  
  return { payoutData: processedData, ledgerData, duplicates, jvCodes };
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
  ledgerData: LedgerData,
  jvCodes?: Set<string>
): PayoutData[] => {
  return payoutData.map(payout => {
    const ledgerEntry = ledgerData[payout.UCC];
    let ledgerBalance = 0;
    let status: 'OK' | 'Not OK' | 'JV CODE OK' | 'JV CODE Not OK' = 'Not OK';
    let nseTotal = 0;
    let mcxTotal = 0;
    let difference = 0;

    // Check if UCC is in JV codes first
    if (jvCodes && jvCodes.has(payout.UCC)) {
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
            difference = mcxTotal - payout.Pay;
            break;
          case 'CM':
            ledgerBalance = Math.abs(ledgerEntry.nseCm);
            difference = nseTotal - payout.Pay;
            break;
          case 'FO':
            ledgerBalance = Math.abs(ledgerEntry.nseFo);
            difference = nseTotal - payout.Pay;
            break;
          case 'CM+FO':
            ledgerBalance = ledgerEntry.nseCm + ledgerEntry.nseFo;
            difference = nseTotal - payout.Pay;
            break;
        }
        
        status = 'JV CODE OK';
      } else {
        status = 'JV CODE Not OK';
      }
    } else if (ledgerEntry) {
      // Regular processing for non-JV codes
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
        case 'CM+FO':
          // For combined segment, use total NSE balance
          ledgerBalance = ledgerEntry.nseCm + ledgerEntry.nseFo;
          break;
      }
      
      // Calculate available balance based on segment
      let availableBalance = ledgerBalance;
      
      if (payout.Segment === 'MCX') {
        // For MCX: available = ledgerBalance - Margin
        availableBalance = ledgerBalance - (payout.Margin || 0);
        difference = mcxTotal - payout.Pay;
        
        // Set status based on available balance and margin
        if (payout.Margin === 0) {
          // If margin is 0, process whatever ledger amount is available
          status = 'OK';
        } else {
          status = availableBalance >= payout.Pay ? 'OK' : 'Not OK';
        }
      } else {
        // For FO/CM: available = ledgerBalance - NSESpan
        availableBalance = nseTotal - (payout.NSESpan || 0);
        difference = nseTotal - payout.Pay;
        
        // Set status based on available balance and NSE span
        if (payout.NSESpan === 0) {
          // If NSE span is 0, process whatever ledger amount is available
          status = 'OK';
        } else {
          status = availableBalance >= payout.Pay ? 'OK' : 'Not OK';
        }
      }
    }

    return {
      ...payout,
      LedgerBalance: ledgerBalance,
      Status: status,
      NSETotal: nseTotal,
      MCXTotal: mcxTotal,
      Difference: difference,
      Margin: payout.Margin,
      NSESpan: payout.NSESpan
    };
  });
};

export const calculateSummary = (processedData: PayoutData[], duplicates: string[]) => {
  let okCount = 0;
  let notOkCount = 0;
  let jvCodeOkCount = 0;
  let jvCodeNotOkCount = 0;
  let totalPayout = 0; // Only include OK and JV CODE OK records
  let totalLedgerBalance = 0;
  let totalNSESpan = 0;
  let okCounts = 0;
  let notOkCounts = 0;

  // Segment-wise totals for NSE Globe file export amounts
  let totalFOAmount = 0;
  let totalCMAmount = 0;
  let totalMCXAmount = 0;

  processedData.forEach(row => {
    // Only add to totalPayout if status is OK or JV CODE OK
    if (row.Status === 'OK' || row.Status === 'JV CODE OK') {
      totalPayout += row.Pay;
    
       // Calculate segment-wise export amounts (only for OK statuses)
      if (row.Segment === 'FO') {
        totalFOAmount += row.Pay || 0;
      } else if (row.Segment === 'CM') {
        totalCMAmount += row.Pay || 0;
      } else if (row.Segment === 'CM+FO') {
        // For combined segments: CM gets 0, FO gets full difference
        totalCMAmount += 0;
        totalFOAmount += row.Pay || 0;
      } else if (row.Segment === 'MCX') {
        totalMCXAmount += row.Pay || 0;
      }
    }
    
    
    if (row.LedgerBalance) totalLedgerBalance += row.LedgerBalance;
    if (row.NSESpan) totalNSESpan += row.NSESpan;
    
    switch (row.Status) {
      case 'OK':
        okCount++;
        break;
      case 'Not OK':
        notOkCount++;
        break;
      case 'JV CODE OK':
        jvCodeOkCount++;
        break;
      case 'JV CODE Not OK':
        jvCodeNotOkCount++;
        break;
    }
  });

  okCounts = okCount + jvCodeOkCount;
  notOkCounts = notOkCount + jvCodeNotOkCount;

  return {
    totalRecords: processedData.length,
    totalPayout,
    totalLedgerBalance,
    totalNSESpan,
    okCounts,
    notOkCounts,
    duplicateCount: duplicates.length,
    duplicateUCCs: duplicates,
    totalFOAmount,
    totalCMAmount,
    totalMCXAmount
  };
};

export const exportRMSLimitsFile = (processedData: PayoutData[]) => {
  // Filter only OK status records (including JV CODE OK)
  const okData = processedData.filter(row => 
    row.Status === 'OK' || row.Status === 'JV CODE OK'
  );

  // Sort so COM (MCX) segment comes first
  const sortedData = okData.sort((a, b) => {
    const segA = a.Segment === 'MCX' ? 0 : 1;
    const segB = b.Segment === 'MCX' ? 0 : 1;
    return segA - segB;
  });

  // Create RMS Limits content
  const lines = sortedData.map(row => {
    const segment = row.Segment === 'MCX' ? 'COM' : '';
    const amount = Math.round(row.Difference);
    return `${row.UCC}||${segment}||${amount}|||||||||||||no`;
  });

  // Add header at first line
  return ['RMS Limits', ...lines].join('\n');
};

export const exportmcxglobefile = (processedData: PayoutData[]): string => {
  // Filter only MCX segment with OK status (including JV CODE OK)
  const mcxOkData = processedData.filter(
    row => row.Segment === 'MCX' && (row.Status === 'OK' || row.Status === 'JV CODE OK')
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
    `${currentDate},CO,8090,46365,,${row.UCC},C,${(row.Pay)},,,,,,,D`
  ).join('\n');

  // Create header
  const header =
    'Current Date,Segment Indicator,Clearing Member Code,Trading Member Code,CP Code,Client Code,Account Type,CASH & CASH EQUIVALENTS AMOUNT,Filler1,Filler2,Filler3,Filler4,Filler5,Filler6,ACTION\n';

  return header + mcxContent + '\n';
};

export const exportNSEGlobeFile = (processedData: PayoutData[], ledgerData: LedgerData): string => {
  // Filter only NSE segments (CM, FO, and combined CM+FO) with OK status (including JV CODE OK)
  const nseOkData = processedData.filter(
    row => (row.Segment === 'CM' || row.Segment === 'FO' || row.Segment === 'CM+FO') && 
           (row.Status === 'OK' || row.Status === 'JV CODE OK')
  );

  if (nseOkData.length === 0) return '';

  // Get current date in DD-MMM-YYYY format
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');

  // Helper function to format numbers without trailing zeros
  const formatAmount = (num: number): string => {
    if (num === 0) return '0';
    
    // Convert to string and remove trailing zeros and decimal point if needed
    return num.toString().replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  };

  const lines = [];

  for (const row of nseOkData) {
    if (row.Segment === 'CM' || row.Segment === 'FO') {
      const ledgerEntry = ledgerData[row.UCC];
      
      if (ledgerEntry) {
        // For CM/FO segments, check if CM amount is sufficient
        if (row.Segment === 'CM') {
          // For CM segment, check if CM ledger amount >= payout
          if (ledgerEntry.nseCm >= row.Pay) {
            // CM amount is sufficient, set difference in CM segment
            const cmAmount = Number(row.Difference);
            lines.push(
              `${currentDate},CM,M50302,90221,,${row.UCC},C,${formatAmount(cmAmount)},,,,,,,D`
            );
          } else {
            // CM amount is insufficient, set 0 in CM and difference in FO
            lines.push(
              `${currentDate},CM,M50302,90221,,${row.UCC},C,0,,,,,,,D`
            );
            const foAmount = Number(row.Difference);
            lines.push(
              `${currentDate},FO,M50302,90221,,${row.UCC},C,${formatAmount(foAmount)},,,,,,,D`
            );
          }
        } else if (row.Segment === 'FO') {
          // For FO segment, check if CM ledger amount >= payout
          if (ledgerEntry.nseCm >= row.Pay) {
            // CM amount is sufficient, set difference in CM segment
            const cmAmount = Number(row.Difference);
            lines.push(
              `${currentDate},CM,M50302,90221,,${row.UCC},C,${formatAmount(cmAmount)},,,,,,,D`
            );
          } else {
            // CM amount is insufficient, set difference in FO segment
            const foAmount = Number(row.Difference);
            lines.push(
              `${currentDate},FO,M50302,90221,,${row.UCC},C,${formatAmount(foAmount)},,,,,,,D`
            );
          }
        }
      }
    } else if (row.Segment === 'CM+FO') {
      // For combined segments, leave as is (CM gets 0, FO gets full difference)
      const cmAmount = 0;
      const foAmount = Number(row.Difference);
      
      lines.push(
        `${currentDate},CM,M50302,90221,,${row.UCC},C,${formatAmount(cmAmount)},,,,,,,D`
      );
      lines.push(
        `${currentDate},FO,M50302,90221,,${row.UCC},C,${formatAmount(foAmount)},,,,,,,D`
      );
    }
  }

  // Add header
  const header = 'CURRENTDATE,SEGMENT,CMCODE,TMCODE,CPCODE,CLICODE,ACCOUNTTYPE,AMOUNT,FILLER1,FILLER2,FILLER3,FILLER4,FILLER5,FILLER6,ACTION';
  
  return [header, ...lines].join('\n');
};