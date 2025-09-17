import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, RefreshCw, Search, Check, X, Save, Edit3 } from 'lucide-react';
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
  exportmcxglobefile,
  exportNSEGlobeFile
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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        {/* Search Input - spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Search Records
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search UCC, Client, Segment..."
              className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              disabled={disabled}
            />
          </div>
        </div>
        
        {/* Filters */}
        {filterConfig.map((filter) => {
          if (filter.type === 'range') {
            return (
              <div key={filter.id} className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  {filter.label}
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
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
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                      disabled={disabled}
                    />
                  </div>
                  <div className="flex-1">
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
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            );
          } else if (filter.type === 'select') {
            return (
              <div key={filter.id} className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  {filter.label}
                </label>
                <select
                  value={filters[filter.id]}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    [filter.id]: e.target.value
                  })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
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
            <div key={filter.id} className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                {filter.label}
              </label>
              <input
                type="text"
                value={filters[filter.id]}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  [filter.id]: e.target.value
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                disabled={disabled}
              />
            </div>
          );
        })}
        
        {/* Clear Button - now in its own grid cell */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            onClick={onClearFilters}
            variant="outline"
            disabled={disabled || activeFiltersCount === 0}
            className="h-11 px-4 border-slate-300 hover:bg-slate-50"
          >
            Clear Filters
          </Button>
          {activeFiltersCount > 0 && (
            <div className="flex items-center">
              <span className="bg-blue-500 text-white rounded-lg h-8 px-3 flex items-center justify-center text-sm font-medium">
                {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Payout: React.FC = () => {
  const [payoutData, setPayoutData] = useState<PayoutData[]>([]);
  const [ledgerData, setLedgerData] = useState<LedgerData>({});
  const [jvCodes, setJvCodes] = useState<Set<string>>(new Set()); // Add JV codes state
  const [duplicates, setDuplicates] = useState<string[]>([]);
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

  // Sorting state - Added sorting functionality
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PayoutData | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  });

  // Editing state for Pay amount
  const [editingPay, setEditingPay] = useState<string | null>(null);
  const [tempPayValue, setTempPayValue] = useState<number>(0);

  // Add this state to track manual status overrides
  const [manualStatusOverrides, setManualStatusOverrides] = useState<{[key: string]: 'OK' | 'Not OK' | 'JV CODE OK' | 'JV CODE Not OK'}>({});

  // Add this handler function for toggling status
  const handleToggleStatus = (ucc: string, currentStatus: string) => {
    let newStatus: 'OK' | 'Not OK' | 'JV CODE OK' | 'JV CODE Not OK';
    
    // Define toggle logic for all status types
    switch (currentStatus) {
      case 'OK':
        newStatus = 'Not OK';
        break;
      case 'Not OK':
        newStatus = 'OK';
        break;
      case 'JV CODE OK':
        newStatus = 'JV CODE Not OK';
        break;
      case 'JV CODE Not OK':
        newStatus = 'JV CODE OK';
        break;
      default:
        newStatus = 'OK'; // fallback
    }
    
    setManualStatusOverrides(prev => ({
      ...prev,
      [ucc]: newStatus
    }));

    toast({
      title: "Status Updated",
      description: `Status for UCC ${ucc} changed from ${currentStatus} to ${newStatus}`,
    });
  };

  // Update the processDataWithLedger call to include manual overrides
  const processedData = useMemo(() => {
    const baseProcessedData = processDataWithLedger(payoutData, ledgerData, jvCodes);
    
    // Apply manual status overrides
    return baseProcessedData.map(row => ({
      ...row,
      Status: manualStatusOverrides[row.UCC] || row.Status,
      ManualStatus: manualStatusOverrides[row.UCC] // Keep track of manual changes
    }));
  }, [payoutData, ledgerData, jvCodes, manualStatusOverrides]);

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
      // Updated to destructure jvCodes from the result
      const { payoutData, ledgerData, duplicates, jvCodes } = await processFiles(files);
      setPayoutData(payoutData);
      setLedgerData(ledgerData);
      setDuplicates(duplicates);
      setJvCodes(jvCodes); // Set JV codes state
      
      toast({
        title: "Processing Complete",
        description: `Processed ${payoutData.length} payout records, ${Object.keys(ledgerData).length} ledger records, and ${jvCodes.size} JV codes`,
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
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Fixed: getMonth() returns 0-11
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

  const handlenseglobe = () => {
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
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Fixed: getMonth() returns 0-11
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const nseglobeContent = exportNSEGlobeFile(processedData,ledgerData);
    
    if (!nseglobeContent) {
      toast({
        title: "No NSE Data",
        description: "No NSE records with OK status to export",
        variant: "destructive",
      });
      return;
    }

    // Create and download file
    const blob = new Blob([nseglobeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `90221_ALLOC_${dateString}.T0150`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "NSE Globe file exported successfully",
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

  // Sorting handler - Added sorting functionality
  const handleSort = (key: keyof PayoutData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle double-click to start editing Pay amount
  const handleDoubleClickPay = (ucc: string, payAmount: number) => {
    setEditingPay(ucc);
    setTempPayValue(payAmount);
  };

  // Handle pay amount change during editing
  const handlePayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempPayValue(parseFloat(e.target.value) || 0);
  };

  // Save edited pay amount and recalculate everything
  const handleSavePayEdit = (ucc: string) => {
    // Find the original row
    const originalRow = payoutData.find(row => row.UCC === ucc);
    if (!originalRow) {
      toast({
        title: "Error",
        description: `Row with UCC ${ucc} not found.`,
        variant: "destructive",
      });
      return;
    }

    // Update the specific row in payoutData
    const updatedPayoutData = payoutData.map(row => 
      row.UCC === ucc 
        ? { 
            ...row, 
            Pay: tempPayValue
          } 
        : row
    );

    // Update state
    setPayoutData(updatedPayoutData);
    setEditingPay(null);

    toast({
      title: "Pay Amount Updated",
      description: `Pay amount for UCC ${ucc} updated to ₹${formatNumber(tempPayValue)}`,
    });
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    return calculateSummary(processedData, duplicates);
  }, [processedData, duplicates]);

  const filteredData = useMemo(() => {
    const data = processedData.filter(item => {
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

    // Apply sorting if sortConfig is set
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

        // Handle string comparisons
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }

        // Handle numeric comparisons
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Fallback to string comparison
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        const comparison = aString.localeCompare(bString);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return data;
  }, [processedData, searchQuery, filters, sortConfig]);

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
    setSortConfig({ key: null, direction: 'asc' }); // Reset sorting as well
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
        accept=".xlsx,.xls,.csv,.txt"
        description="Upload MCX, FO, CM payout files, Ledger file, JV Code file, and MRG file"
      />

      {/* Summary Cards - Updated to include JV code counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <Card className="shadow-sm border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {summary.totalRecords > 0 
                ? `₹${formatNumber(summary.totalPayout)}` 
                : '₹0.00'}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-indigo-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-indigo-600">FO Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-700">
            {summary.totalRecords > 0 
              ? `₹${formatNumber(summary.totalFOAmount)}` 
              : '₹0.00'}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm border-cyan-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-cyan-600">CM Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-cyan-700">
            {summary.totalRecords > 0 
              ? `₹${formatNumber(summary.totalCMAmount)}` 
              : '₹0.00'}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-sm border-red-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-600">MCX Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">
            {summary.totalRecords > 0 
              ? `₹${formatNumber(summary.totalMCXAmount)}` 
              : '₹0.00'}
          </div>
        </CardContent>
      </Card>
        <Card className="shadow-sm border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Ledger Balance</CardTitle>
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
              {summary.okCounts}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-600">Not OK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">
              {summary.notOkCounts}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Duplicates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {summary.duplicateCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters - Updated to include JV code statuses */}
      <AdvancedFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        activeFiltersCount={activeFiltersCount}
        disabled={processedData.length === 0}
        filterConfig={[
          { 
            id: 'status', 
            label: 'Status', 
            type: 'select',
            options: ['OK', 'Not OK', 'JV CODE OK', 'JV CODE Not OK']
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
                onClick={handlenseglobe} 
                className="bg-green-600 hover:bg-green-700"
                disabled={processedData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Globe NSE
              </Button>
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
                  <TableHead>
                    <button 
                      onClick={() => handleSort('UCC')}
                      className="flex items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      UCC
                      {sortConfig.key === 'UCC' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      onClick={() => handleSort('Segment')}
                      className="flex items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Segment
                      {sortConfig.key === 'Segment' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('Pay')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Pay
                      {sortConfig.key === 'Pay' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('LedgerBalance')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Ledger Balance
                      {sortConfig.key === 'LedgerBalance' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('NSETotal')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      NSE Total
                      {sortConfig.key === 'NSETotal' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('MCXTotal')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      MCX Total
                      {sortConfig.key === 'MCXTotal' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('TotalLedger')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Total Ledger
                      {sortConfig.key === 'TotalLedger' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('Margin')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      MRG Margin
                      {sortConfig.key === 'Margin' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('NSESpan')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      NSE Span
                      {sortConfig.key === 'NSESpan' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('GlobeFund')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Globe
                      {sortConfig.key === 'GlobeFund' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('Difference')}
                      className="flex justify-end w-full items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Difference
                      {sortConfig.key === 'Difference' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      onClick={() => handleSort('Status')}
                      className="flex items-center font-medium hover:text-blue-600 transition-colors"
                    >
                      Status
                      {sortConfig.key === 'Status' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-slate-600">Processing files...</p>
                    </TableCell>
                  </TableRow>
                ) : processedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
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
                    <TableCell colSpan={12} className="text-center py-8">
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
                      
                      {/* Editable Pay Amount */}
                      <TableCell 
                        className="text-right font-mono text-sm cursor-pointer hover:bg-blue-50 transition-colors"
                        onDoubleClick={() => handleDoubleClickPay(row.UCC, row.Pay)}
                        title="Double-click to edit pay amount"
                      >
                        {editingPay === row.UCC ? (
                          <div className="flex items-center justify-end">
                            <Input
                              type="number"
                              value={tempPayValue}
                              onChange={handlePayChange}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePayEdit(row.UCC);
                                if (e.key === 'Escape') setEditingPay(null);
                              }}
                              className="text-right w-32"
                              step="0.01"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <span>{formatNumber(row.Pay)}</span>
                            <Edit3 className="h-3 w-3 ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono">{row.LedgerBalance ? formatNumber(row.LedgerBalance) : '0'}</TableCell>
                      <TableCell className="text-right font-mono">{row.NSETotal ? formatNumber(row.NSETotal) : '0'}</TableCell>
                      <TableCell className="text-right font-mono">{row.MCXTotal ? formatNumber(row.MCXTotal) : '0'}</TableCell>
                      <TableCell className="text-right font-mono">{row.TotalLedger ? formatNumber(row.TotalLedger) : '0'}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Margin || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.NSESpan || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{(row.GlobeFund)}</TableCell>
                      <TableCell className={`text-right font-mono ${
                        row.Difference !== undefined && row.Difference < 0 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {row.Difference !== undefined 
                          ? formatNumber(row.Difference) 
                          : '0'}
                      </TableCell>
                      
                      {/* Updated Status Display to handle JV CODE statuses */}
                     <TableCell>
                    <div className="flex items-center justify-between">
                      <div>
                        {row.Status === 'OK' ? (
                          <span className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" /> OK
                          </span>
                        ) : row.Status === 'Not OK' ? (
                          <span className="flex items-center text-red-600">
                            <X className="h-4 w-4 mr-1" /> Not OK
                          </span>
                        ) : row.Status === 'JV CODE OK' ? (
                          <span className="flex items-center text-blue-600">
                            <Check className="h-4 w-4 mr-1" /> JV CODE OK
                          </span>
                        ) : row.Status === 'JV CODE Not OK' ? (
                          <span className="flex items-center text-orange-600">
                            <X className="h-4 w-4 mr-1" /> JV CODE Not OK
                          </span>
                        ) : (
                          <span className="flex items-center text-gray-600">
                            <X className="h-4 w-4 mr-1" /> Unknown
                          </span>
                        )}
                        {/* Show indicator for manually changed status */}
                        {row.ManualStatus && (
                          <span className="text-xs text-purple-600 ml-1">(Manual)</span>
                        )}
                      </div>
                      
                      {/* Toggle button - now shows for all status types */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(row.UCC, row.Status)}
                        className="ml-2 h-6 w-6 p-0 hover:bg-slate-100"
                        title="Click to toggle status"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                      
                      {/* Save/Cancel Actions */}
                      <TableCell>
                        {editingPay === row.UCC && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSavePayEdit(row.UCC)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingPay(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
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