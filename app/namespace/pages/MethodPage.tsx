import React, { useState, useEffect } from 'react';
import { Edit3, Hash, Type, Link2, Tag, Sliders, CheckCircle, Database, Clock } from 'lucide-react';
import MethodTestModal from '@/app/components/MethodTestModal';
import { v4 as uuidv4 } from 'uuid';

type Method = { id: string; name: string };
type Props = { onSelect?: (m: Method) => void; method?: any; namespace?: any; onTest?: (method: any, namespace: any) => void };
const API_BASE_URL = 'http://localhost:5001';
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

export default function MethodPage({ onSelect, method, namespace, onTest }: Props) {
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
  const [resolvedNamespaceName, setResolvedNamespaceName] = useState('');
  const [methodName, setMethodName] = useState('');
  const [cacheData, setCacheData] = useState<any[]>([]);
  const [loadingCache, setLoadingCache] = useState(false);

  useEffect(() => {
    if (method) {
      console.log('Method data from backend:', method);
      setEditMethod({ ...method, ...(method.data || {}) });
      
      // Fetch accounts and resolve namespace name
      fetchAccounts();
      resolveNamespaceName();
      resolveMethodName();
      fetchCacheData(); // Fetch cache data for this method
    }
  }, [method]);

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
    const newStatus = cacheConfig.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`${API_BASE_URL}/crud?tableName=brmh-cache`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: { id: cacheConfig.id },
          updates: { 
            status: newStatus,
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        alert(`Cache configuration ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        fetchCacheData(); // Refresh the cache data
      } else {
        alert('Failed to update cache configuration');
      }
    } catch (error) {
      console.error('Error updating cache status:', error);
      alert('Failed to update cache configuration');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-gradient-to-br flex flex-col h-full p-0 m-0">
      <div className="bg-white p-8 flex flex-col gap-6 w-full h-full m-0">
        {!editMode ? (
          <>
            <div className="flex items-center gap-3 mb-2 justify-between">
              <div className="flex items-center gap-3">
                <Sliders className="text-blue-500" size={28} />
                <h2 className="text-2xl font-bold text-blue-700 tracking-tight">Method Details</h2>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 items-center">
                <button
                  title="Test Method"
                  className="w-10 h-10 flex items-center justify-center bg-green-100 hover:bg-green-200 text-green-700 shadow transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                  onClick={() => {
                    if (onTest) onTest(editMethod, namespace);
                  }}
                >
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button
                  title="Edit"
                  className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                  onClick={() => setEditMode(true)}
                >
                  <svg width="23" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-2"><path d="M17 3a2.828 2.828 0 0 1 4 4L7 21H3v-4L17 3z"></path></svg>
                </button>
                <button
                  title="Delete"
                  className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white shadow transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this method?')) {
                      try {
                        const res = await fetch(`http://localhost:5001/unified/methods/${editMethod["namespace-method-id"]}`, {
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
                  <svg width="24" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Edit3 size={16} className="text-blue-400" /> Name</div>
                <div className="text-lg font-semibold text-gray-900">{editMethod["namespace-method-name"] || ''}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Hash size={16} className="text-purple-400" /> ID</div>
                <div className="text-base font-mono text-gray-700">
                  {editMethod["namespace-method-id"] || editMethod["id"] || editMethod["methodId"] || <span className="italic text-gray-400">No ID</span>}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Type size={16} className="text-green-400" /> Type</div>
                <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm font-bold shadow-sm">{editMethod["namespace-method-type"] || ''}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Link2 size={16} className="text-pink-400" /> URL Override</div>
                <div className="text-base text-gray-700">{editMethod["namespace-method-url-override"] || <span className="italic text-gray-400">None</span>}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Sliders size={16} className="text-blue-400" /> Table Name</div>
                <div className="text-base text-gray-700">{editMethod["namespace-method-tableName"] || editMethod["tableName"] || <span className="italic text-gray-400">null</span>}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Tag size={16} className="text-yellow-400" /> Tags</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(editMethod.tags) && editMethod.tags.length > 0 ? (
                    editMethod.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow">{tag}</span>
                    ))
                  ) : (
                    <span className="italic text-gray-400">No tags</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Sliders size={16} className="text-blue-400" /> Query Params</div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(editMethod["namespace-method-queryParams"]) ? editMethod["namespace-method-queryParams"] : []).length > 0 ? (
                    (editMethod["namespace-method-queryParams"] || []).map((q: any, idx: number) => (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono shadow-sm">{q.key || ''} = {q.value || ''}</span>
                    ))
                  ) : (
                    <span className="italic text-gray-400">No query params</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                <div className="flex flex-col">
                  <CheckCircle size={18} className={editMethod['save-data'] ? 'text-green-500' : 'text-gray-300'} />
                  <span className={editMethod['save-data'] ? 'text-green-700 font-semibold' : 'text-gray-400'}>Save Data</span>
                  <span className="text-xs text-gray-500 mt-1">Table Name: {editMethod["namespace-method-tableName"] || editMethod["tableName"] || <span className="italic text-gray-400">null</span>}</span>
                </div>
              </div>
              
              {/* Cache Section */}
              <div className=" flex  justify-between items-center sm:col-span-2 mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={20} className="text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-800">Cache Configuration</h3>
                </div>
                <button
                  onClick={handleEnableCache}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Enable Caching
                </button>
              </div>

              {/* Cache Data Display */}
              <div className="sm:col-span-2 mt-4">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Configured Cache Data</h4>
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
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      Loading cache data...
                    </div>
                  ) : cacheData.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No cache configurations found for this method
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items/Key</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {cacheData.map((cacheConfig, index) => (
                            <tr key={cacheConfig.id || index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                {cacheConfig.project || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {cacheConfig.accountId || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                {cacheConfig.tableName || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {cacheConfig.timeToLive ? `${cacheConfig.timeToLive}s` : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {cacheConfig.itemsPerKey || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  cacheConfig.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {cacheConfig.status || 'unknown'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {cacheConfig.createdAt ? new Date(cacheConfig.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleCacheStatus(cacheConfig)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${
                                      cacheConfig.status === 'active'
                                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                                        : 'bg-green-100 hover:bg-green-200 text-green-700'
                                    }`}
                                  >
                                    {cacheConfig.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCache(cacheConfig.id)}
                                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
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
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Edit3 className="text-blue-500" size={24} />
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time to Live (seconds)</label>
                      <input
                        type="number"
                        value={cacheFormData.timeToLive}
                        onChange={(e) => setCacheFormData(prev => ({ ...prev, timeToLive: parseInt(e.target.value) || 3600 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        min="60"
                      />
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
      </div>
    </div>
  );
} 