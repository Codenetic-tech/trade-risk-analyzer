
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { NseFoData } from '@/utils/nsefoProcessor';

interface NseFoTableProps {
  data: NseFoData[];
}

export const NseFoTable: React.FC<NseFoTableProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>NSE F&O Analysis Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Code</TableHead>
                <TableHead className="text-right">Ledger Amount</TableHead>
                <TableHead className="text-right">Globe Amount</TableHead>
                <TableHead className="text-right">CC01 Margin</TableHead>
                <TableHead className="text-right">90% of Ledger</TableHead>
                <TableHead className="text-right">Short Value</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {row.clicode}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.ledgerAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.globeAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.cc01Margin)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.ninetyPercentLedger)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.shortValue < 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      {formatCurrency(row.shortValue)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.difference < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(Math.abs(row.difference))}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={row.action === 'U' ? 'default' : 'destructive'}
                      className="flex items-center justify-center w-8"
                    >
                      {row.action === 'U' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No data to display. Please upload and process files first.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
