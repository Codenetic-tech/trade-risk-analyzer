import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Banknote, Calculator } from 'lucide-react';
import { NseFoSummary } from '@/utils/nseFoProcessor';

interface NseFoSummaryCardsProps {
  processedData: {
    summary: NseFoSummary;
  } | null;
}

const NseFoSummaryCards: React.FC<NseFoSummaryCardsProps> = ({ processedData }) => {
  return (
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
            Globe Pro Fund
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

      <Card
        className={
          processedData?.summary.finalAmount < 0
            ? "bg-red-600 border-red-1000"
            : ""
        }
      >
        <CardHeader className="pb-2">
          <CardTitle
            className={`text-sm font-medium flex items-center ${
              processedData?.summary.finalAmount < 0
                ? "text-white"
                : "text-cyan-600"
            }`}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Final Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              processedData?.summary.finalAmount < 0
                ? "text-white"
                : "text-cyan-700"
            }`}
          >
            {processedData
              ? `₹${(processedData.summary.finalAmount / 100000).toFixed(2)} L`
              : "₹0.00 L"}
          </div>
        </CardContent>
      </Card>
      
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
              ? `₹${(processedData.summary.negativeShortValue / 100000).toFixed(2)} L` 
              : '₹0.00 L'}
          </div>
        </CardContent>
      </Card>
      
      <Card
        className={
          processedData?.summary.nmass < 0
            ? "bg-red-600 border-red-1000"
            : ""
        }
      >
        <CardHeader className="pb-2">
          <CardTitle
            className={`text-sm font-medium flex items-center ${
              processedData?.summary.nmass < 0
                ? "text-white"
                : "text-pink-600"
            }`}
          >
            <Calculator
              className={`h-4 w-4 mr-2 ${
                processedData?.summary.nmass < 0 ? "text-white" : ""
              }`}
            />
            BaNCS Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              processedData?.summary.nmass < 0
                ? "text-white"
                : "text-pink-700"
            }`}
          >
            {processedData
              ? `${processedData.summary.nmass.toFixed(2)}%`
              : "0.00%"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NseFoSummaryCards;