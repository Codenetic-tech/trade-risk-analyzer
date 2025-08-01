
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, Calculator } from 'lucide-react';

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

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split('\t').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split('\t').map(v => v.trim().replace(/"/g, '').replace(/,/g, ''));
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
      // Parse Kambala file
      const kambalaText = await kambalaFile.text();
      const kambalaData = parseCSV(kambalaText);
      console.log('Kambala data:', kambalaData);

      // Parse code file
      const codeText = await codeFile.text();
      const codes = codeText.split('\n').map(line => line.trim()).filter(line => line);
      setIntersegmentCodes(codes);
      console.log('Intersegment codes:', codes);

      // Filter Kambala data based on codes
      const filteredData = kambalaData.filter(row => codes.includes(row.Entity));
      
      // Process and calculate margins
      const processedKambalaData: KambalaData[] = filteredData.map(row => {
        const availableMargin = parseFloat(row['Available Margin'] || '0');
        const margin99 = Math.round(availableMargin * 0.99);
        const margin1 = Math.round(availableMargin * 0.01);

        return {
          Entity: row.Entity || '',
          Level: row.Level || '',
          Profile: row.Profile || '',
          Cash: parseFloat(row.Cash?.replace(/,/g, '') || '0'),
          Payin: parseFloat(row.Payin?.replace(/,/g, '') || '0'),
          UnclearedCash: parseFloat(row.UnclearedCash?.replace(/,/g, '') || '0'),
          TOTAL: parseFloat(row.TOTAL?.replace(/,/g, '') || '0'),
          AvailableMargin: availableMargin,
          MarginUsed: parseFloat(row.MarginUsed?.replace(/,/g, '') || '0'),
          AvailableCheck: parseFloat(row['Available check']?.replace(/,/g, '') || '0'),
          CollateralTotal: parseFloat(row['Collateral(Total)']?.replace(/,/g, '') || '0'),
          margin99,
          margin1
        };
      });

      setProcessedData(processedKambalaData);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${processedKambalaData.length} records successfully`,
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
      `${currentDate},CO,M50302,90221,,${row.Entity},C,${row.margin1},,,,,,,D`
    ).join('\n');

    const header = 'CURRENTDATE,SEGMENT,CMCODE,TMCODE,CPCODE,CLICODE,ACCOUNTTYPE,AMOUNT,FILLER1,FILLER2,FILLER3,FILLER4,FILLER5,FILLER6,ACTION\n';
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
          Process Kambala file with Evening Intersegment codes and generate globe files
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
            <CardDescription>Upload the Kambala file (.txt or .csv)</CardDescription>
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
                  accept=".txt,.csv"
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
            <CardDescription>Upload the code file (.txt)</CardDescription>
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
                  accept=".txt"
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
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-2 text-left">Entity</th>
                    <th className="border border-slate-300 px-4 py-2 text-left">Level</th>
                    <th className="border border-slate-300 px-4 py-2 text-left">Profile</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Cash</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Payin</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Uncleared Cash</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">TOTAL</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Available Margin</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Margin Used</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Available Check</th>
                    <th className="border border-slate-300 px-4 py-2 text-right">Collateral Total</th>
                    <th className="border border-slate-300 px-4 py-2 text-right bg-blue-50">99% Margin</th>
                    <th className="border border-slate-300 px-4 py-2 text-right bg-green-50">1% Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-medium">{row.Entity}</td>
                      <td className="border border-slate-300 px-4 py-2">{row.Level}</td>
                      <td className="border border-slate-300 px-4 py-2">{row.Profile}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.Cash)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.Payin)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.UnclearedCash)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.TOTAL)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono font-semibold">{formatNumber(row.AvailableMargin)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.MarginUsed)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.AvailableCheck)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono">{formatNumber(row.CollateralTotal)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono font-semibold text-blue-600 bg-blue-50">{formatNumber(row.margin99)}</td>
                      <td className="border border-slate-300 px-4 py-2 text-right font-mono font-semibold text-green-600 bg-green-50">{formatNumber(row.margin1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!kambalaFile || !codeFile ? (
        <Alert>
          <AlertDescription>
            Both Kambala file and Evening Intersegment code file are required to proceed.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default EveningIntersegment;
