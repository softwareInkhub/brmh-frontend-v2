import { useEffect, useState } from 'react';
import { Send, RefreshCw, Copy, Download, Check, ChevronDown, Save } from 'lucide-react';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function MethodTestPage({ method, namespace, onOpenSchemaTab }: { method: any, namespace: any, onOpenSchemaTab?: (schema: any, schemaName: string) => void }) {
  const namespaceId = namespace?.['namespace-id'] || '';
  const methodName = method?.['namespace-method-name'] || '';
  const methodType = method?.['namespace-method-type'] || '';
  const namespaceMethodUrlOverride = method?.['namespace-method-url-override'] || '';
  const saveData = !!method?.['save-data'];
  const methodId = method?.['namespace-method-id'] || '';

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
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'schema'>('body');
  const [requestBody, setRequestBody] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeButton, setActiveButton] = useState<'send' | 'loop' | null>(null);
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

  const executeTest = async (isPaginated: boolean = false) => {
    if (!selectedAccount || isSubmitting || loading) return;
    const controller = new AbortController();
    const signal = controller.signal;
    try {
      setIsSubmitting(true);
      setError(null);
      setLoading(true);
      setResponse(null);
      setActiveButton(isPaginated ? 'loop' : 'send');
      const endpoint = isPaginated
        ? `${API_BASE_URL}/unified/execute/paginated`
        : `${API_BASE_URL}/unified/execute`;
      const formHeaders = Object.fromEntries(
        headers.filter(h => h.key && h.key.trim() !== '').map(h => [h.key.trim(), h.value])
      );
      const requestData = {
        method: methodType,
        url: url,
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
        tableName: `${namespaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedAccount['namespace-account-name'].toLowerCase().replace(/[^a-z0-9]/g, '_')}_${methodName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        saveData: saveData
      };
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
        setResponseTab('body');
        setResponseData(response.body);
        setResponseSchema(generateResponseSchema(response.body));
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
      case 'body': contentToCopy = JSON.stringify(response.body, null, 2); break;
      case 'headers': contentToCopy = JSON.stringify(response.headers, null, 2); break;
      case 'schema': contentToCopy = JSON.stringify(generateResponseSchema(response.body), null, 2); break;
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
      case 'body': contentToDownload = JSON.stringify(response.body, null, 2); fileName = 'response-body.json'; break;
      case 'headers': contentToDownload = JSON.stringify(response.headers, null, 2); fileName = 'response-headers.json'; break;
      case 'schema': contentToDownload = JSON.stringify(generateResponseSchema(response.body), null, 2); fileName = 'response-schema.json'; break;
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
    const generatedSchema = generateResponseSchema(response.body);
    if (onOpenSchemaTab) {
      onOpenSchemaTab(generatedSchema, methodName);
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
  return (
    <div className="w-full h-full bg-white p-8 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Test Method</h2>
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-3 py-2 px-3 bg-red-50 text-[#E11D48] text-[13px] rounded-md border border-red-100">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-[13px] font-medium text-gray-700 mb-1">Method Name</div>
              <div className="text-[13px] text-gray-900">{methodName}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-[13px] font-medium text-gray-700 mb-1">Method Type</div>
              <div className="text-[13px] text-gray-900">{methodType}</div>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-[13px] font-medium text-gray-700 mb-1">Account</div>
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
                className="w-full px-3 py-[6px] text-[13px] bg-white border rounded-md shadow-sm appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an account</option>
                {accounts.map(account => (
                  <option key={account['namespace-account-id']} value={account['namespace-account-id']}>
                    {account['namespace-account-name']}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr,120px] gap-2">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="Enter URL"
            />
            <input
              type="number"
              value={maxIterations}
              onChange={e => setMaxIterations(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-md text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              placeholder="Max iterations"
            />
          </div>
          <div className="border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-wrap border-b border-gray-200">
              <button
                onClick={() => setActiveTab('params')}
                className={`px-4 py-2 text-[13px] font-medium ${activeTab === 'params' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Params
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={`px-4 py-2 text-[13px] font-medium ${activeTab === 'headers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Headers
              </button>
              <button
                onClick={() => setActiveTab('body')}
                className={`px-4 py-2 text-[13px] font-medium ${activeTab === 'body' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                Body
              </button>
            </div>
            <div className="p-4">
              {activeTab === 'params' && (
                <div className="space-y-2">
                  {queryParams.map((param, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={param.key}
                        onChange={e => handleKeyValueChange(index, 'key', e.target.value, 'queryParams')}
                        className="flex-1 p-2 text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Key"
                      />
                      <input
                        type="text"
                        value={param.value}
                        onChange={e => handleKeyValueChange(index, 'value', e.target.value, 'queryParams')}
                        className="flex-1 p-2 text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Value"
                      />
                      <button
                        onClick={() => handleRemoveKeyValuePair(index, 'queryParams')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md text-[13px] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddKeyValuePair('queryParams')}
                    className="text-[13px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Parameter
                  </button>
                </div>
              )}
              {activeTab === 'headers' && (
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={e => handleKeyValueChange(index, 'key', e.target.value, 'headers')}
                        className="flex-1 p-2 text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Key"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={e => handleKeyValueChange(index, 'value', e.target.value, 'headers')}
                        className="flex-1 p-2 text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Value"
                      />
                      <button
                        onClick={() => handleRemoveKeyValuePair(index, 'headers')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md text-[13px] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddKeyValuePair('headers')}
                    className="text-[13px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Header
                  </button>
                </div>
              )}
              {activeTab === 'body' && (
                <div>
                  <textarea
                    value={requestBody}
                    onChange={e => setRequestBody(e.target.value)}
                    className="w-full h-48 p-2 font-mono text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter request body (JSON)"
                  />
                </div>
              )}
            </div>
          </div>
          {response && (
            <div className="border border-gray-200 rounded-lg shadow-sm">
              <div className="flex flex-row justify-between items-center border-b border-gray-200 overflow-x-auto">
                <div className="flex flex-nowrap min-w-0">
                  <button
                    onClick={() => setResponseTab('body')}
                    className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap ${responseTab === 'body' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    Body
                  </button>
                  <button
                    onClick={() => setResponseTab('headers')}
                    className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap ${responseTab === 'headers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    Headers
                  </button>
                  <button
                    onClick={() => setResponseTab('schema')}
                    className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap ${responseTab === 'schema' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    Schema
                  </button>
                </div>
                <div className="flex items-center gap-2 px-2 flex-shrink-0">
                  <div className={`px-2 py-1 rounded-full text-[11px] font-medium ${response.status >= 200 && response.status < 300 ? 'bg-green-100 text-green-800' : response.status >= 400 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>Status: {response.status}</div>
                  {response.executionId && (
                    <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium">ID: {response.executionId}</div>
                  )}
                  <button
                    onClick={handleCopyResponse}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                    title={`Copy ${responseTab}`}
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={handleDownloadResponse}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                    title={`Download ${responseTab}`}
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  {response.status >= 200 && response.status < 300 && (
                    <button
                      onClick={handleSaveSchema}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                      title="Save Schema"
                    >
                      <Save className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 max-h-[300px] overflow-auto">
                <pre className="text-[12px] whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {responseTab === 'body' && JSON.stringify(response.body, null, 2)}
                  {responseTab === 'headers' && JSON.stringify(response.headers, null, 2)}
                  {responseTab === 'schema' && JSON.stringify(generateResponseSchema(response.body), null, 2)}
                </pre>
              </div>
            </div>
          )}
          <div className="flex flex-row justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
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
              className={`px-4 py-2 text-[13px] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm ${activeButton === 'send' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
              onClick={e => {
                e.preventDefault();
                if (!isSubmitting && !loading) executeTest(false);
              }}
              disabled={loading || !selectedAccount || isSubmitting}
              type="button"
            >
              <div className="flex items-center gap-2 min-w-[50px] justify-center">
                {(loading || isSubmitting) && activeButton === 'send' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </>
                )}
              </div>
            </button>
            <button
              className={`px-4 py-2 text-[13px] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm ${activeButton === 'loop' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
              onClick={e => {
                e.preventDefault();
                if (!isSubmitting && !loading) executeTest(true);
              }}
              disabled={loading || !selectedAccount || isSubmitting}
              type="button"
            >
              <div className="flex items-center gap-2 min-w-[70px] justify-center">
                {(loading || isSubmitting) && activeButton === 'loop' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Loop</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 