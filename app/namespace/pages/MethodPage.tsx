import React, { useState, useEffect } from 'react';
import { Play, Edit, Trash2, Hash, Type, Link, Tag, Settings, CheckCircle, Database, Search, FileText, User, Calendar, Globe, Code, Zap, Shield, Activity, BarChart3 } from 'lucide-react';
import MethodTestModal from '@/app/components/MethodTestModal';
import { v4 as uuidv4 } from 'uuid';

type Method = { id: string; name: string };
type Props = { onSelect?: (m: Method) => void; method?: any; namespace?: any; onTest?: (method: any, namespace: any) => void; openEdit?: boolean };
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
const methods = [
  { id: 'm1', name: 'GET /users' },
  { id: 'm2', name: 'POST /login' },
  { id: 'm3', name: 'DELETE /item' },
];

// Helper to extract string from DynamoDB attribute or plain value
function getString(val: any) {
  if (val && typeof val === 'object' && 'S' in val) return val.S;
  return val || '';
}

// Helper to extract the root partition key (id)
function getPartitionKey(method: any) {
  if (method && method.id && typeof method.id === 'object' && 'S' in method.id) return method.id.S;
  if (method && typeof method.id === 'string') return method.id;
  return '';
}

export default function MethodPage({ onSelect, method, namespace, onTest, openEdit }: Props) {
  const [editMethod, setEditMethod] = useState<any>(method || {});
  const [saveMsg, setSaveMsg] = useState('');
  const [editMode, setEditMode] = useState(false);
  
  // Caching state
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [tableExists, setTableExists] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [cacheFormData, setCacheFormData] = useState({
    tableName: '',
    project: 'my-project', // Default project name
    timeToLive: 3600, // 1 hour in seconds
    status: 'active',
    itemsPerKey: 100
  });
  const [cacheTTLType, setCacheTTLType] = useState<'infinite' | 'finite'>('finite');
  const [cacheTTLUnit, setCacheTTLUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [cacheTTLValue, setCacheTTLValue] = useState(1);
  const [resolvedNamespaceName, setResolvedNamespaceName] = useState('');

  // Helper functions for TTL conversion
  const convertToSeconds = (value: number, unit: 'minutes' | 'hours' | 'days'): number => {
    switch (unit) {
      case 'minutes': return value * 60;
      case 'hours': return value * 3600;
      case 'days': return value * 86400;
      default: return value;
    }
  };

  const convertFromSeconds = (seconds: number): { value: number; unit: 'minutes' | 'hours' | 'days' } => {
    if (seconds === 0) return { value: 0, unit: 'hours' };
    if (seconds % 86400 === 0) return { value: seconds / 86400, unit: 'days' };
    if (seconds % 3600 === 0) return { value: seconds / 3600, unit: 'hours' };
    return { value: seconds / 60, unit: 'minutes' };
  };
  const [methodName, setMethodName] = useState('');
  const [cacheData, setCacheData] = useState<any[]>([]);
  const [loadingCache, setLoadingCache] = useState(false);

  // Search indexing state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchFormData, setSearchFormData] = useState({
    project: 'myProject',
    table: 'shopify-inkhub-get-products',
    customFields: [] as string[]
  });
  const [searchIndices, setSearchIndices] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('ankit');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState('');
  const [searchHitsPerPage, setSearchHitsPerPage] = useState(20);
  const [searchPage, setSearchPage] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'caching' | 'search'>('details');
  
  // Indexing configuration state
  const [indexingConfigs, setIndexingConfigs] = useState<any[]>([]);
  const [loadingIndexingConfigs, setLoadingIndexingConfigs] = useState(false);
  const [showCreateIndexingModal, setShowCreateIndexingModal] = useState(false);
  const [showEditIndexingModal, setShowEditIndexingModal] = useState(false);
  const [editingIndexingConfig, setEditingIndexingConfig] = useState<any>(null);
  const [indexingFormData, setIndexingFormData] = useState({
    project: 'myProject',
    table: '',
    description: '',
    customFields: [] as string[],
    status: 'active'
  });
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedConfigForExecution, setSelectedConfigForExecution] = useState<any>(null);
  const [selectedIndexingAccountId, setSelectedIndexingAccountId] = useState('');
  const [selectedIndexingAccount, setSelectedIndexingAccount] = useState<any>(null);
  const [indexingTableExists, setIndexingTableExists] = useState(false);
  const [selectedConfigForSearch, setSelectedConfigForSearch] = useState<string | null>(null);
  const [showEditCacheModal, setShowEditCacheModal] = useState(false);
  const [editingCacheConfig, setEditingCacheConfig] = useState<any>(null);
  const [editCacheFormData, setEditCacheFormData] = useState({
    tableName: '',
    project: 'my-project',
    timeToLive: 3600,
    status: 'active',
    itemsPerKey: 100
  });
  const [editCacheTTLType, setEditCacheTTLType] = useState<'infinite' | 'finite'>('finite');
  const [editCacheTTLUnit, setEditCacheTTLUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [editCacheTTLValue, setEditCacheTTLValue] = useState(1);
  const [showSearchInterface, setShowSearchInterface] = useState(false);

  useEffect(() => {
    if (method) {
      console.log('Method data from backend:', method);
      setEditMethod({ ...method, ...(method.data || {}) });
      
      // Debug: Log all possible table field names
      console.log('=== TABLE NAME DEBUG ===');
      console.log('method["namespace-method-table"]:', method['namespace-method-table']);
      console.log('method?.data?.["namespace-method-table"]:', method?.data?.['namespace-method-table']);
      console.log('method.table:', method.table);
      console.log('method.tableName:', method.tableName);
      console.log('method["table"]:', method['table']);
      console.log('method["tableName"]:', method['tableName']);
      console.log('Full method object keys:', Object.keys(method));
      if (method.data) {
        console.log('Full method.data object keys:', Object.keys(method.data));
      }
      
      // Try multiple possible field names for table
      const methodTable = method['namespace-method-table'] || 
                         method?.data?.['namespace-method-table'] || 
                         method.table || 
                         method.tableName || 
                         method['table'] || 
                         method['tableName'] || 
                         '';
      
      console.log('Extracted table name:', methodTable);
      
      setSearchFormData(prev => ({
        ...prev,
        table: methodTable
      }));
      
      // Set the table name for indexing as well
      setIndexingFormData(prev => ({
        ...prev,
        table: methodTable
      }));
      
      // Fetch accounts and resolve namespace name
      fetchAccounts();
      resolveNamespaceName();
      resolveMethodName();
      fetchCacheData(); // Fetch cache data for this method
      fetchSearchIndices(); // Fetch search indices for this method
      fetchIndexingConfigs(); // Fetch indexing configurations for this method
    }
  }, [method]);

  // Auto-open in edit mode when requested
  useEffect(() => {
    if (openEdit) {
      setEditMode(true);
    }
  }, [openEdit]);

  // Update search form data when indexing configs are loaded
  useEffect(() => {
    if (indexingConfigs.length > 0 && (!searchFormData.table || searchFormData.table === '')) {
      // If no table name was found in method data, use the first active indexing config
      const activeConfig = indexingConfigs.find((config: any) => config.status === 'active');
      if (activeConfig) {
        console.log('Using table name from active indexing config:', activeConfig.table);
        setSearchFormData(prev => ({
          ...prev,
          project: activeConfig.project || prev.project,
          table: activeConfig.table || prev.table
        }));
      }
    }
  }, [indexingConfigs, searchFormData.table]);

  const fetchAccounts = async () => {
    try {
      // Try different possible field names for namespace ID
      const namespaceId = method?.['namespace-id'] || method?.namespaceId || method?.data?.['namespace-id'] || editMethod?.['namespace-id'];
      console.log('Fetching accounts for namespaceId:', namespaceId);
      console.log('Method object:', method);
      console.log('EditMethod object:', editMethod);
      
      if (!namespaceId) {
        console.error('No namespace ID found in method data');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts`);
      console.log('Accounts response:', response);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Accounts data:', data);
        const accountsList = data.accounts || data || [];
        console.log('Accounts list structure:', accountsList);
        if (accountsList.length > 0) {
          console.log('First account object:', accountsList[0]);
          
        }
        setAccounts(accountsList);
      } else {
        console.error('Failed to fetch accounts:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const resolveNamespaceName = async () => {
    try {
      const namespaceId = method?.['namespace-id'] || method?.namespaceId || method?.data?.['namespace-id'] || editMethod?.['namespace-id'];
      if (!namespaceId) return;
      
      const response = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`);
      if (response.ok) {
        const data = await response.json();
        setResolvedNamespaceName(data.namespace?.name || '');
      }
    } catch (error) {
      console.error('Error resolving namespace name:', error);
    }
  };

  const resolveMethodName = () => {
    // Try to get method name from different possible sources
    const methodNameFromMethod = method?.['namespace-method-name'] || method?.name || method?.data?.['namespace-method-name'];
    const methodId = method?.['namespace-method-id'] || method?.methodId;
    
    if (methodNameFromMethod) {
      setMethodName(methodNameFromMethod);
    } else if (methodId) {
      // Extract method name from the method ID (assuming format: namespace-method-id)
      const parts = methodId.split('-');
      if (parts.length >= 3) {
        setMethodName(parts.slice(2).join('-'));
      }
    }
    
    console.log('Resolved method name:', methodNameFromMethod || methodId);
  };

  const handleInput = (field: string, value: any) => {
    setEditMethod((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleArrayInput = (field: string, idx: number, key: string, value: any) => {
    setEditMethod((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const handleAddArrayItem = (field: string, template: any) => {
    setEditMethod((prev: any) => ({
      ...prev,
      [field]: [...(Array.isArray(prev[field]) ? prev[field] : []), template],
    }));
  };

  const handleRemoveArrayItem = (field: string, idx: number) => {
    setEditMethod((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
  };

  // Cache-related functions
  const handleEnableCache = () => {
    setShowCacheModal(true);
    // Re-fetch accounts when modal opens
    fetchAccounts();
  };

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    const account = accounts.find(acc => acc['namespace-account-id'] === accountId);
    setSelectedAccount(account);
    
    // Check if table exists for this account and method (handle DynamoDB structure)
    if (account && methodName) {
      // Handle DynamoDB nested structure
      let tableNameMap: Record<string, string> = {};
      if (account.data && account.data.M && account.data.M.tableName && account.data.M.tableName.M) {
        // Extract tableName from DynamoDB format
        const tableNameObj = account.data.M.tableName.M;
        tableNameMap = Object.fromEntries(
          Object.entries(tableNameObj).map(([key, value]: [string, any]) => [
            key, 
            value.S || value // Extract string value from DynamoDB format
          ])
        );
      } else if (account.tableName) {
        // Fallback to direct tableName access
        tableNameMap = account.tableName;
      }
      
      const tableNameForMethod = tableNameMap[methodName];
      console.log('=== TABLE EXISTENCE CHECK ===');
      console.log('Account:', account['namespace-account-name']);
      console.log('Method name:', methodName);
      console.log('Available tables:', Object.keys(tableNameMap));
      console.log('Table name map:', tableNameMap);
      console.log('Table name for method:', tableNameForMethod);
      console.log('Table exists:', !!tableNameForMethod);
      
      if (tableNameForMethod) {
        setTableExists(true);
        setCacheFormData(prev => ({ ...prev, tableName: tableNameForMethod }));
      } else {
        setTableExists(false);
        setCacheFormData(prev => ({ ...prev, tableName: '' }));
      }
    }
  };

  const handleCreateTable = async () => {
    try {
      const newTableName = `${resolvedNamespaceName}-${selectedAccount?.['namespace-account-name']}-${methodName}`;
      
      const response = await fetch(`${API_BASE_URL}/unified/schema/table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId: editMethod.schemaId || '',
          accountId: selectedAccountId,
          methodName: methodName,
          tableName: newTableName
        })
      });

      if (response.ok) {
        setTableExists(true);
        setCacheFormData(prev => ({ ...prev, tableName: newTableName }));
        setShowCreateTableModal(false);
        // Refresh accounts to get updated tableName map
        fetchAccounts();
      } else {
        alert('Failed to create table');
      }
    } catch (error) {
      console.error('Error creating table:', error);
      alert('Failed to create table');
    }
  };

  const handleSaveCache = async () => {
    try {
      const cacheData = {
        id: uuidv4(),
        methodId: editMethod['namespace-method-id'],
        accountId: selectedAccountId,
        tableName: cacheFormData.tableName,
        project: cacheFormData.project, // Use project name from form
        timeToLive: cacheFormData.timeToLive,
        status: cacheFormData.status,
        itemsPerKey: cacheFormData.itemsPerKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: cacheData })
      });

      if (response.ok) {
        alert('Cache configuration saved successfully!');
        setShowCacheModal(false);
        setCacheFormData({
          tableName: '',
          project: 'my-project',
          timeToLive: 3600,
          status: 'active',
          itemsPerKey: 100
        });
        // Refresh the cache data to show the new configuration
        fetchCacheData();
      } else {
        alert('Failed to save cache configuration');
      }
    } catch (error) {
      console.error('Error saving cache:', error);
      alert('Failed to save cache configuration');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg('');
    const methodId = editMethod["namespace-method-id"];
    if (!methodId) {
      setSaveMsg('Error: Method ID is missing. Cannot update method.');
      return;
    }
    try {
      // Ensure all required fields are present in the payload
      const requestBody = {
        "namespace-method-id": methodId,
        "namespace-method-name": editMethod["namespace-method-name"] || '',
        "namespace-method-type": editMethod["namespace-method-type"] || '',
        "namespace-method-url-override": editMethod["namespace-method-url-override"] || '',
        "namespace-method-queryParams": editMethod["namespace-method-queryParams"] || [],
        "namespace-method-header": editMethod["namespace-method-header"] || [],
        "save-data": !!editMethod["save-data"],
        "isInitialized": !!editMethod["isInitialized"],
        "tags": editMethod["tags"] || [],
        "namespace-method-tableName": editMethod["namespace-method-tableName"] || '',
        "tableName": editMethod["tableName"] || '',
        "schemaId": editMethod["schemaId"] || '',
        "namespace-id": editMethod["namespace-id"] || ''
      };
      const res = await fetch(`${API_BASE_URL}/unified/methods/${methodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (res.ok) {
        setSaveMsg('Method updated successfully!');
        setEditMode(false);
      } else {
        setSaveMsg('Failed to update method.');
      }
    } catch {
      setSaveMsg('Failed to update method.');
    }
  };

  const fetchCacheData = async () => {
    try {
      setLoadingCache(true);
      const methodId = editMethod['namespace-method-id'] || method?.['namespace-method-id'];
      
      if (!methodId) {
        console.log('No method ID available for cache fetch');
        return;
      }

      console.log('Fetching cache data for method ID:', methodId);
      
      // Use the CRUD endpoint to get cache configurations for this method
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-cache&pagination=true&itemPerPage=50`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw cache data:', data);
        
        if (data.success && data.items) {
          // Filter cache configurations for this specific method
          const methodCacheConfigs = data.items.filter((cacheConfig: any) => 
            cacheConfig.methodId === methodId || cacheConfig['methodId'] === methodId
          );
          
          console.log('Filtered cache configs for method:', methodCacheConfigs);
          setCacheData(methodCacheConfigs);
        } else {
          console.log('No cache data found or invalid response');
          setCacheData([]);
        }
      } else {
        console.error('Failed to fetch cache data:', response.status, response.statusText);
        setCacheData([]);
      }
    } catch (error) {
      console.error('Error fetching cache data:', error);
      setCacheData([]);
    } finally {
      setLoadingCache(false);
    }
  };

  const handleDeleteCache = async (cacheId: string) => {
    if (!window.confirm('Are you sure you want to delete this cache configuration?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-cache`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cacheId })
      });

      if (response.ok) {
        alert('Cache configuration deleted successfully!');
        fetchCacheData(); // Refresh the cache data
      } else {
        alert('Failed to delete cache configuration');
      }
    } catch (error) {
      console.error('Error deleting cache:', error);
      alert('Failed to delete cache configuration');
    }
  };

  const handleToggleCacheStatus = async (cacheConfig: any) => {
    try {
    const newStatus = cacheConfig.status === 'active' ? 'inactive' : 'active';
    
      console.log('🔄 Toggling cache status:', { 
        id: cacheConfig.id, 
        currentStatus: cacheConfig.status, 
        newStatus: newStatus 
      });
      
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-cache`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { 
            status: newStatus,
            updatedAt: new Date().toISOString()
          },
          key: { id: cacheConfig.id }
        })
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Status update successful:', result);
        alert(`Cache configuration ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        fetchCacheData(); // Refresh the cache data
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Status update failed:', errorData);
        alert(`Failed to update cache configuration: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error updating cache status:', error);
      alert(`Failed to update cache configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCacheTable = async (cacheConfig: any) => {
    try {
      console.log('🔄 Starting cache table operation for:', cacheConfig);
      
      const requestBody = {
        project: cacheConfig.project,
        table: cacheConfig.tableName,
        recordsPerKey: cacheConfig.itemsPerKey || 1,
        ttl: cacheConfig.timeToLive || 3600
      };
      
      console.log('📤 Sending request to /cache/table:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/cache/table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      const responseText = await response.text();
      console.log('📥 Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        alert(`❌ Server returned invalid JSON: ${responseText}`);
        return;
      }

      if (response.ok) {
        console.log('✅ Cache operation successful:', result);
        alert(`✅ Table cached successfully!\n\nRecords scanned: ${result.totalRecords}\nSuccessful writes: ${result.successfulWrites}\nFill rate: ${result.fillRate}\nDuration: ${result.durationMs}ms`);
      } else {
        console.error('❌ Cache operation failed:', result);
        alert(`❌ Failed to cache table: ${result.message || result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Network error caching table:', error);
      alert(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown network error'}`);
    }
  };

  const handleEditCache = (cacheConfig: any) => {
    setEditingCacheConfig(cacheConfig);
    
    // Initialize TTL fields based on existing config
    const ttlSeconds = cacheConfig.timeToLive || 0;
    const ttlType = ttlSeconds === 0 ? 'infinite' : 'finite';
    
    setEditCacheFormData({
      tableName: cacheConfig.tableName || '',
      project: cacheConfig.project || 'my-project',
      timeToLive: ttlSeconds,
      status: cacheConfig.status || 'active',
      itemsPerKey: cacheConfig.itemsPerKey || 100
    });
    
    setEditCacheTTLType(ttlType);
    
    // Only set finite values if TTL is not 0
    if (ttlSeconds > 0) {
      const ttlConverted = convertFromSeconds(ttlSeconds);
      setEditCacheTTLUnit(ttlConverted.unit);
      setEditCacheTTLValue(ttlConverted.value);
    } else {
      // Set default values for infinite case
      setEditCacheTTLUnit('hours');
      setEditCacheTTLValue(1);
    }
    
    setShowEditCacheModal(true);
  };

  const handleUpdateCache = async () => {
    try {
      if (!editingCacheConfig) return;

      const updates = {
        tableName: editCacheFormData.tableName,
        project: editCacheFormData.project,
        timeToLive: editCacheFormData.timeToLive,
        status: editCacheFormData.status,
        itemsPerKey: editCacheFormData.itemsPerKey,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-cache`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          updates: updates,
          key: { id: editingCacheConfig.id }
        })
      });

      if (response.ok) {
        alert('Cache configuration updated successfully!');
        setShowEditCacheModal(false);
        setEditingCacheConfig(null);
        setEditCacheFormData({
          tableName: '',
          project: 'my-project',
          timeToLive: 3600,
          status: 'active',
          itemsPerKey: 100
        });
        fetchCacheData(); // Refresh the cache data
      } else {
        const errorData = await response.json();
        alert(`Failed to update cache configuration: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating cache:', error);
      alert('Failed to update cache configuration');
    }
  };

  // Search indexing functions
  const handleEnableSearch = () => {
    setShowSearchModal(true);
    // Set default table name based on method
    const defaultTableName = editMethod["namespace-method-tableName"] || editMethod["tableName"] || '';
    setSearchFormData(prev => ({ ...prev, table: defaultTableName }));
  };

  const fetchSearchIndices = async () => {
    try {
      setLoadingSearch(true);
      const methodId = editMethod['namespace-method-id'] || method?.['namespace-method-id'];
      
      if (!methodId) {
        console.log('No method ID available for search indices fetch');
        return;
      }

      console.log('Fetching search indices for method ID:', methodId);
      
      // Get the table name for this method
      const tableName = editMethod["namespace-method-tableName"] || editMethod["tableName"] || '';
      const projectName = searchFormData.project;
      
      const response = await fetch(`${API_BASE_URL}/search/indices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectName,
          table: tableName
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search indices data:', data);
        
        if (data.groupedIndices && data.groupedIndices[projectName] && data.groupedIndices[projectName][tableName]) {
          setSearchIndices(data.groupedIndices[projectName][tableName]);
        } else {
          setSearchIndices([]);
        }
      } else {
        console.error('Failed to fetch search indices:', response.status, response.statusText);
        setSearchIndices([]);
      }
    } catch (error) {
      console.error('Error fetching search indices:', error);
      setSearchIndices([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleIndexTable = async () => {
    try {
      setIndexingStatus('Indexing table...');
      
      const response = await fetch(`${API_BASE_URL}/search/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: searchFormData.project,
          table: searchFormData.table,
          customFields: searchFormData.customFields
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Indexing result:', result);
        setIndexingStatus('Indexing completed successfully!');
        alert(`Indexing completed! Index name: ${result.indexName}, Records: ${result.recordCount}`);
        fetchSearchIndices(); // Refresh indices list
        setShowSearchModal(false);
      } else {
        const errorData = await response.json();
        setIndexingStatus(`Indexing failed: ${errorData.error || 'Unknown error'}`);
        alert('Failed to index table');
      }
    } catch (error) {
      console.error('Error indexing table:', error);
      setIndexingStatus('Indexing failed: Network error');
      alert('Failed to index table');
    }
  };

  const handleSearchQuery = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    if (!searchFormData.project || !searchFormData.table) {
      alert(`Missing required parameters for search:
Project: ${searchFormData.project || 'Not set'}
Table: ${searchFormData.table || 'Not set'}

Please select an indexing configuration above.`);
      return;
    }

    try {
      setLoadingSearch(true);
      
      console.log('🔍 Searching with parameters:', {
        project: searchFormData.project,
        table: searchFormData.table,
        query: searchQuery,
        filters: searchFilters,
        hitsPerPage: searchHitsPerPage,
        page: searchPage
      });
      
      const response = await fetch(`${API_BASE_URL}/search/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: searchFormData.project,
          table: searchFormData.table,
          query: searchQuery,
          filters: searchFilters || undefined,
          hitsPerPage: searchHitsPerPage,
          page: searchPage
        })
      });

      console.log('🔍 Search response status:', response.status);
      console.log('🔍 Search response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Search result:', result);
        setSearchResults(result.hits || []);
      } else {
        const errorText = await response.text();
        console.error('❌ Search error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('❌ Search error:', errorData);
        
        if (response.status === 404) {
          alert(`Search failed: No indices found for table "${searchFormData.table}". Please create and execute an indexing configuration first.`);
        } else {
          alert(`Search failed: ${errorData.error || errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error searching:', error);
      alert('Search failed: Network error - ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleDeleteIndices = async () => {
    if (!window.confirm('Are you sure you want to delete old indices? This will keep only the latest one.')) {
      return;
    }

    try {
      setLoadingSearch(true);
      
      const response = await fetch(`${API_BASE_URL}/search/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: searchFormData.project,
          table: searchFormData.table,
          keepLatest: 1
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Delete result:', result);
        alert(`Deleted ${result.deletedCount} indices. Kept: ${result.keptIndices.join(', ')}`);
        fetchSearchIndices(); // Refresh indices list
      } else {
        const errorData = await response.json();
        alert(`Delete failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting indices:', error);
      alert('Delete failed: Network error');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Indexing configuration functions
  const fetchIndexingConfigs = async () => {
    try {
      setLoadingIndexingConfigs(true);
      const methodId = editMethod['namespace-method-id'] || method?.['namespace-method-id'];
      
      if (!methodId) {
        console.log('No method ID available for indexing configs fetch');
        return;
      }

      console.log('🔍 Fetching indexing configs for method ID:', methodId);
      console.log('🔍 Current method object:', method);
      console.log('🔍 Current editMethod object:', editMethod);
      
      // Use the CRUD endpoint to get indexing configurations for this method
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-indexing&pagination=true&itemPerPage=50`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Raw indexing configs data:', data);
        
        if (data.success && data.items) {
          console.log('📋 All indexing configurations found:', data.items);
          
          // Filter indexing configurations for this specific method
          const methodIndexingConfigs = data.items.filter((config: any) => {
            const configMethodId = config.methodId || config['methodId'];
            const matches = configMethodId === methodId;
            console.log(`🔍 Comparing config methodId: "${configMethodId}" with current methodId: "${methodId}" - Match: ${matches}`);
            return matches;
          });
          
          console.log('✅ Filtered indexing configs for method:', methodIndexingConfigs);
          setIndexingConfigs(methodIndexingConfigs);
          
          // Update search form data with the first active configuration
          if (methodIndexingConfigs.length > 0) {
            const activeConfig = methodIndexingConfigs.find((config: any) => config.status === 'active');
            if (activeConfig) {
              console.log('🎯 Found active config, updating search form:', activeConfig);
              setSearchFormData(prev => ({
                ...prev,
                project: activeConfig.project || prev.project,
                table: activeConfig.table || prev.table
              }));
            }
        } else {
            console.log('⚠️ No indexing configurations found for this method ID');
          }
        } else {
          console.log('❌ No data.items found in response');
          setIndexingConfigs([]);
        }
      } else {
        console.error('❌ Failed to fetch indexing configs:', response.status);
        setIndexingConfigs([]);
      }
    } catch (error) {
      console.error('❌ Error fetching indexing configs:', error);
      setIndexingConfigs([]);
    } finally {
      setLoadingIndexingConfigs(false);
    }
  };

  const handleCreateIndexingConfig = async () => {
    try {
      const methodId = editMethod['namespace-method-id'] || method?.['namespace-method-id'];
      
      if (!methodId) {
        alert('No method ID available');
        return;
      }

      const indexingConfig = {
        id: uuidv4(),
        methodId: methodId,
        project: indexingFormData.project,
        table: indexingFormData.table,
        customFields: indexingFormData.customFields,
        description: indexingFormData.description,
        status: indexingFormData.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-indexing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: indexingConfig })
      });

      if (response.ok) {
        alert('Indexing configuration created successfully!');
        setShowCreateIndexingModal(false);
        setIndexingFormData({
          project: 'my-project',
          table: '',
          customFields: [],
          description: '',
          status: 'active'
        });
        fetchIndexingConfigs(); // Refresh the configs
      } else {
        alert('Failed to create indexing configuration');
      }
    } catch (error) {
      console.error('Error creating indexing config:', error);
      alert('Failed to create indexing configuration');
    }
  };

  const handleDeleteIndexingConfig = async (configId: string) => {
    if (!window.confirm('Are you sure you want to delete this indexing configuration?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-indexing`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: configId })
      });

      if (response.ok) {
        alert('Indexing configuration deleted successfully!');
        fetchIndexingConfigs(); // Refresh the configs
      } else {
        alert('Failed to delete indexing configuration');
      }
    } catch (error) {
      console.error('Error deleting indexing config:', error);
      alert('Failed to delete indexing configuration');
    }
  };

  const handleToggleIndexingStatus = async (config: any) => {
    const newStatus = config.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-indexing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: { id: config.id },
          updates: { 
            status: newStatus,
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        alert(`Indexing configuration ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        fetchIndexingConfigs(); // Refresh the configs
      } else {
        alert('Failed to update indexing configuration');
      }
    } catch (error) {
      console.error('Error updating indexing status:', error);
      alert('Failed to update indexing configuration');
    }
  };

  const handleExecuteIndexing = async (config: any) => {
    setSelectedConfigForExecution(config);
    setShowExecuteModal(true);
  };

  const handleConfirmExecuteIndexing = async () => {
    if (!selectedConfigForExecution) return;
    
    try {
      setIndexingStatus('Indexing table...');
      setShowExecuteModal(false);
      
      const response = await fetch(`${API_BASE_URL}/search/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: selectedConfigForExecution.project,
          table: selectedConfigForExecution.table,
          customFields: selectedConfigForExecution.customFields
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Indexing result:', result);
        setIndexingStatus('Indexing completed successfully!');
        alert(`Indexing completed! Index name: ${result.indexName}, Records: ${result.recordCount}`);
        fetchSearchIndices(); // Refresh indices list
      } else {
        const errorData = await response.json();
        setIndexingStatus(`Indexing failed: ${errorData.error || 'Unknown error'}`);
        alert('Failed to index table');
      }
    } catch (error) {
      console.error('Error indexing table:', error);
      setIndexingStatus('Indexing failed: Network error');
      alert('Failed to index table');
    } finally {
      setSelectedConfigForExecution(null);
    }
  };

  const handleIndexingAccountSelect = async (accountId: string) => {
    const account = accounts.find(acc => acc['namespace-account-id'] === accountId);
    setSelectedIndexingAccountId(accountId);
    setSelectedIndexingAccount(account);
    
    if (!accountId || !editMethod['namespace-method-name']) {
      setIndexingTableExists(false);
      return;
    }

    try {
      // Check if table exists for this account and method
      const methodName = editMethod['namespace-method-name'];
      const tableNameMap = account?.tableName || {};
      const tableNameForMethod = tableNameMap[methodName];
      
      if (tableNameForMethod) {
        // Table exists, set the form data
        setIndexingTableExists(true);
        setIndexingFormData(prev => ({
          ...prev,
          project: 'myProject',
          table: tableNameForMethod,
          description: `Indexing for ${methodName}`
        }));
      } else {
        // No table found, but allow manual entry
        setIndexingTableExists(false);
        setIndexingFormData(prev => ({
          ...prev,
          project: 'myProject',
          table: '',
          description: `Indexing for ${methodName}`
        }));
      }
    } catch (error) {
      console.error('Error checking table existence:', error);
      setIndexingTableExists(false);
    }
  };

  // Function to select indexing configuration for search
  const handleSelectIndexingConfigForSearch = (config: any) => {
    setSearchFormData(prev => ({
      ...prev,
      project: config.project || prev.project,
      table: config.table || prev.table
    }));
    console.log('Updated search form data for config:', config);
  };

  // Function to handle search configuration selection via checkbox
  const handleSearchConfigSelection = (configId: string, config: any) => {
    if (selectedConfigForSearch === configId) {
      // Deselect if already selected
      setSelectedConfigForSearch(null);
      setShowSearchInterface(false);
      setSearchFormData(prev => ({ ...prev, project: '', table: '' }));
    } else {
      // Select new configuration
      setSelectedConfigForSearch(configId);
      setShowSearchInterface(true);
      setSearchFormData(prev => ({
        ...prev,
        project: config.project || 'my-project',
        table: config.table || ''
      }));
    }
  };

  // Function to check available indices for the current table
  const checkTableIndices = async () => {
    if (!searchFormData.project || !searchFormData.table) return;
    
    try {
      console.log('🔍 Checking indices for table:', searchFormData.table);
      
      const response = await fetch(`${API_BASE_URL}/search/indices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: searchFormData.project,
          table: searchFormData.table
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Available indices:', result);
        
        if (result.groupedIndices && 
            result.groupedIndices[searchFormData.project] && 
            result.groupedIndices[searchFormData.project][searchFormData.table]) {
          const indices = result.groupedIndices[searchFormData.project][searchFormData.table];
          console.log(`✅ Found ${indices.length} indices for table ${searchFormData.table}`);
        } else {
          console.log(`⚠️ No indices found for table ${searchFormData.table}`);
        }
      } else {
        console.log('❌ Failed to check indices');
      }
    } catch (error) {
      console.error('❌ Error checking indices:', error);
    }
  };

  // Check indices when search interface is opened
  useEffect(() => {
    if (showSearchInterface && searchFormData.table) {
      checkTableIndices();
    }
  }, [showSearchInterface, searchFormData.table]);

  const handleEditIndexingConfig = (config: any) => {
    setEditingIndexingConfig(config);
    setIndexingFormData({
      project: config.project || 'myProject',
      table: config.table || '',
      description: config.description || '',
      customFields: config.customFields || [],
      status: config.status || 'active'
    });
    setShowEditIndexingModal(true);
  };

  const handleUpdateIndexingConfig = async () => {
    if (!editingIndexingConfig?.id) {
      alert('No configuration selected for editing');
      return;
    }

    if (!indexingFormData.project || !indexingFormData.table) {
      alert('Project and table are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-indexing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: { id: editingIndexingConfig.id },
          updates: {
            project: indexingFormData.project,
            table: indexingFormData.table,
            description: indexingFormData.description,
            customFields: indexingFormData.customFields,
            status: indexingFormData.status,
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Indexing configuration updated:', result);
        alert('Indexing configuration updated successfully!');
        setShowEditIndexingModal(false);
        setEditingIndexingConfig(null);
        fetchIndexingConfigs(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update indexing configuration:', errorData);
        alert(`Failed to update configuration: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error updating indexing configuration:', error);
      alert('Failed to update configuration: Network error');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Breadcrumbs */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-1 text-xs text-gray-600">
          <span className="text-gray-400">Namespace</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{namespace?.['namespace-name'] || 'Unknown'}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Method</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-800 font-medium">{editMethod["namespace-method-name"] || 'Details'}</span>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">Method Details</h2>
              </div>
              {/* Action Buttons */}
          <div className="flex gap-2 items-center">
                <button
                  title="Test Method"
              className="w-8 h-8 flex items-center justify-center bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                  onClick={() => {
                    if (onTest) onTest(editMethod, namespace);
                  }}
                >
              <Play size={16} />
                </button>
                <button
                  title="Edit"
              className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  onClick={() => setEditMode(true)}
                >
              <Edit size={16} />
                </button>
                <button
                  title="Delete"
              className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this method?')) {
                      try {
                        const res = await fetch(`${API_BASE_URL}/unified/methods/${editMethod["namespace-method-id"]}`, {
                          method: 'DELETE',
                        });
                        if (!res.ok && res.status !== 204) throw new Error('Failed to delete method');
                        window.location.reload();
                      } catch {
                        alert('Failed to delete method');
                      }
                    }
                  }}
                >
              <Trash2 size={16} />
                </button>
          </div>
              </div>
            </div>

            {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white">
              <button
                onClick={() => setActiveTab('details')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('caching')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'caching'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Caching
              </button>
              <button
                onClick={() => setActiveTab('search')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Search Indexing
              </button>
            </div>

            {/* Tab Content */}
      {!editMode ? (
        <>
            {activeTab === 'details' && (
            <div className="px-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Edit size={14} className="text-blue-400" /> Name</div>
                  <div className="text-sm font-semibold text-gray-900">{editMethod["namespace-method-name"] || ''}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Hash size={14} className="text-purple-400" /> ID</div>
                  <div className="text-xs font-mono text-gray-700">
                    {editMethod["namespace-method-id"] || editMethod["id"] || editMethod["methodId"] || <span className="italic text-gray-400">No ID</span>}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Type size={14} className="text-green-400" /> Type</div>
                  <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">{editMethod["namespace-method-type"] || ''}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Link size={14} className="text-pink-400" /> URL Override</div>
                  <div className="text-xs text-gray-700">{editMethod["namespace-method-url-override"] || <span className="italic text-gray-400">None</span>}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Settings size={14} className="text-blue-400" /> Table Name</div>
                  <div className="text-xs text-gray-700">{editMethod["namespace-method-tableName"] || editMethod["tableName"] || <span className="italic text-gray-400">null</span>}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Tag size={14} className="text-yellow-400" /> Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(editMethod.tags) && editMethod.tags.length > 0 ? (
                      editMethod.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-semibold">{tag}</span>
                      ))
                    ) : (
                      <span className="italic text-gray-400 text-xs">No tags</span>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Settings size={14} className="text-blue-400" /> Query Params</div>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(editMethod["namespace-method-queryParams"]) ? editMethod["namespace-method-queryParams"] : []).length > 0 ? (
                      (editMethod["namespace-method-queryParams"] || []).map((q: any, idx: number) => (
                        <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">{q.key || ''} = {q.value || ''}</span>
                      ))
                    ) : (
                      <span className="italic text-gray-400 text-xs">No query params</span>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                  <div className="flex flex-col">
                    <CheckCircle size={16} className={editMethod['save-data'] ? 'text-green-500' : 'text-gray-300'} />
                    <span className={editMethod['save-data'] ? 'text-green-700 font-semibold text-xs' : 'text-gray-400 text-xs'}>Save Data</span>
                    <span className="text-xs text-gray-500">Table Name: {editMethod["namespace-method-tableName"] || editMethod["tableName"] || <span className="italic text-gray-400">null</span>}</span>
                  </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'caching' && (
              <div className="px-4 py-3 space-y-4">
                {/* Cache Section */}
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-800">Cache Configuration</h3>
                  </div>
                  <button
                    onClick={handleEnableCache}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Enable Caching
                  </button>
                </div>

                {/* Cache Data Display */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700">Configured Cache Data</h4>
                      <button
                        onClick={fetchCacheData}
                        disabled={loadingCache}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {loadingCache ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                  
                  {loadingCache ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
                      <div className="text-xs">Loading cache data...</div>
                    </div>
                  ) : cacheData.length === 0 ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="text-xs">No cache configurations found for this method</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTL</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items/Key</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {cacheData.map((cacheConfig, index) => (
                            <tr key={cacheConfig.id || `cache-${index}`} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-900 font-mono">
                                {cacheConfig.project || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900">
                                {cacheConfig.accountId || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900 font-mono">
                                {cacheConfig.tableName || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900">
                                {cacheConfig.timeToLive === 0 ? (
                                  <span className="text-purple-600 font-medium">Infinite</span>
                                ) : cacheConfig.timeToLive ? (
                                  (() => {
                                    const seconds = cacheConfig.timeToLive;
                                    if (seconds >= 86400) {
                                      const days = Math.floor(seconds / 86400);
                                      const remainingHours = Math.floor((seconds % 86400) / 3600);
                                      return (
                                        <span>
                                          {days}d {remainingHours > 0 ? `${remainingHours}h` : ''}
                                        </span>
                                      );
                                    } else if (seconds >= 3600) {
                                      const hours = Math.floor(seconds / 3600);
                                      const remainingMinutes = Math.floor((seconds % 3600) / 60);
                                      return (
                                        <span>
                                          {hours}h {remainingMinutes > 0 ? `${remainingMinutes}m` : ''}
                                        </span>
                                      );
                                    } else if (seconds >= 60) {
                                      const minutes = Math.floor(seconds / 60);
                                      const remainingSeconds = seconds % 60;
                                      return (
                                        <span>
                                          {minutes}m {remainingSeconds > 0 ? `${remainingSeconds}s` : ''}
                                        </span>
                                      );
                                    } else {
                                      return <span>{seconds}s</span>;
                                    }
                                  })()
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900">
                                {cacheConfig.itemsPerKey || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                  cacheConfig.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {cacheConfig.status || 'unknown'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {cacheConfig.createdAt ? new Date(cacheConfig.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-900">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleCacheTable(cacheConfig)}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded transition-colors"
                                    title="Cache table data to Redis"
                                  >
                                    Cache Table
                                  </button>
                                  <button
                                    onClick={() => handleEditCache(cacheConfig)}
                                    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded transition-colors"
                                    title="Edit cache configuration"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggleCacheStatus(cacheConfig)}
                                    className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                      cacheConfig.status === 'active'
                                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                                    }`}
                                  >
                                    {cacheConfig.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCache(cacheConfig.id)}
                                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="px-4 py-3 space-y-4">
                {/* Search Indexing Section */}
               

                {/* Indexing Configurations Display */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-gray-700">Search Indexing</h4>
                  <button
                    onClick={() => setShowCreateIndexingModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  >
                    Create Indexing Config
                  </button>
                </div>
                  <div className="p-3">
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-xs text-yellow-800">
                        <strong>💡 How to use Search:</strong>
                        <div className="mt-1">
                          • Check the "Search" checkbox next to an indexing configuration to activate the search interface
                        </div>
                        <div className="mt-1">
                          • Only one configuration can be selected for search at a time
                        </div>
                        <div className="mt-1">
                          • The search interface will appear below when you select a configuration
                        </div>
                        <div className="mt-1">
                          • Click on the search interface header to expand/collapse it
                        </div>
                    </div>
                  </div>
                  
                    {/* Indexing Configurations Table */}
                  {loadingIndexingConfigs ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mx-auto mb-1"></div>
                        <div className="text-xs">Loading indexing configurations...</div>
                    </div>
                  ) : indexingConfigs.length === 0 ? (
                      <div className="p-3 text-center text-gray-500">
                        <div className="text-xs">No indexing configurations found for this method</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {indexingConfigs.map((config, index) => (
                              <tr key={config.id || `config-${index}`} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-900">
                                  <input
                                    type="checkbox"
                                    checked={selectedConfigForSearch === (config.id || index.toString())}
                                    onChange={() => handleSearchConfigSelection(config.id || index.toString(), config)}
                                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    title="Select this configuration for search"
                                  />
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-900 font-mono">
                                {config.project || 'N/A'}
                              </td>
                                <td className="px-3 py-2 text-xs text-gray-900 font-mono">
                                {config.table || 'N/A'}
                              </td>
                                <td className="px-3 py-2 text-xs text-gray-900">
                                {config.description || 'No description'}
                              </td>
                                <td className="px-3 py-2 text-xs">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                  config.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {config.status || 'unknown'}
                                </span>
                              </td>
                                <td className="px-3 py-2 text-xs text-gray-500">
                                {config.createdAt ? new Date(config.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                                <td className="px-3 py-2 text-xs text-gray-900">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEditIndexingConfig(config)}
                                      className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded transition-colors"
                                      title="Edit configuration"
                                    >
                                      Edit
                                    </button>
                                  <button
                                    onClick={() => handleExecuteIndexing(config)}
                                    disabled={config.status !== 'active'}
                                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                                  >
                                    Execute
                                  </button>
                                  <button
                                    onClick={() => handleToggleIndexingStatus(config)}
                                      className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                      config.status === 'active'
                                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                                    }`}
                                  >
                                    {config.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteIndexingConfig(config.id)}
                                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  </div>
                </div>

              

                {/* Search Indices Display */}
               

                {/* Search Interface - Collapsible */}
                {selectedConfigForSearch && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div 
                      className="px-4 py-3 bg-blue-50 border-b border-gray-200 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => setShowSearchInterface(!showSearchInterface)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                          <span>🔍 Search Interface</span>
                          {indexingConfigs.find(c => (c.id || c.id === 0) === selectedConfigForSearch) && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {indexingConfigs.find(c => (c.id || c.id === 0) === selectedConfigForSearch)?.project}/{indexingConfigs.find(c => (c.id || c.id === 0) === selectedConfigForSearch)?.table}
                            </span>
                          )}
                        </h4>
                        <span className="text-blue-600 text-sm">
                          {showSearchInterface ? '▼' : '▶'}
                        </span>
                  </div>
                    </div>
                    
                    {showSearchInterface && (
                  <div className="p-4">
                        {/* Compact Search Form */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Search Query</label>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                                placeholder="Enter search query..."
                        />
                      </div>
                            <div className="w-20">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Hits</label>
                        <input
                          type="number"
                          value={searchHitsPerPage}
                          onChange={(e) => setSearchHitsPerPage(parseInt(e.target.value) || 20)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                          min="1"
                          max="100"
                        />
                      </div>
                            <div className="w-16">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Page</label>
                        <input
                          type="number"
                          value={searchPage}
                          onChange={(e) => setSearchPage(parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                          min="0"
                        />
                      </div>
                            <div className="w-40">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Table</label>
                              <input
                                type="text"
                                value={searchFormData.table}
                                onChange={(e) => setSearchFormData(prev => ({ ...prev, table: e.target.value }))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                                placeholder="Table name"
                              />
                    </div>
                            <div className="pt-5">
                    <button
                      onClick={handleSearchQuery}
                      disabled={!searchQuery.trim() || loadingSearch}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingSearch ? (
                                  <div className="flex items-center gap-1">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                    <span>Searching...</span>
                                  </div>
                                ) : (
                                  'Search'
                                )}
                    </button>
                            </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-semibold text-gray-700">
                                  Search Results ({searchResults.length} found)
                                </h5>
                                <button
                                  onClick={() => setSearchResults([])}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Clear
                                </button>
                    </div>
                      </div>
                            <div className="max-h-96 overflow-y-auto">
                      {searchResults.map((result, idx) => (
                                <div key={`result-${idx}`} className="border-b border-gray-100 last:border-b-0">
                                  <div className="p-3 hover:bg-gray-50">
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                                  </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                        {/* No Results Message */}
                        {searchResults.length === 0 && !loadingSearch && (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-sm">No search results yet</div>
                            <div className="text-xs mt-1">Enter a search query and click Search to find results</div>
                      </div>
                        )}
                    </div>
                    )}
                    </div>
                  )}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6 animate-fade-in p-4 md:p-6">
            <div className="flex items-center gap-3 mb-2">
              <Edit size={24} className="text-blue-500" />
              <h2 className="text-xl font-bold text-blue-700 tracking-tight">Edit Method</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                  value={editMethod["namespace-method-name"] || ''}
                  onChange={e => handleInput("namespace-method-name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base bg-gray-100"
                  value={editMethod["namespace-method-id"] || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <input
                  type="text"
                  className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50 placeholder-gray-400"
                  value={editMethod["namespace-method-type"] || ''}
                  onChange={e => handleInput("namespace-method-type", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
                <input
                  type="text"
                  className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
                  value={editMethod["namespace-method-url-override"] || ''}
                  onChange={e => handleInput("namespace-method-url-override", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition outline-none bg-yellow-50 placeholder-gray-400"
                  value={Array.isArray(editMethod.tags) ? editMethod.tags.join(', ') : ''}
                  onChange={e => handleInput('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Query Params</label>
                <div className="space-y-2">
                  {(Array.isArray(editMethod["namespace-method-queryParams"]) ? editMethod["namespace-method-queryParams"] : []).map((q: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        placeholder="Key"
                        value={q.key || ''}
                        onChange={e => handleArrayInput("namespace-method-queryParams", idx, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        placeholder="Value"
                        value={q.value || ''}
                        onChange={e => handleArrayInput("namespace-method-queryParams", idx, 'value', e.target.value)}
                      />
                      <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveArrayItem("namespace-method-queryParams", idx)}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="text-blue-600 text-xs mt-1" onClick={() => handleAddArrayItem("namespace-method-queryParams", { key: '', value: '' })}>+ Add Query Param</button>
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={!!editMethod['save-data']}
                  onChange={e => handleInput('save-data', e.target.checked)}
                  id="save-data-checkbox"
                />
                <label htmlFor="save-data-checkbox" className="text-xs font-medium text-gray-700">Save Data</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="bg-gray-200 text-gray-700 rounded-lg px-6 py-2 font-semibold text-base hover:bg-gray-300 transition"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-2 font-bold text-base shadow-lg hover:from-blue-600 hover:to-purple-600 transition"
              >
                Save
              </button>
            </div>
            {saveMsg && <div className="text-green-600 text-sm mt-2">{saveMsg}</div>}
          </form>
        )}

        {/* Cache Modal */}
        {showCacheModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Enable Caching</h3>
                <button
                  onClick={() => setShowCacheModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Account Selection */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">1. Select Account</h4>
                <div className="mb-2 text-sm text-gray-600">
                  Found {accounts.length} accounts
                </div>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                >
                  <option value="">Select an account...</option>
                  {accounts.map((account, index) => {
                    // Use the correct field names for accounts
                    const accountId = account['namespace-account-id'] || account.id || `account-${index}`;
                    const accountName = account['namespace-account-name'] || account.name || `Account ${index + 1}`;
                    
                    return (
                      <option key={accountId} value={accountId}>
                        {accountName}
                      </option>
                    );
                  })}
                </select>
                {accounts.length === 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    No accounts found. Please check if the namespace has accounts.
                  </div>
                )}
              </div>

              {/* Step 2: Table Check */}
              {selectedAccountId && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">2. Table Status</h4>
                  {tableExists ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800">✓ Table exists for this account and method</p>
                      <p className="text-sm text-green-600 mt-1">Table: {cacheFormData.tableName}</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-yellow-800">⚠ No table found for this account and method</p>
                      <button
                        onClick={() => setShowCreateTableModal(true)}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Create Table
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Cache Configuration */}
              {selectedAccountId && tableExists && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">3. Cache Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                      <input
                        type="text"
                        value={cacheFormData.project}
                        onChange={(e) => setCacheFormData(prev => ({ ...prev, project: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                      <input
                        type="text"
                        value={cacheFormData.tableName}
                        onChange={(e) => setCacheFormData(prev => ({ ...prev, tableName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time to Live</label>
                      <div className="space-y-3">
                        {/* TTL Type Selection */}
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="radio"
                              name="createTTLType"
                              value="finite"
                              checked={cacheTTLType === 'finite'}
                              onChange={(e) => {
                                setCacheTTLType('finite');
                                const newTTL = convertToSeconds(cacheTTLValue, cacheTTLUnit);
                                setCacheFormData(prev => ({ ...prev, timeToLive: newTTL }));
                              }}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">Finite Time</span>
                          </label>
                          <label className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                              type="radio"
                              name="createTTLType"
                              value="infinite"
                              checked={cacheTTLType === 'infinite'}
                              onChange={(e) => {
                                setCacheTTLType('infinite');
                                setCacheFormData(prev => ({ ...prev, timeToLive: 0 }));
                              }}
                              className="mr-2 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">Infinite (No Expiration)</span>
                          </label>
                        </div>
                        
                        {/* Finite TTL Controls */}
                        {cacheTTLType === 'finite' && (
                          <div className="flex gap-3 items-center">
                            <div className="flex-1">
                      <input
                        type="number"
                                value={cacheTTLValue}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  setCacheTTLValue(value);
                                  const newTTL = convertToSeconds(value, cacheTTLUnit);
                                  setCacheFormData(prev => ({ ...prev, timeToLive: newTTL }));
                                }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                min="1"
                                placeholder="Enter value"
                              />
                            </div>
                            <div className="w-32">
                              <select
                                value={cacheTTLUnit}
                                onChange={(e) => {
                                  const unit = e.target.value as 'minutes' | 'hours' | 'days';
                                  setCacheTTLUnit(unit);
                                  const newTTL = convertToSeconds(cacheTTLValue, unit);
                                  setCacheFormData(prev => ({ ...prev, timeToLive: newTTL }));
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                              >
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                              </select>
                            </div>
                          </div>
                        )}
                        
                        {/* Display current TTL in seconds */}
                        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border">
                          <span className="font-medium">Current TTL:</span> {cacheTTLType === 'infinite' 
                            ? 'No expiration (0 seconds)' 
                            : `${cacheFormData.timeToLive.toLocaleString()} seconds`
                          }
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={cacheFormData.status}
                        onChange={(e) => setCacheFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Items per Key</label>
                      <input
                        type="number"
                        value={cacheFormData.itemsPerKey}
                        onChange={(e) => setCacheFormData(prev => ({ ...prev, itemsPerKey: parseInt(e.target.value) || 100 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCacheModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                {selectedAccountId && tableExists && (
                  <button
                    onClick={handleSaveCache}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Save Cache Configuration
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Table Modal */}
        {showCreateTableModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Create Table</h3>
                <button
                  onClick={() => setShowCreateTableModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-3">
                  Create a table for account <strong>{selectedAccount?.['namespace-account-name']}</strong> and method <strong>{methodName}</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  Table name: <code className="bg-gray-100 px-2 py-1 rounded">{resolvedNamespaceName}-{selectedAccount?.['namespace-account-name']}-{methodName}</code>
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateTableModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTable}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Table
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Execute Indexing Confirmation Modal */}
        {showExecuteModal && selectedConfigForExecution && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Execute Indexing</h3>
                <button
                  onClick={() => {
                    setShowExecuteModal(false);
                    setSelectedConfigForExecution(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-800 font-medium">Please review the indexing configuration before proceeding</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
                        {selectedConfigForExecution.project}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono">
                        {selectedConfigForExecution.table}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
                      {selectedConfigForExecution.description || 'No description provided'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields ({selectedConfigForExecution.customFields?.length || 0} fields)</label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {selectedConfigForExecution.customFields && selectedConfigForExecution.customFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedConfigForExecution.customFields.map((field: string, index: number) => (
                            <span key={`field-${index}`} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {field}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No custom fields specified</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedConfigForExecution.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedConfigForExecution.status}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
                        {selectedConfigForExecution.createdAt ? new Date(selectedConfigForExecution.createdAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-blue-800 font-medium">What will happen?</h4>
                    <ul className="text-blue-700 text-sm mt-1 space-y-1">
                      <li>• All data from the specified table will be scanned</li>
                      <li>• Data will be indexed to Algolia with the specified custom fields</li>
                      <li>• A new search index will be created with timestamp</li>
                      <li>• The process may take several minutes depending on data size</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowExecuteModal(false);
                    setSelectedConfigForExecution(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmExecuteIndexing}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Execute Indexing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Indexing Configuration Modal */}
        {showCreateIndexingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Create Indexing Configuration</h3>
                <button
                  onClick={() => setShowCreateIndexingModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Step 1: Account Selection */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">1. Select Account</h4>
                  <div className="mb-2 text-sm text-gray-600">
                    Found {accounts.length} accounts
                  </div>
                  <select
                    value={selectedIndexingAccountId}
                    onChange={(e) => handleIndexingAccountSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                  >
                    <option value="">Select an account...</option>
                    {accounts.map((account, index) => {
                      // Use the correct field names for accounts
                      const accountId = account['namespace-account-id'] || account.id || `account-${index}`;
                      const accountName = account['namespace-account-name'] || account.name || `Account ${index + 1}`;
                      
                      return (
                        <option key={accountId} value={accountId}>
                          {accountName}
                        </option>
                      );
                    })}
                  </select>
                  {accounts.length === 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      No accounts found. Please check if the namespace has accounts.
                    </div>
                  )}
                </div>

                {/* Step 2: Table Status - Only show if account is selected */}
                {selectedIndexingAccountId && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">2. Table Status</h4>
                    {indexingTableExists ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-800">✓ Table exists for this account and method</p>
                        <p className="text-sm text-green-600 mt-1">Table: {indexingFormData.table}</p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-yellow-800">⚠ No table found for this account and method</p>
                        <p className="text-sm text-yellow-600 mt-1">You can still proceed with a custom table name</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Configuration Details - Only show if account is selected and table exists */}
                {selectedIndexingAccountId && indexingTableExists && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">3. Configuration Details</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                          <input
                            type="text"
                            value={indexingFormData.project}
                            onChange={(e) => setIndexingFormData(prev => ({ ...prev, project: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            placeholder="Enter project name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                          <input
                            type="text"
                            value={indexingFormData.table}
                            onChange={(e) => setIndexingFormData(prev => ({ ...prev, table: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                            placeholder="Enter table name"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={indexingFormData.description}
                          onChange={(e) => setIndexingFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                          placeholder="Enter description for this indexing configuration"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields (comma separated)</label>
                        <input
                          type="text"
                          value={indexingFormData.customFields.join(', ')}
                          onChange={(e) => setIndexingFormData(prev => ({ 
                            ...prev, 
                            customFields: e.target.value.split(',').map(field => field.trim()).filter(Boolean)
                          }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                          placeholder="e.g., id, name, order_number, email, phone, financial_status, fulfillment_status, tags, created_at, updated_at, total_price, currency, customer.first_name, customer.last_name, customer.email, customer.phone, customer.default_address.city, customer.default_address.province, customer.default_address.country, billing_address.name, billing_address.city, billing_address.province, billing_address.country, shipping_address.name, shipping_address.city, shipping_address.province, shipping_address.country, line_items.title, line_items.variant_title, line_items.sku, line_items.vendor, line_items.price, fulfillments.tracking_number, fulfillments.tracking_company, fulfillments.shipment_status"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={indexingFormData.status}
                          onChange={(e) => setIndexingFormData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show message when account selected but no table exists */}
                {selectedIndexingAccountId && !indexingTableExists && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-blue-800 font-medium">No table was automatically detected for this account and method. Please create a table first before creating an indexing configuration.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateIndexingModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateIndexingConfig}
                  disabled={!selectedIndexingAccountId || !indexingTableExists || !indexingFormData.project || !indexingFormData.table}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Create Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Indexing Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Search Indexing</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Indexing Configuration */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">1. Indexing Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={searchFormData.project}
                      onChange={(e) => setSearchFormData(prev => ({ ...prev, project: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                    <input
                      type="text"
                      value={searchFormData.table}
                      onChange={(e) => setSearchFormData(prev => ({ ...prev, table: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      placeholder="Enter table name"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields (comma separated)</label>
                    <input
                      type="text"
                      value={searchFormData.customFields.join(', ')}
                      onChange={(e) => setSearchFormData(prev => ({ 
                        ...prev, 
                        customFields: e.target.value.split(',').map(field => field.trim()).filter(Boolean)
                      }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      placeholder="e.g., name, email, description"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleIndexTable}
                    disabled={!searchFormData.project || !searchFormData.table || indexingStatus.includes('Indexing')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {indexingStatus.includes('Indexing') ? 'Indexing...' : 'Index Table'}
                  </button>
                  {indexingStatus && (
                    <p className="mt-2 text-sm text-gray-600">{indexingStatus}</p>
                  )}
                </div>
              </div>

              {/* Search Interface */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">2. Search Interface</h4>
                
                {/* Debug Information */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div><strong>Current Search Configuration:</strong></div>
                    <div>Project: <span className="font-mono">{searchFormData.project || 'Not set'}</span></div>
                    <div>Table: <span className="font-mono">{searchFormData.table || 'Not set'}</span></div>
                    {selectedConfigForSearch && (
                      <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded">
                        <div className="text-green-800">
                          <strong>✓ Selected Configuration:</strong>
                          <div className="font-mono text-xs">
                            {indexingConfigs.find(c => (c.id || c.id === 0) === selectedConfigForSearch)?.project}/{indexingConfigs.find(c => (c.id || c.id === 0) === selectedConfigForSearch)?.table}
                          </div>
                        </div>
                      </div>
                    )}
                    {!searchFormData.table && (
                      <div className="text-red-600 mt-1">
                        ⚠️ Table is not set. Please select an indexing configuration above or manually enter the table name.
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Manual Table Override */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manual Table Override (if auto-detection fails):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchFormData.table}
                      onChange={(e) => setSearchFormData(prev => ({ ...prev, table: e.target.value }))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      placeholder="Enter table name (e.g., shopify-inkhub-get-orders)"
                    />
                    <button
                      onClick={() => setSearchFormData(prev => ({ ...prev, table: 'shopify-inkhub-get-orders' }))}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      Set Example
                    </button>
                  </div>
                </div>
                
                {/* Indexing Configuration Selector */}
                {indexingConfigs.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Indexing Configuration:</label>
                    <div className="space-y-2">
                      {indexingConfigs.map((config, idx) => (
                        <div key={config.id || `search-config-${idx}`} className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelectIndexingConfigForSearch(config)}
                            className={`px-3 py-1 rounded text-sm border ${
                              searchFormData.table === config.table && searchFormData.project === config.project
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {config.project}/{config.table} ({config.status})
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Query</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      placeholder="Enter search query"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filters (optional)</label>
                    <input
                      type="text"
                      value={searchFilters}
                      onChange={(e) => setSearchFilters(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      placeholder="e.g., status:active"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hits per Page</label>
                    <input
                      type="number"
                      value={searchHitsPerPage}
                      onChange={(e) => setSearchHitsPerPage(parseInt(e.target.value) || 20)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page</label>
                    <input
                      type="number"
                      value={searchPage}
                      onChange={(e) => setSearchPage(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                      min="0"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSearchQuery}
                  disabled={!searchQuery.trim() || loadingSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loadingSearch ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">3. Search Results</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="text-sm text-gray-600 mb-2">
                      Found {searchResults.length} results
                    </div>
                    {searchResults.map((result, idx) => (
                      <div key={`search-result-${idx}`} className="bg-white border border-gray-200 rounded p-3 mb-2">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Cache Configuration Modal */}
        {showEditCacheModal && editingCacheConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Edit Cache Configuration</h3>
                <button
                  onClick={() => {
                    setShowEditCacheModal(false);
                    setEditingCacheConfig(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
      </div>

              <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                  <input
                    type="text"
                    value={editCacheFormData.tableName}
                    onChange={(e) => setEditCacheFormData(prev => ({ ...prev, tableName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Enter table name"
                  />
    </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <input
                    type="text"
                    value={editCacheFormData.project}
                    onChange={(e) => setEditCacheFormData(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    placeholder="Enter project name"
                  />
                </div>
               </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time to Live</label>
                    <div className="space-y-3">
                      {/* TTL Type Selection */}
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="radio"
                            name="editTTLType"
                            value="finite"
                            checked={editCacheTTLType === 'finite'}
                            onChange={(e) => {
                              setEditCacheTTLType('finite');
                              const newTTL = convertToSeconds(editCacheTTLValue, editCacheTTLUnit);
                              setEditCacheFormData(prev => ({ ...prev, timeToLive: newTTL }));
                            }}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">Finite Time</span>
                        </label>
                        <label className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="radio"
                            name="editTTLType"
                            value="infinite"
                            checked={editCacheTTLType === 'infinite'}
                            onChange={(e) => {
                              setEditCacheTTLType('infinite');
                              setEditCacheFormData(prev => ({ ...prev, timeToLive: 0 }));
                            }}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">Infinite (No Expiration)</span>
                        </label>
                      </div>
                      
                      {/* Finite TTL Controls */}
                      {editCacheTTLType === 'finite' && (
                        <div className="flex gap-3 items-center">
                          <div className="flex-1">
                            <input
                              type="number"
                              value={editCacheTTLValue}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                setEditCacheTTLValue(value);
                                const newTTL = convertToSeconds(value, editCacheTTLUnit);
                                setEditCacheFormData(prev => ({ ...prev, timeToLive: newTTL }));
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                              min="1"
                              placeholder="Enter value"
                            />
                          </div>
                          <div className="w-32">
                            <select
                              value={editCacheTTLUnit}
                              onChange={(e) => {
                                const unit = e.target.value as 'minutes' | 'hours' | 'days';
                                setEditCacheTTLUnit(unit);
                                const newTTL = convertToSeconds(editCacheTTLValue, unit);
                                setEditCacheFormData(prev => ({ ...prev, timeToLive: newTTL }));
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {/* Display current TTL in seconds */}
                      <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border">
                        <span className="font-medium">Current TTL:</span> {editCacheTTLType === 'infinite' 
                          ? 'No expiration (0 seconds)' 
                          : `${editCacheFormData.timeToLive.toLocaleString()} seconds`
                        }
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Items per Key</label>
                    <input
                      type="number"
                      value={editCacheFormData.itemsPerKey}
                      onChange={(e) => setEditCacheFormData(prev => ({ ...prev, itemsPerKey: parseInt(e.target.value) || 100 }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                      min="1"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editCacheFormData.status}
                    onChange={(e) => setEditCacheFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                </div>

                

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-blue-800 font-medium">Current Configuration</h4>
                      <div className="text-blue-700 text-sm mt-1 space-y-1">
                        <div>• Table: {editingCacheConfig.tableName}</div>
                        <div>• Project: {editingCacheConfig.project}</div>
                        <div>• TTL: {editingCacheConfig.timeToLive}s</div>
                        <div>• Items/Key: {editingCacheConfig.itemsPerKey}</div>
                        <div>• Status: {editingCacheConfig.status}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditCacheModal(false);
                    setEditingCacheConfig(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCache}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Update Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Indexing Configuration Modal */}
        {showEditIndexingModal && editingIndexingConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Edit Indexing Configuration</h3>
                <button
                  onClick={() => {
                    setShowEditIndexingModal(false);
                    setEditingIndexingConfig(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={indexingFormData.project}
                    onChange={(e) => setIndexingFormData(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                    placeholder="Enter project name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                  <input
                    type="text"
                    value={indexingFormData.table}
                    onChange={(e) => setIndexingFormData(prev => ({ ...prev, table: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                    placeholder="Enter table name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={indexingFormData.description}
                    onChange={(e) => setIndexingFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                    placeholder="Enter description for this indexing configuration"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Fields (comma separated)</label>
                  <input
                    type="text"
                    value={indexingFormData.customFields.join(', ')}
                    onChange={(e) => setIndexingFormData(prev => ({ 
                      ...prev, 
                      customFields: e.target.value.split(',').map(field => field.trim()).filter(Boolean)
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                    placeholder="e.g., id, name, order_number, email, phone, financial_status, fulfillment_status, tags, created_at, updated_at, total_price, currency, customer.first_name, customer.last_name, customer.email, customer.phone, customer.default_address.city, customer.default_address.province, customer.default_address.country, billing_address.name, billing_address.city, billing_address.province, billing_address.country, shipping_address.name, shipping_address.city, shipping_address.province, shipping_address.country, line_items.title, line_items.variant_title, line_items.sku, line_items.vendor, line_items.price, fulfillments.tracking_number, fulfillments.tracking_company, fulfillments.shipment_status"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={indexingFormData.status}
                    onChange={(e) => setIndexingFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:border-green-400"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditIndexingModal(false);
                    setEditingIndexingConfig(null);
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateIndexingConfig}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Update Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
   
  );
} 