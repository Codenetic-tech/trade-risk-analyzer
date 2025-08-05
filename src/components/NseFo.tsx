
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, DollarSign, Banknote, Calculator, Download } from 'lucide-react';
import { NseCmUploadModal } from './NseCmUploadModal';
import { NseCmTable } from './NseCmTable';
import { processNseCmFiles, NseCmData, NseCmSummary, NseCmOutputRecord } from '@/utils/nseCmProcessor';
import ModernLoading from './ModernLoading';

const NseFo: React.FC = () => {
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
      // For now using same processor, will modify later for F&O specific logic
      const result = await processNseCmFiles(files, unallocatedFund);
      setProcessedData(result);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${result.data.length} F&O records successfully`,
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process F&O files. Please check file formats and try again.",
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
        'FO', // Changed segment to FO
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
    link.download = 'nse_fo_output.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isProcessing) {
    return (
      <ModernLoading 
        message="Processing NSE F&O Files"
        subMessage="Analyzing futures and options data, risk allocations, and NRI exclusions. This may take a few moments."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800">NSE F&O - Morning BOD</h1>
        <p className="text-slate-600 mt-2">
          Upload Risk, NSE Globe, and NRI files to analyze NSE F&O allocation differences
        </p>
      </div>

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

      {/* Unallocated Fund Input and Export Section */}
      {processedData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
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
              <div className="flex space-x-2">
                <Button
                  onClick={exportOutputFile}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Output File
                </Button>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  variant="outline"
                >
                  Upload New Files
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {processedData && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-800">NSE F&O Analysis Results</h2>
          <NseCmTable data={processedData.data} />
        </div>
      )}

      {/* Show upload button only when no data is processed */}
      {!processedData && (
        <div className="text-center py-12">
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
            size="lg"
          >
            Upload Files for NSE F&O Analysis
          </Button>
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

export default NseFo;
