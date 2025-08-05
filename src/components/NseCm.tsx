
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, TrendingUp, TrendingDown, DollarSign, Banknote, Calculator } from 'lucide-react';
import { NseCmUploadModal } from './NseCmUploadModal';
import { NseCmTable } from './NseCmTable';
import { processNseCmFiles, NseCmData, NseCmSummary } from '@/utils/nseCmProcessor';

const NseCm: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [processedData, setProcessedData] = useState<{
    data: NseCmData[];
    summary: NseCmSummary;
  } | null>(null);

  const handleFilesUploaded = async (files: { 
    risk: File | null; 
    nse: File | null; 
    nri: File | null; 
  }) => {
    setIsProcessing(true);

    try {
      const result = await processNseCmFiles(files);
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

      {/* Upload Button */}
      {!processedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <span>Upload Files</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files for NSE CM Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {processedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">NSE CM Analysis Results</h2>
            <button
              onClick={() => setProcessedData(null)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Upload New Files
            </button>
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
