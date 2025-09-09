import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  _contentHash?: string;
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

// Optimized memoized table row with better comparison
const MemoizedTableRow = React.memo(({ row }: { row: GlobeData }) => {
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }, []);

  return (
    <TableRow 
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
  );
}, (prevProps, nextProps) => {
  // Compare using content hash for better performance
  return prevProps.row._contentHash === nextProps.row._contentHash && 
         prevProps.row._isNew === nextProps.row._isNew &&
         prevProps.row._isModified === nextProps.row._isModified;
});

MemoizedTableRow.displayName = 'MemoizedTableRow';

const GlobeFund: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'nse' | 'mcx'>('nse');
  const [nseGlobeData, setNseGlobeData] = useState<GlobeData[]>([]);
  const [mcxGlobeData, setMcxGlobeData] = useState<GlobeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
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
  const lastFetchedDataRef = useRef<{
    nse: Map<string, string>;
    mcx: Map<string, string>;
  }>({
    nse: new Map(),
    mcx: new Map()
  });

  // Clear flags timeout refs
  const clearFlagsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Storage utilities with error handling
  const storage = useMemo(() => ({
    set: (key: string, value: any) => {
      try {
        const item = {
          value,
          timestamp: Date.now(),
          expires: Date.now() + (30 * 60 * 1000) // 30 minutes
        };
        // Use sessionStorage for better persistence across page navigation
        sessionStorage.setItem(`globe_${key}`, JSON.stringify(item));
      } catch (error) {
        console.warn('Storage set error:', error);
      }
    },
    get: (key: string) => {
      try {
        const item = sessionStorage.getItem(`globe_${key}`);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        if (Date.now() > parsed.expires) {
          sessionStorage.removeItem(`globe_${key}`);
          return null;
        }
        
        return parsed.value;
      } catch (error) {
        console.warn('Storage get error:', error);
        return null;
      }
    },
    remove: (key: string) => {
      try {
        sessionStorage.removeItem(`globe_${key}`);
      } catch (error) {
        console.warn('Storage remove error:', error);
      }
    }
  }), []);

  // Generate content hash for comparison
  const generateContentHash = useCallback((row: GlobeData): string => {
    const keys = ['name', 'allocdate', 'clrtype', 'segments', 'tmcode', 'clicode', 'acctype', 'allocated'];
    return btoa(keys.map(key => row[key] || '').join('|'));
  }, []);

  // Generate unique ID for each row
  const generateRowId = useCallback((row: GlobeData): string => {
    return `${row.name}-${row.allocdate}-${row.tmcode}-${row.clicode || 'null'}-${row.segments}`;
  }, []);

  // Process raw data and add metadata
  const processRawData = useCallback((data: any[]): GlobeData[] => {
    return data.map(row => {
      const processedRow = {
        ...row,
        _id: generateRowId(row),
        _contentHash: generateContentHash(row),
        _isNew: false,
        _isModified: false
      };
      return processedRow;
    });
  }, [generateRowId, generateContentHash]);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedNse = storage.get('nse_data');
        const cachedMcx = storage.get('mcx_data');
        const cachedLastUpdated = storage.get('last_updated');
        const cachedSearchQuery = storage.get('search_query');
        const cachedActiveTab = storage.get('active_tab');
        const cachedLastFetchedNse = storage.get('last_fetched_nse');
        const cachedLastFetchedMcx = storage.get('last_fetched_mcx');

        if (cachedNse) {
          setNseGlobeData(cachedNse);
        }
        
        if (cachedMcx) {
          setMcxGlobeData(cachedMcx);
        }

        if (cachedLastFetchedNse) {
          lastFetchedDataRef.current.nse = new Map(cachedLastFetchedNse);
        }

        if (cachedLastFetchedMcx) {
          lastFetchedDataRef.current.mcx = new Map(cachedLastFetchedMcx);
        }

        if (cachedLastUpdated) {
          setLastUpdated(new Date(cachedLastUpdated));
        }

        if (cachedSearchQuery) {
          setSearchQuery(cachedSearchQuery);
        }

        if (cachedActiveTab) {
          setActiveTab(cachedActiveTab);
        }

        // Check if data is stale (older than 5 minutes)
        const isDataStale = !cachedLastUpdated || 
          (Date.now() - new Date(cachedLastUpdated).getTime()) > 5 * 60 * 1000;

        // Only fetch if no cached data or data is stale
        if ((!cachedNse && !cachedMcx) || isDataStale) {
          await fetchGlobeData();
        }
      } catch (error) {
        console.error('Error loading cached data:', error);
        await fetchGlobeData();
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadCachedData();
  }, []);

  // Cache data whenever it changes
  useEffect(() => {
    if (nseGlobeData.length > 0) {
      storage.set('nse_data', nseGlobeData);
    }
  }, [nseGlobeData, storage]);

  useEffect(() => {
    if (mcxGlobeData.length > 0) {
      storage.set('mcx_data', mcxGlobeData);
    }
  }, [mcxGlobeData, storage]);

  // Cache other state
  useEffect(() => {
    storage.set('search_query', searchQuery);
  }, [searchQuery, storage]);

  useEffect(() => {
    storage.set('active_tab', activeTab);
  }, [activeTab, storage]);

  useEffect(() => {
    if (lastUpdated) {
      storage.set('last_updated', lastUpdated.toISOString());
    }
  }, [lastUpdated, storage]);

  // Fetch data from API
  const fetchApiData = useCallback(async (source: 'NSE Globe' | 'MCX Globe') => {
    const response = await fetch('https://n8n.gopocket.in/webhook/getglobe', {
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
    
    if (!Array.isArray(data)) {
      console.error('Expected array but got:', data);
      return [];
    }
    
    return processRawData(data);
  }, [processRawData]);

  // Optimized incremental update function
  const performIncrementalUpdate = useCallback((
    newData: GlobeData[],
    currentData: GlobeData[],
    dataType: 'nse' | 'mcx'
  ): { updatedData: GlobeData[], newCount: number, modifiedCount: number } => {
    const currentDataMap = new Map(currentData.map(row => [row._id!, row]));
    const newDataMap = new Map(newData.map(row => [row._id!, row._contentHash!]));
    const lastFetchedMap = lastFetchedDataRef.current[dataType];
    
    let newCount = 0;
    let modifiedCount = 0;
    const updatedData: GlobeData[] = [...currentData];

    // Process new data for incremental changes
    newData.forEach(newRow => {
      const rowId = newRow._id!;
      const existingRowIndex = updatedData.findIndex(row => row._id === rowId);
      const lastFetchedHash = lastFetchedMap.get(rowId);
      
      if (existingRowIndex === -1) {
        // Completely new record
        newRow._isNew = true;
        updatedData.push(newRow);
        newCount++;
      } else {
        // Check if content has changed since last fetch
        if (lastFetchedHash && lastFetchedHash !== newRow._contentHash) {
          newRow._isModified = true;
          updatedData[existingRowIndex] = { ...newRow };
          modifiedCount++;
        } else {
          // No change - keep existing row without flags
          updatedData[existingRowIndex] = { 
            ...updatedData[existingRowIndex],
            _isNew: false,
            _isModified: false
          };
        }
      }
      
      // Update last fetched hash
      lastFetchedMap.set(rowId, newRow._contentHash!);
    });

    // Remove records that no longer exist in new data
    const updatedDataFiltered = updatedData.filter(row => 
      newDataMap.has(row._id!) || row._isNew || row._isModified
    );

    return { updatedData: updatedDataFiltered, newCount, modifiedCount };
  }, []);

  // Main fetch function with optimized updates
  const fetchGlobeData = useCallback(async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('syncing');
      setError(null);
      
      // Reset counters
      setNewRecordsCount(0);
      setModifiedRecordsCount(0);
      
      // Fetch both datasets
      const [nseData, mcxData] = await Promise.all([
        fetchApiData('NSE Globe'),
        fetchApiData('MCX Globe')
      ]);
      
      // Perform incremental updates
      const nseUpdate = performIncrementalUpdate(nseData, nseGlobeData, 'nse');
      const mcxUpdate = performIncrementalUpdate(mcxData, mcxGlobeData, 'mcx');
      
      // Update state only if there are changes
      if (nseUpdate.newCount > 0 || nseUpdate.modifiedCount > 0 || nseGlobeData.length === 0) {
        setNseGlobeData(nseUpdate.updatedData);
      }
      
      if (mcxUpdate.newCount > 0 || mcxUpdate.modifiedCount > 0 || mcxGlobeData.length === 0) {
        setMcxGlobeData(mcxUpdate.updatedData);
      }
      
      // Update counters
      setNewRecordsCount(nseUpdate.newCount + mcxUpdate.newCount);
      setModifiedRecordsCount(nseUpdate.modifiedCount + mcxUpdate.modifiedCount);
      
      // Cache the last fetched hashes
      storage.set('last_fetched_nse', Array.from(lastFetchedDataRef.current.nse.entries()));
      storage.set('last_fetched_mcx', Array.from(lastFetchedDataRef.current.mcx.entries()));
      
      setConnectionStatus('connected');
      setLastUpdated(new Date());
      
      // Clear flags after 5 seconds
      if (clearFlagsTimeoutRef.current) {
        clearTimeout(clearFlagsTimeoutRef.current);
      }
      
      clearFlagsTimeoutRef.current = setTimeout(() => {
        setNseGlobeData(prev => prev.map(row => ({
          ...row,
          _isNew: false,
          _isModified: false
        })));
        setMcxGlobeData(prev => prev.map(row => ({
          ...row,
          _isNew: false,
          _isModified: false
        })));
      }, 5000);
      
    } catch (error) {
      console.error('Error fetching globe data:', error);
      setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, [nseGlobeData, mcxGlobeData, fetchApiData, performIncrementalUpdate, storage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clearFlagsTimeoutRef.current) {
        clearTimeout(clearFlagsTimeoutRef.current);
      }
    };
  }, []);

  // Handle column sorting
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Memoized summary calculations
  const summaryData = useMemo((): SummaryData => {
    const totalCMFund = nseGlobeData
      .filter(row => row.segments?.toLowerCase().includes('cm'))
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    const totalFOFund = nseGlobeData
      .filter(row => {
        const segments = row.segments?.toLowerCase() || '';
        return segments.includes('fo') || segments.includes('f&o');
      })
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    const totalCDFund = nseGlobeData
      .filter(row => row.segments?.toLowerCase().includes('cd'))
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    const totalMCXFund = mcxGlobeData
      .reduce((sum, row) => sum + parseFloat(row.allocated || '0'), 0);
    
    const currentTabData = activeTab === 'nse' ? nseGlobeData : mcxGlobeData;
    const totalRecords = currentTabData.length;

    return {
      totalCMFund,
      totalFOFund,
      totalCDFund,
      totalMCXFund,
      totalRecords
    };
  }, [nseGlobeData, mcxGlobeData, activeTab]);

  // Memoized filtered and sorted data
  const filteredData = useMemo(() => {
    const data = activeTab === 'nse' ? nseGlobeData : mcxGlobeData;
    
    let filtered = data;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter(item => 
        item.tmcode?.toLowerCase().includes(query) ||
        item.clicode?.toLowerCase().includes(query) ||
        item.segments?.toLowerCase().includes(query) ||
        item.allocated?.toLowerCase().includes(query)
      );
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        if (sortConfig.key === 'allocated') {
          const aNum = parseFloat(a.allocated || '0');
          const bNum = parseFloat(b.allocated || '0');
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
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

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ['name', 'allocdate', 'clrtype', 'segments', 'tmcode', 'clicode', 'acctype', 'allocated'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
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
    URL.revokeObjectURL(url);
  }, [filteredData, activeTab]);

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

  const renderSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const getCurrentData = () => {
    return activeTab === 'nse' ? nseGlobeData : mcxGlobeData;
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Loading Globe Data</h2>
          <p className="text-slate-500">Please wait while we fetch your data...</p>
        </div>
      </div>
    );
  }

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
              {isLoading ? 'Syncing...' : 'Refresh'}
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
                    {isLoading && getCurrentData().length === 0 ? (
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
                      filteredData.map((row) => (
                        <MemoizedTableRow key={row._id} row={row} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Loading overlay for incremental updates */}
              {isLoading && getCurrentData().length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Syncing latest data...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GlobeFund;