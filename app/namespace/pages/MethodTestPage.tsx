import { useEffect, useState } from 'react';
import { Send, RefreshCw, Copy, Download, Check, ChevronDown, Save, ChevronRight, Home, ChevronRight as ChevronRightIcon, Play, Edit, Trash2, Hash, Type, Link, Tag, Settings, CheckCircle, Database, Search, FileText, User, Calendar, Globe, Code, Zap, Shield, Activity, BarChart3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { schemaToFields, NestedFieldsEditor } from '@/app/namespace/components/SchemaService';

interface AccountHeader {
  key: string;
  value: string;
}

interface Account {
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-id': string;
  'namespace-account-header': AccountHeader[];
  'namespace-account-url-override': string;
  'save-data': boolean;
  tableName?: Record<string, string>;
}

interface KeyValuePair {
  key: string;
  value: string;
}

interface Response {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  executionId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// Recursive component for collapsible JSON display
const CollapsibleJson = ({ data, level = 0, collapsedPaths = new Set(), onToggle }: { 
  data: any, 
  level?: number, 
  collapsedPaths?: Set<string>, 
  onToggle?: (path: string) => void 
}) => {
  const indent = '  '.repeat(level);
  
  if (typeof data === 'object' && data !== null) {
    const isArray = Array.isArray(data);
    const items = isArray ? data : Object.entries(data);
    const path = level === 0 ? 'root' : `level-${level}`;
    const isCollapsed = collapsedPaths.has(path);
    
    return (
      <div>
        <div className="flex items-center">
          <button
            onClick={() => onToggle?.(path)}
            className="mr-1 text-gray-400 hover:text-gray-300 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <span className="text-gray-300">
            {isArray ? '[' : '{'}
          </span>
          {isCollapsed && (
            <span className="text-gray-500 ml-1">
              {isArray ? `${items.length} items` : `${items.length} properties`}
            </span>
          )}
          {!isCollapsed && (
            <span className="text-gray-300">
              {isArray ? ']' : '}'}
            </span>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="ml-4">
            {isArray ? (
              items.map((item: any, index: number) => (
                <div key={index}>
                  <span className="text-gray-500">{indent}</span>
                  {typeof item === 'object' && item !== null ? (
                    <CollapsibleJson 
                      data={item} 
                      level={level + 1} 
                      collapsedPaths={collapsedPaths}
                      onToggle={onToggle}
                    />
                  ) : (
                    <span>
                      {typeof item === 'string' ? (
                        <span className="text-green-400">"{item}"</span>
                      ) : typeof item === 'number' ? (
                        <span className="text-yellow-400">{item}</span>
                      ) : (
                        <span className="text-purple-400">{String(item)}</span>
                      )}
                    </span>
                  )}
                  {index < items.length - 1 && <span className="text-gray-300">,</span>}
                </div>
              ))
            ) : (
              items.map(([key, value]: [string, any], index: number) => (
                <div key={key}>
                  <span className="text-gray-500">{indent}</span>
                  <span className="text-blue-400">"{key}"</span>
                  <span className="text-gray-300">: </span>
                  {typeof value === 'object' && value !== null ? (
                    <CollapsibleJson 
                      data={value} 
                      level={level + 1} 
                      collapsedPaths={collapsedPaths}
                      onToggle={onToggle}
                    />
                  ) : (
                    <span>
                      {typeof value === 'string' ? (
                        <span className="text-green-400">"{value}"</span>
                      ) : typeof value === 'number' ? (
                        <span className="text-yellow-400">{value}</span>
                      ) : (
                        <span className="text-purple-400">{String(value)}</span>
                      )}
                    </span>
                  )}
                  {index < items.length - 1 && <span className="text-gray-300">,</span>}
                </div>
              ))
            )}
            <div>
              <span className="text-gray-500">{indent}</span>
              <span className="text-gray-300">
                {isArray ? ']' : '}'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <span>
      {typeof data === 'string' ? (
        <span className="text-green-400">"{data}"</span>
      ) : typeof data === 'number' ? (
        <span className="text-yellow-400">{data}</span>
      ) : (
        <span className="text-purple-400">{String(data)}</span>
      )}
    </span>
  );
};

export default function MethodTestPage({ method, namespace, onOpenSchemaTab }: { method: any, namespace: any, onOpenSchemaTab?: (schema: any, schemaName: string) => void }) {
  const namespaceId = namespace?.['namespace-id'] || '';
  const methodName = method?.['namespace-method-name'] || '';
  const methodType = method?.['namespace-method-type'] || '';
  const namespaceMethodUrlOverride = method?.['namespace-method-url-override'] || '';
  const saveData = !!method?.['save-data'];
  const methodId = method?.['namespace-method-id'] || '';
  const tableName = method?.['namespace-method-tableName'] || method?.['tableName'] || '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('');
  const [namespaceName, setNamespaceName] = useState<string>('');
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [headers, setHeaders] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [maxIterations, setMaxIterations] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');
  const [responseTab, setResponseTab] = useState<'pretty' | 'raw' | 'preview' | 'visualize'>('pretty');
  const [requestBody, setRequestBody] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeButton, setActiveButton] = useState<'send' | 'loop' | 'sync' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [responseSchema, setResponseSchema] = useState<Record<string, unknown> | null>(null);
  const [schemaTabValue, setSchemaTabValue] = useState<Record<string, unknown> | null>(null);
  const [isSavingSchema, setIsSavingSchema] = useState(false);
  const [responseData, setResponseData] = useState<unknown | null>(null);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);
  const [schemaNameInput, setSchemaNameInput] = useState<string>(methodName);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaName, setSchemaName] = useState(methodName);
  const [jsonSchema, setJsonSchema] = useState(JSON.stringify(schemaTabValue, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncFormData, setSyncFormData] = useState({
    tableName: '',
    url: '',
    headers: {},
    idField: 'id',
    stopOnExisting: false,
    nextPageIn: 'header',
    nextPageField: 'link',
    isAbsoluteUrl: true,
    maxPages: 200,
    tokenParam: ''
  });
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  
  const [showResponse, setShowResponse] = useState(false);
  const [showValidate, setShowValidate] = useState(false);
  


  const handleToggleCollapse = (path: string) => {
    const newCollapsedPaths = new Set(collapsedPaths);
    if (newCollapsedPaths.has(path)) {
      newCollapsedPaths.delete(path);
    } else {
      newCollapsedPaths.add(path);
    }
    setCollapsedPaths(newCollapsedPaths);
  };

  useEffect(() => {
    const fetchNamespaceDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch namespace details: ${response.status}`);
        }
        const data = await response.json();
        setNamespaceName(data['namespace-name'] || '');
      } catch (err) {
        console.error('Error fetching namespace details:', err);
      }
    };
    if (namespaceId) {
      fetchNamespaceDetails();
    }
  }, [namespaceId]);

  useEffect(() => {
    let mounted = true;
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts`);
        if (!response.ok || !mounted) return;
        const data = await response.json();
        if (mounted) {
          setAccounts(data || []);
          if (data && data.length > 0) {
            const firstAccount = data[0];
            setSelectedAccount(firstAccount);
            const baseUrl = firstAccount['namespace-account-url-override'] || '';
            const methodUrl = namespaceMethodUrlOverride || '';
            const finalUrl = baseUrl && methodUrl 
              ? baseUrl.endsWith('/') && methodUrl.startsWith('/')
                ? baseUrl + methodUrl.slice(1)
                : !baseUrl.endsWith('/') && !methodUrl.startsWith('/')
                ? baseUrl + '/' + methodUrl
                : baseUrl + methodUrl
              : baseUrl + methodUrl;
            setUrl(finalUrl);
            if (firstAccount['namespace-account-header'] && firstAccount['namespace-account-header'].length > 0) {
              const accountHeaders = firstAccount['namespace-account-header'].map((header: AccountHeader) => ({
                key: header.key,
                value: header.value
              }));
              setHeaders([...accountHeaders, { key: '', value: '' }]);
            }
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching accounts:', err);
          setError('Network error when fetching accounts');
        }
      }
    };
    if (namespaceId) fetchAccounts();
    return () => { mounted = false; };
  }, [namespaceId, namespaceMethodUrlOverride]);

  useEffect(() => {
    // Load default query params from method if available
    if (method && Array.isArray(method['namespace-method-queryParams'])) {
      const defaultParams = method['namespace-method-queryParams'].map((param: any) => ({
        key: param.key || '',
        value: param.value || ''
      }));
      setQueryParams(defaultParams.length > 0 ? defaultParams : [{ key: '', value: '' }]);
    }
  }, [method]);

  const executeTest = async (isPaginated: boolean = false, isSync: boolean = false) => {
    if (!selectedAccount || isSubmitting || loading) return;
    const controller = new AbortController();
    const signal = controller.signal;
    try {
      setIsSubmitting(true);
      setError(null);
      setLoading(true);
      setResponse(null);
      setActiveButton(isSync ? 'sync' : isPaginated ? 'loop' : 'send');

      // Dynamically get tableName from selectedAccount.tableName[methodName]
      let dynamicTableName = '';
      if (saveData && selectedAccount && selectedAccount.tableName && methodName) {
        dynamicTableName = selectedAccount.tableName[methodName] || '';
      }

      // Use the base URL without query parameters
      let urlWithParams = url;

      const endpoint = isPaginated
        ? `${API_BASE_URL}/unified/execute/paginated`
        : `${API_BASE_URL}/unified/execute`;

      const formHeaders = Object.fromEntries(
        headers.filter(h => h.key && h.key.trim() !== '').map(h => [h.key.trim(), h.value])
      );

      const requestData = {
        method: methodType,
        url: urlWithParams,
        namespaceAccountId: selectedAccount['namespace-account-id'],
        queryParams: Object.fromEntries(
          queryParams.filter(p => p.key && p.key.trim() !== '').map(p => [p.key.trim(), p.value])
        ),
        headers: formHeaders,
        ...(isPaginated ? { 
          ...(maxIterations ? { maxIterations: parseInt(maxIterations) } : {}),
          paginationType: 'link',
          paginationConfig: {
            limitParam: 'limit',
            pageParam: 'page_info',
            defaultLimit: '50'
          }
        } : {}),
        ...(activeTab === 'body' && requestBody ? { body: tryParseJSON(requestBody) } : {}),
        ...(saveData && dynamicTableName ? {
          tableName: dynamicTableName,
          saveData: true,
          schemaId: method?.['schemaId'] || null
        } : {
          saveData: false
        })
      };
      // Log the complete request body
      console.log('=== METHOD TEST REQUEST BODY ===');
      console.log('Endpoint:', endpoint);
      console.log('Request Data:', JSON.stringify(requestData, null, 2));
      console.log('Selected Account:', selectedAccount);
      console.log('Method Name:', methodName);
      console.log('Dynamic Table Name:', dynamicTableName);
      console.log('Is Paginated:', isPaginated);
      console.log('URL with Params:', urlWithParams);
      console.log('Headers:', formHeaders);
      console.log('Query Params:', Object.fromEntries(
        queryParams.filter(p => p.key && p.key.trim() !== '').map(p => [p.key.trim(), p.value])
      ));
      if (activeTab === 'body' && requestBody) {
        console.log('Request Body:', requestBody);
      }
      console.log('=== END REQUEST BODY ===');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal
      });
      if (signal.aborted) return;
      const responseHeaders = Object.fromEntries(response.headers.entries());
      const data = await response.json();
      const responseObj: Response = {
        success: response.ok,
        data: data.data || data,
        error: data.error,
        status: response.status,
        headers: responseHeaders,
        body: data,
        executionId: data.executionId || data.data?.executionId
      };
      if (!signal.aborted) {
        setResponse(responseObj);
        if (!response.ok) setError(data.error || `Request failed with status ${response.status}`);
        if (responseObj.executionId) localStorage.setItem('currentExecutionId', responseObj.executionId);
        setResponseTab('pretty');
        setResponseData(response.body);
        setResponseSchema(generateResponseSchema(response.body));
        
        // Show response and validate panels after successful request
        setShowResponse(true);
        setShowValidate(true);
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error('Error executing test:', err);
        setError(err instanceof Error ? err.message : 'Network error during test execution');
      }
    } finally {
      if (!signal.aborted) {
        setTimeout(() => {
          setLoading(false);
          setActiveButton(null);
          setIsSubmitting(false);
        }, 300);
      }
    }
    return () => { controller.abort(); };
  };

  const tryParseJSON = (text: string) => {
    try { return JSON.parse(text); } catch { return text; }
  };

  const generateResponseSchema = (data: unknown): Record<string, unknown> => {
    if (data === null) return { type: 'null' };
    if (Array.isArray(data)) {
      const items = data.length > 0 ? generateResponseSchema(data[0]) : {};
      return { type: 'array', items };
    }
    if (typeof data === 'object' && data !== null) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
        properties[key] = generateResponseSchema(value);
        if (value !== null && value !== undefined) required.push(key);
      });
      return { type: 'object', properties, required };
    }
    return { type: typeof data };
  };

  const handleCopyResponse = () => {
    if (!response) return;
    let contentToCopy = '';
    switch (responseTab) {
      case 'pretty': contentToCopy = JSON.stringify(response.body, null, 2); break;
      case 'raw': contentToCopy = JSON.stringify(response.body); break;
      case 'preview': contentToCopy = JSON.stringify(response.body, null, 2); break;
      case 'visualize': contentToCopy = JSON.stringify(response.body, null, 2); break;
    }
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadResponse = () => {
    if (!response) return;
    let contentToDownload = '';
    let fileName = '';
    switch (responseTab) {
      case 'pretty': contentToDownload = JSON.stringify(response.body, null, 2); fileName = 'response-pretty.json'; break;
      case 'raw': contentToDownload = JSON.stringify(response.body); fileName = 'response-raw.json'; break;
      case 'preview': contentToDownload = JSON.stringify(response.body, null, 2); fileName = 'response-preview.json'; break;
      case 'visualize': contentToDownload = JSON.stringify(response.body, null, 2); fileName = 'response-visualize.json'; break;
    }
    const blob = new Blob([contentToDownload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveSchema = () => {
    if (!response || !response.body) {
      toast.error('No response data available to save as schema');
      return;
    }
    // Generic: find the first array field in the response body (regardless of name)
    const body = (response.body as any)?.body || response.body;
    let arrayField: any[] | null = null;
    let arrayFieldName: string | null = null;
    if (body && typeof body === 'object') {
      for (const key in body) {
        if (Array.isArray(body[key])) {
          arrayField = body[key];
          arrayFieldName = key;
          break;
        }
      }
    }
    if (!arrayField || arrayField.length === 0) {
      toast.error('No array field found in response to generate schema');
      return;
    }
    const generatedSchema = generateResponseSchema(arrayField[0]);
    if (onOpenSchemaTab) {
      onOpenSchemaTab(generatedSchema, methodName);
    }
    toast.success(`Schema generated for array field: ${arrayFieldName}`);
  };

  const handleSync = async () => {
    if (!selectedAccount || isSubmitting || loading) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      setLoading(true);
      setResponse(null);
      setActiveButton('sync');

      const requestData = {
        method: 'GET', // Default method for sync
        url: syncFormData.url,
        queryParams: {},
        headers: syncFormData.headers,
        tableName: syncFormData.tableName,
        saveData: true,
        paginationType: 'sync', // This tells backend to use lambda
        // Sync-specific parameters
        idField: syncFormData.idField,
        stopOnExisting: syncFormData.stopOnExisting,
        nextPageIn: syncFormData.nextPageIn,
        nextPageField: syncFormData.nextPageField,
        isAbsoluteUrl: syncFormData.isAbsoluteUrl,
        maxPages: syncFormData.maxPages,
        ...(syncFormData.tokenParam && { tokenParam: syncFormData.tokenParam })
      };

      console.log('=== SYNC REQUEST ===');
      console.log('Request Data:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`${API_BASE_URL}/unified/execute/paginated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      const responseObj: Response = {
        success: response.ok,
        data: data.data || data,
        error: data.error,
        status: response.status,
        headers: {},
        body: data
      };

      setResponse(responseObj);
      if (!response.ok) setError(data.error || `Request failed with status ${response.status}`);
      setResponseTab('pretty');
      setResponseData(response.body);
      setShowSyncModal(false);

    } catch (err) {
      console.error('Error executing sync:', err);
      setError(err instanceof Error ? err.message : 'Network error during sync execution');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setActiveButton(null);
        setIsSubmitting(false);
      }, 300);
    }
  };

  const handleSchemaModalSave = async (finalSchemaName: string, finalJsonSchema: string) => {
    try {
      setIsSavingSchema(true);
      const apiResponse = await fetch(`${API_BASE_URL}/unified/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId,
          schemaName: finalSchemaName,
          methodName,
          namespaceId,
          schemaType: 'response',
          schema: JSON.parse(finalJsonSchema),
          isArray: Array.isArray(responseData),
          originalType: Array.isArray(responseData) ? 'array' : 'object',
          url: namespaceMethodUrlOverride
        }),
      });
      if (!apiResponse.ok) throw new Error('Failed to save schema');
      const result = await apiResponse.json();
      toast.success('Schema saved successfully');
      setShowSchemaModal(false);
      if (result.schemaId) {
        const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`);
        const nsData = await nsRes.json();
        const currentSchemaIds = Array.isArray(nsData.schemaIds) ? nsData.schemaIds : [];
        const updatedSchemaIds = [...currentSchemaIds, result.schemaId];
        await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...nsData, schemaIds: updatedSchemaIds }),
        });
        toast.success('Namespace updated with schemaIds');
      }
      if (result.schemaId && methodId) {
        const methodRes = await fetch(`${API_BASE_URL}/unified/methods/${methodId}`);
        const methodDataRaw = await methodRes.json();
        const methodData = methodDataRaw.data ? methodDataRaw.data : methodDataRaw;
        const methodUpdatePayload = {
          "namespace-method-name": methodData["namespace-method-name"] || "unknown",
          "namespace-method-type": methodData["namespace-method-type"] || "GET",
          "namespace-method-url-override": methodData["namespace-method-url-override"] || "",
          "namespace-method-queryParams": methodData["namespace-method-queryParams"] || [],
          "namespace-method-header": methodData["namespace-method-header"] || [],
          "save-data": methodData["save-data"] || false,
          "isInitialized": methodData["isInitialized"] || false,
          "tags": methodData["tags"] || [],
          "schemaId": result.schemaId
        };
        Object.keys(methodUpdatePayload as any).forEach(
          key => ((methodUpdatePayload as any)[key] == null) && delete (methodUpdatePayload as any)[key]
        );
        await fetch(`${API_BASE_URL}/unified/methods/${methodId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(methodUpdatePayload),
        });
        toast.success('Method updated with schemaId');
      }
    } catch (error) {
      console.error('Error saving schema:', error);
      toast.error('Failed to save schema');
    } finally {
      setIsSavingSchema(false);
    }
  };

  useEffect(() => {
    if (response && response.body) {
      const generated = generateResponseSchema(response.body);
      setSchemaTabValue(generated);
    }
  }, [response]);

  // Add missing handlers for params/headers
  const handleAddKeyValuePair = (type: 'queryParams' | 'headers') => {
    if (type === 'queryParams') {
      setQueryParams([...queryParams, { key: '', value: '' }]);
    } else {
      setHeaders([...headers, { key: '', value: '' }]);
    }
  };

  const handleRemoveKeyValuePair = (index: number, type: 'queryParams' | 'headers') => {
    if (type === 'queryParams') {
      setQueryParams(queryParams.filter((_, i) => i !== index));
    } else {
      setHeaders(headers.filter((_, i) => i !== index));
    }
  };

  const handleKeyValueChange = (
    index: number,
    field: 'key' | 'value',
    value: string,
    type: 'queryParams' | 'headers'
  ) => {
    if (type === 'queryParams') {
      const newParams = [...queryParams];
      newParams[index][field] = value;
      setQueryParams(newParams);
    } else {
      const newHeaders = [...headers];
      newHeaders[index][field] = value;
      setHeaders(newHeaders);
    }
  };

  // --- PAGE LAYOUT ---
  // Build query string from queryParams for display
  const filteredParams = queryParams.filter(p => p.key && p.key.trim() !== '');
  let urlWithParams = url;
  if (filteredParams.length > 0) {
    const searchParams = new URLSearchParams();
    filteredParams.forEach(param => searchParams.append(param.key, param.value));
    urlWithParams += (urlWithParams.includes('?') ? '&' : '?') + searchParams.toString();
  }
  return (
    <div className="w-full h-full bg-white">
      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center space-x-1 text-xs text-gray-600">
          <Home className="h-3 w-3" />
          <ChevronRight className="h-3 w-3" />
          <span className="hover:text-blue-600 cursor-pointer">Namespaces</span>
          <ChevronRight className="h-3 w-3" />
          <span className="hover:text-blue-600 cursor-pointer">{namespaceName}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 font-medium">{methodName}</span>
        </div>
      </div>

      {/* Layout Container */}
      <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Request Panel */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4" style={{ maxHeight: '500px' }}>
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">API Request</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">GET Find pet by ID</span>
                <button className="text-xs text-gray-400 hover:text-gray-600">+</button>
                <button className="text-xs text-gray-400 hover:text-gray-600">...</button>
              </div>
            </div>
          </div>
          
          <div className="p-3">
            {/* API Method and URL Section */}
            <div className="flex items-end space-x-1 mb-2">
              <div className="relative">
                <button className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                  <span>{methodType}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <input
                type="text"
                value={urlWithParams}
                onChange={e => setUrl(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter URL"
              />
              <div className="w-28">
                <div className="relative">
                  <select
                    value={selectedAccount?.['namespace-account-id'] || ''}
                    onChange={e => {
                      const accountId = e.target.value;
                      const account = accounts.find(a => a['namespace-account-id'] === accountId);
                      setSelectedAccount(account || null);
                      if (account) {
                        const baseUrl = account['namespace-account-url-override'] || '';
                        const methodUrl = namespaceMethodUrlOverride || '';
                        const finalUrl = baseUrl && methodUrl 
                          ? baseUrl.endsWith('/') && methodUrl.startsWith('/')
                            ? baseUrl + methodUrl.slice(1)
                            : !baseUrl.endsWith('/') && !methodUrl.startsWith('/')
                            ? baseUrl + '/' + methodUrl
                            : baseUrl + methodUrl
                          : baseUrl + methodUrl;
                        setUrl(finalUrl);
                        if (account['namespace-account-header'] && account['namespace-account-header'].length > 0) {
                          const accountHeaders = account['namespace-account-header'].map((header: AccountHeader) => ({
                            key: header.key,
                            value: header.value
                          }));
                          setHeaders([...accountHeaders, { key: '', value: '' }]);
                        }
                      }
                    }}
                    className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded shadow-sm appearance-none cursor-pointer pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Account</option>
                    {accounts.map(account => (
                      <option key={account['namespace-account-id']} value={account['namespace-account-id']}>
                        {account['namespace-account-name']}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1">
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="w-16">
                <input
                  type="number"
                  value={maxIterations}
                  onChange={e => setMaxIterations(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Max iterations"
                />
              </div>
            </div>

            {error && (
              <div className="mb-2 py-1 px-2 bg-red-50 text-[#E11D48] text-xs rounded border border-red-100">
                {error}
              </div>
            )}

            {/* Request Configuration Sub-Tabs */}
            <div className="border-b border-gray-200 mb-2">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('params')}
                  className={`px-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'params' 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Params {queryParams.filter(p => p.key && p.key.trim() !== '').length > 0 && (
                    <span className="ml-1 bg-purple-100 text-purple-700 px-1 rounded text-xs">
                      {queryParams.filter(p => p.key && p.key.trim() !== '').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('body')}
                  className={`px-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'body' 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Body
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-1 py-1.5 text-xs font-medium border-b-2 transition-colors relative ${
                    activeTab === 'headers' 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Headers
                  {headers.filter(h => h.key && h.key.trim() !== '').length > 0 && (
                    <span className="absolute -top-0.5 -right-1 bg-green-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                      {headers.filter(h => h.key && h.key.trim() !== '').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Request Configuration Content */}
            <div className="space-y-1">
              {activeTab === 'params' && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Query Params</div>
                  <div className="border border-gray-200 rounded">
                    <div className="grid grid-cols-5 gap-2 px-2 py-1 bg-gray-50 text-xs font-medium text-gray-700 border-b border-gray-200">
                      <div>Name</div>
                      <div>Value</div>
                      <div>Type</div>
                      <div>Description</div>
                    </div>
                                          <div className="p-2">
                        {queryParams.map((param, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 mb-1 items-center">
                          <input
                            type="text"
                            value={param.key}
                            onChange={e => handleKeyValueChange(index, 'key', e.target.value, 'queryParams')}
                            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Add a new param"
                          />
                          <input
                            type="text"
                            value={param.value}
                            onChange={e => handleKeyValueChange(index, 'value', e.target.value, 'queryParams')}
                            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Value"
                          />
                          <select className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                          </select>
                          <input
                            type="text"
                            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Description"
                          />
                          <button
                            onClick={() => handleRemoveKeyValuePair(index, 'queryParams')}
                            className="w-5 h-5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-full transition-colors flex items-center justify-center"
                            title="Remove parameter"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddKeyValuePair('queryParams')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Parameter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'headers' && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Headers</div>
                  <div className="border border-gray-200 rounded">
                    <div className="grid grid-cols-5 gap-2 px-2 py-1 bg-gray-50 text-xs font-medium text-gray-700 border-b border-gray-200">
                      <div>Name</div>
                      <div>Value</div>
                      <div>Type</div>
                      <div>Description</div>
                      <div></div>
                    </div>
                    <div className="p-2">
                                              {headers.map((header, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 mb-1 items-center">
                            <input
                              type="text"
                              value={header.key}
                              onChange={e => handleKeyValueChange(index, 'key', e.target.value, 'headers')}
                              className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Header name"
                            />
                            <input
                              type="text"
                              value={header.value}
                              onChange={e => handleKeyValueChange(index, 'value', e.target.value, 'headers')}
                              className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Header value"
                            />
                            <select className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                            <input
                              type="text"
                              className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Description"
                            />
                            <button
                              onClick={() => handleRemoveKeyValuePair(index, 'headers')}
                              className="w-5 h-5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-full transition-colors flex items-center justify-center"
                              title="Remove header"
                            >
                              ✕
                          </button>
                          </div>
                      ))}
                      <button
                        onClick={() => handleAddKeyValuePair('headers')}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Header
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'body' && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Request Body</div>
                  <textarea
                    value={requestBody}
                    onChange={e => setRequestBody(e.target.value)}
                    className="w-full h-24 p-2 text-xs font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter request body (JSON)"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-3">
              <button
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={() => {
                  setUrl('');
                  setRequestBody('');
                  setQueryParams([{ key: '', value: '' }]);
                  setHeaders([{ key: '', value: '' }]);
                  setResponse(null);
                  setError(null);
                }}
                disabled={loading || isSubmitting}
                type="button"
              >
                Reset
              </button>
              <button
                className={`px-3 py-1 text-xs text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 shadow-sm ${activeButton === 'send' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
                onClick={e => {
                  e.preventDefault();
                  if (!isSubmitting && !loading) executeTest(false);
                }}
                disabled={loading || !selectedAccount || isSubmitting}
                type="button"
              >
                <div className="flex items-center gap-1 min-w-[40px] justify-center">
                  {(loading || isSubmitting) && activeButton === 'send' ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      <span>Send</span>
                    </>
                  )}
                </div>
              </button>
              <button
                className={`px-3 py-1 text-xs text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 shadow-sm ${activeButton === 'loop' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
                onClick={e => {
                  e.preventDefault();
                  if (!isSubmitting && !loading) executeTest(true);
                }}
                disabled={loading || !selectedAccount || isSubmitting}
                type="button"
              >
                <div className="flex items-center gap-1 min-w-[50px] justify-center">
                  {(loading || isSubmitting) && activeButton === 'loop' ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      <span>Loop</span>
                    </>
                  )}
                </div>
              </button>
              <button
                className={`px-3 py-1 text-xs text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 shadow-sm ${activeButton === 'sync' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
                onClick={e => {
                  e.preventDefault();
                  if (!isSubmitting && !loading) {
                    setSyncFormData({
                      tableName: selectedAccount?.tableName?.[methodName] || '',
                      url: url,
                      headers: Object.fromEntries(
                        headers.filter(h => h.key && h.key.trim() !== '').map(h => [h.key.trim(), h.value])
                      ),
                      idField: 'id',
                      stopOnExisting: false,
                      nextPageIn: 'header',
                      nextPageField: 'link',
                      isAbsoluteUrl: true,
                      maxPages: 200,
                      tokenParam: ''
                    });
                    setShowSyncModal(true);
                  }
                }}
                disabled={loading || !selectedAccount || isSubmitting}
                type="button"
              >
                <div className="flex items-center gap-1 min-w-[50px] justify-center">
                  {(loading || isSubmitting) && activeButton === 'sync' ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      <span>Sync</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom Panels Container */}
        {(showResponse || showValidate) && (
          <div className="flex gap-4 h-[370px] w-[100%]">
            {showResponse && (
              <div className=" border border-gray-200 rounded-lg shadow-sm w-[100%] ">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg ">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Response</h3>
                    <div className="flex items-center space-x-2">
                      {response && (
                        <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          response.status >= 200 && response.status < 300 
                            ? 'bg-green-100 text-green-800' 
                            : response.status >= 400 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {response.status}
                        </div>
                      )}
                      <select className="px-1 py-0.5 text-xs border border-gray-200 rounded bg-white">
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="text">Text</option>
                      </select>
                      <select className="px-1 py-0.5 text-xs border border-gray-200 rounded bg-white">
                        <option value="utf8">utf8</option>
                        <option value="ascii">ascii</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 h-full overflow-auto  w-[100%]">
                  {!response && (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <Send className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs">No response yet. Click "Send" to test the API.</p>
                      </div>
                    </div>
                  )}
                  
                  {response && (
                    <div className="space-y-3">
                      {/* Response Tabs */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setResponseTab('pretty')}
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                            responseTab === 'pretty' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          Pretty
                        </button>
                        <button
                          onClick={() => setResponseTab('raw')}
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                            responseTab === 'raw' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          Raw
                        </button>
                        <button
                          onClick={() => setResponseTab('preview')}
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                            responseTab === 'preview' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => setResponseTab('visualize')}
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                            responseTab === 'visualize' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          Visualize
                        </button>
                      </div>

                      {/* Response Content */}
                      <div className="max-h-56 overflow-auto">
                        {responseTab === 'pretty' && (
                          <div className="bg-gray-900 text-gray-100 font-mono text-xs rounded">
                            <div className="p-3">
                              <CollapsibleJson 
                                data={response.body} 
                                collapsedPaths={collapsedPaths}
                                onToggle={handleToggleCollapse}
                              />
                            </div>
                          </div>
                        )}
                        
                        {responseTab === 'raw' && (
                          <div className="bg-gray-900 text-gray-100 font-mono text-xs rounded">
                            <div className="p-3">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(response.body)
                                  .split('\n')
                                  .map((line, index) => (
                                    <div key={index} className="flex">
                                      <span className="text-gray-500 mr-3 select-none w-6 text-right">
                                        {index + 1}
                                      </span>
                                      <span className="flex-1">{line}</span>
                                    </div>
                                  ))}
                              </pre>
                            </div>
                          </div>
                        )}
                        
                        {responseTab === 'preview' && (
                          <div className="bg-white border border-gray-200 rounded p-3 max-h-64 overflow-auto">
                            <div className="space-y-2">
                              {response.body && typeof response.body === 'object' && response.body !== null ? (
                                <div className="space-y-2">
                                  {Object.entries(response.body as Record<string, unknown>).map(([key, value]) => (
                                    <div key={key} className="border border-gray-200 rounded p-2 bg-gray-50">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-gray-900 text-xs">{key}</span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                          {Array.isArray(value) ? `${value.length} items` : typeof value}
                                        </span>
                                      </div>
                                      {Array.isArray(value) && value.length > 0 ? (
                                        <div className="space-y-1">
                                          {value.slice(0, 3).map((item, index) => (
                                            <div key={index} className="bg-white p-2 rounded border border-gray-100">
                                              {typeof item === 'object' && item !== null ? (
                                                <div className="space-y-1">
                                                  {Object.entries(item as Record<string, unknown>).slice(0, 2).map(([subKey, subValue]) => (
                                                    <div key={subKey} className="flex justify-between text-xs">
                                                      <span className="font-medium text-gray-700">{subKey}:</span>
                                                      <span className="text-gray-600 truncate max-w-[150px]">
                                                        {String(subValue || '').length > 30 
                                                          ? String(subValue || '').substring(0, 30) + '...' 
                                                          : String(subValue || '')}
                                                      </span>
                                                    </div>
                                                  ))}
                                                  {Object.keys(item).length > 2 && (
                                                    <div className="text-xs text-gray-500 italic">
                                                      ... and {Object.keys(item).length - 2} more fields
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="text-xs text-gray-600">
                                                  {String(item || '')}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                          {value.length > 3 && (
                                            <div className="text-xs text-gray-500 italic text-center py-1 bg-white rounded border">
                                              ... and {value.length - 3} more items
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-600">
                                          {typeof value === 'object' && value !== null ? (
                                            <div className="space-y-1">
                                              {Object.entries(value as Record<string, unknown>).slice(0, 3).map(([subKey, subValue]) => (
                                                <div key={subKey} className="flex justify-between bg-white p-1 rounded">
                                                  <span className="font-medium text-gray-700 text-xs">{subKey}:</span>
                                                  <span className="text-gray-600 text-xs truncate max-w-[150px]">
                                                    {String(subValue || '')}
                                                  </span>
                                                </div>
                                              ))}
                                              {Object.keys(value).length > 3 && (
                                                <div className="text-xs text-gray-500 italic text-center py-1">
                                                  ... and {Object.keys(value).length - 3} more fields
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            String(value || '')
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                        
                        {responseTab === 'visualize' && (
                          <div className="bg-white border border-gray-200 rounded p-3 max-h-64 overflow-auto ">
                            <div className="space-y-3">
                              {response.body && typeof response.body === 'object' && response.body !== null ? (
                                <div className="space-y-3">
                                  {Object.entries(response.body as Record<string, unknown>).map(([key, value]) => (
                                    <div key={key} className="border border-gray-200 rounded p-3">
                                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">{key}</h4>
                                      {Array.isArray(value) ? (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Array with {value.length} items</span>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                              {value.length} items
                                            </span>
                                          </div>
                                          {value.length > 0 && (
                                            <div className="grid grid-cols-1 gap-2">
                                              {value.slice(0, 3).map((item, index) => (
                                                <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                                                  <div className="font-medium text-gray-700">Item {index + 1}</div>
                                                  <div className="text-gray-600 truncate">
                                                    {typeof item === 'object' ? JSON.stringify(item).substring(0, 40) + '...' : String(item || '')}
                                                  </div>
                                                </div>
                                              ))}
                                              {value.length > 3 && (
                                                <div className="col-span-full text-center text-xs text-gray-500 py-1">
                                                  ... and {value.length - 3} more items
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-600">
                                          {typeof value === 'object' && value !== null ? (
                                            <div className="space-y-1">
                                              {Object.entries(value as Record<string, unknown>).slice(0, 3).map(([subKey, subValue]) => (
                                                <div key={subKey} className="flex justify-between">
                                                  <span className="font-medium text-xs">{subKey}:</span>
                                                  <span className="text-gray-600 text-xs">{String(subValue || '')}</span>
                                                </div>
                                              ))}
                                              {Object.keys(value).length > 3 && (
                                                <div className="text-xs text-gray-500 italic text-center py-1">
                                                  ... and {Object.keys(value).length - 3} more fields
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            String(value || '')
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Response Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 ">
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500">
                            {response.body && typeof response.body === 'object' 
                              ? `${Object.keys(response.body).length} keys`
                              : '1 item'
                            }
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={handleCopyResponse}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                            title={`Copy ${responseTab}`}
                          >
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={handleDownloadResponse}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                            title={`Download ${responseTab}`}
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          {response.status >= 200 && response.status < 300 && (
                            <button
                              onClick={handleSaveSchema}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                              title="Save Schema"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showValidate && (
              <div className=" border border-gray-200 rounded-lg shadow-sm  w-[40%]">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Validate</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-600">Validate</span>
                        <div className="relative inline-block w-8 h-4 bg-gray-200 rounded-full">
                          <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform"></div>
                        </div>
                      </div>
                      {response && (
                        <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          response.status >= 200 && response.status < 300 
                            ? 'bg-green-100 text-green-800' 
                            : response.status >= 400 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          OK ({response.status})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 h-full overflow-auto">
                  {!response && (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-xs">No validation results yet. Send a request to see validation.</p>
                      </div>
                    </div>
                  )}
                  
                  {response && (
                    <div className="space-y-3">
                      {/* Validation Results */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded">
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✕</span>
                          </div>
                          <div className="text-xs text-red-800">
                            <div className="font-medium">Response data differs from endpoint spec</div>
                            <div className="text-red-600">1. $.data.id should be integer</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div className="text-xs text-green-800">
                            <div className="font-medium">1. Status is available</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

          
      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sync Configuration</h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                  <input
                    type="text"
                    value={syncFormData.tableName}
                    onChange={(e) => setSyncFormData({...syncFormData, tableName: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., shopify_inkhub_get_products"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Field</label>
                  <input
                    type="text"
                    value={syncFormData.idField}
                    onChange={(e) => setSyncFormData({...syncFormData, idField: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., id"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="text"
                  value={syncFormData.url}
                  onChange={(e) => setSyncFormData({...syncFormData, url: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="https://api.example.com/endpoint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headers (JSON)</label>
                <textarea
                  value={JSON.stringify(syncFormData.headers, null, 2)}
                  onChange={(e) => {
                    try {
                      const headers = JSON.parse(e.target.value);
                      setSyncFormData({...syncFormData, headers});
                    } catch (error) {
                      // Ignore invalid JSON
                    }
                  }}
                  className="w-full h-24 p-2 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder='{"Authorization": "Bearer token"}'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Page In</label>
                  <select
                    value={syncFormData.nextPageIn}
                    onChange={(e) => setSyncFormData({...syncFormData, nextPageIn: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="header">Header</option>
                    <option value="body">Body</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Page Field</label>
                  <input
                    type="text"
                    value={syncFormData.nextPageField}
                    onChange={(e) => setSyncFormData({...syncFormData, nextPageField: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., link, bookmark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token Parameter (Optional)</label>
                  <input
                    type="text"
                    value={syncFormData.tokenParam}
                    onChange={(e) => setSyncFormData({...syncFormData, tokenParam: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="e.g., bookmark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Pages</label>
                  <input
                    type="number"
                    value={syncFormData.maxPages || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSyncFormData({...syncFormData, maxPages: value ? parseInt(value) : 200});
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={syncFormData.stopOnExisting}
                    onChange={(e) => setSyncFormData({...syncFormData, stopOnExisting: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Stop on existing items</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={syncFormData.isAbsoluteUrl}
                    onChange={(e) => setSyncFormData({...syncFormData, isAbsoluteUrl: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Is absolute URL</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={isSubmitting || !syncFormData.tableName || !syncFormData.url}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Syncing...' : 'Start Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}