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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BrokerageData, 
  BrokerageSummary, 
  exportBrokerageData, 
  exportOrderClient, 
  exportClientWiseBrokerage 
} from '@/utils/brokerageProcessor';
import { Search, Download, FileText, Users } from 'lucide-react';

interface BrokerageTableProps {
  data: BrokerageData[];
  summary: BrokerageSummary;
  orderClientData?: string[];
}

export const BrokerageTable: React.FC<BrokerageTableProps> = ({ 
  data, 
  summary, 
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

  return (
    <div className="space-y-6">
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
                {paginatedData.map((row, index) => (
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

      {/* Download Section */}
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
            >
              <FileText className="h-4 w-4 mr-2" />
              Order Client
            </Button>
            <Button
              onClick={() => exportClientWiseBrokerage(filteredData, 'ALL')}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Client wise ALL
            </Button>
            <Button
              onClick={() => exportClientWiseBrokerage(filteredData, 'COM')}
              className="bg-purple-600 hover:bg-purple-700 w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Client wise COM
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
