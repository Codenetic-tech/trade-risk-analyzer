// McxProcessor.ts
import * as XLSX from 'xlsx';

export interface McxFoData {
  clicode: string;
  ledgerAmount: number;
  globeAmount: number;
  action: 'A' | 'D';
  difference: number;
  mcxMargin: number; // New field (replaces cc01Margin)
  ninetyPercentLedger: number;
  shortValue: number;
  ninetyabove: number;
}

export interface McxFoSummary {
  upgradeTotal: number;
  downgradeTotal: number;
  netValue: number;
  proFund: number;
  finalAmount: number;
  negativeShortValue: number;
  nmass: number;
}

export interface McxFoOutputRecord {
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

// Fixed CSV parser for MCX globe file - now handles both comma and tab delimiters
const parseMcxGlobeCSV = (csvText: string): any[] => {
  // Remove BOM if present
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.substring(1);
  }

  const lines = csvText.split('\n');
  if (lines.length < 1) return [];
  
  // Check delimiter - use comma if present, otherwise tab
  const firstLine = lines[0];
  const delimiter = firstLine.includes(',') ? ',' : '\t';
  
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(delimiter).map(v => v.trim());
    if (values.length >= 7) {
      const row: any = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          row[header] = values[index];
        }
      });
      
      // Filter for MCXCCL and CO segments
      if (row.Clrtype === 'MCXCCL' && row.Segments === 'CO') {
        data.push(row);
      }
    }
  }
  
  return data;
};

// Fixed Excel parser for Risk file
const parseRiskExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false
        });

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
        const mcxBalanceIndex = headerRow.findIndex(h => 
          String(h).includes('MCX') && String(h).includes('Balance')
        );
        const nameIndex = headerRow.findIndex(h => 
          String(h).includes('Name') || String(h).includes('Client Name')
        );

        console.log('Header row:', headerRow);
        console.log(`Indices: uccIndex=${uccIndex}, mcxBalanceIndex=${mcxBalanceIndex}, nameIndex=${nameIndex}`);

        if (uccIndex === -1 || mcxBalanceIndex === -1) {
          throw new Error('Could not find required columns (UCC and MCX Balance)');
        }

        const processedData = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < Math.max(uccIndex, mcxBalanceIndex, nameIndex)) continue;
          
          const ucc = row[uccIndex] ? String(row[uccIndex]).trim() : '';
          const mcxBalance = row[mcxBalanceIndex] ? String(row[mcxBalanceIndex]).trim() : '0';
          const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';

          if (!ucc || ucc === 'undefined' || ucc === '#N/A') continue;
          
          let balance = 0;
          if (mcxBalance && mcxBalance !== '0.00') {
            const cleanBalance = mcxBalance.replace(/[^\d.-]/g, '');
            const rawValue = parseFloat(cleanBalance) || 0;
            const adjustedValue = rawValue * -1;
            if (adjustedValue > 0) {
              balance = adjustedValue;
            }
          }

          processedData.push({
            Name: name,
            UCC: ucc,
            MCX_Balance: balance
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

// Parser for MRG file - fixed margin extraction
const parseMrgFile = (mrgText: string): {[key: string]: number} => {
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
  
  return marginMap;
};

const parseSearchResultsExcel = async (file: File): Promise<{ [key: string]: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false
        });

        // Find header row by searching for "Client Code" column
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.some(cell => 
            String(cell).toLowerCase().includes('client code')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Could not find header row with "Client Code"');
        }

        const headerRow = jsonData[headerRowIndex].map(cell => String(cell).trim().toLowerCase());
        
        // Get column indices
        const clientCodeIndex = headerRow.findIndex(h => 
          h.includes('client code')
        );
        const totalMUIndex = headerRow.findIndex(h => 
          h.includes('total mu (rs)')
        );

        if (clientCodeIndex === -1 || totalMUIndex === -1) {
          throw new Error('Required columns (Client Code, Total MU (Rs)) not found');
        }

        console.log('Header row found at index:', headerRowIndex);
        console.log('Client Code Index:', clientCodeIndex);
        console.log('Total MU Index:', totalMUIndex);

        const marginMap: { [key: string]: number } = {};
        
        // Process rows starting from headerRowIndex + 1
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < Math.max(clientCodeIndex, totalMUIndex)) continue;
          
          const ucc = row[clientCodeIndex] ? String(row[clientCodeIndex]).trim() : '';
          const totalMU = row[totalMUIndex] ? String(row[totalMUIndex]).trim() : '0';

          if (!ucc || ucc === 'undefined' || ucc === '#N/A') continue;
          
          // Clean and parse the margin value
          const cleanTotalMU = totalMU.replace(/[^\d.-]/g, '');
          const marginValue = parseFloat(cleanTotalMU) || 0;
          
          marginMap[ucc] = marginValue;
        }
        
        resolve(marginMap);
      } catch (error) {
        console.error('Error parsing SearchResults Excel:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

export const processMcxFiles = async (files: {
  risk: File | null;
  globe: File | null;
  marginData: File | null;
}, unallocatedFund: number = 0): Promise<{ data: McxFoData[]; summary: McxFoSummary; outputRecords: McxFoOutputRecord[] }> => {
  if (!files.risk || !files.globe || (!files.marginData)) {
    throw new Error('All files (Risk, Globe, MRG) are required');
  }

  try {
    console.log('Processing files...');
    
    // Process Risk Excel file
    console.log('Processing risk file...');
    const riskData = await parseRiskExcel(files.risk);
    console.log('Risk data records:', riskData.length);
    console.log('Sample risk data:', riskData.slice(0, 5));

    // Process Globe CSV file
    console.log('Processing globe file...');
    const globeText = await files.globe.text();
    console.log('Globe file sample:', globeText.substring(0, 200));
    const globeData = parseMcxGlobeCSV(globeText);
    console.log('Globe data records:', globeData.length);
    console.log('Sample globe data:', globeData.slice(0, 5));
    
    // Process MRG file
    console.log('Processing MRG file...');
    const mrgText = await files.marginData.text();
    console.log('MRG file sample:', mrgText.substring(0, 200));
     let marginMap: { [key: string]: number } = {};
  if (files.marginData) {
    const fileName = files.marginData.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel file (SearchResults)
      marginMap = await parseSearchResultsExcel(files.marginData);
    } else if (fileName.endsWith('.csv')) {
      // CSV file (MRG)
      const mrgText = await files.marginData.text();
      marginMap = parseMrgFile(mrgText);
    } else {
      throw new Error('Unsupported margin file format');
    }
  } else {
    throw new Error('Margin data file is required');
  }
    
    console.log('Margin records:', Object.keys(marginMap).length);
    console.log('Sample margin data:', Object.entries(marginMap).slice(0, 5));

    const OVERRIDE_UCCS = ['K05', 'G10', 'SKY34100'];

    
    // Process Globe data
    const globeAllocations: { [key: string]: number } = {};
    let proFund = 0;

    for (const row of globeData) {
      const allocated = parseFloat(row.Allocated) || 0;
      const clicode = row.Clicode?.trim() || '';
      const accType = row.Acctype;

      if (accType === 'P') {
        proFund = allocated;
      } else if (clicode) {
        globeAllocations[clicode] = (globeAllocations[clicode] || 0) + allocated;
      }
    }

    console.log('Globe Allocations:', globeAllocations);
    console.log('ProFund:', proFund);

    // Process each record
    const processedData: McxFoData[] = [];
    const outputRecords: McxFoOutputRecord[] = [];
    let upgradeTotal = 0;
    let downgradeTotal = 0;
    let negativeShortValue = 0;
    
    // Get current date
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const currentDate = `${day}-${month}-${year}`;

    // 1. Process risk data records
    for (const riskRow of riskData) {
      const ucc = riskRow.UCC;
      let ledgerAmount = riskRow.MCX_Balance || 0;

      if (OVERRIDE_UCCS.includes(ucc)) {
        ledgerAmount = 50000; // Set fixed ledger amount
      }

      const globeAmount = globeAllocations[ucc] || 0;
      let difference = ledgerAmount - globeAmount;
      difference = parseFloat(difference.toFixed(2));
      const mcxMargin = marginMap[ucc] || 0;
      
      // Calculate new fields
      const ninetyPercentLedger = ledgerAmount * 0.9;
      const shortValue = ninetyPercentLedger - mcxMargin;
      const ninetyabove = ledgerAmount > 0 ? (mcxMargin / ledgerAmount) * 100 : 0;
      
      // Accumulate negative short values
      if (shortValue < 0) {
        negativeShortValue += Math.abs(shortValue);
      }

      // Skip logic
      const hasZeroDifference = Math.abs(difference) <= 0.01;
      const hasBothAmountsZero = (ledgerAmount === 0 && globeAmount === 0);
      const hasMarginValue = mcxMargin > 0;
      
      if (hasZeroDifference && hasBothAmountsZero && !hasMarginValue) {
        continue;
      }

      // Determine action (A for addition, D for deletion)
      let action: 'A' | 'D' = difference > 0 ? 'A' : 'D';
      
      if (Math.abs(difference) > 0.01) {
        if (action === 'A') {
          upgradeTotal += difference;
        } else {
          downgradeTotal += Math.abs(difference);
        }
      }

      processedData.push({
        clicode: ucc,
        ledgerAmount,
        globeAmount,
        action,
        difference: Math.abs(difference),
        mcxMargin,
        ninetyPercentLedger,
        shortValue,
        ninetyabove
      });

      if (Math.abs(difference) > 0.01) {
        outputRecords.push({
          currentDate,
          segment: 'CO',
          cmCode: '8090',
          tmCode: '46365',
          cpCode: '',
          clicode: ucc,
          accountType: 'C',
          amount: parseFloat(Math.abs(difference).toFixed(2)),
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

    // 2. Add records for globe clients missing in risk file
    for (const clicode in globeAllocations) {
      if (!riskData.some(r => r.UCC === clicode)) {
        const allocation = globeAllocations[clicode];
        if (allocation > 0) {
          const ledgerAmount = 0;
          const globeAmount = allocation;
          const difference = allocation;
          const mcxMargin = marginMap[clicode] || 0;
          const ninetyPercentLedger = 0;
          const shortValue = -mcxMargin;
          const ninetyabove = 0;
          
          if (shortValue < 0) {
            negativeShortValue += Math.abs(shortValue);
          }

          processedData.push({
            clicode,
            ledgerAmount,
            globeAmount,
            action: 'D',
            difference,
            mcxMargin,
            ninetyPercentLedger,
            shortValue,
            ninetyabove
          });
          
          downgradeTotal += allocation;
          
          outputRecords.push({
            currentDate,
            segment: 'CO',
            cmCode: '8090',
            tmCode: '46365',
            cpCode: '',
            clicode,
            accountType: 'C',
            amount: parseFloat(allocation.toFixed(2)),
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
    const finalProFund = proFund - 3010000;
    const unallocatedFundAmount = unallocatedFund * 100000;
    const finalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
    const sd = finalAmount + 3010000;
    const nmass = -(negativeShortValue / sd) * 100;

    const summary: McxFoSummary = {
      upgradeTotal,
      downgradeTotal,
      netValue,
      proFund,
      finalAmount,
      negativeShortValue,
      nmass
    };
     // 3. Add ProFund record ONLY if finalProFund is not zero
    if (Math.abs(finalProFund) > 0.01) {  // Using tolerance for floating point comparison
      const proFundAction: 'A' | 'D' = finalProFund < 0 ? 'A' : 'D';
      
      outputRecords.unshift({
        currentDate,
        segment: 'CO',
        cmCode: '8090',
        tmCode: '46365',
        cpCode: '',
        clicode: '',
        accountType: 'P',
        amount: Math.abs(finalProFund),
        filler1: '',
        filler2: '',
        filler3: '',
        filler4: '',
        filler5: '',
        filler6: '',
        action: proFundAction,
      });
    }

    console.log('Processing complete. Summary:', summary);
    return { data: processedData, summary, outputRecords };

  } catch (error) {
    console.error('Error processing MCX files:', error);
    throw new Error(`Failed to process files: ${error.message}`);
  }
};