import * as XLSX from 'xlsx';

export interface NseCmData {
  clicode: string;
  ledgerAmount: number;
  globeAmount: number;
  action: 'U' | 'D';
  difference: number;
}

export interface NseCmSummary {
  upgradeTotal: number;
  downgradeTotal: number;
  netValue: number;
  proFund: number;
  finalAmount: number;
}

export interface NseCmOutputRecord {
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
        
        // Find the header row that contains "UCC" and "NSE-CM Balance"
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
        const nseCmIndex = headerRow.findIndex(h => String(h).includes('NSE-CM'));
        const nameIndex = headerRow.findIndex(h => String(h).includes('Name'));
        
        if (uccIndex === -1 || nseCmIndex === -1) {
          throw new Error('Could not find required columns');
        }
        
        console.log('Header row:', headerRow);
        console.log('UCC Index:', uccIndex, 'NSE-CM Index:', nseCmIndex);
        
        // Process data rows
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const ucc = row[uccIndex] ? String(row[uccIndex]).trim() : '';
          const nseCmBalance = row[nseCmIndex] ? String(row[nseCmIndex]).trim() : '0';
          const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
          
          // Skip rows without UCC or with invalid UCC
          if (!ucc || ucc === '' || ucc === 'undefined' || ucc === '#N/A') {
            continue;
          }
          
          // Parse NSE-CM Balance - handle negative values and "Cr" suffix
          let balance = 0;
          if (nseCmBalance && nseCmBalance !== '0.00') {
            const cleanBalance = nseCmBalance.replace(/[^\d.-]/g, ''); // Remove non-numeric characters except minus and dot
            const rawValue = parseFloat(cleanBalance) || 0;
            // CHANGES START HERE: Multiply by -1 and only take positive values
            const adjustedValue = rawValue * -1;
            if (adjustedValue > 0) {
              balance = adjustedValue;
            }
          }
          
          console.log(`Processing: UCC=${ucc}, Balance=${balance}, Original=${nseCmBalance}`);
          
          // Only include rows with balance > 0
          if (balance > 0) {
            processedData.push({
              Name: name,
              UCC: ucc,
              NSE_CM_Balance: balance
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

// Helper function to parse NRI Excel file
const parseNriExcel = async (file: File): Promise<string[]> => {
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
        
        const nriCodes: string[] = [];
        
        // Find header row and NRI LIST column
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row && row[0] && String(row[0]).toLowerCase().includes('nri list')) {
            // Found NRI LIST header, collect codes from column A starting from next row
            for (let j = i + 1; j < jsonData.length; j++) {
              const dataRow = jsonData[j] as any[];
              if (dataRow && dataRow[0] && String(dataRow[0]).trim()) {
                nriCodes.push(String(dataRow[0]).trim());
              }
            }
            break;
          }
        }
        
        resolve(nriCodes);
      } catch (error) {
        console.error('Error parsing NRI Excel:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read NRI Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

export const processNseCmFiles = async (files: {
  risk: File | null;
  nse: File | null;
  nri: File | null;
}, unallocatedFund: number = 0): Promise<{ data: NseCmData[]; summary: NseCmSummary; outputRecords: NseCmOutputRecord[] }> => {
  if (!files.risk || !files.nse || !files.nri) {
    throw new Error('All files (Risk, NSE, NRI) are required');
  }

  try {
    // Process Risk Excel file
    const riskData = await parseExcel(files.risk);
    console.log('Risk data:', riskData);

    // Process NSE CSV file
    const nseText = await files.nse.text();
    const nseData = parseCSV(nseText);
    console.log('NSE data:', nseData);
    
    // Group NSE data by Clicode for CM segment and get ProFund
    const nseAllocations: { [key: string]: number } = {};
    let proFund = 0;
    const validNseData = nseData.filter(row => row.Clicode || row.Acctype);
    
    validNseData.forEach(row => {
      const clicode = String(row.Clicode || '').trim();
      const segment = String(row.Segments || '').trim();
      const allocated = parseFloat(row.Allocated) || 0;
      const accType = String(row.Acctype || '').trim();
      
      if (segment === 'CM') {
        if (accType === 'P') {
          proFund = allocated; // ProFund value from Acctype P segments CM
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

    // Process NRI Excel file to get excluded codes
    const nriExcludeCodes = await parseNriExcel(files.nri);
    console.log('NRI exclude codes:', nriExcludeCodes);

    // Process each record
    const processedData: NseCmData[] = [];
    const outputRecords: NseCmOutputRecord[] = [];
    let upgradeTotal = 0;
    let downgradeTotal = 0;
    
    // Get current date in DD-MMM-YYYY format with hyphens (05-Aug-2025)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const currentDate = `${day}-${month}-${year}`;

    // 1. Process risk data records
    riskData.forEach(riskRow => {
      const ucc = riskRow.UCC;
      
      // Skip if UCC is in NRI exclude list
      if (nriExcludeCodes.includes(ucc)) {
        console.log(`Skipping ${ucc} - in NRI exclude list`);
        return;
      }
      
      const ledgerAmount = riskRow.NSE_CM_Balance || 0;
      const globeAmount = nseAllocations[ucc] || 0;
      const difference = ledgerAmount - globeAmount; // Changed: ledger - globe for correct difference calculation
      
      console.log(`Processing ${ucc}: Ledger=${ledgerAmount}, Globe=${globeAmount}, Difference=${difference}`);

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

      // Correct action logic: if ledger > globe = U, if ledger < globe = D
      let action: 'U' | 'D' = ledgerAmount > globeAmount ? 'U' : 'D';
      
      if (action === 'U') {
        upgradeTotal += Math.abs(difference);
      } else {
        downgradeTotal += Math.abs(difference);
      }

      processedData.push({
        clicode: ucc,
        ledgerAmount,
        globeAmount,
        action,
        difference,
      });

      outputRecords.push({
        currentDate,
        segment: 'CM',
        cmCode: 'M50302',
        tmCode: '90221',
        cpCode: '',
        clicode: ucc,
        accountType: 'C',
        amount: ledgerAmount, // Use ledger amount in output
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
        !nriExcludeCodes.includes(clicode) &&
        allocation > 0 // Only include if there's actual allocation
      ) {
        console.log(`Adding missing client ${clicode} from globe file with allocation ${allocation}`);
        
        // For missing clients: ledger=0, globe=allocation, so ledger < globe = D
        const difference = 0 - allocation; // ledger - globe = 0 - allocation
        
        processedData.push({
          clicode,
          ledgerAmount: 0,
          globeAmount: allocation,
          action: 'D', // Since ledger (0) < globe (allocation)
          difference,
        });
        
        downgradeTotal += allocation;
        
        outputRecords.push({
          currentDate,
          segment: 'CM',
          cmCode: 'M50302',
          tmCode: '90221',
          cpCode: '',
          clicode: clicode,
          accountType: 'C',
          amount: 0, // Use ledger amount (0) in output
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
    const finalProFund = proFund - 8000000;
    const unallocatedFundAmount = unallocatedFund * 100000; // Convert lacs to actual amount
    const finalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));

    const summary: NseCmSummary = {
      upgradeTotal,
      downgradeTotal,
      netValue,
      proFund,
      finalAmount,
    };

    // 3. Add ProFund record using finalAmount at the beginning with correct action logic
    const proFundAction: 'U' | 'D' = proFund < finalAmount ? 'U' : 'D';
    
    outputRecords.unshift({
      currentDate,
      segment: 'CM',
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
    console.error('Error processing NSE CM files:', error);
    throw new Error('Failed to process files. Please check file formats and try again.');
  }
};