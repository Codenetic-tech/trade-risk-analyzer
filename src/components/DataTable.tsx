
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskData, exportToExcel } from '@/utils/dataProcessor';
import { Search, Download, Filter } from 'lucide-react';

interface DataTableProps {
  data: RiskData[];
  summary: {
    totalRecords: number;
    nilCount: number;
    excessCount: number;
    shortCount: number;
    totalLedger: number;
    totalAllocation: number;
  };
}

const DataTable: React.FC<DataTableProps> = ({ data, summary }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 500; // Increased to 500 records per page

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.ucc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{summary.totalRecords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">NIL Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{summary.nilCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">EXCESS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{summary.excessCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">SHORT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{summary.shortCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <CardTitle>Risk Analysis Results (Showing {itemsPerPage} records per page)</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search UCC or Client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                {paginatedData.map((row) => (
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
                ))}
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
    </div>
  );
};

export default DataTable;
