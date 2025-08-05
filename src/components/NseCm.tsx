
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, TrendingUp, TrendingDown, DollarSign, Banknote, Calculator, Download } from 'lucide-react';
import { NseCmUploadModal } from './NseCmUploadModal';
import { NseCmTable } from './NseCmTable';
import { processNseCmFiles, NseCmData, NseCmSummary, NseCmOutputRecord } from '@/utils/nseCmProcessor';

const NseCm: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [unallocatedFund, setUnallocatedFund] = useState<number>(0);
  const [processedData, setProcessedData] = useState<{
    data: NseCmData[];
    summary: NseCmSummary;
    outputRecords: NseCmOutputRecord[];
  } | null>(null);

  const handleFilesUploaded = async (files: { 
    risk: File | null; 
    nse: File | null; 
    nri: File | null; 
  }) => {
    setIsProcessing(true);
    setShowUploadModal(false);

    try {
      const result = await processNseCmFiles(files, unallocatedFund);
      setProcessedData(result);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${result.data.length} records successfully`,
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process files. Please check file formats and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportOutputFile = () => {
    if (!processedData) return;

    const headers = ['CURRENTDATE', 'SEGMENT', 'CMCODE', 'TMCODE', 'CPCODE', 'CLICODE', 'ACCOUNTTYPE', 'AMOUNT', 'FILLER1', 'FILLER2', 'FILLER3', 'FILLER4', 'FILLER5', 'FILLER6', 'ACTION'];
    const csvContent = [
      headers.join(','),
      ...processedData.outputRecords.map(row => [
        row.currentDate,
        row.segment,
        row.cmCode,
        row.tmCode,
        row.cpCode,
        row.clicode,
        row.accountType,
        row.amount,
        row.filler1,
        row.filler2,
        row.filler3,
        row.filler4,
        row.filler5,
        row.filler6,
        row.action
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nse_cm_output.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="text-lg font-medium text-slate-700">Processing NSE CM files...</div>
        <p className="text-slate-500">This may take a few moments</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800">NSE CM - Morning BOD</h1>
        <p className="text-slate-600 mt-2">
          Upload Risk, NSE Globe, and NRI files to analyze NSE CM allocation differences
        </p>
      </div>

      {/* Unallocated Fund Input and Upload Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Process Files</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="unallocated-fund">Unallocated Fund</Label>
            <Input
              id="unallocated-fund"
              type="number"
              placeholder="Enter unallocated fund amount"
              value={unallocatedFund || ''}
              onChange={(e) => setUnallocatedFund(parseFloat(e.target.value) || 0)}
              className="max-w-sm"
            />
          </div>
          
          <div className="text-center py-8">
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files for NSE CM Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {processedData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {processedData.summary.upgradeTotal.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center">
                <TrendingDown className="h-4 w-4 mr-2" />
                Downgrade Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {processedData.summary.downgradeTotal.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Net Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {processedData.summary.netValue.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 flex items-center">
                <Banknote className="h-4 w-4 mr-2" />
                Pro Fund
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {processedData.summary.proFund.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600 flex items-center">
                <Calculator className="h-4 w-4 mr-2" />
                Final Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {processedData.summary.finalAmount.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Section */}
      {processedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">NSE CM Analysis Results</h2>
            <div className="flex space-x-2">
              <Button
                onClick={exportOutputFile}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Output File
              </Button>
              <button
                onClick={() => setProcessedData(null)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium px-4 py-2 border border-blue-200 rounded-md hover:bg-blue-50"
              >
                Upload New Files
              </button>
            </div>
          </div>
          
          <NseCmTable data={processedData.data} />
        </div>
      )}

      {/* Upload Modal */}
      <NseCmUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onFilesSelected={handleFilesUploaded}
      />
    </div>
  );
};

export default NseCm;
