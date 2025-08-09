import React, { useState, useMemo } from 'react';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from './ui/select';
import { Input } from './ui/input';
import { 
  Upload, 
  FileText, 
  Users, 
  Download, 
  AlertCircle, 
  Search, 
  FileSpreadsheet, 
  X 
} from 'lucide-react';
import ModernLoading from './ModernLoading';
import { 
  BrokerageData, 
  BrokerageSummary, 
  processBrokerageData,
  exportBrokerageData,
  exportOrderClient,
  exportClientWiseBrokerage
} from '@/utils/brokerageProcessor';
import { CardDescription } from './ui/card';

// ===================================================================
// BROKERAGE UPLOAD MODAL
// ===================================================================
interface BrokerageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (dataFile: File | null, basketFile: File | null) => void;
}

const BrokerageUploadModal: React.FC<BrokerageUploadModalProps> = ({
  open,
  onOpenChange,
  onFilesSelected,
}) => {
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [basketFile, setBasketFile] = useState<File | null>(null);

  const handleFileSelect = (type: 'data' | 'basket', file: File) => {
    if (type === 'data') {
      setDataFile(file);
    } else {
      setBasketFile(file);
    }
  };

  const handleConfirm = () => {
    onFilesSelected(dataFile, basketFile);
    onOpenChange(false);
    setDataFile(null);
    setBasketFile(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setDataFile(null);
    setBasketFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Upload Brokerage Files</span>
          </DialogTitle>
          <DialogDescription>
            Upload the Excel data file (.xlsx) and optionally the order basket file to process brokerage data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>Data File (Required)</span>
              </CardTitle>
              <CardDescription>Upload the main Excel file (.xlsx) with "Data" sheet</CardDescription>
            </CardHeader>
            <CardContent>
              {dataFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{dataFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDataFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="data-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="data-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('data', file);
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
                <span>Order Basket File (Optional)</span>
              </CardTitle>
              <CardDescription>Upload the order basket Excel file (.xlsx)</CardDescription>
            </CardHeader>
            <CardContent>
              {basketFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{basketFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBasketFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="basket-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="basket-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('basket', file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!dataFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Process Files
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===================================================================
// BROKERAGE TABLE
// ===================================================================
interface BrokerageTableProps {
  data: BrokerageData[];
  orderClientData?: string[];
}

const BrokerageTable: React.FC<BrokerageTableProps> = ({ 
  data, 
  orderClientData = [] 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredData = useMemo(() => {
    let filtered = data.filter(item => 
      item.clientCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (statusFilter === 'active') {
      filtered = filtered.filter(item => 
        item.mcxFut > 0 || item.mcxOpt > 0 || item.nseFut > 0 || item.nseOpt > 0 || 
        item.cashInt > 0 || item.cashDel > 0 || item.cdFut > 0 || item.cdOpt > 0
      );
    } else if (statusFilter === 'zero') {
      filtered = filtered.filter(item => 
        item.mcxFut === 0 && item.mcxOpt === 0 && item.nseFut === 0 && item.nseOpt === 0 && 
        item.cashInt === 0 && item.cashDel === 0 && item.cdFut === 0 && item.cdOpt === 0
      );
    }

    return filtered;
  }, [data, searchQuery, statusFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(num);
  };

  // Check if data is available for enabling download buttons
  const hasData = filteredData.length > 0;

  return (
    <div className="space-y-6">
      {/* Moved Download Output Files above the table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-blue-600" />
            <span>Download Output Files</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              onClick={() => exportOrderClient(filteredData, orderClientData)}
              className="bg-blue-600 hover:bg-blue-700 w-full"
              disabled={!hasData}
            >
              <FileText className="h-4 w-4 mr-2" />
              Order Client
            </Button>
            <Button
              onClick={() => exportClientWiseBrokerage(filteredData, 'ALL')}
              className="bg-green-600 hover:bg-green-700 w-full"
              disabled={!hasData}
            >
              <Users className="h-4 w-4 mr-2" />
              Client wise ALL
            </Button>
            <Button
              onClick={() => exportClientWiseBrokerage(filteredData, 'COM')}
              className="bg-purple-600 hover:bg-purple-700 w-full"
              disabled={!hasData}
            >
              <Users className="h-4 w-4 mr-2" />
              Client wise COM
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table moved below the download section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <CardTitle>Brokerage Data Results ({filteredData.length} records)</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search Client Code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="zero">Zero Values</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Code</TableHead>
                  <TableHead className="text-right">MCX FUT</TableHead>
                  <TableHead className="text-right">MCX OPT</TableHead>
                  <TableHead className="text-right">NSE FUT</TableHead>
                  <TableHead className="text-right">NSE OPT</TableHead>
                  <TableHead className="text-right">Cash Int</TableHead>
                  <TableHead className="text-right">Cash Del</TableHead>
                  <TableHead className="text-right">CD FUT</TableHead>
                  <TableHead className="text-right">CD OPT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, index) => (
                    <TableRow key={`${row.clientCode}-${index}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{row.clientCode}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.mcxFut)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.mcxOpt)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.nseFut)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.nseOpt)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.cashInt)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.cashDel)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.cdFut)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.cdOpt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      {data.length === 0 ? 'Upload files to see brokerage data' : 'No matching records found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
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

// ===================================================================
// MAIN BROKERAGE COMPONENT
// ===================================================================
const Brokerage: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [processedData, setProcessedData] = useState<BrokerageData[]>([]);
  const [summary, setSummary] = useState<BrokerageSummary | null>(null);
  const [orderClientData, setOrderClientData] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (dataFile: File | null, basketFile: File | null) => {
    if (!dataFile) {
      setError('Please select the data file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await processBrokerageData(dataFile, basketFile);
      
      setProcessedData(result.data);
      setSummary(result.summary);
      setOrderClientData(result.orderClientData || []);
      setIsUploadModalOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error processing files. Please check the file format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
          <ModernLoading />
        </div>
      )}

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

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Results Table - Always shown */}
      <BrokerageTable 
        data={processedData} 
        orderClientData={orderClientData}
      />

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