import * as XLSX from 'xlsx';

export interface NseFoData {
  clicode: string;
  ledgerAmount: number;
  globeAmount: number;
  action: 'U' | 'D';
  difference: number;
  cc01Margin: number; // New field
  ninetyPercentLedger: number; // New field
  shortValue: number; // New field
  ninetyabove: number;
}

export interface NseFoSummary {
  upgradeTotal: number;
  downgradeTotal: number;
  netValue: number;
  proFund: number;
  finalAmount: number;
  negativeShortValue: number; // NEW FIELD
  nmass: number;
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

// Fixed CSV parser for NSE file
const parseNSECSV = (csvText: string): any[] => {
  const lines = csvText.split('\n');
  if (lines.length < 1) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length >= 7) {
      const row: any = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          row[header] = values[index];
        }
      });
      data.push(row);
    }
  }
  
  return data;
};

// Fixed Excel parser
const parseExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get all data as array of arrays
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false
        });

        // Find header row index
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.some(cell => String(cell).includes('UCC'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Could not find header row with UCC');
        }

        const headerRow = jsonData[headerRowIndex];
        const uccIndex = headerRow.findIndex(h => 
          String(h).includes('UCC') || String(h).includes('Client Code')
        );
        const nseFoIndex = headerRow.findIndex(h => 
          String(h).includes('NSE-F&O') || String(h).includes('NSE-FO')
        );
        const nameIndex = headerRow.findIndex(h => 
          String(h).includes('Name') || String(h).includes('Client Name')
        );

        if (uccIndex === -1 || nseFoIndex === -1) {
          throw new Error('Could not find required columns (UCC and NSE-F&O Balance)');
        }

        const processedData = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < Math.max(uccIndex, nseFoIndex, nameIndex)) continue;
        
        const ucc = row[uccIndex] ? String(row[uccIndex]).trim() : '';
        const nseFoBalance = row[nseFoIndex] ? String(row[nseFoIndex]).trim() : '0';
        const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';

        // Skip rows without UCC
        if (!ucc || ucc === 'undefined' || ucc === '#N/A') continue;
        
        // Parse NSE-F&O Balance - Flip sign and keep only positive values
        let balance = 0;
        if (nseFoBalance && nseFoBalance !== '0.00') {
          const cleanBalance = nseFoBalance.replace(/[^\d.-]/g, ''); // Remove non-numeric except - and .
          const rawValue = parseFloat(cleanBalance) || 0;
          const adjustedValue = rawValue * -1; // Flip sign
          if (adjustedValue > 0) {
            balance = adjustedValue; // Keep only positive adjusted values
          }
        }

        // Only include rows with balance > 0 OR if they have CC01 margin
        // We'll check CC01 in processing, so include all UCCs for now
        processedData.push({
          Name: name,
          UCC: ucc,
          NSE_FO_Balance: balance  // This will be 0 for negative/zero original values
        });
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

// Update ClientMargin CSV parser to match your file format
const parseClientMarginCSVText = (csvText: string): {[key: string]: number} => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 1) return {};

  const headers = lines[0].split(',').map(h => h.trim());
  
  // Find indices using more flexible matching
  const clientCodeIndex = headers.findIndex(h => 
    h.toLowerCase().includes('client') && h.toLowerCase().includes('code')
  );
  
  const totalMarginIndex = headers.findIndex(h => 
    h.toLowerCase().includes('total') && h.toLowerCase().includes('margin')
  );

  if (clientCodeIndex === -1 || totalMarginIndex === -1) {
    console.error('CSV Headers:', headers);
    throw new Error('Required columns (Client Code and Total Margin) not found in CSV');
  }

  const marginMap: {[key: string]: number} = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length <= Math.max(clientCodeIndex, totalMarginIndex)) continue;
    
    const clientCode = values[clientCodeIndex];
    // Skip summary rows and empty client codes
    if (!clientCode || clientCode === 'Total' || clientCode === 'All amounts in Rs.') continue;
    
    // Handle potential currency formatting in total margin
    let marginValue = 0;
    const marginStr = values[totalMarginIndex].replace(/[^\d.-]/g, '');
    if (marginStr) {
      marginValue = parseFloat(marginStr);
    }
    
    marginMap[clientCode] = marginValue;
  }

  return marginMap;
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

    // Process NSE CSV file with fixed parser
    const nseText = await files.nse.text();
    const nseData = parseNSECSV(nseText);
    console.log('NSE data:', nseData);
    
    // Process CC01/ClientMargin file - handle both formats
    let cc01MarginMap: {[key: string]: number} = {};
    const cc01FileName = files.cc01.name.toLowerCase();
    
    if (cc01FileName.includes('clientmargin')) {
      // Process as ClientMargin CSV file
      const cc01Text = await files.cc01.text();
      cc01MarginMap = parseClientMarginCSVText(cc01Text);
    } else {
      // Process as CC01 CSV file (original format)
      const cc01Text = await files.cc01.text();
      const cc01Lines = cc01Text.split('\n');
      
      for (const line of cc01Lines) {
        if (!line.trim()) continue;
        const values = line.split(',');
        if (values.length >= 6) {
          const ucc = values[0].trim();
          const margin = parseFloat(values[5]) || 0;
          if (ucc) {
            cc01MarginMap[ucc] = margin;
          }
        }
      }
    }

    console.log('CC01 Margin Map:', cc01MarginMap);
    
    // Process NSE data
    const nseAllocations: { [key: string]: number } = {};
    let proFund = 0;

    for (const row of nseData) {
      const segment = row.Segments;
      const accType = row.Acctype;
      const allocated = parseFloat(row.Allocated) || 0;
      const clicode = row.Clicode?.trim() || '';

      if (segment === 'FO') {
        if (accType === 'P') {
          proFund = allocated;
        } else if (clicode) {
          nseAllocations[clicode] = (nseAllocations[clicode] || 0) + allocated;
        }
      }
    }

    console.log('NSE Allocations:', nseAllocations);
    console.log('ProFund:', proFund);

    // Process each record
    const processedData: NseFoData[] = [];
    const outputRecords: NseFoOutputRecord[] = [];
    let upgradeTotal = 0;
    let downgradeTotal = 0;
    let negativeShortValue = 0;
    
    // Get current date in DD-MMM-YYYY format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const currentDate = `${day}-${month}-${year}`;

    // 1. Process risk data records
    for (const riskRow of riskData) {
      const ucc = riskRow.UCC;
      
      const ledgerAmount = riskRow.NSE_FO_Balance || 0;
      const globeAmount = nseAllocations[ucc] || 0;
      const difference = ledgerAmount - globeAmount;
      const cc01Margin = cc01MarginMap[ucc] || 0;
      
      // Calculate new fields
      const ninetyPercentLedger = ledgerAmount * 0.9;
      const shortValue = ninetyPercentLedger - cc01Margin;
      const ninetyabove = (cc01Margin / ledgerAmount) * 100; 
      
      // Accumulate negative short values for ALL records
      if (shortValue < 0) {
        negativeShortValue += Math.abs(shortValue);
      }

      // SKIP LOGIC: Skip if difference=0 AND both amounts=0, EXCEPT if there's CC01 margin
      const hasZeroDifference = Math.abs(difference) <= 0;
      const hasBothAmountsZero = (ledgerAmount === 0 && globeAmount === 0);
      const hasCC01Value = cc01Margin > 0;
      
      // Skip if: zero difference AND both amounts zero AND no CC01 value
      if (hasZeroDifference && hasBothAmountsZero && !hasCC01Value) {
        continue;
      }

      // Determine action
      let action: 'U' | 'D' = ledgerAmount > globeAmount ? 'U' : 'D';
      
      // Only add to upgrade/downgrade totals if there's an actual difference (for output file calculation)
      if (Math.abs(difference) > 0) {
        if (action === 'U') {
          upgradeTotal += difference;
        } else {
          downgradeTotal += Math.abs(difference);
        }
      }

      // Add to UI table data
      processedData.push({
        clicode: ucc,
        ledgerAmount,
        globeAmount,
        action,
        difference,
        cc01Margin,
        ninetyPercentLedger,
        shortValue,
        ninetyabove
      });

      // Only create output records for records with actual differences (output file logic unchanged)
      if (Math.abs(difference) > 0) {
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
      }
    }

    // 2. Add records for globe file clients missing in risk file
    for (const clicode in nseAllocations) {
      if (!riskData.some(r => r.UCC === clicode)) {
        const allocation = nseAllocations[clicode];
        if (allocation > 0) {
          const ledgerAmount = 0;
          const globeAmount = allocation;
          const difference = 0 - allocation;
          const cc01Margin = cc01MarginMap[clicode] || 0;
          const ninetyPercentLedger = 0;
          const shortValue = ninetyPercentLedger - cc01Margin;
          const ninetyabove = (cc01Margin / ledgerAmount) * 100; 
          
          // Accumulate negative short values
          if (shortValue < 0) {
            negativeShortValue += Math.abs(shortValue);
          }

          processedData.push({
            clicode,
            ledgerAmount,
            globeAmount,
            action: 'D',
            difference,
            cc01Margin,
            ninetyPercentLedger,
            shortValue,
            ninetyabove
          });
          
          downgradeTotal += allocation;
          
          outputRecords.push({
            currentDate,
            segment: 'FO',
            cmCode: 'M50302',
            tmCode: '90221',
            cpCode: '',
            clicode,
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
    }

    // Calculate summary values
    const netValue = upgradeTotal - downgradeTotal;
    const finalProFund = proFund - 2500000;
    const unallocatedFundAmount = unallocatedFund * 100000;
    const finalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
    const sd = finalAmount + 2500000;
    const nmass = -(negativeShortValue / sd) * 100;

    const summary: NseFoSummary = {
      upgradeTotal,
      downgradeTotal,
      netValue,
      proFund,
      finalAmount,
      negativeShortValue,
      nmass
    };

    // 3. Add ProFund record
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

    return { data: processedData, summary, outputRecords };

  } catch (error) {
    console.error('Error processing NSE CM files:', error);
    throw new Error('Failed to process files. Please check file formats and try again.');
  }
};