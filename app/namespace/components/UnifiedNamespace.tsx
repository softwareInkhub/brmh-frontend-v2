"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Database, RefreshCw, ChevronDown, ChevronRight, Search, Code, Table, Grid, List as ListIcon, Users, Terminal, X, Info, UserPlus, FilePlus, Globe, User, Edit2, Key, MoreVertical } from "react-feather";
import { FileCode } from 'lucide-react';
import UnifiedSchemaModal from '../Modals/UnifiedSchemaModal';
import MethodTestModal from '@/app/components/MethodTestModal';
import SchemaPreviewModal from '../Modals/SchemaPreviewModal';

import CreateDataModal from '../Modals/CreateDataModal';
import NamespaceModal from '../Modals/NamespaceModal';
import { useSidePanel } from "@/app/components/SidePanelContext";
import { toast } from 'react-hot-toast';

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
  "icon-url"?: string;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// --- MethodPreviewModal ---
interface MethodPreviewModalProps {
  method: Method;
  onClose: () => void;
  onEdit: (method: Method) => void;
  onDelete: (method: Method) => void;
  onTest: (method: Method) => void;
  onTable?: (method: Method, tableName: string) => Promise<void>;
}

const MethodPreviewModal: React.FC<MethodPreviewModalProps> = ({ method, onClose, onEdit, onDelete, onTest, onTable }) => {
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
  onViewAccount?: (account: any, ns?: any) => void;
  onViewMethod?: (method: any, ns?: any) => void;
  onViewSchema?: (schema: any, ns?: any) => void;
}

const UnifiedNamespace: React.FC<UnifiedNamespaceProps> = ({ externalModalTrigger, onModalClose, fetchNamespaceDetails, namespaceDetailsMap, setNamespaceDetailsMap, refreshData, onViewAccount, onViewMethod, onViewSchema }) => {
  const { isCollapsed } = useSidePanel();
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
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string | null>(null);
  const [showUnifiedSchemaModal, setShowUnifiedSchemaModal] = useState(false);
  const [expandedNamespaceId, setExpandedNamespaceId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

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



  // Add state for proper NamespaceModal
  const [showNamespaceModal, setShowNamespaceModal] = useState(false);
  const [editingNamespace, setEditingNamespace] = useState<any>(null);

  // Add state for MethodTestModal
  const [isMethodTestModalOpen, setIsMethodTestModalOpen] = useState(false);
  const [testingMethod, setTestingMethod] = useState<Method | null>(null);

  // Schema preview and actions state
  const [previewSchema, setPreviewSchema] = useState<any | null>(null);
  const [showTableNameModal, setShowTableNameModal] = useState(false);
  const [pendingTableSchema, setPendingTableSchema] = useState<any>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableNameError, setTableNameError] = useState('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [dataFormSchema, setDataFormSchema] = useState<any>(null);
  const [dataForm, setDataForm] = useState<any>({});
  const [dataTableName, setDataTableName] = useState('');
  const [tableMetaStatusById, setTableMetaStatusById] = useState<{ [metaId: string]: string }>({});

  // Add state for schema modal namespace context
  const [schemaModalNamespace, setSchemaModalNamespace] = useState<any>(null);

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

      console.log('=== FETCHED NAMESPACES DEBUG ===');
      console.log('Namespaces data:', nsData);
      console.log('Sample namespace with icon:', nsData.find((ns: any) => ns['icon-url']));
      console.log('Namespaces with icons:', nsData.filter((ns: any) => ns['icon-url']).length);

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

  useEffect(() => {
    const handler = () => { fetchData(); };
    window.addEventListener('refresh-unified-namespace', handler);
    return () => window.removeEventListener('refresh-unified-namespace', handler);
  }, [fetchData]);

  // --- Handlers ---
  const handleNamespaceSave = async (namespaceData: any) => {
    try {
      const isEdit = !!editingNamespace;
      const url = isEdit
        ? `${API_BASE_URL}/unified/namespaces/${editingNamespace["namespace-id"]}`
        : `${API_BASE_URL}/unified/namespaces`;
      const method = isEdit ? 'PUT' : 'POST';
      
      // Check if it's FormData (has icon) or regular object
      const isFormData = namespaceData instanceof FormData;
      
      const headers: Record<string, string> = {};
      let body: string | FormData;
      
      if (isFormData) {
        body = namespaceData;
        // Don't set Content-Type header for FormData, let browser set it with boundary
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          "namespace-name": namespaceData["namespace-name"],
          "namespace-url": namespaceData["namespace-url"],
          "tags": namespaceData.tags || []
        });
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error('Failed to save namespace');
      }

      setShowNamespaceModal(false);
      setEditingNamespace(null);
      fetchData();
      toast.success(isEdit ? 'Namespace updated successfully!' : 'Namespace created successfully!');
    } catch (error: any) {
      console.error('Error saving namespace:', error);
      toast.error(error.message || 'Failed to save namespace');
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
    // Set selected namespace
    setSelectedNamespaceId(ns["namespace-id"]);
    setSelectedNamespace(ns);
    
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
        const [accountsData, methodsData] = await Promise.all([
          accountsRes.json(),
          methodsRes.json()
        ]);
        
        // Ensure accounts and methods are always arrays
        const accounts = Array.isArray(accountsData) ? accountsData : 
                        (accountsData?.body && Array.isArray(accountsData.body)) ? accountsData.body : [];
        const methods = Array.isArray(methodsData) ? methodsData : 
                       (methodsData?.body && Array.isArray(methodsData.body)) ? methodsData.body : [];
        
        setNamespaceDetailsMap(prev => ({ ...prev, [ns["namespace-id"]]: { accounts, methods } }));
      } catch (err) {
        setError(prev => ({ ...prev, namespaces: 'Failed to fetch namespace details' }));
        // Set empty arrays on error to prevent future errors
        setNamespaceDetailsMap(prev => ({ ...prev, [ns["namespace-id"]]: { accounts: [], methods: [] } }));
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
  useEffect(() => {
    if (showModal.type === 'namespace') {
      if (showModal.data) {
        setNamespaceForm({
          "namespace-name": showModal.data["namespace-name"] || '',
          "namespace-url": showModal.data["namespace-url"] || '',
          tags: showModal.data.tags || [],
        });
      } else {
        setNamespaceForm({
          "namespace-name": '',
          "namespace-url": '',
          tags: [],
        });
      }
    }
  }, [showModal]);

  return (
    <div 
      className={`p-0 transition-all duration-200 ${isCollapsed ? 'ml-10' : 'ml-10'}`}
      onClick={(e) => {
        // Clear selection when clicking on the background
        if (e.target === e.currentTarget) {
          setSelectedNamespaceId(null);
          setSelectedNamespace(null);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Namesapce</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-[4px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search.text}
              onChange={e => setSearch(prev => ({ ...prev, text: e.target.value }))}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
        
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
           
            
            <button
              onClick={() => { setEditingNamespace(null); setShowNamespaceModal(true); }}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={14} className="mr-1" /> Add Namespace
            </button>
        
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Namespaces Section */}
        <div>
          

          {loading.namespaces && <div className="text-gray-500">Loading namespaces...</div>}
          {error.namespaces && <div className="text-red-500">{error.namespaces}</div>}

          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}>
            {filteredNamespaces.map((ns, idx) => {
              // Debug logging for namespace icons
              if (idx === 0) {
                console.log('=== NAMESPACE CARD DEBUG ===');
                console.log('First namespace:', ns);
                console.log('Has icon-url:', !!ns["icon-url"]);
                console.log('Icon URL:', ns["icon-url"]);
              }
              return (
              <React.Fragment key={ns["namespace-id"]}>
                <div
                  className={`bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-all duration-200 flex items-center gap-3 p-4 group ${
                    selectedNamespaceId === ns["namespace-id"] 
                      ? 'ring-2 ring-blue-500 border-blue-300' 
                      : expandedNamespaceId === ns["namespace-id"] 
                        ? 'ring-2 ring-green-500 border-green-300' 
                        : 'hover:border-gray-300'
                  }`}
                  onClick={() => handleNamespaceClick(ns)}
                  onMouseEnter={() => {
                    if (!namespaceDetailsMap[ns["namespace-id"]]) {
                      fetchNamespaceDetails(ns["namespace-id"]);
                    }
                  }}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {ns["icon-url"] ? (
                      <img 
                        src={ns["icon-url"]} 
                        alt={`${ns["namespace-name"]} icon`}
                        className="w-8 h-8 rounded object-cover"
                        onLoad={(e) => {
                          console.log('Icon loaded successfully:', ns["icon-url"]);
                        }}
                        onError={(e) => {
                          console.error('Icon failed to load:', ns["icon-url"], e);
                          // Fallback to database icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded bg-gray-100 flex items-center justify-center ${ns["icon-url"] ? 'hidden' : ''}`}>
                      <Database size={16} className="text-gray-600" />
                    </div>
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{ns["namespace-name"]}</h4>
                    {viewMode === 'list' && (
                      <div className="mt-1 flex items-center gap-3 min-w-0">
                        {ns["namespace-url"] && (
                          <span className="text-xs text-gray-500 truncate max-w-[280px]">{ns["namespace-url"]}</span>
                        )}
                        {Array.isArray(ns.tags) && ns.tags.length > 0 && (
                          <div className="hidden md:flex flex-wrap gap-1">
                            {ns.tags.slice(0, 3).map((tag: string) => (
                              <span key={`${ns["namespace-id"]}-${tag}`} className="px-2 py-0.5 bg-gray-50 text-gray-700 text-[11px] rounded-full border border-gray-200">
                                {tag}
                              </span>
                            ))}
                            {ns.tags.length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-[11px] rounded-full border border-gray-200">
                                +{ns.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="hidden md:flex items-center gap-2 ml-auto">
                          <span className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-700">
                            Accounts {namespaceDetailsMap[ns["namespace-id"]]?.accounts?.length ?? '—'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-700">
                            Methods {namespaceDetailsMap[ns["namespace-id"]]?.methods?.length ?? '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingNamespace(ns); setShowNamespaceModal(true); }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete('namespace', ns["namespace-id"]); }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </React.Fragment>
            );
            })}
          </div>
          {/* Expanded details below the grid */}
          {expandedNamespaceId && (
            <div className="w-full bg-white/60 backdrop-blur-sm rounded-xl p-4 mt-4 mb-2 shadow-sm border border-gray-200">
                    {/* Accounts */}
                    <div className="mb-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800 text-sm flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"><Users size={14} className="text-blue-600"/></span>Accounts</span>
                        <button className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-md active:scale-[0.98]" onClick={() => {
                          const event = new CustomEvent('open-all-accounts-tab', { detail: { namespaceId: expandedNamespaceId } });
                          window.dispatchEvent(event);
                        }}><Plus size={12} /> Add Account</button>
                      </div>
                {loadingDetails && !namespaceDetailsMap[expandedNamespaceId] ? (
                        <div className="text-gray-500 text-xs flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/> Loading accounts...</div>
                ) : (!namespaceDetailsMap[expandedNamespaceId]?.accounts || !Array.isArray(namespaceDetailsMap[expandedNamespaceId]?.accounts) || namespaceDetailsMap[expandedNamespaceId]?.accounts.length === 0 ? (
                        <div className="text-gray-500 text-xs flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 px-4 py-3 rounded-lg"><Info size={12}/> No accounts found.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                    {namespaceDetailsMap[expandedNamespaceId]?.accounts?.map(account => (
                            <div key={account["namespace-account-id"]} className="group rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3 flex items-center gap-3 hover:shadow-md transition cursor-pointer" onClick={() => {
                              // Open the single namespace tab and trigger account view
                              const currentNamespace = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                              if (currentNamespace && onViewAccount) {
                                onViewAccount(account, currentNamespace);
                              }
                            }}>
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/70 border border-blue-100"><User size={14} className="text-blue-600"/></div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">{account["namespace-account-name"]}</div>
                                {account["namespace-account-url-override"] && <div className="text-xs text-gray-500 truncate">{account["namespace-account-url-override"]}</div>}
                              </div>
                              <div className="ml-auto flex items-center gap-1">
                                {account.tags && Array.isArray(account.tags) && account.tags.length > 0 && account.tags.slice(0,2).map((tag: string) => (
                                  <span key={`${account["namespace-account-id"]}-${tag}`} className="px-2 py-0.5 bg-white/80 border border-blue-100 text-blue-700 text-[10px] rounded-full">{tag}</span>
                                ))}
                                {account.tags && account.tags.length > 2 && (
                                  <span className="px-2 py-0.5 bg-white/80 border border-blue-100 text-blue-700 text-[10px] rounded-full">+{account.tags.length - 2}</span>
                                )}

                                <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-white/70 rounded-md transition" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  // Open the account tab in edit mode
                                  const currentNamespace = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                                  if (currentNamespace && onViewAccount) {
                                    onViewAccount(account, currentNamespace);
                                  }
                                }}><Edit size={12} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/70 rounded-md transition" onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account); }}><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Methods */}
                    <div className="mt-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800 text-sm flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100"><Terminal size={14} className="text-sky-600"/></span>Methods</span>
                        <button className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow hover:shadow-md active:scale-[0.98]" onClick={() => {
                          const event = new CustomEvent('open-all-methods-tab', { detail: { namespaceId: expandedNamespaceId } });
                          window.dispatchEvent(event);
                        }}><Plus size={12} /> Add Method</button>
                      </div>
                {loadingDetails && !namespaceDetailsMap[expandedNamespaceId] ? (
                        <div className="text-gray-500 text-xs flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg"><div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"/> Loading methods...</div>
                ) : (!namespaceDetailsMap[expandedNamespaceId]?.methods || !Array.isArray(namespaceDetailsMap[expandedNamespaceId]?.methods) || namespaceDetailsMap[expandedNamespaceId]?.methods.length === 0 ? (
                        <div className="text-gray-500 text-xs flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 px-4 py-3 rounded-lg"><Info size={12}/> No methods found.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                    {namespaceDetailsMap[expandedNamespaceId]?.methods?.map((method, index) => (
                            <div key={method["namespace-method-id"] || `method-${expandedNamespaceId}-${index}`} className="group rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 flex items-center gap-3 hover:shadow-md transition cursor-pointer" onClick={() => {
                              // Open the single namespace tab and trigger method view
                              const currentNamespace = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                              if (currentNamespace && onViewMethod) {
                                onViewMethod(method, currentNamespace);
                              }
                            }}>
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200"><Terminal size={14} className="text-gray-700"/></div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 text-sm truncate">{method["namespace-method-name"]}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${method["namespace-method-type"] === 'GET' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{method["namespace-method-type"]}</span>
                                  {method.tags && Array.isArray(method.tags) && method.tags.length > 0 && method.tags.slice(0,2).map((tag: string) => (
                                    <span key={`${method["namespace-method-id"]}-${tag}`} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-[10px] rounded-full">{tag}</span>
                                  ))}
                                  {method.tags && method.tags.length > 2 && (
                                    <span className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 text-[10px] rounded-full">+{method.tags.length - 2}</span>
                                  )}
                                </div>
                              </div>
                              <div className="ml-auto flex items-center gap-1">

                                <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-white/70 rounded-md transition" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  // Open the method tab in edit mode
                                  const currentNamespace = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                                  if (currentNamespace && onViewMethod) {
                                    onViewMethod(method, currentNamespace);
                                  }
                                }}><Edit size={12} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/70 rounded-md transition" onClick={(e) => { e.stopPropagation(); handleDeleteMethod(method); }}><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
              {/* Schemas for selected namespace */}
              <div className="mt-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-sm flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100"><FileCode size={14} className="text-purple-600"/></span>Schemas</span>
                  <button
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow hover:shadow-md active:scale-[0.98]"
                    onClick={() => {
                      const event = new CustomEvent('open-create-schema-tab', { detail: { namespaceId: expandedNamespaceId } });
                      window.dispatchEvent(event);
                    }}
                  >
                    <Plus size={12}/> Create Schema
                  </button>
                </div>
                {
                  (() => {
                    const ns = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                    const nsSchemaIds = ns && Array.isArray((ns as any).schemaIds) ? (ns as any).schemaIds : [];
                    if (!Array.isArray(nsSchemaIds)) return null;
                    const nsSchemas = schemas.filter(s => nsSchemaIds.includes(s.id));
                    if (nsSchemas.length === 0) {
                      return <div className="text-gray-500 text-xs flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 px-4 py-3 rounded-lg"><Info size={12}/> No schemas found.</div>;
                    }
              return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 max-h-80 overflow-y-auto">
                        {nsSchemas.map(schema => (
                          <div key={schema.id} className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-3 hover:shadow-md transition cursor-pointer" onClick={() => {
                            // Open the single namespace tab and trigger schema view
                            const currentNamespace = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                            if (currentNamespace && onViewSchema) {
                              onViewSchema(schema, currentNamespace);
                            }
                          }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/70 border border-purple-100 flex items-center justify-center"><FileCode size={14} className="text-purple-600"/></div>
                                <span className="font-semibold text-purple-700 text-sm truncate">{schema.schemaName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-white/70 rounded-md transition" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  // Open the schema tab in edit mode
                                  const currentNamespace = filteredNamespaces.find(ns => ns["namespace-id"] === expandedNamespaceId);
                                  if (currentNamespace && onViewSchema) {
                                    onViewSchema(schema, currentNamespace);
                                  }
                                }}><Edit size={12} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/70 rounded-md transition" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDelete('schema', schema.id); 
                                }}><Trash2 size={12} /></button>
                              </div>
                            </div>
                            <span className="text-xs text-gray-600">{schema.originalType}{schema.isArray ? ' (Array)' : ''}</span>
                          </div>
                        ))}
                </div>
              );
                  })()
                }
          </div>
            </div>
          )}
        </div>
      </div>

      {/* Schema Preview Modal */}
      <SchemaPreviewModal
        open={!!previewSchema}
        onClose={() => setPreviewSchema(null)}
        schema={previewSchema}
        onEdit={schema => {
          setShowModal({ type: 'schema', data: schema });
          setPreviewSchema(null);
        }}
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
                      body: JSON.stringify({ schemaId: pendingTableSchema.id, tableName: tableNameInput.trim() })
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
      <NamespaceModal
        isOpen={showNamespaceModal}
        onClose={() => { setShowNamespaceModal(false); setEditingNamespace(null); }}
        onSave={handleNamespaceSave}
        namespace={editingNamespace}
      />

      <UnifiedSchemaModal
        showModal={showUnifiedSchemaModal}
        setShowModal={setShowUnifiedSchemaModal}
        onSuccess={refreshData}
        namespace={schemaModalNamespace}
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
                    <div key={header.key ? `header-${header.key}` : `header-${index}`} className="flex gap-2">
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
                    <div key={variable.key ? `var-${variable.key}` : `var-${index}`} className="flex gap-2">
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
                    <div key={param.key ? `param-${param.key}` : `param-${index}`} className="flex gap-2">
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
                    <div key={header.key ? `header-${header.key}` : `header-${index}`} className="flex gap-2">
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



      <CreateDataModal
        open={showDataModal && !!dataFormSchema}
        onClose={() => setShowDataModal(false)}
        schema={dataFormSchema}
        tableName={dataTableName}
        onSuccess={() => { setShowDataModal(false); }}
      />
    </div>
  );
};

export default UnifiedNamespace; 