import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, DollarSign, Banknote, Calculator, Download, Settings, Edit } from 'lucide-react';
import { NseCmUploadModal } from './NseCmUploadModal';
import { NseCmTable } from './NseCmTable';
import { processNseCmFiles, NseCmData, NseCmSummary, NseCmOutputRecord } from '@/utils/nseCmProcessor';
import ModernLoading from './ModernLoading';

const NseCm: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [unallocatedFund, setUnallocatedFund] = useState<number>(0);
  const [tempUnallocatedFund, setTempUnallocatedFund] = useState<number>(0);
  const [isEditingUnallocated, setIsEditingUnallocated] = useState(false);
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

  const handleSetUnallocatedFund = async () => {
    setUnallocatedFund(tempUnallocatedFund);
    setIsEditingUnallocated(false);
    
    // Reprocess data with new unallocated fund if we have processed data
    if (processedData) {
      toast({
        title: "Recalculating",
        description: "Updating calculations with new unallocated fund amount...",
      });
      
      // Update the final amount in summary and output records using new formula
      const netValue = processedData.summary.upgradeTotal - processedData.summary.downgradeTotal;
      const finalProFund = processedData.summary.proFund - 8000000;
      const unallocatedFundAmount = tempUnallocatedFund * 100000; // Convert lacs to actual amount
      const newFinalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
      
      const updatedSummary = {
        ...processedData.summary,
        finalAmount: newFinalAmount
      };
      
      const proFundAction: 'U' | 'D' = processedData.summary.proFund < newFinalAmount ? 'U' : 'D';
      
      const updatedOutputRecords = processedData.outputRecords.map((record, index) => {
        if (index === 0 && record.accountType === 'P') {
          return { 
            ...record, 
            amount: newFinalAmount,
            action: proFundAction
          };
        }
        return record;
      });
      
      setProcessedData({
        ...processedData,
        summary: updatedSummary,
        outputRecords: updatedOutputRecords
      });
    }
  };

  const handleEditUnallocatedFund = () => {
    setTempUnallocatedFund(unallocatedFund);
    setIsEditingUnallocated(true);
  };

  const exportOutputFile = () => {
    if (!processedData || !processedData.outputRecords || processedData.outputRecords.length === 0) return;

    // Get current date in DDMMYYYY format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const headers = ['CURRENTDATE', 'SEGMENT', 'CMCODE', 'TMCODE', 'CPCODE', 'CLICODE', 'ACCOUNTTYPE', 'AMOUNT', 'FILLER1', 'FILLER2', 'FILLER3', 'FILLER4', 'FILLER5', 'FILLER6', 'ACTION'];
    const textContent = [
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

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `90221_ALLOC_${dateString}.T0001`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (isProcessing) {
    return (
      <ModernLoading 
        message="Processing NSE CM Files"
        subMessage="Analyzing risk data, globe allocations, and NRI exclusions. This may take a few moments."
      />
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
                ₹{(processedData.summary.upgradeTotal / 100000).toFixed(2)} L
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
                ₹{(processedData.summary.downgradeTotal / 100000).toFixed(2)} L
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
                ₹{(processedData.summary.netValue / 100000).toFixed(2)} L
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
                ₹{(processedData.summary.proFund / 100000).toFixed(2)} L
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
                ₹{(processedData.summary.finalAmount / 100000).toFixed(2)} L
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unallocated Fund and Export Section */}
      {processedData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between space-y-4 lg:space-y-0">
              <div className="space-y-2">
                <Label htmlFor="unallocated-fund">Unallocated Fund (in Lacs)</Label>
                <div className="flex items-center space-x-2">
                  {isEditingUnallocated ? (
                    <>
                      <Input
                        id="temp-unallocated-fund"
                        type="number"
                        placeholder="Enter amount in lacs"
                        value={tempUnallocatedFund || ''}
                        onChange={(e) => setTempUnallocatedFund(parseFloat(e.target.value) || 0)}
                        className="max-w-sm"
                        step="0.01"
                      />
                      <Button
                        onClick={handleSetUnallocatedFund}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Set
                      </Button>
                      <Button
                        onClick={() => setIsEditingUnallocated(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        id="unallocated-fund"
                        type="text"
                        value={`₹${unallocatedFund.toFixed(2)} L`}
                        readOnly
                        className="max-w-sm bg-gray-50"
                      />
                      <Button
                        onClick={handleEditUnallocatedFund}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
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
          <h2 className="text-xl font-semibold text-slate-800">NSE CM Analysis Results</h2>
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
            Upload Files for NSE CM Analysis
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

export default NseCm;
