import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Search, Filter, Download, Upload, BarChart3, RefreshCw } from 'lucide-react';
import FileUpload from './FileUpload';
import { processFiles, ProcessedData, RiskData, exportToExcel } from '@/utils/dataProcessor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';


const Dashboard: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilesUploaded = async (files: { risk: File | null; nse: File | null; mcx: File | null }) => {
    setIsProcessing(true);
    setIsLoading(true);

    try {
      const result = await processFiles(files);
      setProcessedData(result);
      setShowUploadModal(false);
      
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
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!processedData) return [];
    
    return processedData.data.filter(item => {
      const matchesSearch = item.ucc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [processedData, searchQuery, statusFilter]);

  const paginatedData = useMemo(() => {
    if (!processedData) return [];
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, processedData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const colors = {
      'NIL': 'bg-green-100 text-green-800 hover:bg-green-200',
      'EXCESS': 'bg-red-100 text-red-800 hover:bg-red-200',
      'SHORT': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status}
      </Badge>
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Summary calculations
  const summaryTotals = useMemo(() => {
    if (!processedData) {
      return {
        totalRecords: 0,
        nilCount: 0,
        excessCount: 0,
        shortCount: 0,
        totalLedger: 0,
        totalAllocation: 0
      };
    }
    
    return processedData.summary;
  }, [processedData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Risk Management Dashboard</h1>
            <p className="text-slate-600 mt-2">
              Upload and analyze risk files to monitor allocation differences
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
            {processedData && (
              <Button 
                onClick={() => setShowVisualization(!showVisualization)} 
                variant="outline" 
                className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showVisualization ? 'Hide Charts' : 'Show Charts'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl">
           <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogContent className="max-w-6xl">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span>Upload Files for Risk Analysis</span>
                </DialogTitle>
                <DialogDescription>
                  Upload your Risk Excel file and Globe allocation files (NSE/MCX) to begin analysis
                </DialogDescription>
              </DialogHeader>
              
              <FileUpload 
                onFilesUploaded={handleFilesUploaded} 
                onCancel={() => setShowUploadModal(false)}
              />
            </DialogContent>
          </Dialog>

          </div>
        </div>
      )}

      {/* Summary Cards - Always visible like EveningIntersegment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summaryTotals.totalRecords}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">NIL Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {summaryTotals.nilCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">EXCESS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {summaryTotals.excessCount}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">SHORT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {summaryTotals.shortCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <CardTitle>
              {processedData ? `Risk Analysis Results (${filteredData.length} records)` : 'Risk Analysis'}
            </CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search UCC or Client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                  disabled={!processedData}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={!processedData}>
                <SelectTrigger className="w-full sm:w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="NIL">NIL</SelectItem>
                  <SelectItem value="EXCESS">EXCESS</SelectItem>
                  <SelectItem value="SHORT">SHORT</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => exportToExcel(filteredData)}
                className="bg-green-600 hover:bg-green-700"
                disabled={!processedData}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
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
                  <TableHead>Client Name</TableHead>
                  <TableHead className="text-right">MCX Balance</TableHead>
                  <TableHead className="text-right">NSE-CM Balance</TableHead>
                  <TableHead className="text-right">NSE-F&O Balance</TableHead>
                  <TableHead className="text-right">NSE-CDS Balance</TableHead>
                  <TableHead className="text-right">LED TOTAL</TableHead>
                  <TableHead className="text-right">FO</TableHead>
                  <TableHead className="text-right">CM</TableHead>
                  <TableHead className="text-right">CD</TableHead>
                  <TableHead className="text-right">CO</TableHead>
                  <TableHead className="text-right">ALLOC TOTAL</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead className="text-right">DIFF</TableHead>
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
                ) : !processedData ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-lg font-medium text-slate-800">
                        No Data Processed Yet
                      </h3>
                      <p className="text-slate-600 mb-4">
                        Upload your Risk Excel and Globe allocation files to begin analysis
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
                        No matching records found
                      </h3>
                      <p className="text-slate-600">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row) => (
                    <TableRow key={row.ucc} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{row.ucc}</TableCell>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.mcxBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.nseCmBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.nseFoBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.nseCdsBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-blue-600">
                        {formatNumber(row.ledTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.fo)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.cm)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.cd)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(row.co)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-purple-600">
                        {formatNumber(row.allocTotal)}
                      </TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${
                        row.diff > 0 ? 'text-red-600' : row.diff < 0 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {formatNumber(row.diff)}
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

export default Dashboard;