import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, RefreshCw, Search, Check, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import MultiFileUploadModal from './MultiFileUploadModal';
import {
  PayoutData,
  LedgerData,
  processFiles,
  exportProcessedData,
  formatNumber,
  processDataWithLedger,
  calculateSummary,
  exportRMSLimitsFile,
  exportmcxglobefile
} from '@/utils/payoutprocessor';

interface AdvancedFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: {
    ucc: string;
    clientName: string;
    segment: string;
    status: string;
    payRange: { min: string; max: string };
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  disabled: boolean;
  filterConfig: {
    id: string;
    label: string;
    type: string;
    minPlaceholder?: string;
    maxPlaceholder?: string;
    options?: string[];
  }[];
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
  activeFiltersCount,
  disabled,
  filterConfig
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search UCC, Client, Segment..."
            className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
          />
        </div>
        
        {filterConfig.map((filter) => {
          if (filter.type === 'range') {
            return (
              <div key={filter.id} className="flex flex-col min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-1">
                  {filter.label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={filter.minPlaceholder || 'Min'}
                    value={filters[filter.id].min}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      [filter.id]: {
                        ...filters[filter.id],
                        min: e.target.value
                      }
                    })}
                    className="p-2 border border-slate-300 rounded-md w-full"
                    disabled={disabled}
                  />
                  <input
                    type="number"
                    placeholder={filter.maxPlaceholder || 'Max'}
                    value={filters[filter.id].max}
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      [filter.id]: {
                        ...filters[filter.id],
                        max: e.target.value
                      }
                    })}
                    className="p-2 border border-slate-300 rounded-md w-full"
                    disabled={disabled}
                  />
                </div>
              </div>
            );
          } else if (filter.type === 'select') {
            return (
              <div key={filter.id} className="flex flex-col min-w-[200px]">
                <label className="text-sm font-medium text-slate-700 mb-1">
                  {filter.label}
                </label>
                <select
                  value={filters[filter.id]}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    [filter.id]: e.target.value
                  })}
                  className="p-2 border border-slate-300 rounded-md"
                  disabled={disabled}
                >
                  <option value="">All</option>
                  {filter.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            );
          }
          return (
            <div key={filter.id} className="flex flex-col min-w-[200px]">
              <label className="text-sm font-medium text-slate-700 mb-1">
                {filter.label}
              </label>
              <input
                type="text"
                value={filters[filter.id]}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  [filter.id]: e.target.value
                })}
                className="p-2 border border-slate-300 rounded-md"
                disabled={disabled}
              />
            </div>
          );
        })}
        
        <div className="flex items-end gap-2">
          <Button
            onClick={onClearFilters}
            variant="outline"
            disabled={disabled || activeFiltersCount === 0}
            className="h-10"
          >
            Clear Filters
          </Button>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const Payout: React.FC = () => {
  const [payoutData, setPayoutData] = useState<PayoutData[]>([]);
  const [ledgerData, setLedgerData] = useState<LedgerData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Advanced filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    ucc: '',
    clientName: '',
    segment: '',
    status: '',
    payRange: { min: '', max: '' },
  });

  // Processed data with ledger and status
  const processedData = useMemo(() => {
    return processDataWithLedger(payoutData, ledgerData);
  }, [payoutData, ledgerData]);

  const handleProcessFiles = async (files: File[]) => {
    if (!files || files.length === 0) {
      toast({
        title: "Missing Files",
        description: "Please select payout files to process",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setIsLoading(true);

    try {
      const { payoutData, ledgerData } = await processFiles(files);
      setPayoutData(payoutData);
      setLedgerData(ledgerData);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${payoutData.length} payout records and ${Object.keys(ledgerData).length} ledger records`,
      });
    } catch (error: any) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process files. Please check file formats.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
    }
  };

  const handleExportRMS = () => {
    if (processedData.length === 0) {
      toast({
        title: "No Data",
        description: "No payout data to export",
        variant: "destructive",
      });
      return;
    }

    const rmsContent = exportRMSLimitsFile(processedData);
    
    // Create and download file
    const blob = new Blob([rmsContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Kambala file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "RMS Limits file exported successfully",
    });
  };

  const handlemcxglobe = () => {
    if (processedData.length === 0) {
      toast({
        title: "No Data",
        description: "No payout data to export",
        variant: "destructive",
      });
      return;
    }

        // Get date for filename (DDMMYYYY)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getDate() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const mcxglobeContent = exportmcxglobefile(processedData);
    
    // Create and download file
    const blob = new Blob([mcxglobeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MCCLCOLL_46365_${dateString}.010`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "MCX Globe file exported successfully",
    });
  };



  const handleExport = () => {
    if (processedData.length === 0) {
      toast({
        title: "No Data",
        description: "No payout data to export",
        variant: "destructive",
      });
      return;
    }

    exportProcessedData(processedData);

    toast({
      title: "Export Complete",
      description: "Payout data exported successfully",
    });
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    return calculateSummary(processedData);
  }, [processedData]);

  const filteredData = useMemo(() => {
    return processedData.filter(item => {
      // Search filter
      const matchesSearch = 
        item.UCC.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ClientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Segment.toLowerCase().includes(searchQuery.toLowerCase());

      // Advanced filters
      const matchesUCC = !filters.ucc || item.UCC.toLowerCase().includes(filters.ucc.toLowerCase());
      const matchesClientName = !filters.clientName || 
        item.ClientName.toLowerCase().includes(filters.clientName.toLowerCase());
      const matchesSegment = !filters.segment || 
        item.Segment.toLowerCase().includes(filters.segment.toLowerCase());
      const matchesStatus = !filters.status || 
        item.Status === filters.status;
      
      const matchesPayRange = 
        (!filters.payRange.min || item.Pay >= parseFloat(filters.payRange.min)) &&
        (!filters.payRange.max || item.Pay <= parseFloat(filters.payRange.max));

      return matchesSearch && matchesUCC && matchesClientName && matchesSegment && 
             matchesStatus && matchesPayRange;
    });
  }, [processedData, searchQuery, filters]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.ucc) count++;
    if (filters.clientName) count++;
    if (filters.segment) count++;
    if (filters.status) count++;
    if (filters.payRange.min || filters.payRange.max) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      ucc: '',
      clientName: '',
      segment: '',
      status: '',
      payRange: { min: '', max: '' },
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
            <h1 className="text-3xl font-bold text-slate-800">Payout Processing</h1>
            <p className="text-slate-600 mt-2">
              Process MCX, FO, and CM payout files with ledger validation
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
          </div>
        </div>
      </div>

      <MultiFileUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onFilesSelected={handleProcessFiles}
        multiple={true}
        accept=".xlsx,.xls"
        description="Upload MCX, FO, CM payout files and Ledger file"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.totalRecords}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Payout Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {summary.totalRecords > 0 
                ? `₹${formatNumber(summary.totalPayout)}` 
                : '₹0.00'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Total Ledger Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {summary.totalRecords > 0 
                ? `₹${formatNumber(summary.totalLedgerBalance)}` 
                : '₹0.00'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-teal-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-600">OK Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">
              {summary.okCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-600">Not OK Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">
              {summary.notOkCount}
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
        filterConfig={[
          { id: 'ucc', label: 'UCC', type: 'text' },
          { id: 'clientName', label: 'Client Name', type: 'text' },
          { id: 'segment', label: 'Segment', type: 'text' },
          { 
            id: 'status', 
            label: 'Status', 
            type: 'select',
            options: ['OK', 'Not OK']
          },
          { 
            id: 'payRange', 
            label: 'Pay Amount', 
            type: 'range',
            minPlaceholder: 'Min Pay',
            maxPlaceholder: 'Max Pay'
          }
        ]}
      />

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Payout Data {processedData.length > 0 && 
                `(${filteredData.length} of ${processedData.length} records)`}
            </CardTitle>
            <div className="space-x-2 flex flex-wrap gap-2">
                <Button 
                onClick={handlemcxglobe} 
                className="bg-green-600 hover:bg-green-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Globe MCX
              </Button>

              <Button 
                onClick={handleExportRMS} 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Kambala File
              </Button>
              <Button 
                onClick={handleExport} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UCC</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Pay</TableHead>
                  <TableHead className="text-right">Ledger Balance</TableHead>
                  <TableHead className="text-right">NSE Total</TableHead>
                  <TableHead className="text-right">MCX Total</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-slate-600">Processing files...</p>
                    </TableCell>
                  </TableRow>
                ) : processedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-lg font-medium text-slate-800">
                        No Data Processed Yet
                      </h3>
                      <p className="text-slate-600 mb-4">
                        Upload your payout and ledger files
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
                    <TableCell colSpan={8} className="text-center py-8">
                      <Search className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-lg font-medium text-slate-800">
                        No matching records
                      </h3>
                      <p className="text-slate-600">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-mono">{row.UCC}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          row.Segment === 'MCX' ? 'bg-red-100 text-red-800' :
                          row.Segment === 'FO' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {row.Segment}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Pay)}</TableCell>
                      <TableCell className="text-right font-mono">{row.LedgerBalance ? formatNumber(row.LedgerBalance) : 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono">{row.NSETotal ? formatNumber(row.NSETotal) : 'N/A'}</TableCell>
                      <TableCell className="text-right font-mono">{row.MCXTotal ? formatNumber(row.MCXTotal) : 'N/A'}</TableCell>
                      <TableCell className={`text-right font-mono ${
                        row.Difference !== undefined && row.Difference < 0 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {row.Difference !== undefined 
                          ? formatNumber(row.Difference) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {row.Status === 'OK' ? (
                          <span className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" /> OK
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <X className="h-4 w-4 mr-1" /> Not OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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

export default Payout;