import React, { useState, useEffect, useMemo, useRef } from 'react'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button'; 
import { Alert, AlertDescription } from '@/components/ui/alert'; 
import { RefreshCw, Download, Wifi, WifiOff, Upload, FileSpreadsheet, X, ChevronUp, ChevronDown } from 'lucide-react'; 
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog'; 
import { toast } from '@/hooks/use-toast'; 
import { FileUploadModal } from './GlobeFileUploadModal'; 

interface RealtimeData { 
  Time: string; 
  UCC: string; 
  Amount: string; 
  Seg: string; 
  Gateway: string; 
  'Order ID': string; 
  BackOffice: string; 
  Kambala: string; 
  'pre globe': string; 
  allocation: string; 
  _id?: string; 
  _isNew?: boolean; 
  _isModified?: boolean; 
} 

interface SummaryData { 
  totalAmount: number; 
  successfulTransactions: number; 
  pendingTransactions: number; 
  failedTransactions: number; 
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

const RealtimeFund: React.FC = () => { 
  const [realtimeData, setRealtimeData] = useState<RealtimeData[]>([]); 
  const [isInitialLoading, setIsInitialLoading] = useState(true); 
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false); 
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); 
  const [autoRefresh, setAutoRefresh] = useState(true); 
  const [refreshInterval, setRefreshInterval] = useState(10); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [error, setError] = useState<string | null>(null); 
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected'); 
  const [newRecordsCount, setNewRecordsCount] = useState(0); 
  const [modifiedRecordsCount, setModifiedRecordsCount] = useState(0); 
  const [showUploadModal, setShowUploadModal] = useState(false); 
  const [isUploading, setIsUploading] = useState(false); 
  const [sortConfig, setSortConfig] = useState<{ 
    key: keyof RealtimeData | ''; 
    direction: 'asc' | 'desc'; 
  }>({ 
    key: '', 
    direction: 'asc' 
  }); 
  
  // Store the last fetched data to compare for changes 
  const lastFetchedData = useRef<RealtimeData[]>([]); 
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const inMemoryStorage = useRef<{[key: string]: any}>({}); 

  // Storage keys 
  const STORAGE_KEYS = { 
    data: 'realtimeFund_data', 
    lastUpdated: 'realtimeFund_lastUpdated', 
    autoRefresh: 'realtimeFund_autoRefresh', 
    refreshInterval: 'realtimeFund_refreshInterval', 
    searchQuery: 'realtimeFund_searchQuery', 
    statusFilter: 'realtimeFund_statusFilter' 
  }; 

  // Memory storage functions 
  const setStorageItem = (key: string, value: any) => { 
    inMemoryStorage.current[key] = JSON.stringify(value); 
  }; 

  const getStorageItem = (key: string) => { 
    const item = inMemoryStorage.current[key]; 
    return item ? JSON.parse(item) : null; 
  }; 

  // Load data from memory storage on component mount 
  useEffect(() => { 
    const loadStoredData = () => { 
      try { 
        const storedData = getStorageItem(STORAGE_KEYS.data); 
        const storedLastUpdated = getStorageItem(STORAGE_KEYS.lastUpdated); 
        const storedAutoRefresh = getStorageItem(STORAGE_KEYS.autoRefresh); 
        const storedRefreshInterval = getStorageItem(STORAGE_KEYS.refreshInterval); 
        const storedSearchQuery = getStorageItem(STORAGE_KEYS.searchQuery); 
        const storedStatusFilter = getStorageItem(STORAGE_KEYS.statusFilter); 

        if (storedData) { 
          setRealtimeData(storedData); 
          lastFetchedData.current = storedData; 
        } 

        if (storedLastUpdated) { 
          setLastUpdated(new Date(storedLastUpdated)); 
        } 

        if (storedAutoRefresh !== null) { 
          setAutoRefresh(storedAutoRefresh); 
        } 

        if (storedRefreshInterval) { 
          setRefreshInterval(storedRefreshInterval); 
        } 

        if (storedSearchQuery) { 
          setSearchQuery(storedSearchQuery); 
        } 

        if (storedStatusFilter) { 
          setStatusFilter(storedStatusFilter); 
        } 

        // If we have stored data, set initial loading to false 
        if (storedData) { 
          setIsInitialLoading(false); 
        } 
      } catch (error) { 
        console.error('Error loading stored data:', error); 
      } 
    }; 

    loadStoredData(); 
    
    // Always fetch fresh data after loading stored data 
    fetchAllData(false); 
  }, []); 

  // Save data to memory storage whenever it changes 
  useEffect(() => { 
    if (realtimeData.length > 0) { 
      setStorageItem(STORAGE_KEYS.data, realtimeData); 
    } 
  }, [realtimeData]); 

  // Save other states to storage 
  useEffect(() => { 
    setStorageItem(STORAGE_KEYS.autoRefresh, autoRefresh); 
  }, [autoRefresh]); 

  useEffect(() => { 
    setStorageItem(STORAGE_KEYS.refreshInterval, refreshInterval); 
  }, [refreshInterval]); 

  useEffect(() => { 
    setStorageItem(STORAGE_KEYS.searchQuery, searchQuery); 
  }, [searchQuery]); 

  useEffect(() => { 
    setStorageItem(STORAGE_KEYS.statusFilter, statusFilter); 
  }, [statusFilter]); 

  useEffect(() => { 
    if (lastUpdated) { 
      setStorageItem(STORAGE_KEYS.lastUpdated, lastUpdated.toISOString()); 
    } 
  }, [lastUpdated]); 

  // Generate a unique ID for each row based on its content 
  const generateRowId = (row: RealtimeData): string => { 
    return `${row.Time}-${row.UCC}-${row['Order ID']}-${row.Amount}`; 
  }; 

  // Create a content hash for comparison 
  const getRowContentHash = (row: RealtimeData): string => { 
    const keys = ['Time', 'UCC', 'Amount', 'Seg', 'Gateway', 'Order ID', 'BackOffice', 'Kambala', 'pre globe', 'allocation']; 
    return keys.map(key => row[key] || '').join('|'); 
  }; 

  // Fetch data from API
const fetchAPIData = async () => {
  try {
    // Use environment variable for API base URL
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    const apiUrl = `${API_BASE_URL}/api/method/rms.api.get_realtimefund_records`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'include' // Include cookies if needed
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.message || !data.message.success) {
      throw new Error('API response not successful');
    }
    
    // Transform API data to match RealtimeData interface
    const transformedData = data.message.records.map((record: any) => ({
      Time: record.time,
      UCC: record.ucc,
      Amount: record.amount,
      Seg: record.seg,
      Gateway: record.gateway,
      'Order ID': record.order_id,
      BackOffice: record.backoffice,
      Kambala: record.kambala,
      'pre globe': record.pre_globe,
      allocation: record.allocation,
      _id: `${record.time}-${record.ucc}-${record.order_id}-${record.amount}`
    }));
    
    return transformedData;
  } catch (error: any) {
    console.error('Error fetching API data:', error);
    throw new Error(`Failed to fetch data: ${error.message || 'Unknown error'}`);
  }
};

  const fetchAllData = async (isAutoRefresh = false) => {
    try {
      // Set appropriate loading state
      if (isAutoRefresh) {
        setIsAutoRefreshing(true);
        setConnectionStatus('syncing');
      } else {
        setIsInitialLoading(true);
      }
      
      setError(null);
      
      const apiData = await fetchAPIData();
      
      if (isAutoRefresh && lastFetchedData.current.length > 0) {
        // Improved incremental update for auto-refresh
        const currentDataMap = new Map(lastFetchedData.current.map(row => [row._id!, getRowContentHash(row)]));
        const newDataMap = new Map(apiData.map(row => [row._id!, getRowContentHash(row)]));
        
        let newCount = 0;
        let modifiedCount = 0;
        
        // Start with clean data (no flags)
        const cleanCurrentData = lastFetchedData.current.map(row => ({
          ...row,
          _isNew: false,
          _isModified: false
        }));
        
        // Create a map of current data by ID for easy lookup
        const currentDataById = new Map(cleanCurrentData.map(row => [row._id!, row]));
        
        // Process new data
        const updatedData: RealtimeData[] = [];
        
        apiData.forEach(newRow => {
          const rowId = newRow._id!;
          const newContentHash = newDataMap.get(rowId);
          const oldContentHash = currentDataMap.get(rowId);
          const existingRow = currentDataById.get(rowId);
          
          if (!existingRow) {
            // New record
            newRow._isNew = true;
            updatedData.push(newRow);
            newCount++;
            console.log('New record detected:', newRow);
          } else if (oldContentHash !== newContentHash) {
            // Modified record
            newRow._isModified = true;
            updatedData.push(newRow);
            modifiedCount++;
            console.log('Modified record detected:', { old: existingRow, new: newRow });
          } else {
            // Unchanged record
            updatedData.push(existingRow);
          }
        });
        
        // Handle deleted records (records that exist in current but not in new data)
        const newDataIds = new Set(apiData.map(row => row._id));
        const deletedRecords = cleanCurrentData.filter(row => !newDataIds.has(row._id!));
        
        if (deletedRecords.length > 0) {
          console.log('Deleted records:', deletedRecords.length);
        }
        
        // Sort data by time (most recent first) to maintain consistent order
        updatedData.sort((a, b) => {
          const timeA = new Date(a.Time).getTime();
          const timeB = new Date(b.Time).getTime();
          return timeB - timeA;
        });
        
        setRealtimeData(updatedData);
        lastFetchedData.current = updatedData.map(row => ({
          ...row,
          _isNew: false,
          _isModified: false
        }));
        
        setNewRecordsCount(newCount);
        setModifiedRecordsCount(modifiedCount);
        
        console.log(`Auto-refresh completed: ${newCount} new, ${modifiedCount} modified, ${updatedData.length} total`);
        
        // Clear new/modified flags after 5 seconds
        setTimeout(() => {
          setRealtimeData(prev => prev.map(row => ({
            ...row,
            _isNew: false,
            _isModified: false
          })));
        }, 5000);
        
        setConnectionStatus('connected');
      } else {
        // Full refresh for initial load or manual refresh
        const sortedData = apiData.sort((a, b) => {
          const timeA = new Date(a.Time).getTime();
          const timeB = new Date(b.Time).getTime();
          return timeB - timeA;
        });
        
        setRealtimeData(sortedData);
        lastFetchedData.current = sortedData;
        setNewRecordsCount(0);
        setModifiedRecordsCount(0);
        setConnectionStatus('connected');
        console.log('Full refresh completed:', sortedData.length, 'records');
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to fetch data: ${error.message}`);
      setConnectionStatus('disconnected');
    } finally {
      setIsInitialLoading(false);
      setIsAutoRefreshing(false);
    }
  };

  const handleFilesUpload = async (nseFile: File, mcxFile: File): Promise<void> => {
    if (!nseFile || !mcxFile) {
      setError("Both NSE and MCX files are required");
      return;
    }

    setIsUploading(true);
    
    try {
      // Parse both CSV files
      const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return []; // Need at least a header and one data row
        
        // Extract headers
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Parse data rows
        return lines.slice(1).map(line => {
          // Handle quoted values that might contain commas
          const values = line.split(',').reduce((acc, curr) => {
            // If the current value starts with a quote but doesn't end with one,
            // we're in a quoted value that spans multiple segments
            if (curr.startsWith('"') && !curr.endsWith('"')) {
              if (acc.inQuote) {
                acc.current += ',' + curr;
              } else {
                acc.inQuote = true;
                acc.current = curr;
              }
            } else if (curr.endsWith('"') && acc.inQuote) {
              acc.current += ',' + curr;
              acc.values.push(acc.current.replace(/^"|"$/g, '')); // Remove quotes
              acc.inQuote = false;
              acc.current = '';
            } else if (acc.inQuote) {
              acc.current += ',' + curr;
            } else {
              acc.values.push(curr.trim());
            }
            return acc;
          }, { values: [], inQuote: false, current: '' }).values;
          
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim();
          });
          
          return row;
        }).filter(row => Object.keys(row).length > 0 && Object.values(row).some(val => val !== ''));
      };

      // Read and parse both files
      const nseText = await nseFile.text();
      const mcxText = await mcxFile.text();
      
      const nseData = parseCSV(nseText);
      const mcxData = parseCSV(mcxText);

      // Prepare the payload
      const payload = {
        source: "upload",
        nseData,
        mcxData,
        timestamp: new Date().toISOString()
      };

      // Send to webhook
      const response = await fetch('https://n8n.gopocket.in/webhook/globeupload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const responseData = await response.json();

      // Show success toast notification
      toast({
        title: "Upload Successful",
        description: responseData.status || "Globe data updated",
        duration: 5000,
      });

      setError(null);
      
      // Refresh the data
      await fetchAllData(false);
    } catch (error: any) {
      console.error('Error processing files:', error);
      setError(`Failed to process files: ${error.message}`);
      
      // Show error toast notification
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Auto-refresh effect 
  useEffect(() => { 
    // Clear existing timeout 
    if (autoRefreshTimeoutRef.current) { 
      clearTimeout(autoRefreshTimeoutRef.current); 
    } 
    
    if (autoRefresh && !isInitialLoading) { 
      const scheduleNextRefresh = () => { 
        autoRefreshTimeoutRef.current = setTimeout(() => { 
          fetchAllData(true).finally(() => { 
            scheduleNextRefresh(); // Schedule next refresh 
          }); 
        }, refreshInterval * 1000); 
      }; 
      
      scheduleNextRefresh(); 
    } 
    
    return () => { 
      if (autoRefreshTimeoutRef.current) { 
        clearTimeout(autoRefreshTimeoutRef.current); 
      } 
    }; 
  }, [autoRefresh, refreshInterval, isInitialLoading]); 

  // Handle column sorting 
  const handleSort = (key: keyof RealtimeData) => { 
    let direction: 'asc' | 'desc' = 'asc'; 
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') { 
      direction = 'desc'; 
    } 
    
    setSortConfig({ key, direction }); 
  }; 

  // Calculate summary data 
  const summaryData = useMemo((): SummaryData => { 
    const totalAmount = realtimeData.reduce((sum, row) => sum + parseFloat(row.Amount || '0'), 0); 
    const successfulTransactions = realtimeData.filter(row =>  
      row.BackOffice === 'Success' && row.Kambala === 'Success' 
    ).length; 
    const pendingTransactions = realtimeData.filter(row =>  
      row.BackOffice === 'Pending' || row.Kambala === 'Pending' 
    ).length; 
    const failedTransactions = realtimeData.filter(row =>  
      row.BackOffice === 'Failed' || row.Kambala === 'Failed' 
    ).length; 

    return { 
      totalAmount, 
      successfulTransactions, 
      pendingTransactions, 
      failedTransactions 
    }; 
  }, [realtimeData]); 

  // Filter and sort data based on search, status filters, and sorting 
  const filteredData = useMemo(() => { 
    let data = realtimeData.filter(item => { 
      const matchesSearch =  
        item.UCC.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item['Order ID'].toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.Gateway.toLowerCase().includes(searchQuery.toLowerCase()); 

      let matchesStatus = true; 
      if (statusFilter === 'success') { 
        matchesStatus = item.BackOffice === 'Success' && item.Kambala === 'Success'; 
      } else if (statusFilter === 'pending') { 
        matchesStatus = item.BackOffice === 'Pending' || item.Kambala === 'Pending'; 
      } else if (statusFilter === 'failed') { 
        matchesStatus = item.BackOffice === 'Failed' || item.Kambala === 'Failed'; 
      } 

      return matchesSearch && matchesStatus; 
    }); 

   if (sortConfig.key) { 
  data.sort((a, b) => { 
    // Handle numeric sorting for Amount, Pre Globe, and Allocation 
    if (sortConfig.key === 'Amount' || sortConfig.key === 'pre globe' || sortConfig.key === 'allocation') { 
      const aNum = parseFloat(a[sortConfig.key] || '0'); 
      const bNum = parseFloat(b[sortConfig.key] || '0'); 
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum; 
    } 
    
    // Handle time sorting for Time column with new format DD-MM-YYYY-HH:MM:SS 
    if (sortConfig.key === 'Time') { 
      const parseTimeString = (timeStr: string) => { 
        if (!timeStr) return 0; 
        
        try { 
          // Split into parts: [day, month, year, time] 
          const parts = timeStr.split('-'); 
          if (parts.length < 4) return 0; // Invalid format 
          
          // Extract time components and split HH:MM:SS 
          const timeComponents = parts[3].split(':'); 
          if (timeComponents.length < 3) return 0; // Invalid time 

          // Create a Date object in UTC to avoid timezone issues 
          const date = new Date( 
            parseInt(parts[2]), // Year 
            parseInt(parts[1]) - 1, // Month (0-indexed) 
            parseInt(parts[0]), // Day 
            parseInt(timeComponents[0]), // Hours 
            parseInt(timeComponents[1]), // Minutes 
            parseInt(timeComponents[2]) // Seconds 
          ); 
          
          return date.getTime(); // Return timestamp for comparison 
        } catch (error) { 
          console.error('Error parsing time:', timeStr, error); 
          return 0; 
        } 
      }; 

      const aTimestamp = parseTimeString(a.Time); 
      const bTimestamp = parseTimeString(b.Time); 
      return sortConfig.direction === 'asc' ? aTimestamp - bTimestamp : bTimestamp - aTimestamp; 
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

return data; 

  }, [realtimeData, searchQuery, statusFilter, sortConfig]); 

  const formatNumber = (num: number) => { 
    return new Intl.NumberFormat('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2, 
    }).format(num); 
  }; 

  const exportToCSV = () => { 
    const headers = ['Time', 'UCC', 'Amount', 'Seg', 'Gateway', 'Order ID', 'BackOffice', 'Kambala', 'pre globe', 'allocation']; 
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
    link.setAttribute('download', `realtime_fund_data_${new Date().toISOString().slice(0, 10)}.csv`); 
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
  const renderSortIndicator = (key: keyof RealtimeData) => { 
    if (sortConfig.key !== key) return null; 
    
    return sortConfig.direction === 'asc' ?  
      <ChevronUp className="h-4 w-4 inline ml-1" /> :  
      <ChevronDown className="h-4 w-4 inline ml-1" />; 
  }; 

  return ( 
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen"> 
      {/* Header */} 
      <div className="border-b border-slate-200 bg-white rounded-lg p-6 shadow-sm"> 
        <div className="flex justify-between items-center"> 
          <div> 
            <div className="flex items-center gap-3"> 
              <h1 className="text-3xl font-bold text-slate-800">Realtime Fund Management</h1> 
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
              onClick={() => setShowUploadModal(true)} 
              variant="outline" 
              className="border-blue-300 text-blue-700 hover:bg-blue-50" 
              disabled={isUploading} 
            > 
              {isUploading ? ( 
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 
              ) : ( 
                <Upload className="h-4 w-4 mr-2" /> 
              )} 
              Upload Globe Files 
            </Button> 
            <Button  
              onClick={() => fetchAllData(false)} 
              disabled={isInitialLoading} 
              variant="outline" 
            > 
              <RefreshCw className={`h-4 w-4 mr-2 ${isInitialLoading ? 'animate-spin' : ''}`} /> 
              Refresh 
            </Button> 
            <Button  
              onClick={exportToCSV} 
              className="bg-green-600 hover:bg-green-700" 
              disabled={realtimeData.length === 0} 
            > 
              <Download className="h-4 w-4 mr-2" /> 
              Export CSV 
            </Button> 
          </div> 
        </div> 
      </div> 

      {/* File Upload Modal */} 
      <FileUploadModal 
        open={showUploadModal} 
        onOpenChange={setShowUploadModal} 
        onFilesSelected={handleFilesUpload} 
        isUploading={isUploading} 
      /> 

      {/* Error Alert */} 
      {error && ( 
        <Alert variant="destructive"> 
          <AlertDescription> 
            {error} 
          </AlertDescription> 
        </Alert> 
      )} 

      {/* Auto Refresh Settings */} 
      <Card> 
        <CardHeader className="pb-3"> 
          <CardTitle className="flex items-center justify-between"> 
            <span>Auto Refresh Settings</span> 
            <div className="flex items-center gap-2 text-sm"> 
              {isAutoRefreshing && ( 
                <span className="text-blue-600 flex items-center gap-1"> 
                  <RefreshCw className="h-3 w-3 animate-spin" /> 
                  Syncing... 
                </span> 
              )} 
              <span className={`capitalize ${ 
                connectionStatus === 'connected' ? 'text-green-600' :  
                connectionStatus === 'syncing' ? 'text-blue-600' : 'text-red-600' 
              }`}> 
                {connectionStatus} 
              </span> 
            </div> 
          </CardTitle> 
        </CardHeader> 
        <CardContent> 
          <div className="flex flex-col sm:flex-row gap-4 items-center"> 
            <div className="flex items-center space-x-2"> 
              <input 
                type="checkbox" 
                id="autoRefresh" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)} 
                className="h-4 w-4 text-blue-600 rounded" 
              /> 
              <Label htmlFor="autoRefresh" className="text-sm">Auto Refresh</Label> 
            </div> 
            <div className="flex items-center space-x-2"> 
              <Label htmlFor="refreshInterval" className="text-sm">Refresh every</Label> 
              <Select 
                value={refreshInterval.toString()} 
                onValueChange={(value) => setRefreshInterval(parseInt(value))} 
              > 
                <SelectTrigger className="w-24"> 
                  <SelectValue /> 
                </SelectTrigger> 
                <SelectContent> 
                  <SelectItem value="10">10s</SelectItem> 
                  <SelectItem value="30">30s</SelectItem> 
                  <SelectItem value="60">1m</SelectItem> 
                  <SelectItem value="300">5m</SelectItem> 
                </SelectContent> 
              </Select> 
            </div> 
            <div className="text-sm text-slate-500"> 
              {autoRefresh ? 'Live monitoring active' : 'Auto refresh disabled'} 
            </div> 
          </div> 
        </CardContent> 
      </Card> 

      {/* Summary Cards */} 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> 
        <Card className="shadow-sm border-blue-100"> 
          <CardHeader className="pb-2"> 
            <CardTitle className="text-sm font-medium text-blue-600">Total Amount</CardTitle> 
          </CardHeader> 
          <CardContent> 
            <div className="text-2xl font-bold text-blue-700"> 
              ₹{formatNumber(summaryData.totalAmount)} 
            </div> 
          </CardContent> 
        </Card> 
        <Card className="shadow-sm border-green-100"> 
          <CardHeader className="pb-2"> 
            <CardTitle className="text-sm font-medium text-green-600">Successful</CardTitle> 
          </CardHeader> 
          <CardContent> 
            <div className="text-2xl font-bold text-green-700"> 
              {summaryData.successfulTransactions} 
            </div> 
            <p className="text-xs text-slate-500 mt-1">Transactions</p> 
          </CardContent> 
        </Card> 
        <Card className="shadow-sm border-yellow-100"> 
          <CardHeader className="pb-2"> 
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle> 
          </CardHeader> 
          <CardContent> 
            <div className="text-2xl font-bold text-yellow-700"> 
              {summaryData.pendingTransactions} 
            </div> 
            <p className="text-xs text-slate-500 mt-1">Transactions</p> 
          </CardContent> 
        </Card> 
        <Card className="shadow-sm border-red-100"> 
          <CardHeader className="pb-2"> 
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle> 
          </CardHeader> 
          <CardContent> 
            <div className="text-2xl font-bold text-red-700"> 
              {summaryData.failedTransactions} 
            </div> 
            <p className="text-xs text-slate-500 mt-1">Transactions</p> 
          </CardContent> 
        </Card> 
      </div> 

      {/* Filters */} 
      <Card> 
        <CardHeader className="pb-3"> 
          <CardTitle>Filters</CardTitle> 
        </CardHeader> 
        <CardContent> 
          <div className="flex flex-col sm:flex-row gap-4"> 
            <div className="flex-1"> 
              <Label htmlFor="search" className="mb-2 block">Search</Label> 
              <Input 
                id="search" 
                placeholder="Search by UCC, Order ID, or Gateway" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              /> 
            </div> 
            <div className="w-full sm:w-48"> 
              <Label htmlFor="status" className="mb-2 block">Status</Label> 
              <Select value={statusFilter} onValueChange={setStatusFilter}> 
                <SelectTrigger id="status"> 
                  <SelectValue /> 
                </SelectTrigger> 
                <SelectContent> 
                  <SelectItem value="all">All Status</SelectItem> 
                  <SelectItem value="success">Success</SelectItem> 
                  <SelectItem value="pending">Pending</SelectItem> 
                  <SelectItem value="failed">Failed</SelectItem> 
                </SelectContent> 
              </Select> 
            </div> 
          </div> 
        </CardContent> 
      </Card> 

      {/* Data Table */} 
      <Card> 
        <CardHeader> 
          <div className="flex justify-between items-center"> 
            <CardTitle> 
              Realtime Fund Data {realtimeData.length > 0 &&  
                `(${filteredData.length} of ${realtimeData.length} records)`} 
            </CardTitle> 
            <div className="flex items-center gap-2 text-sm text-slate-500"> 
              {getConnectionStatusIcon()} 
              <span>Auto refresh: {autoRefresh ? 'ON' : 'OFF'}</span> 
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
                    onClick={() => handleSort('Time')} 
                  > 
                    Time {renderSortIndicator('Time')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100" 
                    onClick={() => handleSort('UCC')} 
                  > 
                    UCC {renderSortIndicator('UCC')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100 text-right" 
                    onClick={() => handleSort('Amount')} 
                  > 
                    Amount {renderSortIndicator('Amount')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100" 
                    onClick={() => handleSort('Seg')} 
                  > 
                    Segment {renderSortIndicator('Seg')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100" 
                    onClick={() => handleSort('Gateway')} 
                  > 
                    Gateway {renderSortIndicator('Gateway')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100" 
                    onClick={() => handleSort('Order ID')} 
                  > 
                    Order ID {renderSortIndicator('Order ID')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100" 
                    onClick={() => handleSort('BackOffice')} 
                  > 
                    BackOffice {renderSortIndicator('BackOffice')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100" 
                    onClick={() => handleSort('Kambala')} 
                  > 
                    Kambala {renderSortIndicator('Kambala')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100 text-right" 
                    onClick={() => handleSort('pre globe')} 
                  > 
                    Pre Globe {renderSortIndicator('pre globe')} 
                  </TableHead> 
                  <TableHead  
                    className="cursor-pointer hover:bg-slate-100 text-right" 
                    onClick={() => handleSort('allocation')} 
                  > 
                    Allocation {renderSortIndicator('allocation')} 
                  </TableHead> 
                </TableRow> 
              </TableHeader> 
              <TableBody> 
                {isInitialLoading ? ( 
                  <TableRow> 
                    <TableCell colSpan={10} className="text-center py-8"> 
                      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" /> 
                      <p className="mt-2 text-slate-600">Loading data from API...</p> 
                    </TableCell> 
                  </TableRow> 
                ) : realtimeData.length === 0 ? ( 
                  <TableRow> 
                    <TableCell colSpan={10} className="text-center py-8"> 
                      <div className="text-slate-400 mb-2">No data available</div> 
                      <p className="text-slate-600"> 
                        Make sure the API endpoint is accessible 
                      </p> 
                    </TableCell> 
                  </TableRow> 
                ) : filteredData.length === 0 ? ( 
                  <TableRow> 
                    <TableCell colSpan={10} className="text-center py-8"> 
                      <div className="text-slate-400 mb-2">No matching records found</div> 
                      <p className="text-slate-600"> 
                        Try adjusting your search or filters 
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
                      <TableCell className="font-mono text-sm">{row.Time}</TableCell> 
                      <TableCell className="font-medium">{row.UCC}</TableCell> 
                      <TableCell className="text-right font-mono"> 
                        ₹{formatNumber(parseFloat(row.Amount || '0'))} 
                      </TableCell> 
                      <TableCell>{row.Seg}</TableCell> 
                      <TableCell>{row.Gateway}</TableCell> 
                      <TableCell className="font-mono text-sm">{row['Order ID']}</TableCell> 
                      <TableCell> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                          row.BackOffice === 'Success'  
                            ? 'bg-green-100 text-green-800'  
                            : row.BackOffice === 'Pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800' 
                        }`}> 
                          {row.BackOffice} 
                        </span> 
                      </TableCell> 
                      <TableCell> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                          row.Kambala === 'Success'  
                            ? 'bg-green-100 text-green-800'  
                            : row.Kambala === 'Pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800' 
                        }`}> 
                          {row.Kambala} 
                        </span> 
                      </TableCell> 
                      <TableCell className="text-right font-mono"> 
                        {row['pre globe']} 
                      </TableCell> 
                      <TableCell className="text-right font-mono font-semibold"> 
                        {row.allocation} 
                      </TableCell> 
                    </TableRow> 
                  )) 
                )} 
              </TableBody> 
            </Table> 
          </div> 
        </CardContent> 
      </Card> 
    </div> 
  ); 
}; 

export default RealtimeFund;