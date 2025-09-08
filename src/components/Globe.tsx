import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download, Wifi, WifiOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface GlobeData {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  allocdate: string;
  clrtype: string;
  segments: string;
  tmcode: string;
  clicode: string | null;
  acctype: string;
  allocated: string;
  _id?: string;
  _isNew?: boolean;
  _isModified?: boolean;
}

interface SummaryData {
  totalCMFund: number;
  totalFOFund: number;
  totalCDFund: number;
  totalMCXFund: number;
  totalRecords: number;
}

// Custom Table Components
const Table = ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className="w-full border-collapse" {...props}>{children}</table>
);

const TableHeader = ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-slate-50" {...props}>{children}</thead>
);

const TableBody = ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...props}>{children}</tbody>
);

const TableRow = ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className="border-b border-slate-200" {...props}>{children}</tr>
);

const TableHead = ({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`px-4 py-3 text-left text-sm font-medium text-slate-600 ${className}`} {...props}>
    {children}
  </th>
);

const TableCell = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-4 py-3 text-sm text-slate-900 ${className}`} {...props}>
    {children}
  </td>
);

const GlobeFund: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'nse' | 'mcx'>('nse');
  const [nseGlobeData, setNseGlobeData] = useState<GlobeData[]>([]);
  const [mcxGlobeData, setMcxGlobeData] = useState<GlobeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected');
  const [newRecordsCount, setNewRecordsCount] = useState(0);
  const [modifiedRecordsCount, setModifiedRecordsCount] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: '',
    direction: 'asc'
  });

  // Store the last fetched data to compare for changes
  const lastFetchedNseGlobeData = useRef<GlobeData[]>([]);
  const lastFetchedMcxGlobeData = useRef<GlobeData[]>([]);

  // Storage keys
  const STORAGE_KEYS = {
    nse_data: 'globe_nse_data',
    mcx_data: 'globe_mcx_data',
    lastUpdated: 'globe_lastUpdated',
    searchQuery: 'globe_searchQuery',
    activeTab: 'globe_activeTab',
    lastFetchedNse: 'globe_lastFetchedNse',
    lastFetchedMcx: 'globe_lastFetchedMcx'
  };

  // Local storage functions
  const setStorageItem = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const getStorageItem = (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  };

  // Generate a unique ID for each row based on its content
  const generateRowId = (row: GlobeData): string => {
    return `${row.name}-${row.allocdate}-${row.tmcode}-${row.clicode}-${row.allocated}`;
  };

  // Create a content hash for comparison
  const getRowContentHash = (row: GlobeData): string => {
    const keys = ['name', 'allocdate', 'clrtype', 'segments', 'tmcode', 'clicode', 'acctype', 'allocated'];
    return keys.map(key => row[key] || '').join('|');
  };

  // Load data from local storage on component mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedNseData = getStorageItem(STORAGE_KEYS.nse_data);
        const storedMcxData = getStorageItem(STORAGE_KEYS.mcx_data);
        const storedLastUpdated = getStorageItem(STORAGE_KEYS.lastUpdated);
        const storedSearchQuery = getStorageItem(STORAGE_KEYS.searchQuery);
        const storedActiveTab = getStorageItem(STORAGE_KEYS.activeTab);
        const storedLastFetchedNse = getStorageItem(STORAGE_KEYS.lastFetchedNse);
        const storedLastFetchedMcx = getStorageItem(STORAGE_KEYS.lastFetchedMcx);

        if (storedNseData) {
          setNseGlobeData(storedNseData);
        }

        if (storedMcxData) {
          setMcxGlobeData(storedMcxData);
        }

        if (storedLastFetchedNse) {
          lastFetchedNseGlobeData.current = storedLastFetchedNse;
        }

        if (storedLastFetchedMcx) {
          lastFetchedMcxGlobeData.current = storedLastFetchedMcx;
        }

        if (storedLastUpdated) {
          setLastUpdated(new Date(storedLastUpdated));
        }

        if (storedSearchQuery) {
          setSearchQuery(storedSearchQuery);
        }

        if (storedActiveTab) {
          setActiveTab(storedActiveTab);
        }

        // If we have stored data, set initial loading to false
        if (storedNseData || storedMcxData) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading stored data:', error);
      }
    };

    loadStoredData();
    
    // Only fetch fresh data if data is stale (older than 5 minutes)
    const storedLastUpdated = getStorageItem(STORAGE_KEYS.lastUpdated);
    const isDataStale = !storedLastUpdated || (Date.now() - new Date(storedLastUpdated).getTime()) > 5 * 60 * 1000;
    
    if (isDataStale || (!getStorageItem(STORAGE_KEYS.nse_data) && !getStorageItem(STORAGE_KEYS.mcx_data))) {
      fetchGlobeData();
    }
  }, []);

  // Save data to local storage whenever it changes
  useEffect(() => {
    if (nseGlobeData.length > 0) {
      setStorageItem(STORAGE_KEYS.nse_data, nseGlobeData);
    }
  }, [nseGlobeData]);

  useEffect(() => {
    if (mcxGlobeData.length > 0) {
      setStorageItem(STORAGE_KEYS.mcx_data, mcxGlobeData);
    }
  }, [mcxGlobeData]);

  // Save other states to storage
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.searchQuery, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (lastUpdated) {
      setStorageItem(STORAGE_KEYS.lastUpdated, lastUpdated.toISOString());
    }
  }, [lastUpdated]);

  // Save last fetched data to storage
  useEffect(() => {
    if (lastFetchedNseGlobeData.current.length > 0) {
      setStorageItem(STORAGE_KEYS.lastFetchedNse, lastFetchedNseGlobeData.current);
    }
  }, [lastFetchedNseGlobeData.current]);

  useEffect(() => {
    if (lastFetchedMcxGlobeData.current.length > 0) {
      setStorageItem(STORAGE_KEYS.lastFetchedMcx, lastFetchedMcxGlobeData.current);
    }
  }, [lastFetchedMcxGlobeData.current]);

  // Fetch Globe data from API
  const fetchApiData = async (source: 'NSE Globe' | 'MCX Globe') => {
    try {
      const response = await fetch('https://n8n.gopocket.in/webhook/rms1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data is an array, if not, return empty array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', data);
        return [];
      }
      
      // Add IDs to each row
      return data.map((row: any) => ({
        ...row,
        _id: generateRowId(row)
      }));
    } catch (error) {
      console.error(`Error fetching ${source} data:`, error);
      throw error;
    }
  };

  // Process data for incremental updates
  const processIncrementalUpdate = (
    newData: GlobeData[],
    lastData: GlobeData[],
    setData: React.Dispatch<React.SetStateAction<GlobeData[]>>,
    setLastData: (data: GlobeData[]) => void
  ) => {
    if (lastData.length > 0) {
      const currentDataMap = new Map(lastData.map(row => [row._id!, getRowContentHash(row)]));
      const newDataMap = new Map(newData.map(row => [row._id!, getRowContentHash(row)]));
      
      let newCount = 0;
      let modifiedCount = 0;
      
      // Start with clean data (no flags)
      const cleanCurrentData = lastData.map(row => ({
        ...row,
        _isNew: false,
        _isModified: false
      }));
      
      // Create a map of current data by ID for easy lookup
      const currentDataById = new Map(cleanCurrentData.map(row => [row._id!, row]));
      
      // Process new data
      const updatedData: GlobeData[] = [];
      
      newData.forEach(newRow => {
        const rowId = newRow._id!;
        const newContentHash = newDataMap.get(rowId);
        const oldContentHash = currentDataMap.get(rowId);
        const existingRow = currentDataById.get(rowId);
        
        if (!existingRow) {
          // New record
          (newRow as any)._isNew = true;
          updatedData.push(newRow);
          newCount++;
        } else if (oldContentHash !== newContentHash) {
          // Modified record
          (newRow as any)._isModified = true;
          updatedData.push(newRow);
          modifiedCount++;
        } else {
          // Unchanged record
          updatedData.push(existingRow);
        }
      });
      
      setData(updatedData);
      setLastData(updatedData.map(row => ({
        ...row,
        _isNew: false,
        _isModified: false
      })));
      
      // Update counts
      setNewRecordsCount(newCount);
      setModifiedRecordsCount(modifiedCount);
      
      // Clear new/modified flags after 5 seconds
      setTimeout(() => {
        setData(prev => prev.map(row => ({
          ...row,
          _isNew: false,
          _isModified: false
        })));
      }, 5000);
    } else {
      // Full refresh for initial load
      setData(newData);
      setLastData(newData);
    }
  };

  const fetchGlobeData = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('syncing');
      setError(null);
      
      // Fetch both NSE and MCX data
      const [nseData, mcxData] = await Promise.all([
        fetchApiData('NSE Globe'),
        fetchApiData('MCX Globe')
      ]);
      
      // Process incremental updates for both datasets
      processIncrementalUpdate(
        nseData,
        lastFetchedNseGlobeData.current,
        setNseGlobeData,
        (data) => lastFetchedNseGlobeData.current = data
      );
      
      processIncrementalUpdate(
        mcxData,
        lastFetchedMcxGlobeData.current,
        setMcxGlobeData,
        (data) => lastFetchedMcxGlobeData.current = data
      );
      
      setConnectionStatus('connected');
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching globe data:', error);
      setError(`Failed to fetch data: ${error.message}`);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle column sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Calculate summary data based on segments
  const summaryData = useMemo((): SummaryData => {
    const currentTabData = activeTab === 'nse' ? nseGlobeData : mcxGlobeData;
    
    // Calculate NSE funds (from nseGlobeData)
    const totalCMFund = nseGlobeData
      .filter(row => row.segments && row.segments.toLowerCase().includes('cm'))
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    const totalFOFund = nseGlobeData
      .filter(row => row.segments && (row.segments.toLowerCase().includes('fo') || row.segments.toLowerCase().includes('f&o')))
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    const totalCDFund = nseGlobeData
      .filter(row => row.segments && row.segments.toLowerCase().includes('cd'))
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    // Calculate MCX funds (from mcxGlobeData)
    const totalMCXFund = mcxGlobeData
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    // Current tab records count
    const totalRecords = currentTabData.length;

    return {
      totalCMFund,
      totalFOFund,
      totalCDFund,
      totalMCXFund,
      totalRecords
    };
  }, [nseGlobeData, mcxGlobeData, activeTab]);

  // Filter and sort data based on search
  const filteredData = useMemo(() => {
    const data = activeTab === 'nse' ? nseGlobeData : mcxGlobeData;
    
    const filtered = data.filter(item => {
      return (
        item.tmcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.clicode && item.clicode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.segments.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.allocated.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Handle numeric sorting for allocated
        if (sortConfig.key === 'allocated') {
          const aNum = parseFloat(a.allocated || '0');
          const bNum = parseFloat(b.allocated || '0');
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Default string sorting for other columns
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [nseGlobeData, mcxGlobeData, activeTab, searchQuery, sortConfig]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const exportToCSV = () => {
    const headers = ['name', 'allocdate', 'clrtype', 'segments', 'tmcode', 'clicode', 'acctype', 'allocated'];
    const data = filteredData;

    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_globe_data_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  // Render sort indicator for table headers
  const renderSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    return activeTab === 'nse' ? nseGlobeData : mcxGlobeData;
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-800">Globe Data Management</h1>
              {getConnectionStatusIcon()}
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-4 mt-1 text-sm">
                <span className="text-slate-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
                {(newRecordsCount > 0 || modifiedRecordsCount > 0) && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {newRecordsCount > 0 && `${newRecordsCount} new`}
                    {newRecordsCount > 0 && modifiedRecordsCount > 0 && ', '}
                    {modifiedRecordsCount > 0 && `${modifiedRecordsCount} updated`}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={fetchGlobeData}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={exportToCSV}
              className="bg-green-600 hover:bg-green-700"
              disabled={getCurrentData().length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'nse' | 'mcx')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nse">NSE Globe</TabsTrigger>
          <TabsTrigger value="mcx">MCX Globe</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="shadow-sm border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Total CM Fund</CardTitle>
                <CardDescription className="text-xs text-blue-500">NSE Cash Market</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  ₹{formatNumber(summaryData.totalCMFund)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Total FO Fund</CardTitle>
                <CardDescription className="text-xs text-green-500">NSE F&O</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  ₹{formatNumber(summaryData.totalFOFund)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-yellow-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Total CD Fund</CardTitle>
                <CardDescription className="text-xs text-yellow-500">NSE Currency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  ₹{formatNumber(summaryData.totalCDFund)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">Total MCX Fund</CardTitle>
                <CardDescription className="text-xs text-purple-500">MCX Commodities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  ₹{formatNumber(summaryData.totalMCXFund)}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Total Records</CardTitle>
                <CardDescription className="text-xs text-red-500">{activeTab.toUpperCase()} Allocations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {summaryData.totalRecords}
                </div>
                <p className="text-xs text-slate-500 mt-1">Active Tab</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex-1">
                <Label htmlFor="search" className="mb-2 block">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by TM Code, Client Code, Segment, or Allocated Amount"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {activeTab === 'nse' ? 'NSE Globe Data' : 'MCX Globe Data'}
                  {getCurrentData().length > 0 && 
                    ` (${filteredData.length} of ${getCurrentData().length} records)`}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  {getConnectionStatusIcon()}
                  <span className={`capitalize ${
                    connectionStatus === 'connected' ? 'text-green-600' : 
                    connectionStatus === 'syncing' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {connectionStatus}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('allocdate')}
                      >
                        Date {renderSortIndicator('allocdate')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('clrtype')}
                      >
                        CLR Type {renderSortIndicator('clrtype')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('segments')}
                      >
                        Segment {renderSortIndicator('segments')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('tmcode')}
                      >
                        TM Code {renderSortIndicator('tmcode')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('clicode')}
                      >
                        Client Code {renderSortIndicator('clicode')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort('acctype')}
                      >
                        Account Type {renderSortIndicator('acctype')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-slate-100 text-right"
                        onClick={() => handleSort('allocated')}
                      >
                        Allocated {renderSortIndicator('allocated')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                          <p className="mt-2 text-slate-600">
                            Loading {activeTab.toUpperCase()} Globe data...
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : getCurrentData().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-slate-400 mb-2">No data available</div>
                          <p className="text-slate-600">
                            No data found for {activeTab.toUpperCase()} Globe
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-slate-400 mb-2">No matching records found</div>
                          <p className="text-slate-600">
                            Try adjusting your search criteria
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((row, index) => (
                        <TableRow 
                          key={`${row._id}-${index}`} 
                          className={`hover:bg-slate-50 transition-colors duration-200 ${
                            row._isNew ? 'bg-green-50 border-l-4 border-green-400' :
                            row._isModified ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                          }`}
                        >
                          <TableCell className="font-mono text-sm">{row.allocdate}</TableCell>
                          <TableCell>{row.clrtype}</TableCell>
                          <TableCell>{row.segments}</TableCell>
                          <TableCell className="font-mono">{row.tmcode}</TableCell>
                          <TableCell className="font-mono">{row.clicode || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              row.acctype === 'C' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {row.acctype === 'C' ? 'Client' : 'Proprietary'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            ₹{formatNumber(parseFloat(row.allocated || '0'))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GlobeFund;