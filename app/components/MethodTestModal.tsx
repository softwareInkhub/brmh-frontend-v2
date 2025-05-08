import { useEffect, useState } from 'react';
import { X, Send, RefreshCw, Copy, Download, Check, ChevronDown, FileCode } from 'lucide-react';
import SchemaPreviewModal from './SchemaPreviewModal';
import SchemaEditorModal from './SchemaEditorModal';

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

interface MethodTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  namespaceId: string;
  methodId: string;
  methodName: string;
  methodType: string;
  namespaceMethodUrlOverride: string;
  saveData: boolean;
}

interface SchemaState {
  schema: any;
  isArray: boolean;
  originalType: string;
  isSaved: boolean;
  schemaId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function MethodTestModal({
  isOpen,
  onClose,
  namespaceId,
  methodId,
  methodName,
  methodType,
  namespaceMethodUrlOverride,
  saveData
}: MethodTestModalProps) {
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
  const [schemaState, setSchemaState] = useState<SchemaState | null>(null);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [isSavingSchema, setIsSavingSchema] = useState(false);

  // Fetch namespace details
  useEffect(() => {
    const fetchNamespaceDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}`);
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

  // Execute the method test
  const executeTest = async (isPaginated: boolean = false) => {
    if (!selectedAccount || isSubmitting || loading) {
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    try {
      setIsSubmitting(true);
      setError(null);
      setLoading(true);
      setResponse(null);
      setActiveButton(isPaginated ? 'loop' : 'send');

      const endpoint = isPaginated
        ? `${API_BASE_URL}/execute/paginated`
        : `${API_BASE_URL}/execute`;

      // Prepare headers from the form
      const formHeaders = Object.fromEntries(
        headers
          .filter(h => h.key && h.key.trim() !== '')
          .map(h => [h.key.trim(), h.value])
      );

      const requestData = {
        method: methodType,
        url: url,
        namespaceAccountId: selectedAccount['namespace-account-id'],
        queryParams: Object.fromEntries(
          queryParams
            .filter(p => p.key && p.key.trim() !== '')
            .map(p => [p.key.trim(), p.value])
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

      console.log('============ Request Details ============');
      console.log('Request URL:', endpoint);
      console.log('Request Method:', methodType);
      console.log('Request Headers:', formHeaders);
      console.log('Request Query Params:', requestData.queryParams);
      console.log('Request Body:', requestData.body || 'No body');
      console.log('Table Name:', requestData.tableName);
      console.log('Save Data:', requestData.saveData);
      console.log('======================================');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal
      });

      if (signal.aborted) {
        return;
      }

      const responseHeaders = Object.fromEntries(response.headers.entries());
      const data = await response.json();
      
      console.log('============ Response Details ============');
      console.log('Response Status:', response.status);
      console.log('Response Headers:', responseHeaders);
      console.log('Response Body:', data);
      if (data.executionId || (data.data && data.data.executionId)) {
        console.log('Execution ID:', data.executionId || data.data.executionId);
      }
      console.log('=======================================');

      const responseObj: Response = {
        success: response.ok,
        data: data.data || data, // Handle both wrapped and direct responses
        error: data.error,
        status: response.status,
        headers: responseHeaders,
        body: data,
        executionId: data.executionId || data.data?.executionId
      };

      if (!signal.aborted) {
        setResponse(responseObj);
        
        if (!response.ok) {
          setError(data.error || `Request failed with status ${response.status}`);
        }

        if (responseObj.executionId) {
          localStorage.setItem('currentExecutionId', responseObj.executionId);
        }

        // Set active tab to 'body' to show the response
        setResponseTab('body');
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

    return () => {
      controller.abort();
    };
  };

  const tryParseJSON = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
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
        if (value !== null && value !== undefined) {
          required.push(key);
        }
      });
      return { type: 'object', properties, required };
    }
    return { type: typeof data };
  };

  const handleCopyResponse = () => {
    if (!response) return;
    let contentToCopy = '';
    switch (responseTab) {
      case 'body':
        contentToCopy = JSON.stringify(response.body, null, 2);
        break;
      case 'headers':
        contentToCopy = JSON.stringify(response.headers, null, 2);
        break;
      case 'schema':
        contentToCopy = JSON.stringify(generateResponseSchema(response.body), null, 2);
        break;
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
      case 'body':
        contentToDownload = JSON.stringify(response.body, null, 2);
        fileName = 'response-body.json';
        break;
      case 'headers':
        contentToDownload = JSON.stringify(response.headers, null, 2);
        fileName = 'response-headers.json';
        break;
      case 'schema':
        contentToDownload = JSON.stringify(generateResponseSchema(response.body), null, 2);
        fileName = 'response-schema.json';
        break;
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

  // Close when clicking outside the modal
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  // Initialize
  useEffect(() => {
    let mounted = true;

    const initializeModal = async () => {
      if (isOpen && mounted) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}/accounts`);
          
          if (!response.ok || !mounted) {
            return;
          }

          const data = await response.json();
          if (mounted) {
            setAccounts(data || []);
            if (data && data.length > 0) {
              const firstAccount = data[0];
              setSelectedAccount(firstAccount);
              
              // Set initial URL based on account URL override and method URL override
              const baseUrl = firstAccount['namespace-account-url-override'] || '';
              const methodUrl = namespaceMethodUrlOverride || '';
              // Ensure we don't add an extra slash between baseUrl and methodUrl
              const finalUrl = baseUrl && methodUrl 
                ? baseUrl.endsWith('/') && methodUrl.startsWith('/')
                  ? baseUrl + methodUrl.slice(1)  // Remove leading slash from methodUrl if baseUrl ends with slash
                  : !baseUrl.endsWith('/') && !methodUrl.startsWith('/')
                  ? baseUrl + '/' + methodUrl     // Add slash if neither has one
                  : baseUrl + methodUrl           // Use as is if exactly one has a slash
                : baseUrl + methodUrl;            // Simple concatenation if either is empty
              setUrl(finalUrl);

              // Set initial headers from account's namespace-account-header
              if (firstAccount['namespace-account-header'] && firstAccount['namespace-account-header'].length > 0) {
                const accountHeaders = firstAccount['namespace-account-header'].map((header: AccountHeader) => ({
                  key: header.key,
                  value: header.value
                }));
                // Add an empty header pair at the end for new entries
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
      }
    };

    initializeModal();

    return () => {
      mounted = false;
    };
  }, [isOpen, namespaceId, namespaceMethodUrlOverride]);

  // Update the account selection handler
  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const accountId = e.target.value;
    const account = accounts.find(a => a['namespace-account-id'] === accountId);
    setSelectedAccount(account || null);
    
    if (account) {
      // Set the URL with both account URL override and method URL override
      const baseUrl = account['namespace-account-url-override'] || '';
      const methodUrl = namespaceMethodUrlOverride || '';
      // Ensure we don't add an extra slash between baseUrl and methodUrl
      const finalUrl = baseUrl && methodUrl 
        ? baseUrl.endsWith('/') && methodUrl.startsWith('/')
          ? baseUrl + methodUrl.slice(1)  // Remove leading slash from methodUrl if baseUrl ends with slash
          : !baseUrl.endsWith('/') && !methodUrl.startsWith('/')
          ? baseUrl + '/' + methodUrl     // Add slash if neither has one
          : baseUrl + methodUrl           // Use as is if exactly one has a slash
        : baseUrl + methodUrl;            // Simple concatenation if either is empty
      setUrl(finalUrl);

      // Set the headers from account's namespace-account-header
      if (account['namespace-account-header'] && account['namespace-account-header'].length > 0) {
        const accountHeaders = account['namespace-account-header'].map((header: AccountHeader) => ({
          key: header.key,
          value: header.value
        }));
        // Add an empty header pair at the end for new entries
        setHeaders([...accountHeaders, { key: '', value: '' }]);
      }
    }
  };

  const generateSchema = async () => {
    if (!response?.body) return;

    try {
      const schemaResponse = await fetch(`${API_BASE_URL}/api/schema/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseData: response.body })
      });

      if (!schemaResponse.ok) {
        throw new Error('Failed to generate schema');
      }

      const schemaData = await schemaResponse.json();
      setSchemaState({
        schema: schemaData.schema,
        isArray: schemaData.isArray,
        originalType: schemaData.originalType,
        isSaved: false
      });
      setShowSchemaPreview(true);
    } catch (error) {
      console.error('Error generating schema:', error);
      setError('Failed to generate schema');
    }
  };

  const saveSchema = async (schema: any) => {
    if (!schemaState) return;

    setIsSavingSchema(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/schema/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId,
          methodName,
          namespaceId,
          schemaType: 'response',
          schema,
          isArray: schemaState.isArray,
          originalType: schemaState.originalType,
          url
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save schema');
      }

      const savedSchema = await response.json();
      setSchemaState(prev => ({
        ...prev!,
        schema,
        isSaved: true,
        schemaId: savedSchema['schema-id']
      }));
      setShowSchemaPreview(false);
    } catch (error) {
      console.error('Error saving schema:', error);
      setError('Failed to save schema');
    } finally {
      setIsSavingSchema(false);
    }
  };

  const updateSchema = async (updatedSchema: any) => {
    if (!schemaState?.schemaId) return;

    setIsSavingSchema(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/schema/${schemaState.schemaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: updatedSchema,
          isArray: schemaState.isArray,
          originalType: schemaState.originalType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update schema');
      }

      setSchemaState(prev => ({
        ...prev!,
        schema: updatedSchema
      }));
      setShowSchemaEditor(false);
    } catch (error) {
      console.error('Error updating schema:', error);
      setError('Failed to update schema');
    } finally {
      setIsSavingSchema(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={handleOutsideClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[98%] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] my-2 sm:my-8 flex flex-col min-h-[200px] max-h-[98vh] sm:max-h-[90vh]">
        {/* Modal header */}
        <div className="px-3 sm:px-6 py-2 sm:py-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-[14px] sm:text-[15px] font-semibold text-gray-900">Test Method</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {error && (
            <div className="mb-3 sm:mb-6 py-2 px-3 bg-red-50 text-[#E11D48] text-[12px] sm:text-[13px] rounded-md border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
                <div className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-1">Method Name</div>
                <div className="text-[12px] sm:text-[13px] text-gray-900">{methodName}</div>
              </div>

              <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
                <div className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-1">Method Type</div>
                <div className="text-[12px] sm:text-[13px] text-gray-900">{methodType}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-2 sm:p-3 rounded-md">
              <div className="text-[12px] sm:text-[13px] font-medium text-gray-700 mb-1">Account</div>
              <div className="relative">
                <select
                  value={selectedAccount?.['namespace-account-id'] || ''}
                  onChange={handleAccountChange}
                  className="w-full px-2 sm:px-3 py-[5px] sm:py-[6px] text-[12px] sm:text-[13px] bg-white border rounded-md shadow-sm appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an account</option>
                  {accounts.map(account => (
                    <option key={account['namespace-account-id']} value={account['namespace-account-id']}>
                      {account['namespace-account-name']}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr,120px] gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-md text-[12px] sm:text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                placeholder="Enter URL"
              />
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-md text-[12px] sm:text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                placeholder="Max iterations"
              />
            </div>

            <div className="border border-gray-200 rounded-lg shadow-sm">
              <div className="flex flex-wrap border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('params')}
                  className={`px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium ${
                    activeTab === 'params'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Params
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium ${
                    activeTab === 'headers'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Headers
                </button>
                <button
                  onClick={() => setActiveTab('body')}
                  className={`px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-medium ${
                    activeTab === 'body'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Body
                </button>
              </div>

              <div className="p-3 sm:p-4">
                {activeTab === 'params' && (
                  <div className="space-y-2">
                    {queryParams.map((param, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={param.key}
                          onChange={(e) => handleKeyValueChange(index, 'key', e.target.value, 'queryParams')}
                          className="flex-1 p-2 text-[12px] sm:text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => handleKeyValueChange(index, 'value', e.target.value, 'queryParams')}
                          className="flex-1 p-2 text-[12px] sm:text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleRemoveKeyValuePair(index, 'queryParams')}
                          className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-md text-[12px] sm:text-[13px] transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddKeyValuePair('queryParams')}
                      className="text-[12px] sm:text-[13px] text-blue-600 hover:text-blue-700 font-medium"
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
                          onChange={(e) => handleKeyValueChange(index, 'key', e.target.value, 'headers')}
                          className="flex-1 p-2 text-[12px] sm:text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => handleKeyValueChange(index, 'value', e.target.value, 'headers')}
                          className="flex-1 p-2 text-[12px] sm:text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => handleRemoveKeyValuePair(index, 'headers')}
                          className="p-1.5 sm:p-2 text-red-500 hover:bg-red-50 rounded-md text-[12px] sm:text-[13px] transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddKeyValuePair('headers')}
                      className="text-[12px] sm:text-[13px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add Header
                    </button>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="w-full h-36 sm:h-48 p-2 font-mono text-[12px] sm:text-[13px] border border-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-medium whitespace-nowrap ${
                        responseTab === 'body'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Body
                    </button>
                    <button
                      onClick={() => setResponseTab('headers')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-medium whitespace-nowrap ${
                        responseTab === 'headers'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Headers
                    </button>
                    <button
                      onClick={() => setResponseTab('schema')}
                      className={`px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-medium whitespace-nowrap ${
                        responseTab === 'schema'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Schema
                    </button>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 flex-shrink-0">
                    <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-100 text-green-800'
                        : response.status >= 400
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Status: {response.status}
                    </div>
                    {response.executionId && (
                      <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] sm:text-[11px] font-medium">
                        ID: {response.executionId}
                      </div>
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
                    <button
                      onClick={generateSchema}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
                      title="Generate OpenAPI Schema"
                    >
                      <FileCode className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="p-2 sm:p-3 max-h-[250px] sm:max-h-[300px] overflow-auto">
                  <pre className="text-[11px] sm:text-[12px] whitespace-pre-wrap bg-gray-50 p-2 sm:p-3 rounded-md">
                    {responseTab === 'body' && JSON.stringify(response.body, null, 2)}
                    {responseTab === 'headers' && JSON.stringify(response.headers, null, 2)}
                    {responseTab === 'schema' && JSON.stringify(generateResponseSchema(response.body), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-2 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-b-lg flex flex-row justify-end gap-1.5 sm:gap-2 border-t border-gray-200">
          <button
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-[12px] text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={loading || isSubmitting}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-[12px] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm ${
              activeButton === 'send' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'
            }`}
            onClick={(e) => {
              e.preventDefault();
              if (!isSubmitting && !loading) {
                executeTest(false);
              }
            }}
            disabled={loading || !selectedAccount || isSubmitting}
            type="button"
          >
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-[40px] sm:min-w-[50px] justify-center">
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
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-[12px] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm ${
              activeButton === 'loop' ? 'bg-blue-700' : 'bg-[#2563EB] hover:bg-blue-700'
            }`}
            onClick={(e) => {
              e.preventDefault();
              if (!isSubmitting && !loading) {
                executeTest(true);
              }
            }}
            disabled={loading || !selectedAccount || isSubmitting}
            type="button"
          >
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-[60px] sm:min-w-[70px] justify-center">
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
        </div>
      </div>

      {/* Schema Preview Modal */}
      <SchemaPreviewModal
        isOpen={showSchemaPreview}
        onClose={() => setShowSchemaPreview(false)}
        schema={schemaState?.schema}
        isArray={schemaState?.isArray ?? false}
        originalType={schemaState?.originalType ?? ''}
        onSave={saveSchema}
        onEdit={() => {
          setShowSchemaPreview(false);
          setShowSchemaEditor(true);
        }}
        isSaving={isSavingSchema}
      />

      {/* Schema Editor Modal */}
      <SchemaEditorModal
        isOpen={showSchemaEditor}
        onClose={() => setShowSchemaEditor(false)}
        schema={schemaState?.schema}
        onSave={updateSchema}
        isSaving={isSavingSchema}
      />
    </div>
  );
} 