
import * as XLSX from 'xlsx';

export interface NseFoData {
  clicode: string;
  ledgerAmount: number;
  globeAmount: number;
  cc01Margin: number;
  ninetyPercentLedger: number;
  shortValue: number;
  action: 'U' | 'D';
  difference: number;
}

export interface NseFoSummary {
  upgradeTotal: number;
  downgradeTotal: number;
  netValue: number;
  proFund: number;
  finalAmount: number;
  negativeShortTotal: number;
}

export interface NseFoOutputRecord {
  currentDate: string;
  segment: string;
  cmCode: string;
  tmCode: string;
  cpCode: string;
  clicode: string;
  accountType: string;
  amount: number;
  filler1: string;
  filler2: string;
  filler3: string;
  filler4: string;
  filler5: string;
  filler6: string;
  action: string;
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
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false
        });
        
        const processedData = [];
        let headerRow: any[] = [];
        let headerRowIndex = -1;
        
        // Find the header row that contains "UCC" and "NSE-FO Balance"
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row && row.some(cell => String(cell).includes('UCC'))) {
            headerRow = row;
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          throw new Error('Could not find header row with UCC');
        }
        
        // Find column indices
        const uccIndex = headerRow.findIndex(h => String(h).includes('UCC'));
        const nseFoIndex = headerRow.findIndex(h => String(h).includes('NSE-FO'));
        const nameIndex = headerRow.findIndex(h => String(h).includes('Name'));
        
        if (uccIndex === -1 || nseFoIndex === -1) {
          throw new Error('Could not find required columns');
        }
        
        console.log('Header row:', headerRow);
        console.log('UCC Index:', uccIndex, 'NSE-FO Index:', nseFoIndex);
        
        // Process data rows
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const ucc = row[uccIndex] ? String(row[uccIndex]).trim() : '';
          const nseFoBalance = row[nseFoIndex] ? String(row[nseFoIndex]).trim() : '0';
          const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
          
          // Skip rows without UCC or with invalid UCC
          if (!ucc || ucc === '' || ucc === 'undefined' || ucc === '#N/A') {
            continue;
          }
          
          // Parse NSE-FO Balance - handle negative values and "Cr" suffix
          let balance = 0;
          if (nseFoBalance && nseFoBalance !== '0.00') {
            const cleanBalance = nseFoBalance.replace(/[^\d.-]/g, '');
            const rawValue = parseFloat(cleanBalance) || 0;
            const adjustedValue = rawValue * -1;
            if (adjustedValue > 0) {
              balance = adjustedValue;
            }
          }
          
          console.log(`Processing: UCC=${ucc}, Balance=${balance}, Original=${nseFoBalance}`);
          
          // Only include rows with balance > 0
          if (balance > 0) {
            processedData.push({
              Name: name,
              UCC: ucc,
              NSE_FO_Balance: balance
            });
          }
        }
        
        console.log('Processed risk data:', processedData);
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

// Helper function to parse CC01 CSV file
const parseCC01CSV = (csvText: string): { [key: string]: number } => {
  const lines = csvText.split('\n');
  const cc01Data: { [key: string]: number } = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length >= 6) {
      const ucc = values[0]; // Column A
      const cc01Margin = parseFloat(values[5]) || 0; // Column F
      
      if (ucc && cc01Margin > 0) {
        cc01Data[ucc] = cc01Margin;
      }
    }
  }
  
  return cc01Data;
};

export const processNseFoFiles = async (files: {
  risk: File | null;
  nse: File | null;
  cc01: File | null;
}, unallocatedFund: number = 0): Promise<{ data: NseFoData[]; summary: NseFoSummary; outputRecords: NseFoOutputRecord[] }> => {
  if (!files.risk || !files.nse || !files.cc01) {
    throw new Error('All files (Risk, NSE, CC01) are required');
  }

  try {
    // Process Risk Excel file
    const riskData = await parseExcel(files.risk);
    console.log('Risk data:', riskData);

    // Process NSE CSV file
    const nseText = await files.nse.text();
    const nseData = parseCSV(nseText);
    console.log('NSE data:', nseData);
    
    // Group NSE data by Clicode for FO segment and get ProFund
    const nseAllocations: { [key: string]: number } = {};
    let proFund = 0;
    const validNseData = nseData.filter(row => row.Clicode || row.Acctype);
    
    validNseData.forEach(row => {
      const clicode = String(row.Clicode || '').trim();
      const segment = String(row.Segments || '').trim();
      const allocated = parseFloat(row.Allocated) || 0;
      const accType = String(row.Acctype || '').trim();
      
      if (segment === 'FO') {
        if (accType === 'P') {
          proFund = allocated; // ProFund value from Acctype P segments FO
        } else if (clicode) {
          if (!nseAllocations[clicode]) {
            nseAllocations[clicode] = 0;
          }
          nseAllocations[clicode] += allocated;
        }
      }
    });

    console.log('NSE Allocations:', nseAllocations);
    console.log('ProFund:', proFund);

    // Process CC01 CSV file
    const cc01Text = await files.cc01.text();
    const cc01Data = parseCC01CSV(cc01Text);
    console.log('CC01 data:', cc01Data);

    // Process each record
    const processedData: NseFoData[] = [];
    const outputRecords: NseFoOutputRecord[] = [];
    let upgradeTotal = 0;
    let downgradeTotal = 0;
    let negativeShortTotal = 0;
    
    // Get current date in DD-MMM-YYYY format with hyphens (05-Aug-2025)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const currentDate = `${day}-${month}-${year}`;

    // 1. Process risk data records
    riskData.forEach(riskRow => {
      const ucc = riskRow.UCC;
      const ledgerAmount = riskRow.NSE_FO_Balance || 0;
      const globeAmount = nseAllocations[ucc] || 0;
      const cc01Margin = cc01Data[ucc] || 0;
      const ninetyPercentLedger = ledgerAmount * 0.9;
      const shortValue = ninetyPercentLedger - cc01Margin;
      const difference = ledgerAmount - globeAmount;
      
      console.log(`Processing ${ucc}: Ledger=${ledgerAmount}, Globe=${globeAmount}, CC01=${cc01Margin}, 90%=${ninetyPercentLedger}, Short=${shortValue}, Difference=${difference}`);

      // Skip records with zero difference
      if (Math.abs(difference) <= 0.01) {
        console.log(`Skipping ${ucc} - zero difference`);
        return;
      }

      // Skip records where both ledger and globe amounts are zero
      if (ledgerAmount === 0 && globeAmount === 0) {
        console.log(`Skipping ${ucc} - both amounts are zero`);
        return;
      }

      let action: 'U' | 'D' = ledgerAmount > globeAmount ? 'U' : 'D';
      
      if (action === 'U') {
        upgradeTotal += Math.abs(difference);
      } else {
        downgradeTotal += Math.abs(difference);
      }

      // Add negative short values to negativeShortTotal
      if (shortValue < 0) {
        negativeShortTotal += Math.abs(shortValue);
      }

      processedData.push({
        clicode: ucc,
        ledgerAmount,
        globeAmount,
        cc01Margin,
        ninetyPercentLedger,
        shortValue,
        action,
        difference,
      });

      outputRecords.push({
        currentDate,
        segment: 'FO',
        cmCode: 'M50302',
        tmCode: '90221',
        cpCode: '',
        clicode: ucc,
        accountType: 'C',
        amount: ledgerAmount,
        filler1: '',
        filler2: '',
        filler3: '',
        filler4: '',
        filler5: '',
        filler6: '',
        action: action,
      });
    });

    // 2. Add records for globe file clients missing in risk file (but only if they have allocations > 0)
    const processedCliCodes = new Set(riskData.map(row => row.UCC));
    for (const clicode in nseAllocations) {
      const allocation = nseAllocations[clicode];
      if (
        !processedCliCodes.has(clicode) &&
        allocation > 0
      ) {
        console.log(`Adding missing client ${clicode} from globe file with allocation ${allocation}`);
        
        const cc01Margin = cc01Data[clicode] || 0;
        const ninetyPercentLedger = 0;
        const shortValue = ninetyPercentLedger - cc01Margin;
        const difference = 0 - allocation;
        
        processedData.push({
          clicode,
          ledgerAmount: 0,
          globeAmount: allocation,
          cc01Margin,
          ninetyPercentLedger,
          shortValue,
          action: 'D',
          difference,
        });
        
        downgradeTotal += allocation;
        
        // Add negative short values to negativeShortTotal
        if (shortValue < 0) {
          negativeShortTotal += Math.abs(shortValue);
        }
        
        outputRecords.push({
          currentDate,
          segment: 'FO',
          cmCode: 'M50302',
          tmCode: '90221',
          cpCode: '',
          clicode: clicode,
          accountType: 'C',
          amount: 0,
          filler1: '',
          filler2: '',
          filler3: '',
          filler4: '',
          filler5: '',
          filler6: '',
          action: 'D',
        });
      }
    }

    // Calculate summary values using new formula
    const netValue = upgradeTotal - downgradeTotal;
    const finalproFund = proFund - 8000000;
    const unallocatedFundAmount = unallocatedFund * 100000;
    const finalAmount = parseFloat((finalproFund - netValue + unallocatedFundAmount).toFixed(2));

    const summary: NseFoSummary = {
      upgradeTotal,
      downgradeTotal,
      netValue,
      proFund,
      finalAmount,
      negativeShortTotal,
    };

    // 3. Add ProFund record using finalAmount at the beginning with correct action logic
    const proFundAction: 'U' | 'D' = proFund < finalAmount ? 'U' : 'D';
    
    outputRecords.unshift({
      currentDate,
      segment: 'FO',
      cmCode: 'M50302',
      tmCode: '90221',
      cpCode: '',
      clicode: '',
      accountType: 'P',
      amount: finalAmount,
      filler1: '',
      filler2: '',
      filler3: '',
      filler4: '',
      filler5: '',
      filler6: '',
      action: proFundAction,
    });

    console.log('Final summary:', summary);
    console.log('Processed data count:', processedData.length);

    return { data: processedData, summary, outputRecords };

  } catch (error) {
    console.error('Error processing NSE FO files:', error);
    throw new Error('Failed to process files. Please check file formats and try again.');
  }
};
