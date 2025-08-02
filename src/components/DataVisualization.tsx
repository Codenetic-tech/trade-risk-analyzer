
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from 'recharts';

interface KambalaData {
  Entity: string;
  Level: string;
  Profile: string;
  Cash: number;
  Payin: number;
  UnclearedCash: number;
  TOTAL: number;
  AvailableMargin: number;
  MarginUsed: number;
  AvailableCheck: number;
  CollateralTotal: number;
  margin99: number;
  margin1: number;
  kambalaNseAmount: number;
  kambalaMcxAmount: number;
}

interface DataVisualizationProps {
  data: KambalaData[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const DataVisualization: React.FC<DataVisualizationProps> = ({ data }) => {
  // Prepare data for different chart types
  const marginData = data.slice(0, 10).map(item => ({
    entity: item.Entity.substring(0, 8) + '...',
    availableMargin: item.AvailableMargin,
    marginUsed: item.MarginUsed,
    margin99: item.margin99,
    margin1: item.margin1,
  }));

  const balanceData = data.slice(0, 10).map(item => ({
    entity: item.Entity.substring(0, 8) + '...',
    cash: item.Cash,
    payin: item.Payin,
    unclearedCash: item.UnclearedCash,
  }));

  const kambalaData = data.slice(0, 15).map(item => ({
    entity: item.Entity.substring(0, 6),
    nseAmount: item.kambalaNseAmount,
    mcxAmount: item.kambalaMcxAmount,
  }));

  // Distribution data for pie chart
  const distributionData = [
    { name: 'Positive Cash', value: data.filter(item => item.Cash > 0).length },
    { name: 'Negative Cash', value: data.filter(item => item.Cash < 0).length },
    { name: 'Zero Cash', value: data.filter(item => item.Cash === 0).length },
  ].filter(item => item.value > 0);

  // Scatter plot data for margin utilization
  const utilizationData = data.map(item => ({
    x: item.AvailableMargin,
    y: item.MarginUsed,
    entity: item.Entity,
  }));

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrency = (value: number) => {
    return '₹' + formatNumber(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Margin Analysis Bar Chart */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Margin Analysis (Top 10 Entities)</span>
          </CardTitle>
          <CardDescription>Available vs Used Margin with 99% and 1% calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={marginData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="entity" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Bar dataKey="availableMargin" fill="#3B82F6" name="Available Margin" />
              <Bar dataKey="marginUsed" fill="#EF4444" name="Margin Used" />
              <Bar dataKey="margin99" fill="#10B981" name="99% Margin" />
              <Bar dataKey="margin1" fill="#F59E0B" name="1% Margin" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Cash Flow Analysis</span>
          </CardTitle>
          <CardDescription>Cash, Payin, and Uncleared Cash breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="entity" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Bar dataKey="cash" fill="#10B981" name="Cash" />
              <Bar dataKey="payin" fill="#3B82F6" name="Payin" />
              <Bar dataKey="unclearedCash" fill="#F59E0B" name="Uncleared Cash" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Cash Position Distribution</span>
          </CardTitle>
          <CardDescription>Distribution of entities by cash position</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Kambala Amounts Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Kambala NSE vs MCX Amounts</span>
          </CardTitle>
          <CardDescription>Comparison of calculated Kambala amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kambalaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="entity" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Bar dataKey="nseAmount" fill="#EF4444" name="NSE Amount" />
              <Bar dataKey="mcxAmount" fill="#8B5CF6" name="MCX Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Margin Utilization Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
            <span>Margin Utilization Pattern</span>
          </CardTitle>
          <CardDescription>Available Margin vs Margin Used correlation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Available Margin"
                tick={{ fontSize: 10 }}
                tickFormatter={formatNumber}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Margin Used"
                tick={{ fontSize: 10 }}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={() => ''}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter dataKey="y" fill="#06B6D4" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataVisualization;
