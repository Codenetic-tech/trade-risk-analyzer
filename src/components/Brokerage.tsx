
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Users, Download } from 'lucide-react';
import { BrokerageUploadModal } from './BrokerageUploadModal';
import { BrokerageTable } from './BrokerageTable';
import { processBrokerageData, BrokerageData, BrokerageSummary } from '@/utils/brokerageProcessor';

const Brokerage: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [processedData, setProcessedData] = useState<BrokerageData[]>([]);
  const [summary, setSummary] = useState<BrokerageSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = async (dataFile: File | null, basketFile: File | null) => {
    if (!dataFile) {
      alert('Please select the data file');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processBrokerageData(dataFile, basketFile);
      setProcessedData(result.data);
      setSummary(result.summary);
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files. Please check the file format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Brokerage Management</h1>
          <p className="text-slate-600 mt-1">Process and analyze brokerage data</p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isProcessing}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Upload Files'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {summary?.totalClients || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Active Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {summary?.activeRecords || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Basket Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary?.basketOrders || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Output Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {summary?.outputFiles || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      {processedData.length > 0 && (
        <BrokerageTable data={processedData} summary={summary!} />
      )}

      {/* Upload Modal */}
      <BrokerageUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onFilesSelected={handleFilesSelected}
      />
    </div>
  );
};

export default Brokerage;
