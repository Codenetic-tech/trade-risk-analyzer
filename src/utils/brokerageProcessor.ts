
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

// Helper function to parse CSV in chunks for better performance
const parseCSVInChunks = (csvText: string, chunkSize: number = 10000): any[] => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];
  
  // Remove first column (column A) from all lines
  const processedLines = lines.map(line => {
    const columns = line.split(',');
    return columns.slice(1).join(','); // Remove first column
  });
  
  const headers = processedLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  // Process in chunks to avoid blocking the UI
  for (let i = 1; i < processedLines.length; i += chunkSize) {
    const chunk = processedLines.slice(i, i + chunkSize);
    
    for (const line of chunk) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      const values = trimmedLine.split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }
  }
  
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
    // Parse data file
    const dataText = await dataFile.text();
    const dataLines = parseCSVInChunks(dataText);
    
    console.log('Parsed data lines:', dataLines.length);

    // Parse basket file if provided
    let basketData: any[] = [];
    if (basketFile) {
      const basketText = await basketFile.text();
      basketData = parseCSVInChunks(basketText);
      console.log('Parsed basket data:', basketData.length);
    }

    // Create basket lookup for faster processing
    const basketLookup = new Set(basketData.map(row => row['Basket Name'] || row[Object.keys(row)[0]]));
    
    const processedData: BrokerageData[] = [];
    const orderClientOutput: string[] = [];
    
    let currentUCC = '';
    let mcxFut = 0;
    let mcxOpt = 0;
    let nseFut = 0;
    let nseOpt = 0;
    let cashInt = 0;
    let cashDel = 0;
    let cdFut = 0;
    let cdOpt = 0;
    let basketFound = false;

    // Process data following VBA logic
    for (let i = 0; i < dataLines.length; i++) {
      const row = dataLines[i];
      const col1Data = String(row['Particular'] || '').trim();
      const col2Data = String(row['Client Detail'] || '').trim();

      // Check for UCC
      if (col1Data === 'UCC (Alias):') {
        // Save previous record if exists
        if (currentUCC) {
          if (basketFound) {
            // Reset all values to 0 if basket found
            mcxFut = mcxOpt = nseFut = nseOpt = cashInt = cashDel = cdFut = cdOpt = 0;
            orderClientOutput.push(currentUCC);
          }

          // Apply option additions (VBA logic)
          mcxOpt = parseFloat(String(mcxOpt)) + calculateOptAddition(parseFloat(String(mcxOpt)));
          nseOpt = parseFloat(String(nseOpt)) + calculateOptAddition(parseFloat(String(nseOpt)));
          cdOpt = parseFloat(String(cdOpt)) + calculateOptAddition(parseFloat(String(cdOpt)));

          processedData.push({
            clientCode: currentUCC,
            mcxFut: Math.round(mcxFut * 1000) / 1000,
            mcxOpt: Math.round(mcxOpt * 1000) / 1000,
            nseFut: Math.round(nseFut * 1000) / 1000,
            nseOpt: Math.round(nseOpt * 1000) / 1000,
            cashInt: Math.round(cashInt * 1000) / 1000,
            cashDel: Math.round(cashDel * 1000) / 1000,
            cdFut: Math.round(cdFut * 1000) / 1000,
            cdOpt: Math.round(cdOpt * 1000) / 1000,
          });
        }

        // Reset for new UCC
        currentUCC = col2Data;
        mcxFut = mcxOpt = nseFut = nseOpt = cashInt = cashDel = cdFut = cdOpt = 0;
        basketFound = false;
        continue;
      }

      // Check for basket names
      if (col1Data.includes('Basket') || col1Data.includes('Specific')) {
        const basketNameMatch = col2Data.match(/\[(.*?)\]/);
        if (basketNameMatch && basketLookup.has(basketNameMatch[1])) {
          basketFound = true;
          continue;
        }
      }

      // Process segments based on VBA logic
      if (col1Data.includes('NSE-CM')) {
        // Process NSE-CM logic
        const values = col2Data.split(' ').filter(v => v.trim());
        if (values[0] === 'ALL') {
          if (col2Data.includes('(Delivery)')) {
            cashDel = parseFloat(values[1]) || 0;
          }
          if (col2Data.includes('(Squared-Off)')) {
            cashInt = parseFloat(values[2]) || 0;
          }
        }
      } else if (col1Data.includes('NSE-F&O')) {
        // Process NSE-F&O logic
        const values = col2Data.split(' ').filter(v => v.trim());
        if (values[0] === 'ALL') {
          nseFut = parseFloat(values[2]) || 0;
          nseOpt = parseFloat(values[4]) || 0;
        }
        if (values[0] === 'ALLFUT') {
          nseFut = parseFloat(values[2]) || 0.01;
        }
        if (values[0] === 'ALLOPT' || values[0] === 'ALLSTK' || values[0] === 'ALLOID') {
          const optValue = parseFloat(values[4]) || parseFloat(values[5]) || 0;
          if (optValue > nseOpt) {
            nseOpt = optValue;
          }
        }
        // Set default NSE OPT if NSE FUT exists but NSE OPT is 0
        if (nseFut > 0 && nseOpt === 0) {
          nseOpt = 20.00;
        }
        if (nseFut === 0 && nseOpt > 0) {
          nseFut = 0.01;
        }
      } else if (col1Data.includes('NSE-CDS')) {
        // Process NSE-CDS logic
        const values = col2Data.split(' ').filter(v => v.trim());
        if (values[0] === 'ALL') {
          cdFut = parseFloat(values[2]) || 0;
          cdOpt = parseFloat(values[4]) || 0;
        }
        if (values[0] === 'ALLFUT') {
          cdFut = parseFloat(values[2]) || 0.01;
        }
        if (values[0] === 'ALLOPT') {
          cdOpt = parseFloat(values[4]) || parseFloat(values[5]) || 0;
        }
        if (cdFut > 0 && cdOpt === 0) {
          cdOpt = 20.00;
        }
        if (cdFut === 0 && cdOpt > 0) {
          cdFut = 0.01;
        }
      } else if (col1Data.includes('MCX')) {
        // Process MCX logic
        const values = col2Data.split(' ').filter(v => v.trim());
        if (values[0] === 'ALLFUT' || values[0] === 'ALL') {
          if (values.includes('MktRate') || values.includes('Turnover')) {
            mcxFut = parseFloat(values[2]) || 0.01;
          }
          if (values[0] === 'ALL' && parseFloat(values[4])) {
            mcxOpt = parseFloat(values[4]);
          }
        }
        if (values[0] === 'ALLOPT') {
          mcxOpt = values.includes('MktRate') ? parseFloat(values[5]) || 0 : parseFloat(values[4]) || 0;
        }
        if (mcxFut > 0 && mcxOpt === 0) {
          mcxOpt = 20.00;
        }
      }
    }

    // Process last record
    if (currentUCC) {
      if (basketFound) {
        mcxFut = mcxOpt = nseFut = nseOpt = cashInt = cashDel = cdFut = cdOpt = 0;
        orderClientOutput.push(currentUCC);
      }

      mcxOpt = parseFloat(String(mcxOpt)) + calculateOptAddition(parseFloat(String(mcxOpt)));
      nseOpt = parseFloat(String(nseOpt)) + calculateOptAddition(parseFloat(String(nseOpt)));
      cdOpt = parseFloat(String(cdOpt)) + calculateOptAddition(parseFloat(String(cdOpt)));

      processedData.push({
        clientCode: currentUCC,
        mcxFut: Math.round(mcxFut * 1000) / 1000,
        mcxOpt: Math.round(mcxOpt * 1000) / 1000,
        nseFut: Math.round(nseFut * 1000) / 1000,
        nseOpt: Math.round(nseOpt * 1000) / 1000,
        cashInt: Math.round(cashInt * 1000) / 1000,
        cashDel: Math.round(cashDel * 1000) / 1000,
        cdFut: Math.round(cdFut * 1000) / 1000,
        cdOpt: Math.round(cdOpt * 1000) / 1000,
      });
    }

    const summary: BrokerageSummary = {
      totalClients: processedData.length,
      activeRecords: processedData.filter(item => 
        item.mcxFut > 0 || item.mcxOpt > 0 || item.nseFut > 0 || item.nseOpt > 0 || 
        item.cashInt > 0 || item.cashDel > 0 || item.cdFut > 0 || item.cdOpt > 0
      ).length,
      basketOrders: orderClientOutput.length,
      outputFiles: 3, // Order Client, Client wise ALL, Client wise COM
    };

    return { data: processedData, summary };

  } catch (error) {
    console.error('Error processing brokerage data:', error);
    throw new Error('Failed to process brokerage files. Please check file formats and try again.');
  }
};

export const exportBrokerageData = (data: BrokerageData[]): void => {
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  // Export main data
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
