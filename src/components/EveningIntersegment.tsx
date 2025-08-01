import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Calculator } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';

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
  margin1: number;
}

const EveningIntersegment: React.FC = () => {
  const [kambalaFile, setKambalaFile] = useState<File | null>(null);
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<KambalaData[]>([]);
  const [intersegmentCodes, setIntersegmentCodes] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (type: 'kambala' | 'code', file: File) => {
    if (type === 'kambala') {
      setKambalaFile(file);
    } else {
      setCodeFile(file);
    }
  };

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

  const processFiles = async () => {
    if (!kambalaFile || !codeFile) {
      toast({
        title: "Missing Files",
        description: "Both Kambala and Evening Intersegment code files are required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
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
        return level === '' || level === null || level === undefined;
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

        const availableMargin = parseValue(row['Available Margin']);
        const margin99 = Math.round(availableMargin * 0.99);
        const margin1 = Math.round(availableMargin * 0.01);

        return {
          Entity: String(row.Entity || ''),
          Level: String(row.Level || ''),
          Profile: String(row.Profile || ''),
          Cash: parseValue(row.Cash),
          Payin: parseValue(row.Payin),
          UnclearedCash: parseValue(row.UnclearedCash),
          TOTAL: parseValue(row.TOTAL),
          AvailableMargin: availableMargin,
          MarginUsed: parseValue(row.MarginUsed),
          AvailableCheck: parseValue(row['Available check']),
          CollateralTotal: parseValue(row['Collateral(Total)']),
          margin99,
          margin1
        };
      });

      setProcessedData(processedKambalaData);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${processedKambalaData.length} unique records from ${codes.length} intersegment codes`,
      });
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process files. Please check file formats and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadNSEGlobeFile = () => {
    if (processedData.length === 0) return;

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const nseContent = processedData.map(row => 
      `${currentDate},FO,M50302,90221,,${row.Entity},C,${row.margin1},,,,,,,D`
    ).join('\n');

    const header = 'CURRENTDATE,SEGMENT,CMCODE,TMCODE,CPCODE,CLICODE,ACCOUNTTYPE,AMOUNT,FILLER1,FILLER2,FILLER3,FILLER4,FILLER5,FILLER6,ACTION\n';
    const fullContent = header + nseContent;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nse_globe_file.txt';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadMCXGlobeFile = () => {
    if (processedData.length === 0) return;

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const mcxContent = processedData.map(row => 
      `${currentDate},CO,8090,46365,,${row.Entity},C,${row.margin99},,,,,,,A`
    ).join('\n');

    const header = 'Current Date,Segment Indicator,Clearing Member Code,Trading Member Code,CP Code,Client Code,Account Type,CASH & CASH EQUIVALENTS AMOUNT,Filler1,Filler2,Filler3,Filler4,Filler5,Filler6,ACTION\n';
    const fullContent = header + mcxContent;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mcx_globe_file.txt';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800">Evening Intersegment</h1>
        <p className="text-slate-600 mt-2">
          Process Kambala Excel file with Evening Intersegment codes and generate globe files
        </p>
      </div>

      {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <span>Kambala File</span>
            </CardTitle>
            <CardDescription>Upload the Kambala Excel file (.xlsx)</CardDescription>
          </CardHeader>
          <CardContent>
            {kambalaFile ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium">{kambalaFile.name}</p>
                <p className="text-xs text-green-600">File uploaded successfully</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <label htmlFor="kambala-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>
                </label>
                <input
                  id="kambala-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('kambala', file);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
              <span>Evening Intersegment Code File</span>
            </CardTitle>
            <CardDescription>Upload the code Excel file (.xlsx)</CardDescription>
          </CardHeader>
          <CardContent>
            {codeFile ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium">{codeFile.name}</p>
                <p className="text-xs text-green-600">File uploaded successfully</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <label htmlFor="code-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>
                </label>
                <input
                  id="code-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('code', file);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={processFiles}
          disabled={!kambalaFile || !codeFile || isProcessing}
          className="bg-blue-600 hover:bg-blue-700 px-8 py-2"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Process Files'}
        </Button>
      </div>

      {/* Results Table */}
      {processedData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Processed Data ({processedData.length} records)</CardTitle>
              <div className="space-x-2">
                <Button onClick={downloadNSEGlobeFile} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download NSE Globe File
                </Button>
                <Button onClick={downloadMCXGlobeFile} className="bg-purple-600 hover:bg-purple-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download MCX Globe File
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
                    <TableHead>Level</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Payin</TableHead>
                    <TableHead className="text-right">Uncleared Cash</TableHead>
                    <TableHead className="text-right">TOTAL</TableHead>
                    <TableHead className="text-right">Available Margin</TableHead>
                    <TableHead className="text-right">Margin Used</TableHead>
                    <TableHead className="text-right">Available Check</TableHead>
                    <TableHead className="text-right">Collateral Total</TableHead>
                    <TableHead className="text-right bg-blue-50">99% Margin</TableHead>
                    <TableHead className="text-right bg-green-50">1% Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{row.Entity}</TableCell>
                      <TableCell>{row.Level}</TableCell>
                      <TableCell>{row.Profile}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Cash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Payin)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.UnclearedCash)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.TOTAL)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatNumber(row.AvailableMargin)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.MarginUsed)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.AvailableCheck)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.CollateralTotal)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-blue-600 bg-blue-50">{formatNumber(row.margin99)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600 bg-green-50">{formatNumber(row.margin1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!kambalaFile || !codeFile ? (
        <Alert>
          <AlertDescription>
            Both Kambala Excel file and Evening Intersegment code Excel file are required to proceed.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default EveningIntersegment;
