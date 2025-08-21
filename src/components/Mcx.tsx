// Mcx.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, Download, Settings, Edit, Search, Filter, Upload as UploadIcon, Save, X, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { processMcxFiles, McxFoData, McxFoSummary, McxFoOutputRecord } from '@/utils/McxProcessor';
import ModernLoading from './ModernLoading';
import McxUploadModal from '@/components/McxBod/McxUploadModal';
import McxSummaryCards from '@/components/McxBod/McxSummaryCards';

// ============================================================================
// Main Component
// ============================================================================
const Mcx: React.FC = () => {
  // Main state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [unallocatedFund, setUnallocatedFund] = useState<number>(0);
  const [tempUnallocatedFund, setTempUnallocatedFund] = useState<number>(0);
  const [isEditingUnallocated, setIsEditingUnallocated] = useState(false);
  const [mcxProfundInput, setMcxProfundInput] = useState<string>("35.1");

  const mcxProfundAmount = useMemo(() => {
    const value = parseFloat(mcxProfundInput);
    return isNaN(value) ? 3510000 : Math.round(value * 100000);
  }, [mcxProfundInput]);
  
  const [processedData, setProcessedData] = useState<{
    data: McxFoData[];
    summary: McxFoSummary;
    outputRecords: McxFoOutputRecord[];
  } | null>(null);

    React.useEffect(() => {
    if (processedData) {
      const newNmass = (processedData.summary.negativeShortValue / mcxProfundAmount) * 100;
      setProcessedData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            nmass: newNmass
          }
        };
      });
    }
  }, [mcxProfundAmount, processedData]);
  
  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [ninetyAboveFilter, setNinetyAboveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof McxFoData | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  });
  
  // Editing state
  const [editingLedger, setEditingLedger] = useState<string | null>(null);
  const [tempLedgerValue, setTempLedgerValue] = useState<number>(0);

  const handleFilesUploaded = async (files: { 
    risk: File | null; 
    globe: File | null; 
    marginData: File | null;
  }) => {
    setIsProcessing(true);
    setShowUploadModal(false);

    try {
      const result = await processMcxFiles({
        risk: files.risk,
        globe: files.globe,
        marginData: files.marginData
      }, unallocatedFund);

      // Recalculate nmass with current mcxProfundAmount
      const recalculatedSummary = {
        ...result.summary,
        nmass: (result.summary.negativeShortValue / mcxProfundAmount) * 100
      };
          
      setProcessedData({
      data: result.data,
      summary: recalculatedSummary,
      outputRecords: result.outputRecords
    });
      
      toast({
        title: "Processing Complete",
        description: `Processed ${result.data.length} records successfully`,
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetUnallocatedFund = async () => {
    setUnallocatedFund(tempUnallocatedFund);
    setIsEditingUnallocated(false);
    
    if (processedData) {
      toast({
        title: "Recalculating",
        description: "Updating calculations with new unallocated fund amount...",
      });
      
      const netValue = processedData.summary.upgradeTotal - processedData.summary.downgradeTotal;
      const finalProFund = processedData.summary.proFund - 3010000;
      const unallocatedFundAmount = tempUnallocatedFund * 100000;
      const newFinalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
      const sd = newFinalAmount + 3010000;
      const newNmass = (processedData.summary.negativeShortValue / mcxProfundAmount) * 100;
      
      const updatedSummary = {
        ...processedData.summary,
        finalAmount: newFinalAmount,
        nmass: newNmass
      };
      
      const proFundAction: 'A' | 'D' = finalProFund < 0 ? 'A' : 'D';

      const updatedOutputRecords = processedData.outputRecords.map((record, index) => {
        if (index === 0 && record.accountType === 'P') {
          return { 
            ...record, 
            amount: finalProFund < 0 ? Math.abs(finalProFund) : finalProFund,
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

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateString = `${day}${month}${year}`;

    const headers = ['Current Date','Segment Indicator','Clearing Member Code','Trading Member Code','CP Code','Client Code','Account Type','CASH & CASH EQUIVALENTS AMOUNT','Filler1','Filler2','Filler3','Filler4','Filler5','Filler6','ACTION'];
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
    link.download = `MCCLCOLL_46365_${dateString}.001`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Sorting handler
  const handleSort = (key: keyof McxFoData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort table data
  const filteredData = useMemo(() => {
    if (!processedData) return [];
    
    const data = [...processedData.data];
    
    if (sortConfig.key) {
      data.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return data.filter(item => {
      const matchesSearch = item.clicode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === 'all' || item.action === actionFilter;
      const matchesAmount = amountFilter === 'all' || 
        (amountFilter === 'high' && Math.abs(item.difference) > 10000) ||
        (amountFilter === 'medium' && Math.abs(item.difference) > 1000 && Math.abs(item.difference) <= 10000) ||
        (amountFilter === 'low' && Math.abs(item.difference) <= 1000);

      const matchesNinetyAbove =
      ninetyAboveFilter === 'all' ||
      (ninetyAboveFilter === 'above90' &&
        Number.isFinite(item.ninetyabove) &&
        item.ninetyabove > 90);

      return matchesSearch && matchesAction && matchesAmount && matchesNinetyAbove;
    });
  }, [processedData, searchQuery, actionFilter, amountFilter, ninetyAboveFilter, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, amountFilter, ninetyAboveFilter]);

  const getActionBadge = (action: string) => {
    if (action === 'A') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          Addition
        </Badge>
      );
    } else if (action === 'D') {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          Deletion
        </Badge>
      );
    }
    return <Badge variant="secondary">-</Badge>;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const exportToCsv = () => {
    if (!processedData) return;

    const headers = ['CLICODE', 'Ledger Amount', 'Globe Amount', 'Action', 'Difference', 'ninetyPercentLedger','mcxMargin','shortValue'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.clicode,
        row.ledgerAmount,
        row.globeAmount,
        row.action,
        row.difference,
        row.ninetyPercentLedger,
        row.mcxMargin,
        row.shortValue
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mcx_analysis.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle double-click to start editing
  const handleDoubleClick = (clicode: string, ledgerAmount: number) => {
    setEditingLedger(clicode);
    setTempLedgerValue(ledgerAmount);
  };

  // Handle ledger amount change during editing
  const handleLedgerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempLedgerValue(parseFloat(e.target.value) || 0);
  };

  // Save edited ledger amount
  const handleSaveEdit = (clicode: string) => {
    if (!processedData) return;

    // Find the original row
    const originalRow = processedData.data.find(row => row.clicode === clicode);
    if (!originalRow) {
      toast({
        title: "Error",
        description: `Row with CLICODE ${clicode} not found.`,
        variant: "destructive",
      });
      return;
    }

    const globeAmount = originalRow.globeAmount;

     // Recalculate derived fields
    const newNinetyPercentLedger = 0.9 * tempLedgerValue;
    const newNinetyabove = originalRow.mcxMargin > 0 
      ? (originalRow.mcxMargin / newNinetyPercentLedger) * 100 
      : 0;
    const newShortValue = newNinetyPercentLedger - originalRow.mcxMargin;
    
    // Explicitly type the action as 'A' | 'D'
    const newAction: 'A' | 'D' = tempLedgerValue > globeAmount ? 'A' : 'D';

    // Update the specific row
    const updatedData = processedData.data.map(row => 
      row.clicode === clicode 
        ? { 
            ...row, 
            ledgerAmount: tempLedgerValue,
            difference: Math.abs(tempLedgerValue - globeAmount),
            action: newAction,
            ninetyPercentLedger: newNinetyPercentLedger,
            ninetyabove: newNinetyabove,
            shortValue: newShortValue
          } 
        : row
    );

    // Recalculate totals
    let upgradeTotal = 0;
    let downgradeTotal = 0;
    
    updatedData.forEach(row => {
      if (row.action === 'A') {
        upgradeTotal += row.difference;
      } else {
        downgradeTotal += row.difference;
      }
    });

    const negativeShortValue = updatedData.reduce((sum, row) => {
      if (row.shortValue < 0) {
        return sum + Math.abs(row.shortValue);
      }
      return sum;
    }, 0);

    const netValue = upgradeTotal - downgradeTotal;
    const finalProFund = processedData.summary.proFund - 3010000;
    const unallocatedFundAmount = unallocatedFund * 100000;
    const finalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
    const sd = finalAmount + 3010000;
    const newNmass = (negativeShortValue / mcxProfundAmount) * 100;

    // Update summary
    const updatedSummary = {
      ...processedData.summary,
      upgradeTotal,
      downgradeTotal,
      netValue,
      finalAmount,
      negativeShortValue,
      nmass: newNmass
    };

    // Update output records
    const updatedOutputRecords = processedData.outputRecords.map(record => {
      if (record.clicode === clicode) {
        return {
          ...record,
          amount: tempLedgerValue,
          action: newAction
        };
      }
      return record;
    });

    // Update ProFund record
    const proFundAction: 'A' | 'D' = finalProFund < 0 ? 'A' : 'D';
    updatedOutputRecords[0] = {
      ...updatedOutputRecords[0],
      amount: finalProFund,
      action: proFundAction
    };

    setProcessedData({
      data: updatedData,
      summary: updatedSummary,
      outputRecords: updatedOutputRecords
    });
    setEditingLedger(null);
  };

  if (isProcessing) {
    return (
      <ModernLoading 
        message="Processing MCX Files"
        subMessage="Analyzing risk data, globe allocations, and margin data. This may take a few moments."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">MCX - Morning BOD</h1>
            <p className="text-slate-600 mt-2">
              Upload Backoffice Ledger, MCX Globe, and MRG files to analyze MCX allocation differences
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

      {/* Summary Cards */}
      <McxSummaryCards processedData={processedData} />

      {/* Unallocated Fund and Export Section */}
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
                      disabled={!processedData}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {/* MCX Profund Input - Moved here */}
              {filteredData.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="mr-2 font-medium text-yellow-700">MCX Pro</span>
                    <input
                      type="text"
                      value={mcxProfundInput}
                      onChange={(e) => setMcxProfundInput(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-20 p-2 border border-yellow-300 rounded-md text-center font-mono"
                      placeholder="15"
                    />
                  </div>
                  <div className="text-sm text-yellow-700 font-mono bg-yellow-100 px-2 py-1 rounded">
                    = ₹{new Intl.NumberFormat('en-IN').format(mcxProfundAmount)}
                  </div>
                </div>
              )}
              <Button
                onClick={exportOutputFile}
                className="bg-green-600 hover:bg-green-700"
                disabled={!processedData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Globe File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <span>MCX Analysis Results</span>
              {processedData && (
                <Badge variant="outline" className="ml-2">
                  {filteredData.length} records
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Export CSV Button */}
              <Button
                onClick={exportToCsv}
                className="bg-green-600 hover:bg-green-700"
                disabled={!processedData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Table File
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search CLICODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={!processedData}
              />
            </div>
            
            <Select 
              value={actionFilter} 
              onValueChange={setActionFilter}
              disabled={!processedData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="A">Addition Only</SelectItem>
                <SelectItem value="D">Deletion Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={ninetyAboveFilter}
              onValueChange={setNinetyAboveFilter}
              disabled={!processedData}
            >
              <SelectTrigger>
                <SelectValue placeholder="90% Above Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="above90">Above 90 Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setActionFilter('all');
                setAmountFilter('all');
                setNinetyAboveFilter('all');
                setSortConfig({ key: null, direction: 'asc' });
              }}
              className="flex items-center"
              disabled={!processedData}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button 
                      onClick={() => handleSort('clicode')}
                      className="flex items-center font-medium"
                    >
                      CLICODE
                      {sortConfig.key === 'clicode' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('ledgerAmount')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      Ledger Amount
                      {sortConfig.key === 'ledgerAmount' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('globeAmount')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      Globe Amount
                      {sortConfig.key === 'globeAmount' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('difference')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      Difference
                      {sortConfig.key === 'difference' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('mcxMargin')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      MCX Margin
                      {sortConfig.key === 'mcxMargin' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('ninetyPercentLedger')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      90% of Ledger
                      {sortConfig.key === 'ninetyPercentLedger' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('ninetyabove')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      90% above
                      {sortConfig.key === 'ninetyabove' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button 
                      onClick={() => handleSort('shortValue')}
                      className="flex justify-end w-full items-center font-medium"
                    >
                      Short Value
                      {sortConfig.key === 'shortValue' && (
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
                {!processedData ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                      <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-lg font-medium">No data available</p>
                      <Button 
                        onClick={() => setShowUploadModal(true)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        Upload Files
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                      <Search className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-lg font-medium">No matching records found</p>
                      <p className="text-sm mt-2">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    <TableRow key={`${row.clicode}-${index}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{row.clicode}</TableCell>
                      
                      {/* Editable Ledger Amount */}
                      <TableCell 
                        className="text-right font-mono text-sm cursor-pointer"
                        onDoubleClick={() => handleDoubleClick(row.clicode, row.ledgerAmount)}
                      >
                        {editingLedger === row.clicode ? (
                          <div className="flex items-center justify-end">
                            <Input
                              type="number"
                              value={tempLedgerValue}
                              onChange={handleLedgerChange}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(row.clicode);
                                if (e.key === 'Escape') setEditingLedger(null);
                              }}
                              className="text-right w-32"
                              step="0.01"
                              autoFocus
                            />
                          </div>
                        ) : (
                          formatNumber(row.ledgerAmount)
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.globeAmount)}
                      </TableCell>
                      
                      {/* Action (updates during edit) */}
                      <TableCell>
                        {editingLedger === row.clicode ? 
                          getActionBadge(tempLedgerValue > row.globeAmount ? 'A' : 'D')
                          : getActionBadge(row.action)
                        }
                      </TableCell>
                      
                      {/* Difference (updates during edit) */}
                      <TableCell className={`text-right font-mono text-sm font-semibold ${row.action === 'A' ? 'text-green-600' : 'text-red-600'}`}>
                        {editingLedger === row.clicode ? 
                          formatNumber(Math.abs(tempLedgerValue - row.globeAmount)) 
                          : formatNumber(row.difference)
                        }
                      </TableCell>
                      
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.mcxMargin)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.ninetyPercentLedger)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${row.ninetyabove > 90 ? 'bg-red-200 font-semibold' : ''}`}
                      >
                        {formatNumber(row.ninetyabove)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${row.shortValue < 0 ? 'text-red-600 font-semibold' : ''}`}>
                        {formatNumber(row.shortValue)}
                      </TableCell>
                      
                      {/* Save/Cancel Actions */}
                      <TableCell>
                        {editingLedger === row.clicode && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSaveEdit(row.clicode)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingLedger(null)}
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

      {/* Upload Modal */}
      <McxUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onFilesSelected={handleFilesUploaded}
      />
    </div>
  );
};

export default Mcx;