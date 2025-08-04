
export interface BrokerageData {
  clientCode: string;
  mcxFut: number;
  mcxOpt: number;
  nseFut: number;
  nseOpt: number;
  cashInt: number;
  cashDel: number;
  cdFut: number;
  cdOpt: number;
}

export interface BrokerageSummary {
  totalClients: number;
  activeRecords: number;
  basketOrders: number;
  outputFiles: number;
}

interface ProcessedBrokerageResult {
  data: BrokerageData[];
  summary: BrokerageSummary;
}

// Helper function to parse CSV with proper header detection
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Get headers from first line - handle both tab and comma separators
  let headers: string[] = [];
  let delimiter = '\t';
  
  // Try tab first, then comma
  if (lines[0].includes('\t')) {
    headers = lines[0].split('\t').map(h => h.trim().replace(/"/g, ''));
  } else if (lines[0].includes(',')) {
    delimiter = ',';
    headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  } else {
    // Single column case - might need special handling
    headers = [lines[0].trim().replace(/"/g, '')];
  }
  
  console.log('CSV Headers detected:', headers);
  console.log('Using delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
  
  const data = [];
  
  // Process data lines (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
    
    // Only process if we have the right number of columns or at least some data
    if (values.length >= headers.length || (values.length > 1 && headers.length === 1)) {
      const row: any = {};
      
      // If headers don't match expected format, try to map directly
      if (headers.length === 9 && headers[0].toUpperCase().includes('CLIENT')) {
        // Direct mapping for the expected 9-column format
        row.CLIENTCODE = values[0] || '';
        row.MCXFUT = values[1] || '0';
        row.MCXOPT = values[2] || '0';
        row.NSEFUT = values[3] || '0';
        row.NSEOPT = values[4] || '0';
        row.CASHINT = values[5] || '0';
        row.CASHDEL = values[6] || '0';
        row.CDFUT = values[7] || '0';
        row.CDOPT = values[8] || '0';
      } else {
        // Fallback to header-based mapping
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
      }
      
      data.push(row);
    }
  }
  
  console.log('Parsed CSV data:', data.length, 'rows');
  console.log('Sample row:', data[0]);
  return data;
};

// Function to calculate option additions based on VBA logic
const calculateOptAddition = (optValue: number): number => {
  if (optValue >= 1 && optValue <= 20) return 6;
  if (optValue >= 21 && optValue <= 30) return 8;
  if (optValue >= 31 && optValue <= 40) return 10;
  if (optValue >= 41 && optValue <= 50) return 12;
  if (optValue >= 51 && optValue <= 100) return 20;
  return 0;
};

export const processBrokerageData = async (dataFile: File, basketFile?: File | null): Promise<ProcessedBrokerageResult> => {
  try {
    console.log('Starting to process brokerage data...');
    const dataText = await dataFile.text();
    console.log('Raw file content preview:', dataText.substring(0, 500));
    
    const csvData = parseCSV(dataText);
    console.log('Parsed CSV data count:', csvData.length);

    if (csvData.length === 0) {
      throw new Error('No data found in the uploaded file. Please check the file format.');
    }

    // Parse basket file if provided
    let basketData: any[] = [];
    if (basketFile) {
      const basketText = await basketFile.text();
      basketData = parseCSV(basketText);
      console.log('Parsed basket data:', basketData.length);
    }

    // Process and map the data to our interface
    const processedData: BrokerageData[] = csvData.map((row, index) => {
      console.log(`Processing row ${index + 1}:`, row);
      
      // Handle different possible column names/formats
      const clientCode = String(
        row.CLIENTCODE || row.clientCode || row.ClientCode || 
        row['Client Code'] || row.CLIENT_CODE || ''
      ).trim();
      
      const mcxFut = parseFloat(String(row.MCXFUT || row.mcxFut || row.McxFut || 0));
      const mcxOpt = parseFloat(String(row.MCXOPT || row.mcxOpt || row.McxOpt || 0));
      const nseFut = parseFloat(String(row.NSEFUT || row.nseFut || row.NseFut || 0));
      const nseOpt = parseFloat(String(row.NSEOPT || row.nseOpt || row.NseOpt || 0));
      const cashInt = parseFloat(String(row.CASHINT || row.cashInt || row.CashInt || 0));
      const cashDel = parseFloat(String(row.CASHDEL || row.cashDel || row.CashDel || 0));
      const cdFut = parseFloat(String(row.CDFUT || row.cdFut || row.CdFut || 0));
      const cdOpt = parseFloat(String(row.CDOPT || row.cdOpt || row.CdOpt || 0));

      const processedRow = {
        clientCode,
        mcxFut: isNaN(mcxFut) ? 0 : mcxFut,
        mcxOpt: isNaN(mcxOpt) ? 0 : mcxOpt,
        nseFut: isNaN(nseFut) ? 0 : nseFut,
        nseOpt: isNaN(nseOpt) ? 0 : nseOpt,
        cashInt: isNaN(cashInt) ? 0 : cashInt,
        cashDel: isNaN(cashDel) ? 0 : cashDel,
        cdFut: isNaN(cdFut) ? 0 : cdFut,
        cdOpt: isNaN(cdOpt) ? 0 : cdOpt,
      };
      
      console.log(`Processed row ${index + 1}:`, processedRow);
      return processedRow;
    }).filter(item => item.clientCode && item.clientCode.length > 0); // Remove empty client codes

    console.log('Final processed data count:', processedData.length);
    console.log('Sample processed data:', processedData.slice(0, 3));

    const summary: BrokerageSummary = {
      totalClients: processedData.length,
      activeRecords: processedData.filter(item => 
        item.mcxFut > 0 || item.mcxOpt > 0 || item.nseFut > 0 || item.nseOpt > 0 || 
        item.cashInt > 0 || item.cashDel > 0 || item.cdFut > 0 || item.cdOpt > 0
      ).length,
      basketOrders: basketData.length,
      outputFiles: 3,
    };

    console.log('Final summary:', summary);

    return { data: processedData, summary };

  } catch (error) {
    console.error('Error processing brokerage data:', error);
    throw new Error(`Failed to process brokerage files: ${error instanceof Error ? error.message : 'Unknown error'}. Please check file formats and try again.`);
  }
};

export const exportBrokerageData = (data: BrokerageData[]): void => {
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  const headers = [
    'CLIENTCODE',
    'MCXFUT',
    'MCXOPT',
    'NSEFUT',
    'NSEOPT',
    'CASHINT',
    'CASHDEL',
    'CDFUT',
    'CDOPT'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.clientCode,
      row.mcxFut,
      row.mcxOpt,
      row.nseFut,
      row.nseOpt,
      row.cashInt,
      row.cashDel,
      row.cdFut,
      row.cdOpt
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `brokerage_output_${today}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportOrderClient = (data: BrokerageData[]): void => {
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  let content = 'RMS Limits\n';
  
  // Add NSEOR entries
  data.forEach(row => {
    if (row.nseFut > 0 || row.nseOpt > 0 || row.cashInt > 0 || row.cashDel > 0) {
      content += `${row.clientCode}||||||||||||||||NSEOR\n`;
    }
  });
  
  // Add MCXOR entries
  data.forEach(row => {
    if (row.mcxFut > 0 || row.mcxOpt > 0) {
      content += `${row.clientCode}||COM||||||||||||||MCXOR\n`;
    }
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ORDER_CLIENT_${today}.txt`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportClientWiseBrokerage = (data: BrokerageData[], type: 'ALL' | 'COM'): void => {
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  let content = type === 'ALL' ? 'Client wise brokerage\n' : 'Client wise brokerage|COM\n';
  
  data.forEach(row => {
    const sStr = [
      row.clientCode,
      row.cashDel,
      row.cashInt,
      row.cashDel,
      row.cashInt,
      row.cashInt,
      row.nseFut,
      row.nseFut,
      row.nseFut,
      row.nseFut,
      row.nseOpt,
      row.nseOpt,
      row.nseOpt,
      row.nseOpt,
      row.cdFut,
      row.cdFut,
      row.cdFut,
      row.cdFut,
      row.cdOpt,
      row.cdOpt,
      row.cdOpt,
      row.cdOpt,
      row.mcxFut,
      row.mcxFut,
      row.mcxFut,
      row.mcxFut,
      row.mcxOpt,
      row.mcxOpt,
      row.mcxOpt,
      row.mcxOpt
    ].join('|');
    
    content += sStr + '\n';
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Client_wise_brokerage_${type}_${today}.txt`;
  link.click();
  window.URL.revokeObjectURL(url);
};
