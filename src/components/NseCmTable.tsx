
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NseCmData } from '@/utils/nseCmProcessor';
import { Search, Download, TrendingUp, TrendingDown, Filter } from 'lucide-react';

interface NseCmTableProps {
  data: NseCmData[];
}

export const NseCmTable: React.FC<NseCmTableProps> = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.clicode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === 'all' || item.action === actionFilter;
      const matchesAmount = amountFilter === 'all' || 
        (amountFilter === 'high' && Math.abs(item.difference) > 10000) ||
        (amountFilter === 'medium' && Math.abs(item.difference) > 1000 && Math.abs(item.difference) <= 10000) ||
        (amountFilter === 'low' && Math.abs(item.difference) <= 1000);
      
      return matchesSearch && matchesAction && matchesAmount;
    });
  }, [data, searchQuery, actionFilter, amountFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to first page when filters change
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <span>NSE CM Analysis Results</span>
            <Badge variant="outline" className="ml-2">
              {filteredData.length} records
            </Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              onClick={exportToCsv}
              className="bg-green-600 hover:bg-green-700"
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
            />
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="U">Upgrade Only</SelectItem>
              <SelectItem value="D">Downgrade Only</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={amountFilter} onValueChange={setAmountFilter}>
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
            }}
            className="flex items-center"
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No records found. Try adjusting your filters.
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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
