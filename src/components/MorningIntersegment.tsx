import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Calculator, RefreshCw, Package, BarChart3, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import * as XLSX from 'xlsx';
import AdvancedFilters from './AdvancedFilters';
import DataVisualization from './DataVisualization';
import { FileUploadModal } from '@/components/morningintersegment/FileUploadModal';

interface KambalaData {
  Entity: string;
  Level: string;
  Profile: string;
  Cash: number;
  Payin: number;
  UnclearedCash: number;
  TOTAL: number;
  AvailableMargin: number;
  MarginUsed: number;
  AvailableCheck: number;
  CollateralTotal: number;
  margin99: number;
  margin90: number;
  margin1: number;
  kambalaNseAmount: number;
  kambalaMcxAmount: number;
  nseAmount: number;
  mcxAmount: number;
  nseAllocated: number;
}

const MorningIntersegment: React.FC = () => {
  const [processedData, setProcessedData] = useState<KambalaData[]>([]);
  const [intersegmentCodes, setIntersegmentCodes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showVisualization, setShowVisualization] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [mcxProfundInput, setMcxProfundInput] = useState<string>("20");
  const [isLoading, setIsLoading] = useState(false);

  const [nseAllocations, setNseAllocations] = useState<Record<string, number>>({});
  const [proFund, setProFund] = useState<number>(0);

  const mcxProfundAmount = useMemo(() => {
    const value = parseFloat(mcxProfundInput);
    return isNaN(value) ? 2000000 : Math.round(value * 100000);
  }, [mcxProfundInput]);

  // Advanced filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    entity: '',
    profile: '',
    cashRange: { min: '', max: '' },
    marginRange: { min: '', max: '' },
  });

  const [mismatchErrors, setMismatchErrors] = useState<string[]>([]); // this is for different available margin and available check values

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
          
          console.log('Raw Excel data:', jsonData);
          
          // Find header row and process data
          const headerRowIndex = jsonData.findIndex((row: any) => 
            Array.isArray(row) && row.some((cell: any) => 
              String(cell).toLowerCase().includes('entity') || 
              String(cell).toLowerCase().includes('code')
            )
          );
          
          if (headerRowIndex === -1) {
            throw new Error('Could not find header row in Excel file');
          }
          
          const headers = jsonData[headerRowIndex] as string[];
          const processedData = [];
          
          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;
            
            const rowObj: any = {};
            headers.forEach((header, index) => {
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

  const processFiles = async (kambalaFile: File | null, codeFile: File | null, nseGlobeFile: File | null) => {
    if (!kambalaFile || !codeFile || !nseGlobeFile) {
      toast({
        title: "Missing Files",
        description: "All three files are required",
        variant: "destructive",
      });
      return;
    }

  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

      // Read and parse NSE Globe file
    const nseText = await readFileAsText(nseGlobeFile);
    const nseglobe = parseNSECSV(nseText);
    
    // Extract allocations from NSE Globe file
    const allocations: Record<string, number> = {};
    let proFundAmount = 0;
    
    for (const row of nseglobe) {
      const segment = row.Segments;
      const accType = row.Acctype;
      const allocated = parseFloat(row.Allocated) || 0;
      const clicode = row.Clicode?.trim() || '';

      if (segment === 'FO') {
        if (accType === 'P') {
          proFundAmount = allocated;
        } else if (clicode) {
          allocations[clicode] = (allocations[clicode] || 0) + allocated;
        }
      }
    }
    
    setNseAllocations(allocations);
    setProFund(proFundAmount);
    
  // Get current date in DDMMYYYY format
  const getCurrentDateString = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = today.getFullYear();
    return `${day}${month}${year}`;
  };
  
  const todaysDate = getCurrentDateString();
  const kambalaPattern = new RegExp(`^Morning ${todaysDate}.(xlsx|xls)$`, "i");
  const codePattern = new RegExp(`^MCX TO NSE ${todaysDate}.(xlsx|xls)$`, "i");

  if (!kambalaPattern.test(kambalaFile.name)) {
    toast({
      title: "Invalid Kambala File",
      description: `File name must be: 'Morning ${todaysDate}.xlsx'`,
      variant: "destructive",
    });
    return;
  }
  
  if (!codePattern.test(codeFile.name)) {
    toast({
      title: "Invalid Code File",
      description: `File name must be: 'MCX TO NSE ${todaysDate}.xlsx'`,
      variant: "destructive",
    });
    return;
  }

  setIsProcessing(true);
  setIsLoading(true);

    try {

      setMismatchErrors([]);

      // Parse code Excel file first to get the codes to filter by
      const codeData = await parseExcel(codeFile);
      console.log('Code data:', codeData);
      
      // Extract codes from the code file and remove duplicates
      const rawCodes = codeData
        .map(row => {
          // Get the first non-empty value from the row
          const values = Object.values(row);
          return values.find(val => val && String(val).trim()) as string;
        })
        .filter(code => code && String(code).trim())
        .map(code => String(code).trim());
      
      // Remove duplicates from intersegment codes
      const codes = [...new Set(rawCodes)];
      
      setIntersegmentCodes(codes);
      console.log(`Evening Intersegment codes (${codes.length} unique):`, codes);

      // Parse Kambala Excel file
      const kambalaData = await parseExcel(kambalaFile);
      console.log('Total Kambala data rows:', kambalaData.length);

      // Step 1: Filter Kambala data to only include rows where Level is blank/empty
      const blankLevelData = kambalaData.filter(row => {
        const level = String(row.Level || '').trim();
        return level === 'COM';
      });
      
      console.log('Kambala rows with blank level:', blankLevelData.length);

      // Step 2: From the blank level rows, only take codes that exist in intersegment codes
      // Create a Map to ensure we only get one record per entity (in case of duplicates)
      const entityMap = new Map<string, any>();
      
      blankLevelData.forEach(row => {
        const entity = String(row.Entity || '').trim();
        if (codes.includes(entity) && !entityMap.has(entity)) {
          entityMap.set(entity, row);
        }
      });
      
      const filteredData = Array.from(entityMap.values());
      
      console.log(`Final filtered data: ${filteredData.length} unique records (should match ${codes.length} intersegment codes)`);
      console.log('Filtered entities:', filteredData.map(row => row.Entity));

      // Verify we have all the codes from intersegment file
      const foundEntities = filteredData.map(row => String(row.Entity).trim());
      const missingCodes = codes.filter(code => !foundEntities.includes(code));
      if (missingCodes.length > 0) {
        console.warn('Missing codes from Kambala file:', missingCodes);
      }

      const mismatchErrorsList: string[] = [];

      // Process and calculate margins
      const processedKambalaData: KambalaData[] = filteredData.map(row => {
        const parseValue = (value: any): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            // Remove commas and parse
            const cleaned = value.replace(/,/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        const cash = parseValue(row.Cash);
        const payin = parseValue(row.Payin);
        const unclearedCash = parseValue(row.UnclearedCash);
        const marginUsed = parseValue(row.MarginUsed);
        const collateralTotal = parseValue(row['Collateral(Total)']);
        const availableMargin = parseValue(row['Available Margin']);
        const availableCheck = parseValue(row['Available check']); // Add this
        
        const margin99 = Math.round(availableMargin * 0.99);
        const margin1 = Math.round(availableMargin * 0.01);
        const margin90 = Math.round(availableMargin * 0.90)

        // Check if Available Margin and Available Check match
        if (Math.abs(availableMargin - availableCheck) > 0.01) {
          const errorMsg = `${String(row.Entity || '')}: Available Margin (${availableMargin}) ≠ Available Check (${availableCheck})`;
          console.error('UCC mismatch:', errorMsg);
          mismatchErrorsList.push(errorMsg);
        }

        const nseAllocated = allocations[String(row.Entity || '').trim()] || 0;
         // Calculate all amounts once
        let nseAmount, mcxAmount, kambalaNseAmount, kambalaMcxAmount;

        if (marginUsed === 0) {
          mcxAmount = Math.round((cash + payin) - 100);
          nseAmount = Number(nseAllocated + mcxAmount).toFixed(2);
          kambalaNseAmount = Math.round((cash + payin) - 100);
          kambalaMcxAmount = -Math.round((cash + payin) - 100);
        } else if (marginUsed > 0) {
          nseAmount = Number(nseAllocated + margin90).toFixed(2);
          mcxAmount = margin90 - 1;
          kambalaNseAmount = Math.round(margin90);
          kambalaMcxAmount = -Math.round(margin90);
        }

        return {
          Entity: String(row.Entity || ''),
          Level: String(row.Level || ''),
          Profile: String(row.Profile || ''),
          Cash: cash,
          Payin: payin,
          UnclearedCash: unclearedCash,
          TOTAL: parseValue(row.TOTAL),
          AvailableMargin: availableMargin,
          MarginUsed: marginUsed,
          AvailableCheck: parseValue(row['Available check']),
          CollateralTotal: collateralTotal,
          margin99,
          margin90,
          margin1,
          kambalaNseAmount,
          kambalaMcxAmount,
          nseAmount, // Add this
          mcxAmount,
          nseAllocated,  // Add this
        };
      })
      const processedData = processedKambalaData.filter(row => row.kambalaNseAmount >= 0);
      
      setProcessedData(processedData);
      setMismatchErrors(mismatchErrorsList);
      
     // Show appropriate toast message based on whether there are errors
      if (mismatchErrorsList.length > 0) {
        toast({
          title: "Processing Complete with Errors",
          description: `Processed ${processedKambalaData.length} records but found ${mismatchErrorsList.length} UCC mismatches`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processing Complete",
          description: `Processed ${processedKambalaData.length} unique records from ${codes.length} intersegment codes`,
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process files. Please check file formats and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  // Get current date in DD-MMM-YYYY format
  const getCurrentDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  };



  const downloadNSEGlobeFile = () => {
    // Filter out records with kambalaNseAmount < 0
    const validData = processedData.filter(row => row.kambalaNseAmount >= 0);
    
    if (validData.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No records with kambalaNseAmount >= 0 to download",
        variant: "destructive",
      });
      return;
    }

    // Get date for filename (DDMMYYYY)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Fixed: use getMonth() instead of getDate()
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const nseContent = validData.map(row => {
      return `${getCurrentDate()},FO,M50302,90221,,${row.Entity},C,${(row.nseAmount)},,,,,,,U`;
    }).join('\n');

    const header = 'CURRENTDATE,SEGMENT,CMCODE,TMCODE,CPCODE,CLICODE,ACCOUNTTYPE,AMOUNT,FILLER1,FILLER2,FILLER3,FILLER4,FILLER5,FILLER6,ACTION\n';
    const fullContent = header + nseContent;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `90221_ALLOC_${dateString}.T0004`;  // Updated filename format
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "NSE Globe File Downloaded",
      description: `Downloaded ${validData.length} records (excluded ${processedData.length - validData.length} with negative kambalaNseAmount)`,
    });
  };

  const downloadMCXGlobeFile = () => {
    // Filter out records with kambalaNseAmount < 0
    const validData = processedData.filter(row => row.kambalaNseAmount >= 0);
    
    if (validData.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No records with kambalaNseAmount >= 0 to download",
        variant: "destructive",
      });
      return;
    }

    // Get date for filename (DDMMYYYY)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Fixed: use getMonth() instead of getDate()
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

      // Return formatted row
      const mcxContent = validData.map(row => {
        return `${getCurrentDate()},CO,8090,46365,,${row.Entity},C,${Math.round(row.mcxAmount)},,,,,,,D`;
      }).join('\n');


    const header = 'Current Date,Segment Indicator,Clearing Member Code,Trading Member Code,CP Code,Client Code,Account Type,CASH & CASH EQUIVALENTS AMOUNT,Filler1,Filler2,Filler3,Filler4,Filler5,Filler6,ACTION\n';
    const fullContent = header + mcxContent + '\n';

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MCCLCOLL_46365_${dateString}.003`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "MCX Globe File Downloaded",
      description: `Downloaded ${validData.length} records (excluded ${processedData.length - validData.length} with negative kambalaNseAmount)`,
    });
  };

  const downloadKambalaNSEFile = () => {
    // Filter out records with kambalaNseAmount < 0 AND kambalaNseAmount !== 0
    const filteredData = processedData.filter(row => 
      row.kambalaNseAmount !== 0 && row.kambalaNseAmount >= 0
    );
    
    if (filteredData.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No records with kambalaNseAmount > 0 to download",
        variant: "destructive",
      });
      return;
    }

    // Get date for filename (DDMMYYYY)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Fixed: use getMonth() instead of getDate()
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const nseContent = filteredData.map(row => {
      return `${row.Entity}|||||||||||||||||no||||||||${Math.round(row.kambalaNseAmount)}`;
    }).join('\n');

    const fullContent = 'RMS Limits\n' + nseContent;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NSEkambala_${dateString}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Kambala NSE File Downloaded",
      description: `Downloaded ${filteredData.length} records (excluded ${processedData.length - filteredData.length} with kambalaNseAmount <= 0)`,
    });
  };

  const downloadKambalaMCXFile = () => {
    // Filter out records with kambalaNseAmount < 0 AND kambalaNseAmount !== 0
    const filteredData = processedData.filter(row => 
      row.kambalaNseAmount !== 0 && row.kambalaNseAmount >= 0
    );
    
    if (filteredData.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No records with kambalaNseAmount > 0 to download",
        variant: "destructive",
      });
      return;
    }

    // Get date for filename (DDMMYYYY)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Fixed: use getMonth() instead of getDate()
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const mcxContent = filteredData.map(row => 
      `${row.Entity}||COM|||||||||||||||no||||||||${Math.round(row.kambalaMcxAmount)}`
    ).join('\n');

    const fullContent = 'RMS Limits\n' + mcxContent;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MCXkambala_${dateString}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Kambala MCX File Downloaded",
      description: `Downloaded ${filteredData.length} records (excluded ${processedData.length - filteredData.length} with kambalaNseAmount <= 0)`,
    });
  };

  const downloadAllFiles = () => {
    if (processedData.length === 0) {
      toast({
        title: "No Data",
        description: "No processed data to download",
        variant: "destructive",
      });
      return;
    }

    const validRecords = processedData.filter(row => row.kambalaNseAmount >= 0).length;
    const excludedRecords = processedData.length - validRecords;

    downloadNSEGlobeFile();
    setTimeout(() => downloadMCXGlobeFile(), 500);
    setTimeout(() => downloadKambalaNSEFile(), 1000);
    setTimeout(() => downloadKambalaMCXFile(), 1500);
    setTimeout(() => exportProcessedData(), 2000);

    toast({
      title: "Download Started",
      description: `Downloading ${validRecords} valid records. ${excludedRecords > 0 ? `Excluded ${excludedRecords} records with negative kambalaNseAmount.` : ''} Please check your downloads folder.`,
    });
  };

  const exportProcessedData = () => {
    if (processedData.length === 0) {
      toast({
        title: "No Data",
        description: "No processed data to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = processedData.map(row => ({
      Entity: row.Entity,
      Level: row.Level,
      Profile: row.Profile,
      Cash: row.Cash,
      Payin: row.Payin,
      'Uncleared Cash': row.UnclearedCash,
      TOTAL: row.TOTAL,
      'Available Margin': row.AvailableMargin,
      'Margin Used': row.MarginUsed,
      'Available Check': row.AvailableCheck,
      'Collateral Total': row.CollateralTotal,
      '99% Margin': row.margin99,
      '90% Margin': row.margin90,
      '1% Margin': row.margin1,
      'NSE Globe': row.nseAmount, // Add this
      'MCX Globe': row.mcxAmount, // Add this
      'Kambala NSE': row.kambalaNseAmount,
      'Kambala MCX': row.kambalaMcxAmount,
      'Globe Amount': row.nseAllocated
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evening Intersegment Data');
    XLSX.writeFile(wb, 'evening_intersegment_processed_data.xlsx');

    toast({
      title: "Export Complete",
      description: "Processed data exported successfully",
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const summaryTotals = useMemo(() => {
    return {
      total99Margin: processedData.reduce((sum, row) => sum + row.margin99, 0),
      total1Margin: processedData.reduce((sum, row) => sum + row.margin1, 0),
      totalCollateral: processedData.reduce((sum, row) => sum + row.CollateralTotal, 0),
      totalAvailableMargin: processedData.reduce((sum, row) => sum + row.AvailableMargin, 0),
    };
  }, [processedData]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => {
      // Search filter
      const matchesSearch = item.Entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.Profile.toLowerCase().includes(searchQuery.toLowerCase());

      // Advanced filters
      const matchesEntity = !filters.entity || item.Entity.toLowerCase().includes(filters.entity.toLowerCase());
      const matchesProfile = !filters.profile || item.Profile.toLowerCase().includes(filters.profile.toLowerCase());
      
      const matchesCashRange = (!filters.cashRange.min || item.Cash >= parseFloat(filters.cashRange.min)) &&
                              (!filters.cashRange.max || item.Cash <= parseFloat(filters.cashRange.max));
      
      const matchesMarginRange = (!filters.marginRange.min || item.AvailableMargin >= parseFloat(filters.marginRange.min)) &&
                                (!filters.marginRange.max || item.AvailableMargin <= parseFloat(filters.marginRange.max));

      return matchesSearch && matchesEntity && matchesProfile && matchesCashRange && matchesMarginRange;
    });
  }, [processedData, searchQuery, filters]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.entity) count++;
    if (filters.profile) count++;
    if (filters.cashRange.min || filters.cashRange.max) count++;
    if (filters.marginRange.min || filters.marginRange.max) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      entity: '',
      profile: '',
      cashRange: { min: '', max: '' },
      marginRange: { min: '', max: '' },
    });
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Morning Intersegment</h1>
            <p className="text-slate-600 mt-2">
              Process Kambala Excel file with Morning Intersegment codes and generate globe files
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Upload Files'}
            </Button>
            {processedData.length > 0 && (
              <Button 
                onClick={() => setShowVisualization(!showVisualization)} 
                variant="outline" 
                className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showVisualization ? 'Hide Charts' : 'Show Charts'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onFilesSelected={processFiles}
      />

      {/* available margin available check Mismatch Errors */}
      {mismatchErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <div className="font-bold mb-2">UCC Mismatch Detected:</div>
            {mismatchErrors.slice(0, 5).map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
            {mismatchErrors.length > 5 && (
              <div className="mt-2">
                ...and {mismatchErrors.length - 5} more mismatches
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Visualization */}
      {processedData.length > 0 && showVisualization && (
        <DataVisualization data={processedData} />
      )}

      {/* Summary Cards - Always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total 99% Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {processedData.length > 0 
                ? `${Number(summaryTotals.total99Margin / 100000).toFixed(2)} L` 
                : '0.00 L'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total 1% Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {processedData.length > 0 
                ? `${Number(summaryTotals.total1Margin / 100000).toFixed(2)} L` 
                : '0.00 L'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Total Collateral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {processedData.length > 0 
                ? `${Number(summaryTotals.totalCollateral / 100000).toFixed(2)} L` 
                : '0.00 L'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Total Available Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {processedData.length > 0 
                ? `${Number(summaryTotals.totalAvailableMargin/ 100000).toFixed(2)} L` 
                : '0.00 L'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        activeFiltersCount={activeFiltersCount}
        disabled={processedData.length === 0}
      />

      {/* Results Table - Always visible */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Processed Data {processedData.length > 0 && 
                `(${filteredData.length} of ${processedData.length} records)`}
            </CardTitle>
            <div className="space-x-2 flex flex-wrap gap-2">
              {/* MCX Profund Input
              {processedData.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex items-center">
                    <span className="mr-2 font-medium text-yellow-700">MCX Pro</span>
                    <input
                      type="text"
                      value={mcxProfundInput}
                      onChange={(e) => setMcxProfundInput(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-20 p-2 border border-yellow-300 rounded-md text-center font-mono"
                      placeholder="20"
                    />
                  </div>
                  <div className="text-sm text-yellow-700 font-mono bg-yellow-100 px-2 py-1 rounded">
                    = ₹{new Intl.NumberFormat('en-IN').format(mcxProfundAmount)}
                  </div>
                </div>
              )}*/}
              <Button 
                onClick={downloadNSEGlobeFile} 
                className="bg-green-600 hover:bg-green-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                NSE Globe
              </Button>
              <Button 
                onClick={downloadMCXGlobeFile} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                MCX Globe
              </Button>
              <Button 
                onClick={downloadKambalaNSEFile} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Kambala NSE
              </Button>
              <Button 
                onClick={downloadKambalaMCXFile} 
                className="bg-orange-600 hover:bg-orange-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Kambala MCX
              </Button>
              <Button 
                onClick={downloadAllFiles} 
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-8 py-3 text-white font-semibold shadow-lg"
                disabled={processedData.length === 0 || isLoading}
              >
                <Package className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : 'Download All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Payin</TableHead>
                  <TableHead className="text-right">Uncleared Cash</TableHead>
                  <TableHead className="text-right">TOTAL</TableHead>
                  <TableHead className="text-right">Available Margin</TableHead>
                  <TableHead className="text-right">Margin Used</TableHead>
                  <TableHead className="text-right">Collateral Total</TableHead>
                  <TableHead className="text-right">Globe amount</TableHead>
                  <TableHead className="text-right">90% Margin</TableHead>
                  <TableHead className="text-right bg-blue-50">NSE Globe</TableHead>
                  <TableHead className="text-right bg-green-50">MCX Globe</TableHead>
                  <TableHead className="text-right bg-red-50">Kambala NSE</TableHead>
                  <TableHead className="text-right bg-purple-50">Kambala MCX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-slate-600">Processing files...</p>
                    </TableCell>
                  </TableRow>
                ) : processedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-lg font-medium text-slate-800">
                        No Data Processed Yet
                      </h3>
                      <p className="text-slate-600 mb-4">
                        Upload your Kambala and Evening Intersegment code files
                      </p>
                      <Button 
                        onClick={() => setShowUploadModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <Search className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-lg font-medium text-slate-800">
                        No matching records found
                      </h3>
                      <p className="text-slate-600">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{row.Entity}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Cash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Payin)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.UnclearedCash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.TOTAL)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatNumber(row.AvailableMargin)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.MarginUsed)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.CollateralTotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.nseAllocated)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.margin90)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-600 bg-blue-50">{formatNumber(row.nseAmount)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600 bg-green-50">{formatNumber(row.mcxAmount)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-red-600 bg-red-50">{formatNumber(row.kambalaNseAmount)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-purple-600 bg-purple-50">{formatNumber(row.kambalaMcxAmount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination - only show when we have data */}
          {processedData.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MorningIntersegment;