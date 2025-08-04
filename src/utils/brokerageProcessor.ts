
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
  
  // Get headers from first line
  const headers = lines[0].split('\t').map(h => h.trim().replace(/"/g, ''));
  console.log('CSV Headers:', headers);
  
  const data = [];
  
  // Process data lines (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split('\t').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  
  console.log('Parsed CSV data:', data.length, 'rows');
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
    // For now, let's directly parse the uploaded CSV as final output data
    const dataText = await dataFile.text();
    const csvData = parseCSV(dataText);
    
    console.log('Processing CSV data:', csvData);

    if (csvData.length === 0) {
      throw new Error('No data found in the uploaded file');
    }

    // Parse basket file if provided
    let basketData: any[] = [];
    if (basketFile) {
      const basketText = await basketFile.text();
      basketData = parseCSV(basketText);
      console.log('Parsed basket data:', basketData.length);
    }

    const processedData: BrokerageData[] = csvData.map(row => ({
      clientCode: String(row.CLIENTCODE || row.clientCode || '').trim(),
      mcxFut: parseFloat(String(row.MCXFUT || row.mcxFut || 0)),
      mcxOpt: parseFloat(String(row.MCXOPT || row.mcxOpt || 0)),
      nseFut: parseFloat(String(row.NSEFUT || row.nseFut || 0)),
      nseOpt: parseFloat(String(row.NSEOPT || row.nseOpt || 0)),
      cashInt: parseFloat(String(row.CASHINT || row.cashInt || 0)),
      cashDel: parseFloat(String(row.CASHDEL || row.cashDel || 0)),
      cdFut: parseFloat(String(row.CDFUT || row.cdFut || 0)),
      cdOpt: parseFloat(String(row.CDOPT || row.cdOpt || 0)),
    })).filter(item => item.clientCode); // Remove empty client codes

    const summary: BrokerageSummary = {
      totalClients: processedData.length,
      activeRecords: processedData.filter(item => 
        item.mcxFut > 0 || item.mcxOpt > 0 || item.nseFut > 0 || item.nseOpt > 0 || 
        item.cashInt > 0 || item.cashDel > 0 || item.cdFut > 0 || item.cdOpt > 0
      ).length,
      basketOrders: basketData.length,
      outputFiles: 3,
    };

    console.log('Final processed data:', processedData);
    console.log('Summary:', summary);

    return { data: processedData, summary };

  } catch (error) {
    console.error('Error processing brokerage data:', error);
    throw new Error('Failed to process brokerage files. Please check file formats and try again.');
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
