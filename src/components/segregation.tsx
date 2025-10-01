import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, RefreshCw, Search, Check, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, FilterX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import MultiFileUploadModal from './MultiFileUploadModal';
import {
  parseLedgerExcel,
  parseNSECSV,
  parseMCXCSV,
  parseRemainingExcel,
  processSegregationData,
  exportSegregationData,
  formatNumber
} from '@/utils/segregationprocessor';

export interface SegregationData {
  UCC: string;
  ClientName: string;
  Currencies: number;
  Derivative: number;
  Equities: number;
  MCX: number;
  Total: number;
  NSECM: number;
  NSEFO: number;
  MCXFile: number;
  Remaining: number;
  AllocationTotal: number;
  FODiff: number;
  CMDiff: number;
  MCXDiff: number;
  Status: 'OK' | 'Not OK';
}

type SortField = keyof SegregationData;
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

interface FilterConfig {
  showNonZeroRemaining: boolean;
  showOKStatus: boolean;
  showNotOKStatus: boolean;
  minAmount: string;
  maxAmount: string;
}

const Segregation: React.FC = () => {
  const [segregationData, setSegregationData] = useState<SegregationData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: null,
  });

  // Filtering state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    showNonZeroRemaining: false,
    showOKStatus: true,
    showNotOKStatus: true,
    minAmount: '',
    maxAmount: '',
  });

  const handleProcessFiles = async (files: File[]) => {
    if (!files || files.length === 0) {
      toast({
        title: "Missing Files",
        description: "Please select all required files",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setIsLoading(true);

    try {
      const processedData = await processSegregationData(files);
      setSegregationData(processedData);
      
      toast({
        title: "Processing Complete",
        description: `Processed ${processedData.length} segregation records`,
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

  const handleExport = () => {
    if (segregationData.length === 0) {
      toast({
        title: "No Data",
        description: "No segregation data to export",
        variant: "destructive",
      });
      return;
    }

    exportSegregationData(filteredAndSortedData);

    toast({
      title: "Export Complete",
      description: "Segregation data exported successfully",
    });
  };

  // Sorting function
  const handleSort = (field: SortField) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.field === field) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    
    setSortConfig({ field: direction ? field : null, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4" />;
    }
    
    if (sortConfig.direction === 'desc') {
      return <ArrowDown className="h-4 w-4" />;
    }
    
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = segregationData.filter(item => {
      // Search filter
      const matchesSearch = item.UCC.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ClientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Non-zero remaining filter
      if (filterConfig.showNonZeroRemaining && item.Remaining === 0) {
        return false;
      }

      // Status filter
      const matchesStatus = (filterConfig.showOKStatus && item.Status === 'OK') ||
        (filterConfig.showNotOKStatus && item.Status === 'Not OK');
      
      if (!matchesStatus) return false;

      // Amount range filter (based on Total)
      if (filterConfig.minAmount && item.Total < parseFloat(filterConfig.minAmount)) {
        return false;
      }
      
      if (filterConfig.maxAmount && item.Total > parseFloat(filterConfig.maxAmount)) {
        return false;
      }

      return true;
    });

    // Apply sorting
    if (sortConfig.field && sortConfig.direction) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.field!];
        const bVal = b[sortConfig.field!];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const comparison = aVal - bVal;
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        return 0;
      });
    }

    return filtered;
  }, [segregationData, searchQuery, sortConfig, filterConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const summary = useMemo(() => {
    return {
      totalRecords: segregationData.length,
      totalCurrencies: segregationData.reduce((sum, item) => sum + item.Currencies, 0),
      totalDerivative: segregationData.reduce((sum, item) => sum + item.Derivative, 0),
      totalEquities: segregationData.reduce((sum, item) => sum + item.Equities, 0),
      totalMCX: segregationData.reduce((sum, item) => sum + item.MCX, 0),
      totalOverall: segregationData.reduce((sum, item) => sum + item.Total, 0),
      totalNSECM: segregationData.reduce((sum, item) => sum + item.NSECM, 0),
      totalNSEFO: segregationData.reduce((sum, item) => sum + item.NSEFO, 0),
      totalMCXFile: segregationData.reduce((sum, item) => sum + item.MCXFile, 0),
      totalRemaining: segregationData.reduce((sum, item) => sum + item.Remaining, 0),
      okCount: segregationData.filter(item => item.Status === 'OK').length,
      notOkCount: segregationData.filter(item => item.Status === 'Not OK').length,
      nonZeroRemaining: segregationData.filter(item => item.Remaining !== 0).length,
    };
  }, [segregationData]);

  // Clear all filters
  const clearFilters = () => {
    setFilterConfig({
      showNonZeroRemaining: false,
      showOKStatus: true,
      showNotOKStatus: true,
      minAmount: '',
      maxAmount: '',
    });
    setSortConfig({ field: null, direction: null });
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = filterConfig.showNonZeroRemaining || 
    !filterConfig.showOKStatus || 
    !filterConfig.showNotOKStatus || 
    filterConfig.minAmount || 
    filterConfig.maxAmount ||
    searchQuery;

  const SortableHeader = ({ field, children, className = "" }: { 
    field: SortField; 
    children: React.ReactNode; 
    className?: string; 
  }) => (
    <TableHead 
      className={`cursor-pointer select-none hover:bg-slate-50 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-between">
        {children}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Fund Segregation</h1>
            <p className="text-slate-600 mt-2">
              Process ledger, CC01, FC01, MCX, and remaining files for fund segregation
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
        accept=".xlsx,.xls,.csv"
        description="Upload Ledger.xlsx, C_CC01_90221_*.csv, F_CC01_90221_*.csv, MCX_WebAllocationDeallocation46365_*.csv, remaining.xlsx"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ₹{formatNumber(summary.totalRemaining)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Overall</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ₹{formatNumber(summary.totalOverall)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Derivative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              ₹{formatNumber(summary.totalDerivative)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-600">Equities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700">
              ₹{formatNumber(summary.totalEquities)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">MCX Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              ₹{formatNumber(summary.totalMCX)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search UCC or Client Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={segregationData.length === 0}
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={segregationData.length === 0}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h4 className="font-semibold text-sm mb-3">Filter Options</h4>
                
                {/* Quick Filters */}
                <div className="space-y-2 mb-4">
                  <DropdownMenuCheckboxItem
                    checked={filterConfig.showNonZeroRemaining}
                    onCheckedChange={(checked) => 
                      setFilterConfig(prev => ({ ...prev, showNonZeroRemaining: checked }))
                    }
                  >
                    Show Non-Zero Remaining Only
                  </DropdownMenuCheckboxItem>
                </div>

                <DropdownMenuSeparator />
                
                {/* Status Filters */}
                <div className="space-y-2 my-4">
                  <h5 className="font-medium text-xs text-slate-600">Status</h5>
                  <DropdownMenuCheckboxItem
                    checked={filterConfig.showOKStatus}
                    onCheckedChange={(checked) => 
                      setFilterConfig(prev => ({ ...prev, showOKStatus: checked }))
                    }
                  >
                    OK Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterConfig.showNotOKStatus}
                    onCheckedChange={(checked) => 
                      setFilterConfig(prev => ({ ...prev, showNotOKStatus: checked }))
                    }
                  >
                    Not OK Status
                  </DropdownMenuCheckboxItem>
                </div>

                <DropdownMenuSeparator />

                {/* Amount Range */}
                <div className="space-y-2 my-4">
                  <h5 className="font-medium text-xs text-slate-600">Total Amount Range</h5>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filterConfig.minAmount}
                      onChange={(e) => 
                        setFilterConfig(prev => ({ ...prev, minAmount: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filterConfig.maxAmount}
                      onChange={(e) => 
                        setFilterConfig(prev => ({ ...prev, maxAmount: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={clearFilters} className="text-red-600">
                  <FilterX className="h-4 w-4 mr-2" />
                  Clear All Filters
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="sm">
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filterConfig.showNonZeroRemaining && (
              <Badge variant="secondary">Non-Zero Remaining</Badge>
            )}
            {!filterConfig.showOKStatus && (
              <Badge variant="secondary">Hiding OK Status</Badge>
            )}
            {!filterConfig.showNotOKStatus && (
              <Badge variant="secondary">Hiding Not OK Status</Badge>
            )}
            {filterConfig.minAmount && (
              <Badge variant="secondary">Min: ₹{filterConfig.minAmount}</Badge>
            )}
            {filterConfig.maxAmount && (
              <Badge variant="secondary">Max: ₹{filterConfig.maxAmount}</Badge>
            )}
            {sortConfig.field && (
              <Badge variant="secondary">
                Sorted by {sortConfig.field} ({sortConfig.direction})
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Segregation Data {segregationData.length > 0 && 
                `(${filteredAndSortedData.length} of ${segregationData.length} records)`}
            </CardTitle>
            <Button 
              onClick={handleExport} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={segregationData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="UCC">UCC</SortableHeader>
                  <SortableHeader field="Currencies" className="text-right">Currencies</SortableHeader>
                  <SortableHeader field="Derivative" className="text-right">Derivative</SortableHeader>
                  <SortableHeader field="Equities" className="text-right">Equities</SortableHeader>
                  <SortableHeader field="MCX" className="text-right">MCX Ledger</SortableHeader>
                  <SortableHeader field="Total" className="text-right bg-red-50">Total</SortableHeader>
                  <SortableHeader field="NSEFO" className="text-right">NSE FO</SortableHeader>
                  <SortableHeader field="NSECM" className="text-right">NSE CM</SortableHeader>
                  <SortableHeader field="MCXFile" className="text-right">MCX File</SortableHeader>
                  <SortableHeader field="MCXFile" className="text-right bg-blue-50">Alloc Total</SortableHeader>
                  <SortableHeader field="Remaining" className="text-right">Remaining</SortableHeader>
                  <SortableHeader field="FODiff" className="text-right">FO DIFF</SortableHeader>
                  <SortableHeader field="CMDiff" className="text-right">CM DIFF</SortableHeader>
                  <SortableHeader field="MCXDiff" className="text-right">MCX DIFF</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                      <p className="mt-2 text-slate-600">Processing files...</p>
                    </TableCell>
                  </TableRow>
                ) : segregationData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-lg font-medium text-slate-800">
                        No Data Processed Yet
                      </h3>
                      <p className="text-slate-600 mb-4">
                        Upload your segregation files
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
                    <TableCell colSpan={14} className="text-center py-8">
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
                      <TableCell className="text-right font-mono">{formatNumber(row.Currencies)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Derivative)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.Equities)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.MCX)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-red-600 bg-red-50">{formatNumber(row.Total)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.NSEFO)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.NSECM)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.MCXFile)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-600 bg-blue-50">{formatNumber(row.AllocationTotal)}</TableCell>
                      <TableCell className={`text-right font-mono ${row.Remaining !== 0 ? 'font-bold text-amber-600' : ''}`}>
                        {formatNumber(row.Remaining)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.FODiff)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.CMDiff)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(row.MCXDiff)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {segregationData.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
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

export default Segregation;