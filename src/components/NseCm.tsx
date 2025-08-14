import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Edit, Search, Filter, Download, Settings, Upload, Save, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { processNseCmFiles, NseCmData, NseCmSummary, NseCmOutputRecord } from '@/utils/nseCmProcessor';
import ModernLoading from './ModernLoading';
import NseCmSummaryCards from '@/components/NseCmBod/NseCmSummaryCards';
import NseCmUploadModal from '@/components/NseCmBod/NseCmUploadModal';
import { TrendingUp, TrendingDown } from 'lucide-react';

const NseCm: React.FC = () => {
  // Main component state
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
  
  // Editing state
  const [editingLedger, setEditingLedger] = useState<string | null>(null);
  const [tempLedgerValue, setTempLedgerValue] = useState<number>(0);

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof NseCmData | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  });

  // Modal state
  const [riskFile, setRiskFile] = useState<File | null>(null);
  const [nseFile, setNseFile] = useState<File | null>(null);
  const [nriFile, setNriFile] = useState<File | null>(null);

  // Handle file upload
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
  
    // Explicitly type the action as 'U' | 'D'
    const newAction: 'U' | 'D' = tempLedgerValue > globeAmount ? 'U' : 'D';

    // Update the specific row
    const updatedData = processedData.data.map(row => 
      row.clicode === clicode 
        ? { 
            ...row, 
            ledgerAmount: tempLedgerValue,
            difference: tempLedgerValue - globeAmount,
            action: newAction
          } 
        : row
    );

    // Recalculate totals
    let upgradeTotal = 0;
    let downgradeTotal = 0;
    
    updatedData.forEach(row => {
      if (row.action === 'U') {
        upgradeTotal += Math.abs(row.difference);
      } else {
        downgradeTotal += Math.abs(row.difference);
      }
    });

    const netValue = upgradeTotal - downgradeTotal;
    const finalProFund = processedData.summary.proFund - 8000000;
    const unallocatedFundAmount = unallocatedFund * 100000;
    const finalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));

    // Update summary
    const updatedSummary = {
      ...processedData.summary,
      upgradeTotal,
      downgradeTotal,
      netValue,
      finalAmount
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
    const proFundAction: 'U' | 'D' = finalProFund < finalAmount ? 'U' : 'D';
    updatedOutputRecords[0] = {
      ...updatedOutputRecords[0],
      amount: finalAmount,
      action: proFundAction
    };

    setProcessedData({
      data: updatedData,
      summary: updatedSummary,
      outputRecords: updatedOutputRecords
    });
    setEditingLedger(null);
  };

  // Update unallocated fund
  const handleSetUnallocatedFund = async () => {
    setUnallocatedFund(tempUnallocatedFund);
    setIsEditingUnallocated(false);
    
    if (processedData) {
      toast({
        title: "Recalculating",
        description: "Updating calculations with new unallocated fund amount...",
      });
      
      const netValue = processedData.summary.upgradeTotal - processedData.summary.downgradeTotal;
      const finalProFund = processedData.summary.proFund - 8000000;
      const unallocatedFundAmount = tempUnallocatedFund * 100000;
      const newFinalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
      
      const updatedSummary = {
        ...processedData.summary,
        finalAmount: newFinalAmount
      };
      
      const proFundAction: 'U' | 'D' = finalProFund < newFinalAmount ? 'U' : 'D';
      
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

  // Edit unallocated fund
  const handleEditUnallocatedFund = () => {
    setTempUnallocatedFund(unallocatedFund);
    setIsEditingUnallocated(true);
  };

  // Export output file
  const exportOutputFile = () => {
    if (!processedData || !processedData.outputRecords || processedData.outputRecords.length === 0) return;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
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

  // Sorting handler
  const handleSort = (key: keyof NseCmData) => {
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
    
    // Apply sorting if sortConfig is set
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
      
      return matchesSearch && matchesAction && matchesAmount;
    });
  }, [processedData, searchQuery, actionFilter, amountFilter, sortConfig]);

  // Paginate table data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, amountFilter]);

  // Get action badge UI
  const getActionBadge = (action: string) => {
    if (action === 'U') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <span className="flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            Upgrade
          </span>
        </Badge>
      );
    } else if (action === 'D') {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
          <span className="flex items-center">
            <TrendingDown className="h-3 w-3 mr-1" />
            Downgrade
          </span>
        </Badge>
      );
    }
    return <Badge variant="secondary">-</Badge>;
  };

  // Format numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Export CSV
  const exportToCsv = () => {
    if (!processedData) return;

    const headers = ['CLICODE', 'Ledger Amount', 'Globe Amount', 'Action', 'Difference'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.clicode,
        row.ledgerAmount,
        row.globeAmount,
        row.action,
        row.difference
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nse_cm_analysis.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle file selection in modal
  const handleFileSelect = (type: 'risk' | 'nse' | 'nri', file: File) => {
    if (type === 'risk') {
      setRiskFile(file);
    } else if (type === 'nse') {
      setNseFile(file);
    } else {
      setNriFile(file);
    }
  };

  // Handle modal confirmation
  const handleConfirm = () => {
    handleFilesUploaded({ risk: riskFile, nse: nseFile, nri: nriFile });
    setShowUploadModal(false);
    setRiskFile(null);
    setNseFile(null);
    setNriFile(null);
  };

  // Handle modal cancellation
  const handleCancel = () => {
    setShowUploadModal(false);
    setRiskFile(null);
    setNseFile(null);
    setNriFile(null);
  };

  // Loading state
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
      <NseCmSummaryCards 
        processedData={processedData} 
        unallocatedFund={unallocatedFund} 
      />

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
                      disabled={isProcessing}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Set
                    </Button>
                    <Button
                      onClick={() => setIsEditingUnallocated(false)}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}
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
                      disabled={isProcessing}
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
                disabled={!processedData || isProcessing}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Output File
              </Button>
              <Button
                onClick={() => setShowUploadModal(true)}
                variant="outline"
                disabled={isProcessing}
              >
                Upload New Files
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
              <span>NSE CM Analysis Results</span>
              {processedData && (
                <Badge variant="outline" className="ml-2">
                  {filteredData.length} records
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                onClick={exportToCsv}
                className="bg-green-600 hover:bg-green-700"
                disabled={!processedData || isProcessing}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
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
                disabled={!processedData || isProcessing}
              />
            </div>
            
            <Select 
              value={actionFilter} 
              onValueChange={setActionFilter}
              disabled={!processedData || isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="U">Upgrade Only</SelectItem>
                <SelectItem value="D">Downgrade Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={amountFilter} 
              onValueChange={setAmountFilter}
              disabled={!processedData || isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="high">High (&gt;10,000)</SelectItem>
                <SelectItem value="medium">Medium (1,000-10,000)</SelectItem>
                <SelectItem value="low">Low (≤1,000)</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setActionFilter('all');
                setAmountFilter('all');
                setSortConfig({ key: null, direction: 'asc' });
              }}
              className="flex items-center"
              disabled={!processedData || isProcessing}
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!processedData ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="bg-gray-100 p-4 rounded-full">
                          <Upload className="h-8 w-8 text-gray-500" />
                        </div>
                        <p className="text-lg font-medium text-gray-700">No data available</p>
                        <p className="text-gray-500 max-w-md text-center">
                          Upload Risk, NSE Globe, and NRI files to analyze NSE CM allocation differences
                        </p>
                        <Button 
                          onClick={() => setShowUploadModal(true)}
                          className="mt-4 bg-blue-600 hover:bg-blue-700"
                        >
                          Upload Files
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      <div className="flex flex-col items-center">
                        <Search className="h-10 w-10 text-slate-400 mb-4" />
                        <p className="font-medium">No records found</p>
                        <p className="text-sm mt-2">
                          Try adjusting your filters or search query
                        </p>
                      </div>
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
                          getActionBadge(tempLedgerValue > row.globeAmount ? 'U' : 'D')
                          : getActionBadge(row.action)
                        }
                      </TableCell>
                      
                      {/* Difference (updates during edit) */}
                      <TableCell className={`text-right font-mono text-sm font-semibold ${
                        editingLedger === row.clicode ? 
                          (tempLedgerValue - row.globeAmount > 0 ? 'text-green-600' : 'text-red-600') 
                          : (row.difference > 0 ? 'text-green-600' : row.difference < 0 ? 'text-red-600' : 'text-slate-600')
                      }`}>
                        {editingLedger === row.clicode ? 
                          formatNumber(tempLedgerValue - row.globeAmount) 
                          : formatNumber(row.difference)
                        }
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

          {/* Pagination */}
          {processedData && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isProcessing}
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
                  disabled={currentPage === totalPages || isProcessing}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <NseCmUploadModal 
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        riskFile={riskFile}
        nseFile={nseFile}
        nriFile={nriFile}
        setRiskFile={setRiskFile}
        setNseFile={setNseFile}
        setNriFile={setNriFile}
        handleFileSelect={handleFileSelect}
        handleConfirm={handleConfirm}
        handleCancel={handleCancel}
      />
    </div>
  );
};

export default NseCm;