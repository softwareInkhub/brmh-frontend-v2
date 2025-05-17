"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Database, RefreshCw, ChevronDown, ChevronRight, Search, Eye, Code, Table, Grid, List as ListIcon, Users, Terminal, X, Info, UserPlus, FilePlus, Globe, User, Edit2, Key } from "react-feather";
import UnifiedSchemaModal from './UnifiedSchemaModal';
import MethodTestModal from '@/app/components/MethodTestModal';
import SchemaPreviewModal from './SchemaPreviewModal';
import AccountPreviewModal from './AccountPreviewModal';

// --- Types ---
interface KeyValuePair {
  key: string;
  value: string;
}

interface Account {
  "namespace-account-id": string;
  "namespace-account-name": string;
  "namespace-account-url-override"?: string;
  "namespace-account-header": KeyValuePair[];
  variables: KeyValuePair[];
  tags: string[];
}

interface Method {
  "namespace-method-id": string;
  "namespace-method-name": string;
  "namespace-method-type": string;
  "namespace-method-url-override"?: string;
  "namespace-method-queryParams": KeyValuePair[];
  "namespace-method-header": KeyValuePair[];
  "save-data": boolean;
  "isInitialized": boolean;
  tags: string[];
  "sample-request"?: Record<string, unknown>;
  "sample-response"?: Record<string, unknown>;
  "request-schema"?: Record<string, unknown>;
  "response-schema"?: Record<string, unknown>;
}

interface UnifiedNamespace {
  "namespace-id": string;
  "namespace-name": string;
  "namespace-url": string;
  tags?: string[];
}

interface UnifiedSchema {
  id: string;
  schemaName: string;
  schema: any;
  isArray?: boolean;
  originalType?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// --- MethodPreviewModal ---
interface MethodPreviewModalProps {
  method: Method;
  onClose: () => void;
  onEdit: (method: Method) => void;
  onDelete: (method: Method) => void;
  onTest: (method: Method) => void;
}

const MethodPreviewModal: React.FC<MethodPreviewModalProps> = ({ method, onClose, onEdit, onDelete, onTest }) => {
  const [showWebhookForm, setShowWebhookForm] = React.useState(false);
  const [webhookRoute, setWebhookRoute] = React.useState('');
  const [webhookTable, setWebhookTable] = React.useState('');
  const [webhookLoading, setWebhookLoading] = React.useState(false);
  const [webhookError, setWebhookError] = React.useState('');

  const handleAddWebhook = () => {
    setWebhookLoading(true);
    setTimeout(() => {
      setWebhookLoading(false);
      setShowWebhookForm(false);
      setWebhookRoute('');
      setWebhookTable('');
    }, 1000);
  };

  return (
    <div 
      className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full mr-2 ${
              method["namespace-method-type"] === 'GET' ? 'bg-green-100 text-green-700' :
              method["namespace-method-type"] === 'POST' ? 'bg-blue-100 text-blue-700' :
              method["namespace-method-type"] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
              method["namespace-method-type"] === 'DELETE' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {method["namespace-method-type"]}
            </span>
            <h2 className="text-lg font-semibold text-gray-900">{method["namespace-method-name"]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* ID and URL Override */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">ID</div>
            <div className="text-xs font-mono break-all">{method["namespace-method-id"]}</div>
          </div>
          {method["namespace-method-url-override"] && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">URL Override</div>
              <div className="text-xs font-mono break-all">{method["namespace-method-url-override"]}</div>
            </div>
          )}
        </div>
        {/* Query Parameters */}
        {method["namespace-method-queryParams"] && method["namespace-method-queryParams"].length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-700 mb-1">Query Parameters</div>
            <div className="flex flex-wrap gap-2">
              {method["namespace-method-queryParams"].map((param, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg px-4 py-2 flex gap-6 min-w-[120px]">
                  <span className="text-xs font-medium text-gray-700">{param.key}</span>
                  <span className="text-xs text-gray-500">{param.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Tags */}
        {method.tags && method.tags.length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-700 mb-1">Tags</div>
            <div className="flex flex-wrap gap-2">
              {method.tags.map((tag, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>
        )}
        {/* Save Data */}
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4" /></svg>
            Save Data:
          </span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${method["save-data"] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{method["save-data"] ? 'Yes' : 'No'}</span>
        </div>
        <hr className="my-4" />
        {/* Webhooks Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">Webhooks</span>
            {!showWebhookForm ? (
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                onClick={() => setShowWebhookForm(true)}
              >
                <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" /></svg>
                Register Webhook
              </button>
            ) : (
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                onClick={() => setShowWebhookForm(false)}
              >
                <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V4a2 2 0 1 0-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" /></svg>
                Cancel
              </button>
            )}
          </div>
          {showWebhookForm ? (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
                  <input
                    type="text"
                    value={webhookRoute}
                    onChange={e => setWebhookRoute(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter webhook route"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Name *</label>
                  <input
                    type="text"
                    value={webhookTable}
                    onChange={e => setWebhookTable(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter table name"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddWebhook}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    disabled={webhookLoading}
                  >
                    Add Webhook
                  </button>
                </div>
              </div>
              {webhookError && <div className="text-red-500 text-xs mt-2">{webhookError}</div>}
            </div>
          ) : null}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">No webhooks registered for this method.</div>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            title="Test Method"
            className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            onClick={() => onTest(method)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" /></svg>
          </button>
          <button title="Initialize Table" className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
            <Database size={18} />
          </button>
          <button title="Edit Method" onClick={() => { onEdit(method); onClose(); }} className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Edit2 size={18} />
          </button>
          <button title="Delete Method" onClick={() => { onDelete(method); onClose(); }} className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Move handleOAuthRedirect above the component so it is in scope
function handleOAuthRedirect(
  account: Account,
  selectedNamespace: UnifiedNamespace | null,
  API_BASE_URL: string,
  fetchNamespaceDetails: (id: string) => void
) {
  const variables = account.variables || [];
  const clientId = variables.find((v: KeyValuePair) => v.key === 'client_id')?.value;
  const clientSecret = variables.find((v: KeyValuePair) => v.key === 'secret_key')?.value;
  const redirectUrl = variables.find((v: KeyValuePair) => v.key === 'redirect_uri')?.value;
  if (!clientId || !redirectUrl || !clientSecret) {
    alert('Missing client_id, secret_key, or redirect_uri in account variables');
    return;
  }
  const scopes = ['boards:read', 'boards:write', 'pins:read', 'pins:write'];
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUrl);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(','));
  sessionStorage.setItem('pinterestAccountDetails', JSON.stringify({ clientId, clientSecret, redirectUrl, accountId: account['namespace-account-id'], selectedNamespaceId: selectedNamespace?.['namespace-id'] }));
  window.location.href = authUrl.toString();
}

// Add at the top, after imports
export type UnifiedNamespaceModalType = 'namespace' | 'schema' | 'account' | 'method';
export interface UnifiedNamespaceModalTrigger {
  type: UnifiedNamespaceModalType;
  data: any;
}

// In the component props
export interface UnifiedNamespaceProps {
  externalModalTrigger?: UnifiedNamespaceModalTrigger | null;
  onModalClose?: () => void;
  fetchNamespaceDetails: (namespaceId: string) => Promise<void>;
  namespaceDetailsMap: Record<string, { accounts: any[]; methods: any[] }>;
  setNamespaceDetailsMap: React.Dispatch<React.SetStateAction<Record<string, { accounts: any[]; methods: any[] }>>>;
  refreshData: () => void;
}

const UnifiedNamespace: React.FC<UnifiedNamespaceProps> = ({ externalModalTrigger, onModalClose, fetchNamespaceDetails, namespaceDetailsMap, setNamespaceDetailsMap, refreshData }) => {
  // --- State ---
  const [namespaces, setNamespaces] = useState<UnifiedNamespace[]>([]);
  const [schemas, setSchemas] = useState<UnifiedSchema[]>([]);
  const [loading, setLoading] = useState({ namespaces: false, schemas: false });
  const [error, setError] = useState<{ namespaces: string | null; schemas: string | null }>({ namespaces: null, schemas: null });
  const [search, setSearch] = useState({ text: '', type: 'all' as 'all' | 'namespace' | 'schema' });
  const [showModal, setShowModal] = useState<{ type: 'namespace' | 'schema' | null; data: any }>({ type: null, data: null });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedNamespace, setExpandedNamespace] = useState<string | null>(null);
  const [namespaceDetails, setNamespaceDetails] = useState<{ accounts: Account[]; methods: Method[] }>({ accounts: [], methods: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<UnifiedNamespace | null>(null);
  const [showUnifiedSchemaModal, setShowUnifiedSchemaModal] = useState(false);
  const [expandedNamespaceId, setExpandedNamespaceId] = useState<string | null>(null);

  // --- Form State ---
  const [namespaceForm, setNamespaceForm] = useState({
    "namespace-name": '',
    "namespace-url": '',
    tags: [] as string[],
  });

  const [schemaForm, setSchemaForm] = useState({
    schemaName: '',
    schema: {},
    isArray: false,
    originalType: 'object',
  });
  const [jsonSchema, setJsonSchema] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Add modal state for account
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState<{
    "namespace-account-name": string;
    "namespace-account-url-override": string;
    tags: string[];
    "namespace-account-header": any[];
    variables: any[];
  }>({
    "namespace-account-name": '',
    "namespace-account-url-override": '',
    tags: [],
    "namespace-account-header": [],
    variables: [],
  });
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');

  // Add modal state for method
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [methodForm, setMethodForm] = useState<{
    "namespace-method-name": string;
    "namespace-method-type": string;
    "namespace-method-url-override": string;
    tags: string[];
    "namespace-method-queryParams": any[];
    "namespace-method-header": any[];
    "save-data": boolean;
    "isInitialized": boolean;
    "sample-request": string;
    "sample-response": string;
    "request-schema": string;
    "response-schema": string;
  }>(
    {
      "namespace-method-name": '',
      "namespace-method-type": 'GET',
      "namespace-method-url-override": '',
      tags: [],
      "namespace-method-queryParams": [],
      "namespace-method-header": [],
      "save-data": false,
      "isInitialized": false,
      "sample-request": '',
      "sample-response": '',
      "request-schema": '',
      "response-schema": '',
    }
  );
  const [methodLoading, setMethodLoading] = useState(false);
  const [methodError, setMethodError] = useState('');

  // Add preview state
  const [previewAccount, setPreviewAccount] = useState<Account | null>(null);
  const [previewMethod, setPreviewMethod] = useState<Method | null>(null);

  // Add state for MethodTestModal
  const [isMethodTestModalOpen, setIsMethodTestModalOpen] = useState(false);
  const [testingMethod, setTestingMethod] = useState<Method | null>(null);

  // Schema preview and actions state
  const [previewSchema, setPreviewSchema] = useState<any | null>(null);
  const [showTableNameModal, setShowTableNameModal] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableNameError, setTableNameError] = useState('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [dataFormSchema, setDataFormSchema] = useState<any>(null);
  const [dataForm, setDataForm] = useState<any>({});
  const [dataTableName, setDataTableName] = useState('');

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading({ namespaces: true, schemas: true });
    setError({ namespaces: null, schemas: null });

    try {
      const [nsRes, schemaRes] = await Promise.all([
        fetch(`${API_BASE_URL}/unified/namespaces`),
        fetch(`${API_BASE_URL}/unified/schema`)
      ]);

      if (!nsRes.ok) throw new Error('Failed to fetch namespaces');
      if (!schemaRes.ok) throw new Error('Failed to fetch schemas');

      const [nsData, schemaData] = await Promise.all([
        nsRes.json(),
        schemaRes.json()
      ]);

      setNamespaces(nsData);
      setSchemas(Array.isArray(schemaData) ? schemaData : []);
    } catch (err: any) {
      setError({
        namespaces: err.message || 'Failed to fetch namespaces',
        schemas: err.message || 'Failed to fetch schemas'
      });
    } finally {
      setLoading({ namespaces: false, schemas: false });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Handlers ---
  const handleNamespaceSave = async () => {
    try {
      if (!namespaceForm["namespace-name"] || !namespaceForm["namespace-url"]) {
        setError(prev => ({ ...prev, namespaces: 'Name and URL are required' }));
        return;
      }

      const method = showModal.data ? 'PUT' : 'POST';
      const url = showModal.data
        ? `${API_BASE_URL}/unified/namespaces/${showModal.data["namespace-id"]}`
        : `${API_BASE_URL}/unified/namespaces`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(namespaceForm),
      });

      if (!res.ok) throw new Error('Failed to save namespace');
      setShowModal({ type: null, data: null });
      setNamespaceForm({ "namespace-name": '', "namespace-url": '', tags: [] });
      fetchData();
    } catch (err: any) {
      setError(prev => ({ ...prev, namespaces: err.message }));
    }
  };

  const handleSchemaSave = async () => {
    try {
      if (!schemaForm.schemaName) {
        setError(prev => ({ ...prev, schemas: 'Schema name is required' }));
        return;
      }

      let parsedSchema;
      try {
        parsedSchema = JSON.parse(jsonSchema);
        setJsonError(null);
      } catch {
        setJsonError('Invalid JSON');
        return;
      }

      const method = showModal.data ? 'PUT' : 'POST';
      const url = showModal.data
        ? `${API_BASE_URL}/unified/schema/${showModal.data.id}`
        : `${API_BASE_URL}/unified/schema`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schemaForm, schema: parsedSchema }),
      });

      if (!res.ok) throw new Error('Failed to save schema');
      setShowModal({ type: null, data: null });
      setSchemaForm({ schemaName: '', schema: {}, isArray: false, originalType: 'object' });
      setJsonSchema('{}');
      fetchData();
    } catch (err: any) {
      setError(prev => ({ ...prev, schemas: err.message }));
    }
  };

  const handleDelete = async (type: 'namespace' | 'schema', id: string) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      const url = type === 'namespace'
        ? `${API_BASE_URL}/unified/namespaces/${id}`
        : `${API_BASE_URL}/unified/schema/${id}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete ${type}`);
      fetchData();
    } catch (err: any) {
      setError(prev => ({ ...prev, [type + 's']: err.message }));
    }
  };

  const handleValidateSchema = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(jsonSchema);
        setJsonError(null);
      } catch {
        setJsonError('Invalid JSON');
        setIsValidating(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/unified/schema/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: parsedSchema }),
      });

      const result = await res.json();
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({ error: err.message });
    } finally {
      setIsValidating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNamespaceClick = async (ns: UnifiedNamespace) => {
    if (expandedNamespaceId === ns["namespace-id"]) {
      setExpandedNamespaceId(null);
      return;
    }
    setExpandedNamespaceId(ns["namespace-id"]);
    if (!namespaceDetailsMap[ns["namespace-id"]]) {
      setLoadingDetails(true);
      try {
        const [accountsRes, methodsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/unified/namespaces/${ns["namespace-id"]}/accounts`),
          fetch(`${API_BASE_URL}/unified/namespaces/${ns["namespace-id"]}/methods`)
        ]);
        const [accounts, methods] = await Promise.all([
          accountsRes.json(),
          methodsRes.json()
        ]);
        setNamespaceDetailsMap(prev => ({ ...prev, [ns["namespace-id"]]: { accounts, methods } }));
      } catch (err) {
        setError(prev => ({ ...prev, namespaces: 'Failed to fetch namespace details' }));
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedNamespace(null);
    setNamespaceDetails({ accounts: [], methods: [] });
  };

  // --- Filtered Data ---
  const filteredNamespaces = namespaces.filter(ns =>
    search.type !== 'schema' && (
      search.text === '' ||
      ns["namespace-name"].toLowerCase().includes(search.text.toLowerCase()) ||
      ns["namespace-url"].toLowerCase().includes(search.text.toLowerCase()) ||
      ns.tags?.some(tag => tag.toLowerCase().includes(search.text.toLowerCase()))
    )
  );

  const filteredSchemas = schemas.filter(s =>
    search.type !== 'namespace' && (
      search.text === '' ||
      s.schemaName.toLowerCase().includes(search.text.toLowerCase()) ||
      s.originalType?.toLowerCase().includes(search.text.toLowerCase())
    )
  );

  // Handler to open modal for add/edit
  const handleAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      "namespace-account-name": '',
      "namespace-account-url-override": '',
      tags: [],
      "namespace-account-header": [],
      variables: [],
    });
    setShowAccountModal(true);
  };
  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setAccountForm(account);
    setShowAccountModal(true);
  };

  // Handler to save account
  const handleSaveAccount = async () => {
    if (!selectedNamespace) return;
    setAccountLoading(true);
    setAccountError('');
    try {
      const method = editingAccount ? 'PUT' : 'POST';
      const url = editingAccount
        ? `${API_BASE_URL}/unified/accounts/${editingAccount["namespace-account-id"]}`
        : `${API_BASE_URL}/unified/namespaces/${selectedNamespace["namespace-id"]}/accounts`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });
      if (!res.ok) throw new Error('Failed to save account');
      setShowAccountModal(false);
      fetchNamespaceDetails(selectedNamespace["namespace-id"]);
    } catch (err: any) {
      setAccountError(err.message);
    } finally {
      setAccountLoading(false);
    }
  };

  // Handler to delete account
  const handleDeleteAccount = async (account: any) => {
    if (!selectedNamespace) return;
    if (!window.confirm('Delete this account?')) return;
    setAccountLoading(true);
    setAccountError('');
    try {
      const url = `${API_BASE_URL}/unified/accounts/${account["namespace-account-id"]}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      fetchNamespaceDetails(selectedNamespace["namespace-id"]);
    } catch (err: any) {
      setAccountError(err.message);
    } finally {
      setAccountLoading(false);
    }
  };

  // Handler to open modal for add/edit
  const handleAddMethod = () => {
    setEditingMethod(null);
    setMethodForm({
      "namespace-method-name": '',
      "namespace-method-type": 'GET',
      "namespace-method-url-override": '',
      tags: [],
      "namespace-method-queryParams": [],
      "namespace-method-header": [],
      "save-data": false,
      "isInitialized": false,
      "sample-request": '',
      "sample-response": '',
      "request-schema": '',
      "response-schema": '',
    });
    setShowMethodModal(true);
  };
  const handleEditMethod = (method: any) => {
    setEditingMethod(method);
    setMethodForm(method);
    setShowMethodModal(true);
  };

  // Handler to save method
  const handleSaveMethod = async () => {
    if (!selectedNamespace) return;
    setMethodLoading(true);
    setMethodError('');
    try {
      const method = editingMethod ? 'PUT' : 'POST';
      const url = editingMethod
        ? `${API_BASE_URL}/unified/methods/${editingMethod["namespace-method-id"]}`
        : `${API_BASE_URL}/unified/namespaces/${selectedNamespace["namespace-id"]}/methods`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(methodForm),
      });
      if (!res.ok) throw new Error('Failed to save method');
      setShowMethodModal(false);
      fetchNamespaceDetails(selectedNamespace["namespace-id"]);
    } catch (err: any) {
      setMethodError(err.message);
    } finally {
      setMethodLoading(false);
    }
  };

  // Handler to delete method
  const handleDeleteMethod = async (method: any) => {
    if (!selectedNamespace) return;
    if (!window.confirm('Delete this method?')) return;
    setMethodLoading(true);
    setMethodError('');
    try {
      const url = `${API_BASE_URL}/unified/methods/${method["namespace-method-id"]}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete method');
      fetchNamespaceDetails(selectedNamespace["namespace-id"]);
    } catch (err: any) {
      setMethodError(err.message);
    } finally {
      setMethodLoading(false);
    }
  };

  // Add preview handlers
  const handlePreviewAccount = (account: Account) => {
    setPreviewAccount(account);
  };

  const handlePreviewMethod = (method: Method) => {
    setPreviewMethod(method);
  };

  // Handler to open MethodTestModal
  const handleTestMethod = (method: Method) => {
    setTestingMethod(method);
    setIsMethodTestModalOpen(true);
  };

  // Add effect to open modals from external trigger
  useEffect(() => {
    if (externalModalTrigger) {
      if (externalModalTrigger.type === 'namespace') {
        setShowModal({ type: 'namespace', data: externalModalTrigger.data });
      } else if (externalModalTrigger.type === 'schema') {
        setShowModal({ type: 'schema', data: externalModalTrigger.data });
      } else if (externalModalTrigger.type === 'account') {
        setEditingAccount(externalModalTrigger.data);
        setAccountForm(externalModalTrigger.data);
        setShowAccountModal(true);
      } else if (externalModalTrigger.type === 'method') {
        setEditingMethod(externalModalTrigger.data);
        setMethodForm(externalModalTrigger.data);
        setShowMethodModal(true);
      }
    }
  }, [externalModalTrigger]);

  // When closing any modal, call onModalClose if provided
  const closeAllModals = () => {
    setShowModal({ type: null, data: null });
    setShowAccountModal(false);
    setShowMethodModal(false);
    if (onModalClose) onModalClose();
  };

  // --- UI ---
  return (
    <div className="p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Unified Management</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search.text}
              onChange={e => setSearch(prev => ({ ...prev, text: e.target.value }))}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          <select
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search.type}
            onChange={e => setSearch(prev => ({ ...prev, type: e.target.value as any }))}
          >
            <option value="all">All</option>
            <option value="namespace">Namespaces</option>
            <option value="schema">Schemas</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Namespaces Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Namespaces</h3>
            <button
              onClick={() => setShowModal({ type: 'namespace', data: null })}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={14} className="mr-1" /> Add Namespace
            </button>
          </div>

          {loading.namespaces && <div className="text-gray-500">Loading namespaces...</div>}
          {error.namespaces && <div className="text-red-500">{error.namespaces}</div>}

          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2' : 'space-y-2'}>
            {filteredNamespaces.map(ns => (
              <React.Fragment key={ns["namespace-id"]}>
                <div
                  className="bg-white rounded-lg shadow border border-gray-100 p-2 cursor-pointer hover:shadow-md transition-all relative group flex flex-col min-h-[60px] justify-between"
                  onClick={() => handleNamespaceClick(ns)}
                  style={{ minWidth: 0 }}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Database size={16} className="text-blue-500" />
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{ns["namespace-name"]}</h4>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={e => { e.stopPropagation(); setShowModal({ type: 'namespace', data: ns }); }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete('namespace', ns["namespace-id"]); }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {ns.tags && ns.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ns.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {expandedNamespaceId === ns["namespace-id"] && (
                  <div className="col-span-full bg-gray-50 rounded-lg p-3 mt-1 mb-2">
                    {/* Accounts */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-700 text-sm flex items-center gap-1"><Users size={14}/> Accounts</span>
                        <button className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-full bg-blue-50" onClick={() => { setEditingAccount(null); setAccountForm({ "namespace-account-name": '', "namespace-account-url-override": '', tags: [], "namespace-account-header": [], variables: [] }); setShowAccountModal(true); }}>Add Account</button>
                      </div>
                      {loadingDetails && !namespaceDetailsMap[ns["namespace-id"]] ? (
                        <div className="text-gray-400 text-xs">Loading accounts...</div>
                      ) : (namespaceDetailsMap[ns["namespace-id"]]?.accounts.length === 0 ? (
                        <div className="text-gray-400 text-xs flex items-center gap-2"><Info size={12}/> No accounts found.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {namespaceDetailsMap[ns["namespace-id"]]?.accounts.map(account => (
                            <div key={account["namespace-account-id"]} className="bg-blue-50 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm">
                              <span className="font-medium text-blue-700 text-sm">{account["namespace-account-name"]}</span>
                              {account["namespace-account-url-override"] && <span className="text-xs text-gray-500">{account["namespace-account-url-override"]}</span>}
                              {account.tags && account.tags.length > 0 && account.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">{tag}</span>
                              ))}
                              <button className="p-1 text-gray-400 hover:text-blue-600" onClick={() => handlePreviewAccount(account)}><Eye size={12} /></button>
                              <button className="p-1 text-gray-400 hover:text-blue-600" onClick={() => handleEditAccount(account)}><Edit size={12} /></button>
                              <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => handleDeleteAccount(account)}><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Methods */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-700 text-sm flex items-center gap-1"><Terminal size={14}/> Methods</span>
                        <button className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-full bg-blue-50" onClick={() => { setEditingMethod(null); setMethodForm({ "namespace-method-name": '', "namespace-method-type": 'GET', "namespace-method-url-override": '', tags: [], "namespace-method-queryParams": [], "namespace-method-header": [], "save-data": false, "isInitialized": false, "sample-request": '', "sample-response": '', "request-schema": '', "response-schema": '' }); setShowMethodModal(true); }}>Add Method</button>
                      </div>
                      {loadingDetails && !namespaceDetailsMap[ns["namespace-id"]] ? (
                        <div className="text-gray-400 text-xs">Loading methods...</div>
                      ) : (namespaceDetailsMap[ns["namespace-id"]]?.methods.length === 0 ? (
                        <div className="text-gray-400 text-xs flex items-center gap-2"><Info size={12}/> No methods found.</div>
                      ) : (
                        <div className="space-y-2">
                          {namespaceDetailsMap[ns["namespace-id"]]?.methods.map(method => (
                            <div key={method["namespace-method-id"]} className="bg-gray-50 rounded-lg p-2 flex items-center gap-2 shadow-sm">
                              <span className="font-medium text-gray-800">{method["namespace-method-name"]}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${method["namespace-method-type"] === 'GET' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{method["namespace-method-type"]}</span>
                              {method.tags && method.tags.length > 0 && method.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">{tag}</span>
                              ))}
                              <button className="p-1 text-gray-400 hover:text-blue-600 ml-auto" onClick={() => handlePreviewMethod(method)}><Eye size={12} /></button>
                              <button className="p-1 text-gray-400 hover:text-blue-600" onClick={() => handleEditMethod(method)}><Edit size={12} /></button>
                              <button className="p-1 text-gray-400 hover:text-red-600" onClick={() => handleDeleteMethod(method)}><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Schemas Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Schemas</h3>
            <button
              onClick={() => setShowUnifiedSchemaModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={14} className="mr-1" /> Add Schema
            </button>
          </div>

          {loading.schemas && <div className="text-gray-500">Loading schemas...</div>}
          {error.schemas && <div className="text-red-500">{error.schemas}</div>}

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
            {filteredSchemas.map(s => (
              <div key={s.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 cursor-pointer hover:bg-blue-50 transition-all" onClick={() => setPreviewSchema(s)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{s.schemaName}</h4>
                    <p className="text-xs text-gray-500">
                      {s.originalType}{s.isArray ? ' (Array)' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={e => { e.stopPropagation(); setPreviewSchema(s); }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setShowModal({ type: 'schema', data: s }); }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete('schema', s.id); }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>Created: {new Date(s.createdAt || '').toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Updated: {new Date(s.updatedAt || '').toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schema Preview Modal */}
      <SchemaPreviewModal
        open={!!previewSchema}
        onClose={() => setPreviewSchema(null)}
        schema={previewSchema}
        onEdit={schema => { setShowModal({ type: 'schema', data: schema }); setPreviewSchema(null); }}
        onDelete={schema => { handleDelete('schema', schema.id); setPreviewSchema(null); }}
      />
      {/* Extra actions: Create Table & Create Data */}
      {previewSchema && (
        <div className="flex gap-2 mt-4 justify-end">
          <button
            className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
            onClick={() => { setTableNameInput(previewSchema?.schemaName || ''); setTableNameError(''); setShowTableNameModal(true); }}
          >
            Create Table
          </button>
          <button
            className="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 transition"
            onClick={() => { setDataFormSchema(previewSchema?.schema); setDataTableName(previewSchema?.tableName || previewSchema?.schemaName); setDataForm({}); setShowDataModal(true); }}
          >
            Create Data
          </button>
        </div>
      )}

      {/* Table Name Modal */}
      {showTableNameModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative z-10 border border-gray-200">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowTableNameModal(false)}
            >✕</button>
            <h2 className="text-lg font-semibold mb-4">Create Table for Schema</h2>
            <label className="block text-sm font-medium mb-2">Table Name</label>
            <input
              className="border border-gray-300 p-2 rounded-lg w-full mb-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400"
              value={tableNameInput}
              onChange={e => setTableNameInput(e.target.value)}
              placeholder="Enter table name"
              autoFocus
            />
            {tableNameError && <div className="text-xs text-red-600 mb-2">{tableNameError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold"
                onClick={() => setShowTableNameModal(false)}
              >Cancel</button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                onClick={async () => {
                  if (!tableNameInput.trim()) {
                    setTableNameError('Table name is required.');
                    return;
                  }
                  setTableNameError('');
                  try {
                    const res = await fetch(`${API_BASE_URL}/unified/schema/table`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ schemaId: previewSchema.id, tableName: tableNameInput.trim() })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert('Table created successfully!');
                      setShowTableNameModal(false);
                    } else {
                      setTableNameError(data.error || 'Failed to create table.');
                    }
                  } catch (err) {
                    setTableNameError('Failed to create table: ' + err);
                  }
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Data Modal */}
      {showDataModal && dataFormSchema && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col relative z-10 max-h-[95vh] border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold">Create Data for {dataTableName}</h2>
              <button className="text-gray-500 hover:text-gray-700 text-xl" onClick={() => setShowDataModal(false)}>✕</button>
            </div>
            {/* Main content */}
            <div className="flex-1 flex min-h-0">
              {/* Schema view */}
              <div className="w-1/2 border-r bg-gray-50 p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 64px - 64px)' }}>
                <div className="font-semibold text-sm mb-2">Schema</div>
                <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">{JSON.stringify(dataFormSchema, null, 2)}</pre>
              </div>
              {/* Data form */}
              <div className="w-1/2 p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 64px - 64px)' }}>
                {/* You can use a DynamicForm component here if available */}
                <div className="text-gray-400 text-xs">Data form goes here (implement as needed)</div>
              </div>
            </div>
            {/* Sticky action bar */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white rounded-b-2xl z-10">
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition"
                onClick={() => setShowDataModal(false)}
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal.type === 'namespace' && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowModal({ type: null, data: null })}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg transform transition-all animate-in fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {showModal.data ? 'Edit Namespace' : 'Create New Namespace'}
                </h2>
                <button
                  onClick={() => setShowModal({ type: null, data: null })}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Namespace Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={namespaceForm["namespace-name"]}
                    onChange={e => setNamespaceForm(f => ({ ...f, "namespace-name": e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="Enter namespace name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Namespace URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={namespaceForm["namespace-url"]}
                    onChange={e => setNamespaceForm(f => ({ ...f, "namespace-url": e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="https://api.example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <div className="relative">
                  <input
                    type="text"
                    value={namespaceForm.tags.join(', ')}
                    onChange={e => setNamespaceForm(f => ({ ...f, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="Enter tags (comma-separated)"
                  />
                </div>
                {namespaceForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {namespaceForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 group hover:bg-blue-100 transition-colors"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const newTags = [...namespaceForm.tags];
                            newTags.splice(index, 1);
                            setNamespaceForm(f => ({ ...f, tags: newTags }));
                          }}
                          className="ml-1.5 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => setShowModal({ type: null, data: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNamespaceSave}
                disabled={!namespaceForm["namespace-name"] || !namespaceForm["namespace-url"]}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                {showModal.data ? 'Update Namespace' : 'Create Namespace'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UnifiedSchemaModal
        showModal={showUnifiedSchemaModal}
        setShowModal={setShowUnifiedSchemaModal}
        onSuccess={fetchData}
      />

      {/* Account Modal */}
      {showAccountModal && (
        <div 
          className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAccountModal(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">
              {editingAccount ? 'Edit Account' : 'Create Account'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={accountForm["namespace-account-name"]}
                  onChange={e => setAccountForm(f => ({ ...f, "namespace-account-name": e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Override
                </label>
                <input
                  type="text"
                  value={accountForm["namespace-account-url-override"]}
                  onChange={e => setAccountForm(f => ({ ...f, "namespace-account-url-override": e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Headers
                  </label>
                  <button
                    type="button"
                    onClick={() => setAccountForm(f => ({ ...f, "namespace-account-header": [...f["namespace-account-header"], { key: '', value: '' }] }))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Header
                  </button>
                </div>
                <div className="space-y-2">
                  {accountForm["namespace-account-header"].map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={header.key}
                        onChange={e => {
                          const updated = [...accountForm["namespace-account-header"]];
                          updated[index] = { ...header, key: e.target.value };
                          setAccountForm(f => ({ ...f, "namespace-account-header": updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={header.value}
                        onChange={e => {
                          const updated = [...accountForm["namespace-account-header"]];
                          updated[index] = { ...header, value: e.target.value };
                          setAccountForm(f => ({ ...f, "namespace-account-header": updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = accountForm["namespace-account-header"].filter((_, i) => i !== index);
                          setAccountForm(f => ({ ...f, "namespace-account-header": updated }));
                        }}
                        className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Variables
                  </label>
                  <button
                    type="button"
                    onClick={() => setAccountForm(f => ({ ...f, variables: [...f.variables, { key: '', value: '' }] }))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Variable
                  </button>
                </div>
                <div className="space-y-2">
                  {accountForm.variables.map((variable, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={variable.key}
                        onChange={e => {
                          const updated = [...accountForm.variables];
                          updated[index] = { ...variable, key: e.target.value };
                          setAccountForm(f => ({ ...f, variables: updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={variable.value}
                        onChange={e => {
                          const updated = [...accountForm.variables];
                          updated[index] = { ...variable, value: e.target.value };
                          setAccountForm(f => ({ ...f, variables: updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = accountForm.variables.filter((_, i) => i !== index);
                          setAccountForm(f => ({ ...f, variables: updated }));
                        }}
                        className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={accountForm.tags.join(', ')}
                  onChange={e => setAccountForm(f => ({ ...f, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccount}
                className={`px-4 py-2 ${editingAccount ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg`}
                disabled={accountLoading}
              >
                {editingAccount ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Method Modal */}
      {showMethodModal && (
        <div 
          className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowMethodModal(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">
              {editingMethod ? 'Edit Method' : 'Create Method'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method Name *
                </label>
                <input
                  type="text"
                  value={methodForm["namespace-method-name"]}
                  onChange={e => setMethodForm(f => ({ ...f, "namespace-method-name": e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method Type *
                </label>
                <select
                  value={methodForm["namespace-method-type"]}
                  onChange={e => setMethodForm(f => ({ ...f, "namespace-method-type": e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Override
                </label>
                <input
                  type="text"
                  value={methodForm["namespace-method-url-override"]}
                  onChange={e => setMethodForm(f => ({ ...f, "namespace-method-url-override": e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Query Parameters
                  </label>
                  <button
                    type="button"
                    onClick={() => setMethodForm(f => ({ ...f, "namespace-method-queryParams": [...f["namespace-method-queryParams"], { key: '', value: '' }] }))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Query Parameter
                  </button>
                </div>
                <div className="space-y-2">
                  {methodForm["namespace-method-queryParams"].map((param, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={param.key}
                        onChange={e => {
                          const updated = [...methodForm["namespace-method-queryParams"]];
                          updated[index] = { ...param, key: e.target.value };
                          setMethodForm(f => ({ ...f, "namespace-method-queryParams": updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={e => {
                          const updated = [...methodForm["namespace-method-queryParams"]];
                          updated[index] = { ...param, value: e.target.value };
                          setMethodForm(f => ({ ...f, "namespace-method-queryParams": updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = methodForm["namespace-method-queryParams"].filter((_, i) => i !== index);
                          setMethodForm(f => ({ ...f, "namespace-method-queryParams": updated }));
                        }}
                        className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Headers
                  </label>
                  <button
                    type="button"
                    onClick={() => setMethodForm(f => ({ ...f, "namespace-method-header": [...f["namespace-method-header"], { key: '', value: '' }] }))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Header
                  </button>
                </div>
                <div className="space-y-2">
                  {methodForm["namespace-method-header"].map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={header.key}
                        onChange={e => {
                          const updated = [...methodForm["namespace-method-header"]];
                          updated[index] = { ...header, key: e.target.value };
                          setMethodForm(f => ({ ...f, "namespace-method-header": updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={header.value}
                        onChange={e => {
                          const updated = [...methodForm["namespace-method-header"]];
                          updated[index] = { ...header, value: e.target.value };
                          setMethodForm(f => ({ ...f, "namespace-method-header": updated }));
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = methodForm["namespace-method-header"].filter((_, i) => i !== index);
                          setMethodForm(f => ({ ...f, "namespace-method-header": updated }));
                        }}
                        className="px-2 py-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={methodForm.tags.join(', ')}
                  onChange={e => setMethodForm(f => ({ ...f, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="save-data-edit"
                  checked={methodForm["save-data"]}
                  onChange={e => setMethodForm(f => ({ ...f, "save-data": e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="save-data-edit" className="text-sm text-gray-700">
                  Save Data
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowMethodModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMethod}
                className={`px-4 py-2 ${editingMethod ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg`}
                disabled={methodLoading}
              >
                {editingMethod ? 'Update Method' : 'Create Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Method Preview Modal */}
      {previewMethod && (
        <MethodPreviewModal
          onClose={() => setPreviewMethod(null)}
          method={previewMethod}
          onEdit={method => {
            setEditingMethod(method as any); // Acceptable since editingMethod is any/null
            setMethodForm({
              "namespace-method-name": method["namespace-method-name"],
              "namespace-method-type": method["namespace-method-type"],
              "namespace-method-url-override": method["namespace-method-url-override"] || '',
              tags: method.tags || [],
              "namespace-method-queryParams": method["namespace-method-queryParams"] || [],
              "namespace-method-header": method["namespace-method-header"] || [],
              "save-data": !!method["save-data"],
              "isInitialized": !!method["isInitialized"],
              "sample-request": '',
              "sample-response": '',
              "request-schema": '',
              "response-schema": '',
            });
            setShowMethodModal(true);
            setPreviewMethod(null);
          }}
          onDelete={method => {
            handleDeleteMethod(method);
            setPreviewMethod(null);
          }}
          onTest={method => {
            setTestingMethod(method);
            setIsMethodTestModalOpen(true);
            setPreviewMethod(null);
          }}
        />
      )}

      {/* Method Test Modal */}
      {testingMethod && (
        <MethodTestModal
          isOpen={isMethodTestModalOpen}
          onClose={() => setIsMethodTestModalOpen(false)}
          namespaceId={selectedNamespace?.['namespace-id'] || ''}
          methodName={testingMethod['namespace-method-name']}
          methodType={testingMethod['namespace-method-type']}
          namespaceMethodUrlOverride={testingMethod['namespace-method-url-override'] || ''}
          saveData={!!testingMethod['save-data']}
          methodId={testingMethod['namespace-method-id']}
        />
      )}

      {/* Account Preview Modal */}
      {previewAccount && (
        <AccountPreviewModal
          isOpen={!!previewAccount}
          onClose={() => setPreviewAccount(null)}
          account={{
            ...previewAccount,
            ["namespace-account-variables"]: previewAccount.variables || [],
          }}
          onEdit={account => {
            setEditingAccount(account as any); // Acceptable since editingAccount is any/null
            setAccountForm({
              "namespace-account-name": account["namespace-account-name"],
              "namespace-account-url-override": account["namespace-account-url-override"] || '',
              tags: account.tags || [],
              "namespace-account-header": account["namespace-account-header"] || [],
              variables: account["namespace-account-variables"] || [],
            });
            setShowAccountModal(true);
            setPreviewAccount(null);
          }}
          onDelete={account => {
            handleDeleteAccount({ ...account, variables: account["namespace-account-variables"] || [] });
            setPreviewAccount(null);
          }}
          onLink={account => {
            handleOAuthRedirect({ ...account, variables: account["namespace-account-variables"] || [] }, selectedNamespace, API_BASE_URL, fetchNamespaceDetails);
          }}
        />
      )}
    </div>
  );
};

export default UnifiedNamespace; 