import * as XLSX from 'xlsx';

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
  orderClientData: string[];
}

// Function to calculate option additions based on VBA logic
const calculateOptAddition = (optValue: number): number => {
  if (optValue >= 1 && optValue <= 20) return 6;
  if (optValue >= 21 && optValue <= 30) return 8;
  if (optValue >= 31 && optValue <= 40) return 10;
  if (optValue >= 41 && optValue <= 50) return 12;
  if (optValue >= 51 && optValue <= 100) return 20;
  return 0;
};

// Function to parse space-separated values like VBA's Split function
const parseSpaceSeparatedValues = (text: string): string[] => {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(item => item.length > 0);
};

// Function to safely parse numeric values
const parseNumericValue = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value || value === '') return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
};

export const processBrokerageData = async (dataFile: File, basketFile?: File | null): Promise<ProcessedBrokerageResult> => {
  try {
    console.log('Starting to process brokerage XLSX data...');
    
    // Read the Excel file
    const arrayBuffer = await dataFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    console.log('Available sheet names:', workbook.SheetNames);
    
    // Look for the "Data" sheet (case insensitive)
    let dataSheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().trim() === 'data'
    );
    
    // If no "Data" sheet found, use the first sheet
    if (!dataSheetName) {
      console.log('No "Data" sheet found, using first sheet:', workbook.SheetNames[0]);
      dataSheetName = workbook.SheetNames[0];
    }
    
    if (!dataSheetName) {
      throw new Error('No sheets found in the Excel file.');
    }
    
    console.log('Using sheet:', dataSheetName);
    
    const dataSheet = workbook.Sheets[dataSheetName];
    const sheetData = XLSX.utils.sheet_to_json(dataSheet, { header: 1, defval: '' }) as any[][];
    
    console.log('Sheet data loaded:', sheetData.length, 'rows');
    console.log('First few rows:', sheetData.slice(0, 5));
    
    // Validate data format (check row 2 for "Particular" and "Client Detail")
    if (sheetData.length < 2) {
      throw new Error('Excel file appears to be empty or has insufficient data.');
    }
    
    // Check for the expected headers (more flexible checking)
    const row2Col1 = String(sheetData[1]?.[0] || '').trim();
    const row2Col2 = String(sheetData[1]?.[1] || '').trim();
    
    console.log('Row 2 data:', { col1: row2Col1, col2: row2Col2 });
    
    if (row2Col1 !== 'Particular' || row2Col2 !== 'Client Detail') {
      console.log('Expected headers not found in row 2, checking other rows...');
      
      // Try to find the header row
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, sheetData.length); i++) {
        const col1 = String(sheetData[i]?.[0] || '').trim();
        const col2 = String(sheetData[i]?.[1] || '').trim();
        if (col1 === 'Particular' && col2 === 'Client Detail') {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('Data format is not proper. Could not find "Particular" in column A and "Client Detail" in column B in the first 10 rows.');
      }
      
      console.log('Found headers at row:', headerRowIndex + 1);
    }
    
    // Process basket file if provided
    let basketData: string[] = [];
    if (basketFile) {
      try {
        const basketBuffer = await basketFile.arrayBuffer();
        const basketWorkbook = XLSX.read(basketBuffer, { type: 'array' });
        console.log('Basket file sheet names:', basketWorkbook.SheetNames);
        
        // Look for "Order Basket" sheet (case insensitive)
        let basketSheetName = basketWorkbook.SheetNames.find(name => 
          name.toLowerCase().trim() === 'order basket'
        );
        
        if (!basketSheetName) {
          console.log('No "Order Basket" sheet found, using first sheet');
          basketSheetName = basketWorkbook.SheetNames[0];
        }
        
        if (basketSheetName) {
          const basketSheet = basketWorkbook.Sheets[basketSheetName];
          const basketSheetData = XLSX.utils.sheet_to_json(basketSheet, { header: 1, defval: '' }) as any[][];
          basketData = basketSheetData.map(row => String(row[0] || '').trim()).filter(item => item.length > 0);
          console.log('Basket data loaded:', basketData.length, 'items');
        }
      } catch (basketError) {
        console.log('Error processing basket file:', basketError);
      }
    }
    
    const processedData: BrokerageData[] = [];
    const orderClientData: string[] = [];
    
    // Variables matching VBA code
    let UCC = '';
    let MCXFUT = '';
    let MCXOPT = '';
    let NSEFUT = '';
    let NSEOPT = '';
    let CASHINT = '';
    let CASHDEL = '';
    let CDFUT = '';
    let CDOPT = '';
    let basketFound = false;
    
    // Process each row
    for (let sourceCurrRow = 0; sourceCurrRow < sheetData.length; sourceCurrRow++) {
      const row = sheetData[sourceCurrRow];
      const col1Data = String(row[0] || '').trim();
      const col2Data = String(row[1] || '').trim();
      
      console.log(`Processing row ${sourceCurrRow + 1}: "${col1Data}"`);
      
      switch (col1Data) {
        case 'UCC (Alias):':
          // Save previous UCC data if exists
          if (UCC !== '') {
            if (basketFound) {
              // Reset all values to 0 if basket was found
              MCXFUT = '0';
              MCXOPT = '0';
              NSEFUT = '0';
              NSEOPT = '0';
              CASHINT = '0';
              CASHDEL = '0';
              CDFUT = '0';
              CDOPT = '0';
              orderClientData.push(UCC);
            }
            
            // Save the processed data
            const brokerageRecord: BrokerageData = {
              clientCode: UCC,
              mcxFut: parseNumericValue(MCXFUT),
              mcxOpt: parseNumericValue(MCXOPT),
              nseFut: parseNumericValue(NSEFUT),
              nseOpt: parseNumericValue(NSEOPT),
              cashInt: parseNumericValue(CASHINT),
              cashDel: parseNumericValue(CASHDEL),
              cdFut: parseNumericValue(CDFUT),
              cdOpt: parseNumericValue(CDOPT),
            };
            processedData.push(brokerageRecord);
            
            // Reset variables
            MCXFUT = '';
            MCXOPT = '';
            NSEFUT = '';
            NSEOPT = '';
            CASHINT = '';
            CASHDEL = '';
            CDFUT = '';
            CDOPT = '';
          }
          
          UCC = col2Data;
          basketFound = false;
          console.log('Found UCC:', UCC);
          break;
          
        case 'In NSE-CM:Specific':
        case 'In NSE-CM:Basket':
          // Check for basket name
          if (col2Data.includes(']')) {
            const basketName = col2Data.split(']')[0];
            const cleanBasketName = basketName.replace('[', '').trim();
            if (basketData.includes(cleanBasketName)) {
              basketFound = true;
              continue;
            }
          }
          
          // Process NSE-CM data
          let cmMode = '';
          for (let i = 1; i <= 10; i++) {
            if (sourceCurrRow + i >= sheetData.length) break;
            const nextRow = sheetData[sourceCurrRow + i];
            const mode = String(nextRow[0] || '').trim();
            if (mode === '(Squared-Off)' || mode === '(Delivery)') {
              cmMode = mode;
              sourceCurrRow += i;
              break;
            }
            if (String(nextRow[1] || '').trim() === '') {
              sourceCurrRow = sourceCurrRow + i - 1;
              break;
            }
          }
          
          if (sourceCurrRow + 1 < sheetData.length) {
            sourceCurrRow++;
            const dataRow = sheetData[sourceCurrRow];
            const col2Text = String(dataRow[1] || '').trim();
            const values = parseSpaceSeparatedValues(col2Text);
            
            if (values.length >= 3) {
              const col1 = values[0];
              const col2 = values[1];
              const col3 = values[2];
              
              if (cmMode === '(Delivery)' && col1 === 'ALL' && parseNumericValue(col2) !== 0) {
                CASHDEL = col2;
              }
              
              if (cmMode === '(Squared-Off)' && col1 === 'ALL' && parseNumericValue(col3) !== 0) {
                CASHINT = col3;
              }
            }
          }
          break;
          
        case 'In NSE-F&O:Specific':
        case 'In NSE-F&O:Basket':
          // Check for basket name
          if (col2Data.includes(']')) {
            const basketName = col2Data.split(']')[0];
            const cleanBasketName = basketName.replace('[', '').trim();
            if (basketData.includes(cleanBasketName)) {
              basketFound = true;
              continue;
            }
          }
          
          // Find (Squared-Off) line
          for (let i = 1; i <= 10; i++) {
            if (sourceCurrRow + i >= sheetData.length) break;
            const nextRow = sheetData[sourceCurrRow + i];
            if (String(nextRow[0] || '').trim() === '(Squared-Off)') {
              sourceCurrRow += i;
              break;
            }
            if (String(nextRow[1] || '').trim() === '') {
              sourceCurrRow = sourceCurrRow + i - 1;
              break;
            }
          }
          
          // Process NSE F&O data
          while (sourceCurrRow + 1 < sheetData.length) {
            sourceCurrRow++;
            const dataRow = sheetData[sourceCurrRow];
            const col2Text = String(dataRow[1] || '').trim();
            const values = parseSpaceSeparatedValues(col2Text);
            
            if (values.length >= 5) {
              const col1 = values[0];
              const col3 = values[2];
              const col5 = values[4];
              const col6 = values[5];
              
              if (col1 === 'ALL') {
                if (parseNumericValue(col3) !== 0) {
                  NSEFUT = col3;
                }
                if (parseNumericValue(col5) !== 0) {
                  NSEOPT = col5;
                }
              } else if (col1 === 'ALLFUT') {
                NSEFUT = parseNumericValue(col3) === 0 ? '0.01' : col3;
              } else if (col1 === 'ALLOPT' || col1 === 'ALLSTK' || col1 === 'ALLOID') {
                if (parseNumericValue(col5) !== 0) {
                  if (parseNumericValue(NSEOPT) < parseNumericValue(col5)) {
                    NSEOPT = col5;
                  }
                } else if (col6 && parseNumericValue(NSEOPT) < parseNumericValue(col6)) {
                  NSEOPT = col6;
                }
              }
            }
            
            // Check if next row is empty
            if (sourceCurrRow + 1 >= sheetData.length || String(sheetData[sourceCurrRow + 1][0] || '').trim() === '') {
              if (NSEFUT !== '' && NSEOPT === '') {
                NSEOPT = '20.00';
              }
              break;
            }
          }
          
          if (NSEFUT === '' && parseNumericValue(NSEOPT) !== 0) {
            NSEFUT = '0.01';
          }
          break;
          
        case 'In NSE-CDS:Specific':
        case 'In NSE-CDS:Basket':
          // Similar logic for CDS
          if (col2Data.includes(']')) {
            const basketName = col2Data.split(']')[0];
            const cleanBasketName = basketName.replace('[', '').trim();
            if (basketData.includes(cleanBasketName)) {
              basketFound = true;
              continue;
            }
          }
          
          // Find (Squared-Off) line
          for (let i = 1; i <= 10; i++) {
            if (sourceCurrRow + i >= sheetData.length) break;
            const nextRow = sheetData[sourceCurrRow + i];
            if (String(nextRow[0] || '').trim() === '(Squared-Off)') {
              sourceCurrRow += i;
              break;
            }
            if (String(nextRow[1] || '').trim() === '') {
              sourceCurrRow = sourceCurrRow + i - 1;
              break;
            }
          }
          
          // Process CDS data
          while (sourceCurrRow + 1 < sheetData.length) {
            sourceCurrRow++;
            const dataRow = sheetData[sourceCurrRow];
            const col2Text = String(dataRow[1] || '').trim();
            const values = parseSpaceSeparatedValues(col2Text);
            
            if (values.length >= 5) {
              const col1 = values[0];
              const col3 = values[2];
              const col5 = values[4];
              const col6 = values[5];
              
              if (col1 === 'ALL') {
                if (parseNumericValue(col3) !== 0) {
                  CDFUT = col3;
                }
                if (parseNumericValue(col5) !== 0) {
                  CDOPT = col5;
                }
              } else if (col1 === 'ALLFUT') {
                CDFUT = parseNumericValue(col3) === 0 ? '0.01' : col3;
              } else if (col1 === 'ALLOPT') {
                CDOPT = parseNumericValue(col5) !== 0 ? col5 : col6;
              }
            }
            
            // Check if next row is empty
            if (sourceCurrRow + 1 >= sheetData.length || String(sheetData[sourceCurrRow + 1][0] || '').trim() === '') {
              if (CDFUT !== '' && CDOPT === '') {
                CDOPT = '20.00';
              }
              break;
            }
          }
          
          if (CDFUT === '' && parseNumericValue(CDOPT) !== 0) {
            CDFUT = '0.01';
          }
          break;
          
        case 'In MCX:Specific':
        case 'In MCX:Basket':
          // Check for basket name
          if (col2Data.includes(']')) {
            const basketName = col2Data.split(']')[0];
            const cleanBasketName = basketName.replace('[', '').trim();
            if (basketData.includes(cleanBasketName)) {
              basketFound = true;
              continue;
            }
          }
          
          // Find (Squared-Off) line
          for (let i = 1; i <= 10; i++) {
            if (sourceCurrRow + i >= sheetData.length) break;
            const nextRow = sheetData[sourceCurrRow + i];
            if (String(nextRow[0] || '').trim() === '(Squared-Off)') {
              sourceCurrRow += i;
              break;
            }
            if (String(nextRow[1] || '').trim() === '') {
              sourceCurrRow = sourceCurrRow + i - 1;
              break;
            }
          }
          
          // Process MCX FUT data
          const arrFUT: string[][] = [];
          while (sourceCurrRow + 1 < sheetData.length) {
            sourceCurrRow++;
            const dataRow = sheetData[sourceCurrRow];
            const col2Text = String(dataRow[1] || '').trim();
            const values = parseSpaceSeparatedValues(col2Text);
            
            if (values.length >= 3) {
              const col1 = values[0];
              const col2 = values[1];
              const col3 = values[2];
              const col4 = values[3];
              const col5 = values[4];
              const col6 = values[5];
              
              if (col1 === 'ALLFUT' || col1 === 'ALL') {
                arrFUT.push([col1, col3, col5, col6]);
                
                if (col5 === 'MktRate' || col5 === 'Turnover') {
                  MCXFUT = parseNumericValue(col3) === 0 ? '0.01' : col3;
                  break;
                }
                if (col4 === 'Turnover') {
                  MCXFUT = parseNumericValue(col2) === 0 ? '0.01' : col2;
                  break;
                }
                if (col1 === 'ALL' && parseNumericValue(col5) !== 0) {
                  MCXOPT = col5;
                }
              } else {
                if (arrFUT.length > 0) {
                  MCXFUT = parseNumericValue(arrFUT[0][1]) === 0 ? '0.01' : arrFUT[0][1];
                }
                break;
              }
            } else {
              break;
            }
          }
          
          // Process MCX OPT data
          while (sourceCurrRow < sheetData.length) {
            const dataRow = sheetData[sourceCurrRow];
            const col2Text = String(dataRow[1] || '').trim();
            
            if (!col2Text) {
              if (MCXFUT !== '' && MCXOPT === '') {
                MCXOPT = '20.00';
              }
              break;
            }
            
            const values = parseSpaceSeparatedValues(col2Text);
            
            if (values.length >= 5) {
              const col1 = values[0];
              const col5 = values[4];
              const col6 = values[5];
              
              if (col1 === 'ALLOPT') {
                MCXOPT = col5 === 'MktRate' ? col6 : col5;
                break;
              }
            }
            
            sourceCurrRow++;
          }
          break;
      }
    }
    
    // Save the last UCC if exists
    if (UCC !== '') {
      if (basketFound) {
        MCXFUT = '0';
        MCXOPT = '0';
        NSEFUT = '0';
        NSEOPT = '0';
        CASHINT = '0';
        CASHDEL = '0';
        CDFUT = '0';
        CDOPT = '0';
        orderClientData.push(UCC);
      }
      
      const brokerageRecord: BrokerageData = {
        clientCode: UCC,
        mcxFut: parseNumericValue(MCXFUT),
        mcxOpt: parseNumericValue(MCXOPT),
        nseFut: parseNumericValue(NSEFUT),
        nseOpt: parseNumericValue(NSEOPT),
        cashInt: parseNumericValue(CASHINT),
        cashDel: parseNumericValue(CASHDEL),
        cdFut: parseNumericValue(CDFUT),
        cdOpt: parseNumericValue(CDOPT),
      };
      processedData.push(brokerageRecord);
    }
    
    // Apply option additions and rounding like VBA
    processedData.forEach(record => {
      // Add option additions
      record.mcxOpt += calculateOptAddition(record.mcxOpt);
      record.nseOpt += calculateOptAddition(record.nseOpt);
      record.cdOpt += calculateOptAddition(record.cdOpt);
      
      // Round values to 3 decimal places
      record.mcxFut = Math.round(record.mcxFut * 1000) / 1000;
      record.nseFut = Math.round(record.nseFut * 1000) / 1000;
      record.cashInt = Math.round(record.cashInt * 1000) / 1000;
      record.cashDel = Math.round(record.cashDel * 1000) / 1000;
      record.cdFut = Math.round(record.cdFut * 1000) / 1000;
    });
    
    console.log('Final processed data:', processedData.length, 'records');
    console.log('Order client data:', orderClientData.length, 'records');
    
    const summary: BrokerageSummary = {
      totalClients: processedData.length,
      activeRecords: processedData.filter(item => 
        item.mcxFut > 0 || item.mcxOpt > 0 || item.nseFut > 0 || item.nseOpt > 0 || 
        item.cashInt > 0 || item.cashDel > 0 || item.cdFut > 0 || item.cdOpt > 0
      ).length,
      basketOrders: basketData.length,
      outputFiles: 3,
    };
    
    return { data: processedData, summary, orderClientData };
    
  } catch (error) {
    console.error('Error processing brokerage data:', error);
    throw new Error(`Failed to process brokerage file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export functions remain the same but need to accept orderClientData
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

export const exportOrderClient = (data: BrokerageData[], orderClientData: string[]): void => {
  const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  let content = 'RMS Limits\n';
  
  // Add NSEOR entries for clients with NSE/Cash activity
  data.forEach(row => {
    if (row.nseFut > 0 || row.nseOpt > 0 || row.cashInt > 0 || row.cashDel > 0) {
      content += `${row.clientCode}||||||||||||||||NSEOR\n`;
    }
  });
  
  // Add MCXOR entries for clients with MCX activity  
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
