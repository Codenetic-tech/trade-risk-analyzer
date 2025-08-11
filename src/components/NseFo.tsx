import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Banknote,
  Calculator,
  Download,
  Settings,
  Edit,
  Search,
  Filter,
  FileSpreadsheet,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { processNseFoFiles, NseFoData, NseFoSummary, NseFoOutputRecord } from '@/utils/nseFoProcessor';
import ModernLoading from './ModernLoading';

// ============================================================================
// Upload Modal Component
// ============================================================================
interface NseFoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: {
    risk: File | null;
    nse: File | null;
    cc01: File | null;
  }) => void;
}

const NseFoUploadModal: React.FC<NseFoUploadProps> = ({
  open,
  onOpenChange,
  onFilesSelected,
}) => {
  const [riskFile, setRiskFile] = useState<File | null>(null);
  const [nseFile, setNseFile] = useState<File | null>(null);
  const [cc01File, setCc01File] = useState<File | null>(null);

  const handleFileSelect = (type: 'risk' | 'nse' | 'cc01', file: File) => {
    if (type === 'risk') {
      setRiskFile(file);
    } else if (type === 'nse') {
      setNseFile(file);
    } else {
      setCc01File(file);
    }
  };

  const handleConfirm = () => {
    onFilesSelected({ risk: riskFile, nse: nseFile, cc01: cc01File });
    onOpenChange(false);
    setRiskFile(null);
    setNseFile(null);
    setCc01File(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setRiskFile(null);
    setNseFile(null);
    setCc01File(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UploadIcon className="h-5 w-5 text-blue-600" />
            <span>Upload Files for NSE CM Analysis</span>
          </DialogTitle>
          <DialogDescription>
            Upload Risk Excel file, NSE Globe file, and CC01 CSV file to process NSE CM data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>Risk File</span>
              </CardTitle>
              <CardDescription>Upload the Risk Excel file (.xlsx)</CardDescription>
            </CardHeader>
            <CardContent>
              {riskFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{riskFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRiskFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="risk-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="risk-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('risk', file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span>NSE Globe File</span>
              </CardTitle>
              <CardDescription>Upload the NSE Globe CSV file (.csv)</CardDescription>
            </CardHeader>
            <CardContent>
              {nseFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{nseFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNseFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="nse-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="nse-upload-modal"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('nse', file);
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
                <span>CC01 File</span>
              </CardTitle>
              <CardDescription>Upload the CC01 CSV file (.csv)</CardDescription>
            </CardHeader>
            <CardContent>
              {cc01File ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{cc01File.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCc01File(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="cc01-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="cc01-upload-modal"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('cc01', file);
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
            disabled={!riskFile || !nseFile || !cc01File}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Process Files
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Table Component
// ============================================================================
interface NseFoTableProps {
  data: NseFoData[];
  onUploadClick: () => void;
}

const NseFoTable: React.FC<NseFoTableProps> = ({ data, onUploadClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [ninetyAboveFilter, setNinetyAboveFilter] = useState('all');

  const filteredData = useMemo(() => {
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
  }, [data, searchQuery, actionFilter, amountFilter, ninetyAboveFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, amountFilter]);

  const getActionBadge = (action: string) => {
    if (action === 'U') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          Upgrade
        </Badge>
      );
    } else if (action === 'D') {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          Downgrade
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
    const headers = ['CLICODE', 'Ledger Amount', 'Globe Amount', 'Action', 'Difference', 'ninetyPercentLedger','cc01Margin','shortValue'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.clicode,
        row.ledgerAmount,
        row.globeAmount,
        row.action,
        row.difference,
        row.ninetyPercentLedger,
        row.cc01Margin,
        row.shortValue
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <span>NSE F&O Analysis Results</span>
            {filteredData.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {filteredData.length} records
              </Badge>
            )}
          </CardTitle>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              onClick={exportToCsv}
              className="bg-green-600 hover:bg-green-700"
              disabled={data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search CLICODE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={data.length === 0}
            />
          </div>
          
          <Select 
            value={actionFilter} 
            onValueChange={setActionFilter}
            disabled={data.length === 0}
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
            value={ninetyAboveFilter}
            onValueChange={setNinetyAboveFilter}
            disabled={data.length === 0}
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
            }}
            className="flex items-center"
            disabled={data.length === 0}
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
                <TableHead>CLICODE</TableHead>
                <TableHead className="text-right">Ledger Amount</TableHead>
                <TableHead className="text-right">Globe Amount</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="text-right">CC01 Margin</TableHead>
                <TableHead className="text-right">90% of Ledger</TableHead>
                <TableHead className="text-right">90% above</TableHead>
                <TableHead className="text-right">Short Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-lg font-medium">No data available</p>
                    <Button 
                      onClick={onUploadClick}
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                      Upload Files
                    </Button>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
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
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(row.ledgerAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(row.globeAmount)}
                    </TableCell>
                    <TableCell>{getActionBadge(row.action)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-semibold ${
                      row.difference > 0 ? 'text-green-600' : row.difference < 0 ? 'text-red-600' : 'text-slate-600'
                    }`}>
                      {formatNumber(row.difference)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(row.cc01Margin)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNumber(row.ninetyPercentLedger)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        Number.isFinite(row.ninetyabove) && row.ninetyabove > 90
                          ? 'bg-red-200 font-semibold'
                          : ''
                      }`}
                    >
                      {formatNumber(row.ninetyabove)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${
                      row.shortValue < 0 ? 'text-red-600 font-semibold' : ''
                    }`}>
                      {formatNumber(row.shortValue)}
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
  );
};

// ============================================================================
// Main Component
// ============================================================================
const NseFo: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [unallocatedFund, setUnallocatedFund] = useState<number>(0);
  const [tempUnallocatedFund, setTempUnallocatedFund] = useState<number>(0);
  const [isEditingUnallocated, setIsEditingUnallocated] = useState(false);
  const [processedData, setProcessedData] = useState<{
    data: NseFoData[];
    summary: NseFoSummary;
    outputRecords: NseFoOutputRecord[];
  } | null>(null);

  const handleFilesUploaded = async (files: { 
    risk: File | null; 
    nse: File | null; 
    cc01: File | null; 
  }) => {
    setIsProcessing(true);
    setShowUploadModal(false);

    try {
      const payloadForProcessor = {
        risk: files.risk,
        nse: files.nse,
        nri: files.cc01,
        cc01: files.cc01,
      };

      const result = await processNseFoFiles(payloadForProcessor, unallocatedFund);
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
    
    if (processedData) {
      toast({
        title: "Recalculating",
        description: "Updating calculations with new unallocated fund amount...",
      });
      
      const netValue = processedData.summary.upgradeTotal - processedData.summary.downgradeTotal;
      const finalProFund = processedData.summary.proFund - 2500000;
      const unallocatedFundAmount = tempUnallocatedFund * 100000;
      const newFinalAmount = parseFloat(((finalProFund - netValue + unallocatedFundAmount) - 1000).toFixed(2));
      const sd = newFinalAmount + 2500000;
      const newNmass = (processedData.summary.negativeShortValue / sd) * 100;
      
      
      const updatedSummary = {
        ...processedData.summary,
        finalAmount: newFinalAmount,
        nmass: newNmass
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

  if (isProcessing) {
    return (
      <ModernLoading 
        message="Processing NSE CM Files"
        subMessage="Analyzing risk data, globe allocations, and CC01 exclusions. This may take a few moments."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800">NSE F&O - Morning BOD</h1>
        <p className="text-slate-600 mt-2">
          Upload Backoffice Ledger, NSE Globe, and CC01 files to analyze NSE F&O allocation differences
        </p>
      </div>

        {/* Summary Cards - Now 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {processedData 
                ? `₹${(processedData.summary.upgradeTotal / 100000).toFixed(2)} L` 
                : '₹0.00 L'}
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
              {processedData 
                ? `₹${(processedData.summary.downgradeTotal / 100000).toFixed(2)} L` 
                : '₹0.00 L'}
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
              {processedData 
                ? `₹${(processedData.summary.netValue / 100000).toFixed(2)} L` 
                : '₹0.00 L'}
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
              {processedData 
                ? `₹${(processedData.summary.proFund / 100000).toFixed(2)} L` 
                : '₹0.00 L'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-600 flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Final Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700">
              {processedData 
                ? `₹${(processedData.summary.finalAmount / 100000).toFixed(2)} L` 
                : '₹0.00 L'}
            </div>
          </CardContent>
        </Card>
        {/* New card for negative short values */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center">
              <TrendingDown className="h-4 w-4 mr-2" />
              Negative Short Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {processedData 
                ? `₹-${(processedData.summary.negativeShortValue / 100000).toFixed(2)} L` 
                : '₹0.00 L'}
            </div>
          </CardContent>
        </Card>
        {/* New card for negative short values */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center">
              <TrendingDown className="h-4 w-4 mr-2" />
              NMASS Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {processedData 
                ? `₹${(processedData.summary.nmass).toFixed(2)} %` 
                : '₹0.00 %'}
            </div>
          </CardContent>
        </Card>
      </div>

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
              <Button
                onClick={exportOutputFile}
                className="bg-green-600 hover:bg-green-700"
                disabled={!processedData}
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

      {/* Results Section */}
      <div className="space-y-6">
        <NseFoTable 
          data={processedData?.data || []} 
          onUploadClick={() => setShowUploadModal(true)} 
        />
      </div>

      {/* Upload Modal */}
      <NseFoUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onFilesSelected={handleFilesUploaded}
      />
    </div>
  );
};

export default NseFo;