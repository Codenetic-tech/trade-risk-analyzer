
import React, { useState } from 'react';
import FileUpload from './FileUpload';
import DataTable from './DataTable';
import { processFiles, ProcessedData } from '@/utils/dataProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);

  const handleFilesUploaded = async (files: { risk: File | null; nse: File | null; mcx: File | null }) => {
    setIsProcessing(true);

    try {
      const result = await processFiles(files);
      setProcessedData(result);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${result.data.length} records successfully`,
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process files. Please try again.",
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
        <div className="text-lg font-medium text-slate-700">Processing files...</div>
        <p className="text-slate-500">This may take a few moments</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800">Risk Management Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Upload and analyze risk files to monitor allocation differences
        </p>
      </div>

      {/* File Upload Section */}
      {!processedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>File Upload</span>
            </CardTitle>
            <CardDescription>
              Upload your Risk Excel file and Globe allocation files (NSE/MCX) to begin analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onFilesUploaded={handleFilesUploaded} />
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {processedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-800">Analysis Results</h2>
            </div>
            <button
              onClick={() => setProcessedData(null)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Upload New Files
            </button>
          </div>
          
          <DataTable data={processedData.data} summary={processedData.summary} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
