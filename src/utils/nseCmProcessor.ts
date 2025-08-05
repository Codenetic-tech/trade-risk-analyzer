
import * as XLSX from 'xlsx';

export interface NseCmData {
  clicode: string;
  ledgerAmount: number;
  globeAmount: number;
  action: 'U' | 'D' | '-';
  difference: number;
}

export interface NseCmSummary {
  upgradeTotal: number;
  downgradeTotal: number;
  netValue: number;
  proFund: number;
  finalAmount: number;
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
        
        // Find the header row (row 3, index 2 in 0-based indexing)
        const headerRowIndex = 2;
        if (jsonData.length <= headerRowIndex) {
          throw new Error('Excel file does not have enough rows');
        }
        
        const processedData = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          const rowObj: any = {};
          
          // Map specific columns based on risk file format
          rowObj.Name = row[0] ? String(row[0]).trim() : '';
          rowObj.UCC = row[1] ? String(row[1]).trim() : '';
          rowObj.NSE_CM_Balance = row[4] ? parseFloat(row[4]) : 0;
          
          // Only add rows that have a valid UCC
          if (rowObj.UCC && rowObj.UCC !== '' && rowObj.UCC !== 'undefined') {
            processedData.push(rowObj);
          }
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

export const processNseCmFiles = async (files: {
  risk: File | null;
  nse: File | null;
  nri: File | null;
}): Promise<{ data: NseCmData[]; summary: NseCmSummary }> => {
  if (!files.risk || !files.nse || !files.nri) {
    throw new Error('All files (Risk, NSE, NRI) are required');
  }

  try {
    // Process Risk Excel file
    const riskData = await parseExcel(files.risk);
    console.log('Risk data:', riskData);
    
    // Filter valid risk data
    const filteredRiskData = riskData.filter(row => {
      const ucc = String(row.UCC || '').trim();
      return ucc && ucc !== '' && ucc !== 'undefined';
    });

    // Process NSE CSV file
    const nseText = await files.nse.text();
    const nseData = parseCSV(nseText);
    console.log('NSE data:', nseData);
    
    // Group NSE data by Clicode for CM segment
    const nseAllocations: { [key: string]: number } = {};
    const validNseData = nseData.filter(row => row.Clicode && row.Clicode.trim());
    
    validNseData.forEach(row => {
      const ucc = String(row.Clicode).trim();
      const segment = String(row.Segments || '').trim();
      const allocated = parseFloat(row.Allocated) || 0;
      
      if (segment === 'CM') {
        if (!nseAllocations[ucc]) {
          nseAllocations[ucc] = 0;
        }
        nseAllocations[ucc] += allocated;
      }
    });

    // Process NRI Excel file
    const nriData = await parseExcel(files.nri);
    console.log('NRI data:', nriData);

    // Process each record
    const processedData: NseCmData[] = [];
    let upgradeTotal = 0;
    let downgradeTotal = 0;

    filteredRiskData.forEach(riskRow => {
      const ucc = riskRow.UCC;
      const ledgerAmount = Math.abs(riskRow.NSE_CM_Balance || 0);
      const globeAmount = nseAllocations[ucc] || 0;
      const difference = globeAmount - ledgerAmount;
      
      let action: 'U' | 'D' | '-' = '-';
      if (difference > 0) {
        action = 'U';
        upgradeTotal += difference;
      } else if (difference < 0) {
        action = 'D';
        downgradeTotal += Math.abs(difference);
      }

      processedData.push({
        clicode: ucc,
        ledgerAmount,
        globeAmount,
        action,
        difference,
      });
    });

    const netValue = upgradeTotal - downgradeTotal;
    const proFund = netValue * 0.1; // Assuming 10% for pro fund calculation
    const finalAmount = netValue + proFund;

    const summary: NseCmSummary = {
      upgradeTotal,
      downgradeTotal,
      netValue,
      proFund,
      finalAmount,
    };

    return { data: processedData, summary };

  } catch (error) {
    console.error('Error processing NSE CM files:', error);
    throw new Error('Failed to process files. Please check file formats and try again.');
  }
};
