
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Settings, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EveningIntersegment: React.FC = () => {
  const [proFund, setProFund] = useState<number>(0);
  const [tempProFund, setTempProFund] = useState<number>(0);
  const [isEditingProFund, setIsEditingProFund] = useState(false);

  const handleSetProFund = () => {
    setProFund(tempProFund);
    setIsEditingProFund(false);
    toast({
      title: "ProFund Updated",
      description: `ProFund has been set to ₹${tempProFund.toFixed(2)} L`,
    });
  };

  const handleEditProFund = () => {
    setTempProFund(proFund);
    setIsEditingProFund(true);
  };

  const exportMcxGlobeOutput = () => {
    // Get current date in DD-MMM-YYYY format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('default', { month: 'short' });
    const year = now.getFullYear();
    const currentDate = `${day}-${month}-${year}`;

    const headers = ['CURRENTDATE', 'SEGMENT', 'CMCODE', 'TMCODE', 'CPCODE', 'CLICODE', 'ACCOUNTTYPE', 'AMOUNT', 'FILLER1', 'FILLER2', 'FILLER3', 'FILLER4', 'FILLER5', 'FILLER6', 'ACTION'];
    const proFundAmount = proFund * 100000; // Convert lacs to actual amount
    
    const textContent = [
      headers.join(','),
      [currentDate, 'CO', '8090', '46365', '', '', 'P', proFundAmount, '', '', '', '', '', '', 'A'].join(',')
    ].join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mcx_globe_output.csv';
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "MCX Globe output file has been exported successfully",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800">Evening Intersegment</h1>
        <p className="text-slate-600 mt-2">
          Manage intersegment transfers and export MCX Globe output
        </p>
      </div>

      {/* ProFund Management and Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>ProFund Management & MCX Globe Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <Label htmlFor="pro-fund">ProFund Amount (in Lacs)</Label>
              <div className="flex items-center space-x-2">
                {isEditingProFund ? (
                  <>
                    <Input
                      id="temp-pro-fund"
                      type="number"
                      placeholder="Enter amount in lacs"
                      value={tempProFund || ''}
                      onChange={(e) => setTempProFund(parseFloat(e.target.value) || 0)}
                      className="max-w-sm"
                      step="0.01"
                    />
                    <Button
                      onClick={handleSetProFund}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Set
                    </Button>
                    <Button
                      onClick={() => setIsEditingProFund(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      id="pro-fund"
                      type="text"
                      value={`₹${proFund.toFixed(2)} L`}
                      readOnly
                      className="max-w-sm bg-gray-50"
                    />
                    <Button
                      onClick={handleEditProFund}
                      variant="outline"
                      size="sm"
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
                onClick={exportMcxGlobeOutput}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={proFund <= 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export MCX Globe Output
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              1. Set the ProFund amount using the input field above
            </p>
            <p>
              2. Click "Export MCX Globe Output" to generate the MCX Globe file with the set ProFund amount
            </p>
            <p>
              3. The exported file will include the ProFund record with segment 'CO', account type 'P', and action 'A'
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EveningIntersegment;
