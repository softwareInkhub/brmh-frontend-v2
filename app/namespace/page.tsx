'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { NamespaceInput } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Database, 
  Save, 
  Key, 
  Users, 
  Search, 
  Code,
  User,
  Play,
  Bell,
  Edit,
  X,
  Activity,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'react-feather';
import { toast, Toaster } from 'react-hot-toast';
import MethodTestModal from '../components/MethodTestModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface KeyValuePair {
  key: string;
  value: string;
}

interface DynamoDBTable {
  name?: string;
  TableName?: string;
}

interface Method {
  'namespace-id': string;
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override': string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
  'isInitialized': boolean;
  'tags': string[];
  'sample-request'?: Record<string, unknown>;
  'sample-response'?: Record<string, unknown>;
  'request-schema'?: Record<string, unknown>;
  'response-schema'?: Record<string, unknown>;
}

interface Account {
  'namespace-id': string;
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': KeyValuePair[];
  'variables': KeyValuePair[];
  'tags': string[];
}

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'tags': string[];
}

interface EditFormData {
  account: {
    'namespace-account-name': string;
    'namespace-account-url-override': string;
    'namespace-account-header': KeyValuePair[];
    'variables': KeyValuePair[];
    'tags': string[];
  };
  method: {
    'namespace-method-name': string;
    'namespace-method-type': string;
    'namespace-method-url-override': string;
    'namespace-method-queryParams': KeyValuePair[];
    'namespace-method-header': KeyValuePair[];
    'save-data': boolean;
    'tags': string[];
  };
}

interface AccountPayload {
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': Array<{ key: string; value: string }>;
  'variables': Array<{ key: string; value: string }>;
  'tags': string[];
}

interface MethodPayload {
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override'?: string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
  'isInitialized': boolean;
  'tags'?: string[];
}

interface ExecutionLog {
  'exec-id': string;
  'child-exec-id': string;
  data: {
    'execution-id': string;
    'iteration-no': number;
    'total-items-processed': number;
    'items-in-current-page': number;
    'request-url': string;
    'response-status': number;
    'pagination-type': string;
    'timestamp': string;
    'status'?: string;
    'is-last': boolean;
  };
}

interface DynamoDBItem {
  'exec-id': { S: string };
  'child-exec-id': { S: string };
  data: {
    M: {
      'request-url'?: { S: string };
      'status'?: { S: string };
      'total-items-processed'?: { N: string };
      'iteration-no'?: { N: string };
      'items-in-current-page'?: { N: string };
      'response-status'?: { N: string };
      'pagination-type'?: { S: string };
      'timestamp'?: { S: string };
      'is-last'?: { BOOL: boolean };
    };
  };
}

interface DynamoDBNamespaceItem {
  id: string;
  data: {
    'namespace-name': { S: string };
    'namespace-url': { S: string };
    tags?: { L: { S: string }[] };
  };
}

interface DynamoDBWebhookItem {
  id: { S: string };
  methodId: { S: string };
  route: { S: string };
  tableName: { S: string };
  createdAt: { S: string };
}

interface AccountDetails {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  accountId: string;
}

interface ExecuteRequest {
  method: string;
  url: string;
  namespaceAccountId: string;
  queryParams?: KeyValuePair[];
  headers?: KeyValuePair[];
  body?: unknown;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  namespaceAccountId: string;
  request: {
    queryParams?: KeyValuePair[];
    headers?: KeyValuePair[];
    body?: unknown;
  };
  response: {
    status: number;
    body: unknown;
    headers: Record<string, string>;
  };
}

interface WebhookData {
  id: string;
  methodId: string;
  route: string;
  tableName: string;
  createdAt: string;
}

/**
 * NamespacePage Component
 * Displays a list of namespaces with their basic information and statistics
 */
const NamespacePage = () => {
  // const router = useRouter();
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [methodSearchQuery, setMethodSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [isAddingNamespace, setIsAddingNamespace] = useState(false);
  const [newNamespace, setNewNamespace] = useState<NamespaceInput>({
    'namespace-name': '',
    'namespace-url': '',
    tags: []
  });
  const [editingNamespace, setEditingNamespace] = useState<Namespace | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingMethod, setIsEditingMethod] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    account: {
      'namespace-account-name': '',
      'namespace-account-url-override': '',
      'namespace-account-header': [],
      'variables': [],
      'tags': []
    },
    method: {
      'namespace-method-name': '',
      'namespace-method-type': 'GET',
      'namespace-method-url-override': '',
      'namespace-method-queryParams': [],
      'namespace-method-header': [],
      'save-data': false,
      'tags': []
    }
  });

  // Add new state variables for token handling
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [methodForTable, setMethodForTable] = useState<Method | null>(null);

  const [isMethodTestModalOpen, setIsMethodTestModalOpen] = useState(false);
  const [testingMethod, setTestingMethod] = useState<Method | null>(null);

  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [allWebhooks, setAllWebhooks] = useState<WebhookData[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [webhookForm, setWebhookForm] = useState({ route: '', tableName: '' });

  // Add new state for logs sidebar
  const [showLogsSidebar, setShowLogsSidebar] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());
  const [allExecutions, setAllExecutions] = useState<ExecutionLog[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;  // Maximum number of empty result retries

  // Filter functions
  const filteredNamespaces = namespaces.filter(namespace => {
    const searchLower = searchQuery.toLowerCase();
    return (
      namespace['namespace-name'].toLowerCase().includes(searchLower) ||
      namespace['namespace-url'].toLowerCase().includes(searchLower) ||
      namespace.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // Update accounts list to use filteredAccounts
 

  // Update methods list to use filteredMethods
 

  const saveToHistory = (requestDetails: ExecuteRequest, responseData: { status: number; body: unknown; headers: Record<string, string> }) => {
    try {
      console.log('Saving to history:', { requestDetails, responseData });
      
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        method: requestDetails.method,
        url: requestDetails.url,
        namespaceAccountId: requestDetails.namespaceAccountId,
        request: {
          queryParams: requestDetails.queryParams,
          headers: requestDetails.headers,
          body: requestDetails.body,
        },
        response: {
          status: responseData.status,
          body: responseData.body,
          headers: responseData.headers,
        },
      };

      // Get existing history from localStorage
      let history: HistoryEntry[] = [];
      const existingHistory = localStorage.getItem('apiHistory');
      
      if (existingHistory) {
        try {
          history = JSON.parse(existingHistory);
          if (!Array.isArray(history)) {
            console.warn('Existing history is not an array, resetting');
            history = [];
          }
        } catch (error) {
          console.warn('Error parsing existing history, resetting:', error);
          history = [];
        }
      }

      // Add new entry to the beginning
      history.unshift(newEntry);
      
      // Keep only the last 50 entries
      history = history.slice(0, 50);

      // Save back to localStorage
      localStorage.setItem('apiHistory', JSON.stringify(history));
      console.log('Successfully saved to history. Current history size:', history.length);
      
      // Verify the save
      const savedHistory = localStorage.getItem('apiHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        console.log('Verified history save. Latest entry:', parsed[0]);
      }
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  // Fetch accounts and methods for selected namespace
  const fetchNamespaceDetails = async (namespaceId: string) => {
    try {
      console.log('Fetching namespace details for ID:', namespaceId);
      
      // Accounts request
      const accountsResponse = await fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}/accounts`);
      const accountsData = await accountsResponse.json();
      
      saveToHistory(
        {
          method: 'GET',
          url: `${API_BASE_URL}/api/namespaces/${namespaceId}/accounts`,
          namespaceAccountId: namespaceId,
        },
        {
          status: accountsResponse.status,
          body: accountsData,
          headers: Object.fromEntries(accountsResponse.headers.entries()),
        }
      );

      // Methods request
      const methodsResponse = await fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}/methods`);
      const methodsData = await methodsResponse.json();
      
      saveToHistory(
        {
          method: 'GET',
          url: `${API_BASE_URL}/api/namespaces/${namespaceId}/methods`,
          namespaceAccountId: namespaceId,
        },
        {
          status: methodsResponse.status,
          body: methodsData,
          headers: Object.fromEntries(methodsResponse.headers.entries()),
        }
      );

      if (!accountsResponse.ok || !methodsResponse.ok) {
        throw new Error('Failed to fetch namespace details');
      }

      setAccounts(accountsData || []);
      setMethods(methodsData || []);
    } catch (error) {
      console.error('Error fetching namespace details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    }
  };

  /**
   * Handles namespace selection
   */
  const handleNamespaceClick = (namespace: Namespace) => {
    setSelectedNamespace(namespace);
    fetchNamespaceDetails(namespace['namespace-id']);
  };

  /**
   * Fetches all namespaces from the API and transforms DynamoDB attribute values
   */
  const fetchNamespaces = useCallback(async () => {
    try {
      console.log('🔄 Fetching namespaces...');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      console.log('📡 Using backend URL:', backendUrl);
      
      const response = await fetch(`${backendUrl}/api/namespaces`);
      const rawData = await response.json();
      
      saveToHistory(
        {
          method: 'GET',
          url: `${backendUrl}/api/namespaces`,
          namespaceAccountId: 'system',
        },
        {
          status: response.status,
          body: rawData,
          headers: Object.fromEntries(response.headers.entries()),
        }
      );

      // Transform the data structure
      const transformedData = rawData.map((item: DynamoDBNamespaceItem) => ({
        'namespace-id': item.id,
        'namespace-name': item.data['namespace-name'].S,
        'namespace-url': item.data['namespace-url'].S,
        'tags': Array.isArray(item.data.tags?.L) ? item.data.tags.L.map((tag: { S: string }) => tag.S) : []
      }));

      console.log('Transformed namespaces:', transformedData);
      setNamespaces(transformedData);
    } catch (error) {
      console.error('❌ Error in fetchNamespaces:', error);
      setNamespaces([]);
    }
  }, []);

  /**
   * Creates a new namespace
   */
  const handleCreateNamespace = async () => {
    try {
      if (!newNamespace['namespace-name'] || !newNamespace['namespace-url']) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/namespaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNamespace),
      });

      if (!response.ok) {
        throw new Error('Failed to create namespace');
      }

      const data = await response.json();
      setNamespaces([...namespaces, data]);
      setIsAddingNamespace(false);
      setNewNamespace({
        'namespace-name': '',
        'namespace-url': '',
        tags: []
      });
    } catch (error) {
      console.error('Error creating namespace:', error);
      alert('Failed to create namespace');
    }
  };

  /**
   * Handles namespace deletion
   */
  const handleDeleteNamespace = async (namespaceId: string) => {
    if (window.confirm('Are you sure you want to delete this namespace?')) {
      try {
        // setTokenProcessing(namespaceId); // Add loading state
        const response = await fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete namespace');
        }

        setNamespaces(namespaces.filter(ns => ns['namespace-id'] !== namespaceId));
      } catch (error) {
        console.error('Error deleting namespace:', error);
        alert('Failed to delete namespace');
      } finally {
        // setTokenProcessing(null);
      }
    }
  };

  /**
   * Handles editing a namespace
   */
  const handleEditNamespace = async () => {
    try {
      if (!editingNamespace) return;

      // Show loading state
      // setTokenProcessing(editingNamespace['namespace-id']);

      const response = await fetch(`${API_BASE_URL}/api/namespaces/${editingNamespace['namespace-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'namespace-name': newNamespace['namespace-name'],
          'namespace-url': newNamespace['namespace-url'],
          'tags': newNamespace.tags
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update namespace');
      }

      const updatedNamespace = await response.json();
      setNamespaces(namespaces.map(ns => 
        ns['namespace-id'] === editingNamespace['namespace-id'] ? updatedNamespace : ns
      ));
      setIsAddingNamespace(false);
      setEditingNamespace(null);
      setNewNamespace({
        'namespace-name': '',
        'namespace-url': '',
        tags: []
      });
    } catch (error) {
      console.error('Error updating namespace:', error);
      alert('Failed to update namespace');
    } finally {
      // setTokenProcessing(null);
    }
  };

  /**
   * Opens the edit form for a namespace
   */
  const handleEditClick = (namespace: Namespace) => {
    setEditingNamespace(namespace);
    setNewNamespace({
      'namespace-name': namespace['namespace-name'],
      'namespace-url': namespace['namespace-url'],
      'tags': namespace.tags
    });
    setIsAddingNamespace(true);
  };

  /**
   * Handles account deletion
   */
  const handleDeleteAccount = async (accountId: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/accounts/${accountId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete account');
        }

        setAccounts(accounts.filter(account => account['namespace-account-id'] !== accountId));
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
      }
    }
  };

  /**
   * Opens the edit form for an account
   */
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setEditFormData({
      ...editFormData,
      account: {
        'namespace-account-name': account['namespace-account-name'],
        'namespace-account-url-override': account['namespace-account-url-override'] || '',
        'namespace-account-header': account['namespace-account-header'] || [],
        'variables': account['variables'] || [],
        'tags': account.tags || []
      }
    });
    setIsEditingAccount(true);
  };

  /**
   * Handles method deletion
   */
  const handleDeleteMethod = async (methodId: string) => {
    if (window.confirm('Are you sure you want to delete this method?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/methods/${methodId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete method');
        }

        setMethods(methods.filter(method => method['namespace-method-id'] !== methodId));
      } catch (error) {
        console.error('Error deleting method:', error);
        alert('Failed to delete method');
      }
    }
  };

  /**
   * Opens the edit form for a method
   */
  const handleEditMethod = (method: Method) => {
    setEditingMethod(method);
    setEditFormData({
      ...editFormData,
      method: {
        'namespace-method-name': method['namespace-method-name'],
        'namespace-method-type': method['namespace-method-type'],
        'namespace-method-url-override': method['namespace-method-url-override'] || '',
        'namespace-method-queryParams': method['namespace-method-queryParams'] || [],
        'namespace-method-header': method['namespace-method-header'] || [],
        'save-data': method['save-data'],
        'tags': method.tags || []
      }
    });
    setIsEditingMethod(true);
  };

  const handleUpdateAccount = async () => {
    try {
      // Validate required fields
      if (!editFormData.account['namespace-account-name']) {
        alert('Account name is required');
        return;
      }

      // Show loading state if editing
      if (editingAccount) {
        // setTokenProcessing(editingAccount['namespace-account-id']);
      }

      // Clean up the data before sending
      const cleanedHeaders = editFormData.account['namespace-account-header']
        .filter(header => header.key && header.value)
        .map(header => ({
          key: header.key.trim(),
          value: header.value.trim()
        }));

      const cleanedVariables = editFormData.account.variables
        .filter(variable => variable.key && variable.value)
        .map(variable => ({
          key: variable.key.trim(),
          value: variable.value.trim()
        }));

      const cleanedTags = editFormData.account.tags
        .map(tag => tag.trim())
        .filter(Boolean);

      const payload: AccountPayload = {
        'namespace-account-name': editFormData.account['namespace-account-name'].trim(),
        'namespace-account-url-override': editFormData.account['namespace-account-url-override']?.trim() || undefined,
        'namespace-account-header': cleanedHeaders,
        'variables': cleanedVariables,
        'tags': cleanedTags
      };

      const isCreating = !editingAccount;
      const url = isCreating 
        ? `${API_BASE_URL}/api/namespaces/${selectedNamespace?.['namespace-id']}/accounts`
        : `${API_BASE_URL}/api/accounts/${editingAccount?.['namespace-account-id']}`;

      console.log(`[Account ${isCreating ? 'Create' : 'Update'}] Request to: ${url}`);
      
      // Create a copy of the account with our updated values
      let updatedLocalAccount: Account;
      
      if (isCreating) {
        // For new accounts, we'll get the ID from the response
        updatedLocalAccount = {
          'namespace-id': selectedNamespace?.['namespace-id'] || '',
          'namespace-account-id': '', // Will be filled by server
          'namespace-account-name': payload['namespace-account-name'],
          'namespace-account-url-override': payload['namespace-account-url-override'] || '',
          'namespace-account-header': payload['namespace-account-header'],
          'variables': payload['variables'],
          'tags': payload['tags']
        };
      } else if (editingAccount) {
        // For existing accounts, update local fields while preserving ID
        updatedLocalAccount = {
          ...editingAccount,
          'namespace-account-name': payload['namespace-account-name'],
          'namespace-account-url-override': payload['namespace-account-url-override'] || editingAccount['namespace-account-url-override'] || '',
          'namespace-account-header': payload['namespace-account-header'],
          'variables': payload['variables'],
          'tags': payload['tags']
        };
      } else {
        throw new Error("Invalid state: Missing editing account");
      }

      // Make the API request
      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${isCreating ? 'create' : 'update'} account (${response.status}): ${errorText}`);
      }

      // If creating, try to get ID from response
      if (isCreating) {
        try {
          const data = await response.json();
          if (data && data['namespace-account-id']) {
            updatedLocalAccount['namespace-account-id'] = data['namespace-account-id'];
          }
        } catch {
          console.warn("Could not parse account ID from creation response");
        }
      }

      // Update state with our local copy (optimistic update)
      if (isCreating) {
        if (updatedLocalAccount['namespace-account-id']) {
          // Only add to list if we have an ID
          setAccounts(prev => [...prev, updatedLocalAccount]);
        }
      } else {
        setAccounts(prev => prev.map(acc => 
          acc['namespace-account-id'] === editingAccount?.['namespace-account-id'] 
            ? updatedLocalAccount 
            : acc
        ));
      }

      // Reset form state
      setIsEditingAccount(false);
      setEditingAccount(null);
      
      toast.success(`Account ${isCreating ? 'created' : 'updated'} successfully!`);
      
      // Refresh the data from server to ensure consistency
      if (selectedNamespace) {
        console.log("Refreshing namespace details");
        fetchNamespaceDetails(selectedNamespace['namespace-id']);
      }
    } catch (error) {
      console.error('Error handling account:', error);
      toast.error(`Failed to ${editingAccount ? 'update' : 'create'} account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // setTokenProcessing(null);
    }
  };

  const handleUpdateMethod = async () => {
    try {
      // Validate required fields
      if (!editFormData.method['namespace-method-name'] || !editFormData.method['namespace-method-type']) {
        alert('Method name and type are required');
        return;
      }

      // Show loading state if editing
      if (editingMethod) {
        // setInitializingTable(editingMethod['namespace-method-id']);
      }

      // Clean up the data before sending
      const cleanedQueryParams = editFormData.method['namespace-method-queryParams']
        .filter(param => param.key && param.value)
        .map(param => ({
          key: param.key.trim(),
          value: param.value.trim()
        }));

      const cleanedHeaders = editFormData.method['namespace-method-header']
        .filter(header => header.key && header.value)
        .map(header => ({
          key: header.key.trim(),
          value: header.value.trim()
        }));

      const cleanedTags = editFormData.method.tags
        .map(tag => tag.trim())
        .filter(Boolean);

      const payload: MethodPayload = {
        'namespace-method-name': editFormData.method['namespace-method-name'].trim(),
        'namespace-method-type': editFormData.method['namespace-method-type'],
        'namespace-method-url-override': editFormData.method['namespace-method-url-override']?.trim() || undefined,
        'namespace-method-queryParams': cleanedQueryParams,
        'namespace-method-header': cleanedHeaders,
        'save-data': editFormData.method['save-data'],
        'isInitialized': editingMethod?.isInitialized || false,
        'tags': cleanedTags.length > 0 ? cleanedTags : undefined
      };

      const isCreating = !editingMethod;
      const url = isCreating 
        ? `${API_BASE_URL}/api/namespaces/${selectedNamespace?.['namespace-id']}/methods`
        : `${API_BASE_URL}/api/methods/${editingMethod?.['namespace-method-id']}`;

      console.log(`[Method ${isCreating ? 'Create' : 'Update'}] Request to: ${url}`);
      
      // Create a copy of the method with our updated values
      let updatedLocalMethod: Method;
      
      if (isCreating) {
        // For new methods, we'll get the ID from the response
        updatedLocalMethod = {
          'namespace-id': selectedNamespace?.['namespace-id'] || '',
          'namespace-method-id': '', // Will be filled by server
          'namespace-method-name': payload['namespace-method-name'],
          'namespace-method-type': payload['namespace-method-type'],
          'namespace-method-url-override': payload['namespace-method-url-override'] || '',
          'namespace-method-queryParams': payload['namespace-method-queryParams'],
          'namespace-method-header': payload['namespace-method-header'],
          'save-data': payload['save-data'],
          'isInitialized': payload['isInitialized'],
          'tags': payload['tags'] || [],
          'sample-request': {},
          'sample-response': {},
          'request-schema': {},
          'response-schema': {}
        };
      } else if (editingMethod) {
        // For existing methods, update fields while preserving ID and other data
        updatedLocalMethod = {
          ...editingMethod,
          'namespace-method-name': payload['namespace-method-name'],
          'namespace-method-type': payload['namespace-method-type'],
          'namespace-method-url-override': payload['namespace-method-url-override'] || editingMethod['namespace-method-url-override'],
          'namespace-method-queryParams': payload['namespace-method-queryParams'],
          'namespace-method-header': payload['namespace-method-header'],
          'save-data': payload['save-data'],
          'isInitialized': payload['isInitialized'],
          'tags': payload['tags'] || editingMethod['tags']
        };
      } else {
        throw new Error("Invalid state: Missing editing method");
      }

      // Make the API request
      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${isCreating ? 'create' : 'update'} method (${response.status}): ${errorText}`);
      }

      // If creating, try to get ID from response
      if (isCreating) {
        try {
          const data = await response.json();
          if (data && data['namespace-method-id']) {
            updatedLocalMethod['namespace-method-id'] = data['namespace-method-id'];
          }
        } catch {
          console.warn("Could not parse method ID from creation response");
        }
      }

      // Update state with our local copy (optimistic update)
      if (isCreating) {
        if (updatedLocalMethod['namespace-method-id']) {
          // Only add to list if we have an ID
          setMethods(prev => [...prev, updatedLocalMethod]);
        }
      } else {
        setMethods(prev => prev.map(m => 
          m['namespace-method-id'] === editingMethod?.['namespace-method-id'] 
            ? updatedLocalMethod 
            : m
        ));
      }

      // Reset form state
      setIsEditingMethod(false);
      setEditingMethod(null);
      
      toast.success(`Method ${isCreating ? 'created' : 'updated'} successfully!`);
      
      // Refresh the data from server to ensure consistency
      if (selectedNamespace) {
        console.log("Refreshing namespace details");
        fetchNamespaceDetails(selectedNamespace['namespace-id']);
      }
    } catch (error) {
      console.error('Error handling method:', error);
      toast.error(`Failed to ${editingMethod ? 'update' : 'create'} method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // setInitializingTable(null);
    }
  };

  // Add OAuth redirect handler
  const handleOAuthRedirect = (account: Account) => {
    console.log("Handling OAuth redirect for account:", account);
    
    const variables = account['variables'] || [];
    const clientId = variables.find((v) => v.key === 'client_id')?.value;
    const clientSecret = variables.find((v) => v.key === 'secret_key')?.value;
    const redirectUrl = variables.find((v) => v.key === 'redirect_uri')?.value;

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

    // Store account details in sessionStorage for retrieval after redirect
    sessionStorage.setItem('pinterestAccountDetails', JSON.stringify({
      clientId,
      clientSecret,
      redirectUrl,
      accountId: account['namespace-account-id']
    }));

    // Redirect to Pinterest OAuth
    window.location.href = authUrl.toString();
  };

  const handleFetchToken = useCallback(async (code: string, accountDetails: AccountDetails) => {
    try {
      // setTokenProcessing(accountDetails.accountId);
      
      // Use the correct API base URL
      const response = await fetch(`${API_BASE_URL}/pinterest/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          clientId: accountDetails.clientId,
          clientSecret: accountDetails.clientSecret,
          redirectUrl: accountDetails.redirectUrl
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch token';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse the token response
      const token = await response.json();
      console.log('Pinterest OAuth Token:', token);

      // Get the current account data
      const accountResponse = await fetch(`${API_BASE_URL}/api/accounts/${accountDetails.accountId}`);
      if (!accountResponse.ok) {
        const errorText = await accountResponse.text();
        throw new Error(`Failed to fetch account: ${errorText}`);
      }
      const currentAccount = await accountResponse.json();
      console.log('Current account data:', currentAccount);

      // Create updated account data with the new token
      const updatedAccount = {
        ...currentAccount,
        'namespace-account-header': [
          ...(currentAccount['namespace-account-header'] || []).filter((h: KeyValuePair) => h.key !== 'Authorization'),
          { key: 'Authorization', value: `Bearer ${token}` }
        ]
      };

      console.log('Updating account with:', updatedAccount);

      // Update the account on the backend
      const updateResponse = await fetch(`${API_BASE_URL}/api/accounts/${accountDetails.accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedAccount)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update account with token: ${errorText}`);
      }

      // Update local state
      setAccounts(prevAccounts => 
        prevAccounts.map(acc => 
          acc['namespace-account-id'] === accountDetails.accountId ? updatedAccount : acc
        )
      );

      // Remove code from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());

      toast.success('Pinterest token saved successfully!');
    } catch (error) {
      console.error('Error fetching Pinterest token:', error);
      toast.error(`Failed to fetch Pinterest token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // setTokenProcessing(null);
    }
  }, [setAccounts]);

  // Add useEffect for handling OAuth code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      const storedDetails = sessionStorage.getItem('pinterestAccountDetails');
      if (storedDetails) {
        const accountDetails = JSON.parse(storedDetails);
        handleFetchToken(code, accountDetails);
        sessionStorage.removeItem('pinterestAccountDetails');
      }
    }
  }, [handleFetchToken]);

  // Add the account selection handler
  const handleInitializeTableClick = (method: Method) => {
    setMethodForTable(method);
    setShowAccountSelector(true);
    setViewingMethod(null);
  };

  // Update the handleInitializeTable function
  const handleInitializeTable = async (method: Method, account: Account) => {
    try {
      if (!selectedNamespace) return;
      
      // setInitializingTable(method['namespace-method-id']);

      // Create table name from combination of namespace, account and method names
      const tableName = `${selectedNamespace['namespace-name']}_${account['namespace-account-name']}_${method['namespace-method-name']}`
        .replace(/\s+/g, '_')  // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace any other special chars with underscore
        .toLowerCase();

      console.log('Checking for existing table:', tableName);

      // First, check if table exists
      const tablesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables`);
      if (!tablesResponse.ok) {
        console.error('Failed to fetch tables:', tablesResponse.status);
        throw new Error('Failed to fetch existing tables');
      }

      const responseData = await tablesResponse.json();
      console.log('Tables response:', responseData);

      // Handle different possible response structures
      const existingTables = Array.isArray(responseData) ? responseData : 
                            responseData.tables ? responseData.tables : 
                            responseData.data ? responseData.data : [];
      
      console.log('Existing tables:', existingTables);

      const tableExists = existingTables.some((table: DynamoDBTable) => {
        const exists = table.name === tableName || table.TableName === tableName;
        console.log(`Comparing ${table.name || table.TableName} with ${tableName}: ${exists}`);
        return exists;
      });

      if (tableExists) {
        console.log(`Table ${tableName} already exists`);
        toast(`Table "${tableName}" already exists for ${account['namespace-account-name']}`, {
          style: { background: '#F0F9FF', color: '#0369A1' }
        });
        setShowAccountSelector(false);
        setMethodForTable(null);
        return;
      }

      console.log(`Table ${tableName} does not exist, proceeding with creation`);

      // Create table in DynamoDB
      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dynamodb/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          TableName: tableName,
          KeySchema: [
            {
              AttributeName: "id",
              KeyType: "HASH"
            }
          ],
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S"
            }
          ],
          BillingMode: "PAY_PER_REQUEST"
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => null);
        console.error('Table creation failed you table might be already created:', errorData);
        throw new Error(errorData?.message || 'Failed to create table');
      }

      console.log('Table created successfully');
      toast.success(`Table "${tableName}" created successfully for ${account['namespace-account-name']}!`);
      setShowAccountSelector(false);
      setMethodForTable(null);
    } catch (error) {
      console.error('Error in handleInitializeTable:', error);
      toast.error('Failed to initialize table your table might be already created: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // setInitializingTable(null);
    }
  };

  // Fetch namespaces on component mount
  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  // Add the new view functions after other handler functions
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  const [viewingMethod, setViewingMethod] = useState<Method | null>(null);
  
  const handleViewAccount = (account: Account) => {
    setViewingAccount(account);
  };
  
  const handleViewMethod = (method: Method) => {
    setViewingMethod(method);
    // Filter webhooks for this method from allWebhooks
    const methodWebhooks = allWebhooks.filter(webhook => webhook.methodId === method['namespace-method-id']);
    console.log('Method ID:', method['namespace-method-id']);
    console.log('All webhooks:', allWebhooks);
    console.log('Filtered webhooks for method:', methodWebhooks);
    setWebhooks(methodWebhooks);
  };

  // Add this new function at the component level to handle outside clicks
  const handleOutsideClick = (closeFunction: () => void) => {
    closeFunction();
  };

  // Function to handle testing a method
  const handleTestMethod = (method: Method) => {
    setTestingMethod(method);
    setIsMethodTestModalOpen(true);
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.route || !webhookForm.tableName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Create webhook data
      const webhookData: WebhookData = {
        id: crypto.randomUUID(),
        methodId: viewingMethod?.['namespace-method-id'] || '',
        route: webhookForm.route,
        tableName: webhookForm.tableName,
        createdAt: new Date().toISOString()
      };

      // Save to DynamoDB using backend API
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/webhooks/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: webhookData.id,
          methodId: webhookData.methodId,
          route: webhookData.route,
          tableName: webhookData.tableName,
          createdAt: webhookData.createdAt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save webhook');
      }

      // Update local state
      setAllWebhooks(prev => [...prev, webhookData]);
      setWebhooks(prev => [...prev, webhookData]);
      setWebhookForm({ route: '', tableName: '' });
      setShowWebhookForm(false);
      toast.success('Webhook added successfully');
    } catch (error) {
      console.error('Error adding webhook:', error);
      toast.error('Failed to add webhook: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      // Delete from DynamoDB using backend API
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/webhooks/items/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Key: {
            id: {
              S: webhookId
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to delete webhook');
      }

      // Update local state
      setAllWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      toast.success('Webhook deleted successfully');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const fetchAllWebhooks = async () => {
    try {
      console.log('Fetching all webhooks...');
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/webhooks/items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch webhooks');
      }

      const data = await response.json();
      console.log('Raw webhook data from API:', data);
      
      // Transform DynamoDB items to WebhookData, handling the DynamoDB attribute format
      const webhooksList: WebhookData[] = (data.items || []).map((item: DynamoDBWebhookItem) => ({
        id: item.id.S,
        methodId: item.methodId.S,
        route: item.route.S,
        tableName: item.tableName.S,
        createdAt: item.createdAt.S
      }));

      console.log('Transformed webhooks list:', webhooksList);
      setAllWebhooks(webhooksList);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Failed to fetch webhooks: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Add useEffect to fetch all webhooks when component mounts
  useEffect(() => {
    console.log('Component mounted, fetching webhooks...');
    fetchAllWebhooks();
  }, []);

  // Function to fetch all executions
  const fetchAllExecutions = async () => {
    try {
      console.log('Fetching all executions...');
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/executions/items`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }

      const data = await response.json();
      console.log('Received executions data:', data);
      const logs = data.items.map((item: DynamoDBItem) => ({
        'exec-id': item['exec-id'].S,
        'child-exec-id': item['child-exec-id'].S,
        data: {
          'request-url': item.data['M']['request-url']?.S || '',
          'status': item.data['M']['status']?.S || 'In Progress',
          'total-items-processed': parseInt(item.data['M']['total-items-processed']?.N || '0', 10),
          'iteration-no': parseInt(item.data['M']['iteration-no']?.N || '0', 10),
          'items-in-current-page': parseInt(item.data['M']['items-in-current-page']?.N || '0', 10),
          'response-status': parseInt(item.data['M']['response-status']?.N || '0', 10),
          'pagination-type': item.data['M']['pagination-type']?.S || '',
          'timestamp': item.data['M']['timestamp']?.S || new Date().toISOString(),
          'is-last': item.data['M']['is-last']?.BOOL || false
        }
      }));
      
      // Sort logs by timestamp in descending order (newest first)
      const sortedLogs = logs.sort((a: ExecutionLog, b: ExecutionLog) => {
        const dateA = new Date(a.data.timestamp);
        const dateB = new Date(b.data.timestamp);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('Processed logs:', sortedLogs);
      setAllExecutions(sortedLogs);
    } catch (error) {
      console.error('Error fetching all executions:', error);
    }
  };

  // Function to clear execution ID from URL and localStorage
  const clearExecutionId = useCallback(() => {
    // Clear from localStorage
    localStorage.removeItem('currentExecutionId');
    // Clear from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url.toString());
    // Clear from state
    setCurrentExecutionId(null);
  }, []);

  // Function to fetch execution logs for a specific execution
  const fetchExecutionLogs = useCallback(async () => {
    if (!currentExecutionId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/executions/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          KeyConditionExpression: "#execId = :execId",
          ExpressionAttributeNames: {
            "#execId": "exec-id"
          },
          ExpressionAttributeValues: {
            ":execId": currentExecutionId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch execution logs');
      }

      const data = await response.json();
      
      // If no items are found, increment retry counter
      if (!data.items || data.items.length === 0) {
        setRetryCount(prev => prev + 1);
        if (retryCount >= MAX_RETRIES) {
          console.log('No execution found after maximum retries, stopping polling');
          setIsPolling(false);
          clearExecutionId();
          return;
        }
        return;
      }
      
      // Reset retry counter if we found items
      setRetryCount(0);
      
      const logs = data.items as ExecutionLog[];
      
      // Sort logs: parent first, then children by iteration number
      const sortedLogs = logs.sort((a, b) => {
        if (a['exec-id'] === a['child-exec-id'] && b['exec-id'] !== b['child-exec-id']) return -1;
        if (a['exec-id'] !== a['child-exec-id'] && b['exec-id'] === b['child-exec-id']) return 1;
        return a.data['iteration-no'] - b.data['iteration-no'];
      });

      setExecutionLogs(sortedLogs);

      // Check if we should stop polling
      const parentLog = logs.find(log => log['exec-id'] === log['child-exec-id']);
      if (parentLog?.data.status === 'completed' || parentLog?.data.status === 'error') {
        setIsPolling(false);
        clearExecutionId(); // Clear execution ID when completed or error
      }
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      setIsPolling(false);
      clearExecutionId(); // Clear execution ID on error
    }
  }, [currentExecutionId, retryCount, clearExecutionId, MAX_RETRIES]);

  // Polling effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isPolling && currentExecutionId) {
      console.log('Starting polling for execution ID:', currentExecutionId);
      fetchExecutionLogs(); // Initial fetch
      pollInterval = setInterval(fetchExecutionLogs, 2000); // Poll every 2 seconds instead of 1
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      // Reset retry counter when polling stops
      setRetryCount(0);
    };
  }, [isPolling, currentExecutionId, fetchExecutionLogs]);

  // Function to get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'inProgress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to toggle execution expansion
  const toggleExpansion = (execId: string) => {
    const newExpanded = new Set(expandedExecutions);
    if (newExpanded.has(execId)) {
      newExpanded.delete(execId);
    } else {
      newExpanded.add(execId);
    }
    setExpandedExecutions(newExpanded);
  };

  // Effect to fetch all executions when logs sidebar is opened
  useEffect(() => {
    if (showLogsSidebar) {
      fetchAllExecutions();
    }
  }, [showLogsSidebar]);

  // Effect to read execution ID from URL and localStorage
  useEffect(() => {
    const id = localStorage.getItem('currentExecutionId');
    if (id) {
      console.log('Setting execution ID:', id);
      setCurrentExecutionId(id);
      setIsPolling(true);
      setExecutionLogs([]); // Clear previous logs
      setExpandedExecutions(new Set()); // Reset expanded state
      setShowLogsSidebar(true); // Open the sidebar
    }
  }, []);



  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      <div className="p-4 md:p-6 lg:p-8 max-w-[1920px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
          <div className="flex items-center gap-3">
            <Database className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Namespaces</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Search namespaces..."
                className="w-64 pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowLogsSidebar(true)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Activity size={12} className="mr-1" />
              Logs
            </button>
            <button
              onClick={() => {
                setIsAddingNamespace(true);
                setEditingNamespace(null);
                setNewNamespace({
                  'namespace-name': '',
                  'namespace-url': '',
                  tags: []
                });
              }}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={12} className="mr-1" />
               Namespace
            </button>
          </div>
        </div>

        {/* Namespaces Grid */}
        <div className="mb-6">
          <div className="w-full overflow-hidden">
            <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 flex-nowrap md:flex-wrap gap-3 overflow-x-auto md:overflow-x-visible pb-2 hide-scrollbar">
              {filteredNamespaces.length > 0 ? (
                filteredNamespaces.map((namespace) => (
                  <div 
                    key={namespace['namespace-id']} 
                    className={`flex-none md:flex-auto w-[160px] md:w-auto ${
                      selectedNamespace?.['namespace-id'] === namespace['namespace-id']
                        ? 'border-blue-500'
                        : 'border-blue-100'
                    } bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border p-2 hover:shadow-md transition-all cursor-pointer hover:scale-105`}
                    onClick={() => handleNamespaceClick(namespace)}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <Database size={10} className="text-blue-600" />
                          <span className="text-[10px] font-medium truncate text-blue-900">{namespace['namespace-name']}</span>
                        </div>
                        <span className="text-[8px] text-blue-600/70 block truncate">{namespace['namespace-url']}</span>
                      </div>
                      <div className="flex items-start gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(namespace);
                          }}
                          className="p-1 hover:bg-blue-100/50 rounded-full"
                          title="Edit Namespace"
                        >
                          <Edit2 size={10} className="text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNamespace(namespace['namespace-id']);
                          }}
                          className="p-1 hover:bg-red-100/50 rounded-full"
                          title="Delete Namespace"
                        >
                          <Trash2 size={10} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                    {namespace.tags && namespace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {namespace.tags.slice(0, 2).map((tag, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-[8px] font-medium text-blue-700 border border-blue-100/50"
                          >
                            <span className="w-1 h-1 rounded-full bg-blue-500 mr-1"></span>
                            {tag}
                          </span>
                        ))}
                        {namespace.tags.length > 2 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-[8px] font-medium text-blue-600">
                            +{namespace.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="w-full flex items-center justify-center py-12 text-gray-500">
                  <p className="text-center">No namespaces found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add this style block at the top of your component */}
        <style jsx global>{`
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;  /* Chrome, Safari and Opera */
          }
        `}</style>

        {/* Accounts and Methods Section */}
        {selectedNamespace && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {/* Accounts Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
              <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={accountSearchQuery}
                      onChange={(e) => setAccountSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingAccount(null);
                      setEditFormData(prevState => ({
                        ...prevState,
                        account: {
                          'namespace-account-name': '',
                          'namespace-account-url-override': '',
                          'namespace-account-header': [],
                          'variables': [],
                          'tags': []
                        }
                      }));
                      setIsEditingAccount(true);
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus size={12} className="mr-1" />
                  Account
                  </button>
                </div>
              </div>

              {/* Accounts Grid */}
              <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {accounts.map((account) => (
                    <div
                      key={account['namespace-account-id']}
                      onClick={() => handleViewAccount(account)}
                      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-100 p-2 hover:shadow-md transition-all cursor-pointer hover:scale-105"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-1">
                            <User size={10} className="text-purple-600" />
                            <span className="text-[10px] font-medium truncate text-purple-900">{account['namespace-account-name']}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAccount(account);
                            }}
                            className="p-1 hover:bg-purple-100/50 rounded-full"
                            title="Edit Account"
                          >
                            <Edit2 size={10} className="text-purple-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(account['namespace-account-id']);
                            }}
                            className="p-1 hover:bg-red-100/50 rounded-full"
                            title="Delete Account"
                          >
                            <Trash2 size={10} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      {account.tags && account.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {account.tags.slice(0, 2).map((tag, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-[8px] font-medium text-purple-700 border border-purple-100/50"
                            >
                              <span className="w-1 h-1 rounded-full bg-purple-500 mr-1"></span>
                              {tag}
                            </span>
                          ))}
                          {account.tags.length > 2 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-50 text-[8px] font-medium text-purple-600">
                              +{account.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Methods Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
              <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
                <div className="flex items-center gap-3">
                  <Code className="text-blue-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Methods</h2>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="text"
                      placeholder="Search methods..."
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={methodSearchQuery}
                      onChange={(e) => setMethodSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingMethod(null);
                      setEditFormData(prevState => ({
                        ...prevState,
                        method: {
                          'namespace-method-name': '',
                          'namespace-method-type': 'GET',
                          'namespace-method-url-override': '',
                          'namespace-method-queryParams': [],
                          'namespace-method-header': [],
                          'save-data': false,
                          'tags': []
                        }
                      }));
                      setIsEditingMethod(true);
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus size={12} className="mr-1" />
                     Method
                  </button>
                </div>
              </div>

              {/* Methods Grid */}
              <div className="w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {methods.map((method) => (
                    <div
                      key={method['namespace-method-id']}
                      onClick={() => handleViewMethod(method)}
                      className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg shadow-sm border border-emerald-100 p-2.5 hover:shadow-md transition-all cursor-pointer hover:scale-105 relative"
                    >
                      {/* Method Type Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {method['namespace-method-type']}
                        </span>
                        <div className="flex items-start gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestMethod(method);
                            }}
                            className="p-1 hover:bg-emerald-100/50 rounded-full"
                            title="Test Method"
                          >
                            <Play size={10} className="text-emerald-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMethod(method);
                            }}
                            className="p-1 hover:bg-emerald-100/50 rounded-full"
                            title="Edit Method"
                          >
                            <Edit2 size={10} className="text-emerald-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMethod(method['namespace-method-id']);
                            }}
                            className="p-1 hover:bg-red-100/50 rounded-full"
                            title="Delete Method"
                          >
                            <Trash2 size={10} className="text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Method Name */}
                      <div className="flex items-center gap-2">
                        <Code size={12} className="text-emerald-600 flex-shrink-0" />
                        <h3 className="text-[11px] font-medium text-emerald-900 truncate">
                          {method['namespace-method-name']}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Namespace Modal */}
        {isAddingNamespace && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => handleOutsideClick(() => {
              setIsAddingNamespace(false);
              setEditingNamespace(null);
              setNewNamespace({
                'namespace-name': '',
                'namespace-url': '',
                tags: []
              });
            })}
          >
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingNamespace ? 'Edit Namespace' : 'Create New Namespace'}
                </h2>
                <button
                  onClick={() => {
                    setIsAddingNamespace(false);
                    setEditingNamespace(null);
                    setNewNamespace({
                      'namespace-name': '',
                      'namespace-url': '',
                      tags: []
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Namespace Name *</label>
                  <input
                    type="text"
                    value={newNamespace['namespace-name']}
                    onChange={(e) => setNewNamespace({ ...newNamespace, 'namespace-name': e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter namespace name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Namespace URL *</label>
                  <input
                    type="text"
                    value={newNamespace['namespace-url']}
                    onChange={(e) => setNewNamespace({ ...newNamespace, 'namespace-url': e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter namespace URL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={newNamespace.tags.join(', ')}
                    onChange={(e) => setNewNamespace({
                      ...newNamespace,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter tags (comma-separated)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddingNamespace(false);
                    setEditingNamespace(null);
                    setNewNamespace({
                      'namespace-name': '',
                      'namespace-url': '',
                      tags: []
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingNamespace ? handleEditNamespace : handleCreateNamespace}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  {editingNamespace ? 'Update Namespace' : 'Create Namespace'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Account Modal */}
        {isEditingAccount && !editingAccount && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            key="create-account-modal"
            onClick={() => handleOutsideClick(() => {
              setIsEditingAccount(false);
              setEditingAccount(null);
            })}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">
                Create Account
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.account['namespace-account-name']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'namespace-account-name': e.target.value
                      }
                    })}
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
                    value={editFormData.account['namespace-account-url-override']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'namespace-account-url-override': e.target.value
                      }
                    })}
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        account: {
                          ...editFormData.account,
                          'namespace-account-header': [...editFormData.account['namespace-account-header'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.account['namespace-account-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.account['namespace-account-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.account['namespace-account-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = editFormData.account['namespace-account-header'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        account: {
                          ...editFormData.account,
                          'variables': [...editFormData.account['variables'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Variable
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.account['variables'].map((variable, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={variable.key}
                          onChange={(e) => {
                            const updatedVariables = [...editFormData.account['variables']];
                            updatedVariables[index] = { ...variable, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={variable.value}
                          onChange={(e) => {
                            const updatedVariables = [...editFormData.account['variables']];
                            updatedVariables[index] = { ...variable, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedVariables = editFormData.account['variables'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
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
                    value={editFormData.account.tags.join(', ')}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditingAccount(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {isEditingAccount && editingAccount && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            key={`edit-account-${editingAccount['namespace-account-id']}`}
            onClick={() => handleOutsideClick(() => {
              setIsEditingAccount(false);
              setEditingAccount(null);
            })}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">
                Edit Account
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.account['namespace-account-name']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'namespace-account-name': e.target.value
                      }
                    })}
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
                    value={editFormData.account['namespace-account-url-override']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'namespace-account-url-override': e.target.value
                      }
                    })}
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        account: {
                          ...editFormData.account,
                          'namespace-account-header': [...editFormData.account['namespace-account-header'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.account['namespace-account-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.account['namespace-account-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.account['namespace-account-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = editFormData.account['namespace-account-header'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'namespace-account-header': updatedHeaders
                              }
                            });
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        account: {
                          ...editFormData.account,
                          'variables': [...editFormData.account['variables'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Variable
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.account['variables'].map((variable, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={variable.key}
                          onChange={(e) => {
                            const updatedVariables = [...editFormData.account['variables']];
                            updatedVariables[index] = { ...variable, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={variable.value}
                          onChange={(e) => {
                            const updatedVariables = [...editFormData.account['variables']];
                            updatedVariables[index] = { ...variable, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedVariables = editFormData.account['variables'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              account: {
                                ...editFormData.account,
                                'variables': updatedVariables
                              }
                            });
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
                    value={editFormData.account.tags.join(', ')}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      account: {
                        ...editFormData.account,
                        'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditingAccount(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAccount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Update Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Method Modal */}
        {isEditingMethod && !editingMethod && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            key="create-method-modal"
            onClick={() => handleOutsideClick(() => {
              setIsEditingMethod(false);
              setEditingMethod(null);
            })}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">
                Create Method
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.method['namespace-method-name']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-name': e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Type *
                  </label>
                  <select
                    value={editFormData.method['namespace-method-type']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-type': e.target.value
                      }
                    })}
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
                    value={editFormData.method['namespace-method-url-override']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-url-override': e.target.value
                      }
                    })}
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        method: {
                          ...editFormData.method,
                          'namespace-method-queryParams': [...editFormData.method['namespace-method-queryParams'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Query Parameter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.method['namespace-method-queryParams'].map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => {
                            const updatedParams = [...editFormData.method['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => {
                            const updatedParams = [...editFormData.method['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedParams = editFormData.method['namespace-method-queryParams'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        method: {
                          ...editFormData.method,
                          'namespace-method-header': [...editFormData.method['namespace-method-header'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.method['namespace-method-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.method['namespace-method-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.method['namespace-method-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = editFormData.method['namespace-method-header'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
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
                    value={editFormData.method.tags.join(', ')}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-data-create"
                    checked={editFormData.method['save-data']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'save-data': e.target.checked
                      }
                    })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="save-data-create" className="text-sm text-gray-700">
                    Save Data
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditingMethod(false);
                    setEditingMethod(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMethod}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Method
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Method Modal */}
        {isEditingMethod && editingMethod && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            key={`edit-method-${editingMethod['namespace-method-id']}`}
            onClick={() => handleOutsideClick(() => {
              setIsEditingMethod(false);
              setEditingMethod(null);
            })}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">
                Edit Method
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.method['namespace-method-name']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-name': e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Type *
                  </label>
                  <select
                    value={editFormData.method['namespace-method-type']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-type': e.target.value
                      }
                    })}
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
                    value={editFormData.method['namespace-method-url-override']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'namespace-method-url-override': e.target.value
                      }
                    })}
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        method: {
                          ...editFormData.method,
                          'namespace-method-queryParams': [...editFormData.method['namespace-method-queryParams'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Query Parameter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.method['namespace-method-queryParams'].map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={param.key}
                          onChange={(e) => {
                            const updatedParams = [...editFormData.method['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => {
                            const updatedParams = [...editFormData.method['namespace-method-queryParams']];
                            updatedParams[index] = { ...param, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedParams = editFormData.method['namespace-method-queryParams'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-queryParams': updatedParams
                              }
                            });
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
                      onClick={() => setEditFormData({
                        ...editFormData,
                        method: {
                          ...editFormData.method,
                          'namespace-method-header': [...editFormData.method['namespace-method-header'], { key: '', value: '' }]
                        }
                      })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editFormData.method['namespace-method-header'].map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.method['namespace-method-header']];
                            updatedHeaders[index] = { ...header, key: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const updatedHeaders = [...editFormData.method['namespace-method-header']];
                            updatedHeaders[index] = { ...header, value: e.target.value };
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
                          }}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHeaders = editFormData.method['namespace-method-header'].filter((_, i) => i !== index);
                            setEditFormData({
                              ...editFormData,
                              method: {
                                ...editFormData.method,
                                'namespace-method-header': updatedHeaders
                              }
                            });
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
                    value={editFormData.method.tags.join(', ')}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'tags': e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-data-edit"
                    checked={editFormData.method['save-data']}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      method: {
                        ...editFormData.method,
                        'save-data': e.target.checked
                      }
                    })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="save-data-edit" className="text-sm text-gray-700">
                    Save Data
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsEditingMethod(false);
                    setEditingMethod(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMethod}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Update Method
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Selection Modal */}
        {showAccountSelector && methodForTable && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => handleOutsideClick(() => {
              setShowAccountSelector(false);
              
              setMethodForTable(null);
            })}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-semibold mb-4">Select Account for Table Initialization</h3>
              <div className="max-h-[60vh] overflow-y-auto">
                {accounts.map((account) => (
                  <div
                    key={account['namespace-account-id']}
                    onClick={() => handleInitializeTable(methodForTable, account)}
                    className="p-4 border border-gray-200 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{account['namespace-account-name']}</p>
                        <p className="text-sm text-gray-600">ID: {account['namespace-account-id']}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAccountSelector(false);
                    setMethodForTable(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Account Modal */}
        {viewingAccount && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => handleOutsideClick(() => setViewingAccount(null))}
          >
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="text-blue-600" size={16} />
                  </div>
                  <h3 className="text-base sm:text-xl font-semibold truncate">{viewingAccount['namespace-account-name']}</h3>
                </div>
                <button
                  onClick={() => setViewingAccount(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">ID</p>
                  <p className="text-xs sm:text-sm font-mono break-all">{viewingAccount['namespace-account-id']}</p>
                </div>
                
                {viewingAccount['namespace-account-url-override'] && (
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">URL Override</p>
                    <p className="text-xs sm:text-sm font-mono break-all">{viewingAccount['namespace-account-url-override']}</p>
                  </div>
                )}
              </div>
              
              {viewingAccount['namespace-account-header'] && viewingAccount['namespace-account-header'].length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Headers</h4>
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                    {viewingAccount['namespace-account-header'].map((header, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="text-xs sm:text-sm font-medium text-gray-700 break-all">{header.key}</div>
                        <div className="text-xs sm:text-sm text-gray-600 font-mono break-all">{header.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingAccount['variables'] && viewingAccount['variables'].length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Variables</h4>
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                    {viewingAccount['variables'].map((variable, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="text-xs sm:text-sm font-medium text-gray-700 break-all">{variable.key}</div>
                        <div className="text-xs sm:text-sm text-gray-600 font-mono break-all">{variable.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingAccount.tags && viewingAccount.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingAccount.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end items-center gap-2">
                <button
                  onClick={() => handleOAuthRedirect(viewingAccount)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Fetch Token"
                >
                  <Key size={16} />
                </button>
                <button
                  onClick={() => {
                    handleEditAccount(viewingAccount);
                    setViewingAccount(null);
                  }}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="Edit Account"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => {
                    handleDeleteAccount(viewingAccount['namespace-account-id']);
                    setViewingAccount(null);
                  }}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  title="Delete Account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* View Method Modal */}
        {viewingMethod && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => handleOutsideClick(() => setViewingMethod(null))}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 text-xs rounded-full font-medium ${
                    viewingMethod['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' :
                    viewingMethod['namespace-method-type'] === 'POST' ? 'bg-blue-100 text-blue-700' :
                    viewingMethod['namespace-method-type'] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                    viewingMethod['namespace-method-type'] === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {viewingMethod['namespace-method-type']}
                  </div>
                  <h3 className="text-xl font-semibold">{viewingMethod['namespace-method-name']}</h3>
                </div>
                <button
                  onClick={() => setViewingMethod(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500 mb-1">ID</p>
                  <p className="text-sm font-mono">{viewingMethod['namespace-method-id']}</p>
                </div>
                
                {viewingMethod['namespace-method-url-override'] && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">URL Override</p>
                    <p className="text-sm font-mono">{viewingMethod['namespace-method-url-override']}</p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {viewingMethod['namespace-method-queryParams'] && viewingMethod['namespace-method-queryParams'].length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Query Parameters</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {viewingMethod['namespace-method-queryParams'].map((param, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          <div className="text-sm font-medium text-gray-700">{param.key}</div>
                          <div className="text-sm text-gray-600 font-mono truncate">{param.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {viewingMethod['namespace-method-header'] && viewingMethod['namespace-method-header'].length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Headers</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {viewingMethod['namespace-method-header'].map((header, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          <div className="text-sm font-medium text-gray-700">{header.key}</div>
                          <div className="text-sm text-gray-600 font-mono truncate">{header.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {viewingMethod.tags && viewingMethod.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingMethod.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 mb-4">
                <Save className="text-gray-400" size={14} />
                <span className="text-sm text-gray-600">Save Data:</span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  viewingMethod['save-data'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {viewingMethod['save-data'] ? 'Yes' : 'No'}
                </span>
              </div>
              
              {/* Webhook Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Webhooks</h4>
                  <button
                    onClick={() => setShowWebhookForm(!showWebhookForm)}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Bell size={14} />
                    {showWebhookForm ? 'Cancel' : 'Register Webhook'}
                  </button>
                </div>

                {/* Webhook Form */}
                {showWebhookForm && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Route *
                        </label>
                        <input
                          type="text"
                          value={webhookForm.route}
                          onChange={(e) => setWebhookForm({ ...webhookForm, route: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter webhook route"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Table Name *
                        </label>
                        <input
                          type="text"
                          value={webhookForm.tableName}
                          onChange={(e) => setWebhookForm({ ...webhookForm, tableName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter table name"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddWebhook}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Add Webhook
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Webhooks List */}
                <div className="bg-gray-50 rounded-lg p-3">
                  {webhooks.length > 0 ? (
                    <div className="space-y-3">
                      {webhooks.map((webhook) => (
                        <div key={webhook.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{webhook.route}</p>
                            <p className="text-xs text-gray-500">Table: {webhook.tableName}</p>
                            <p className="text-xs text-gray-400 mt-1">Created: {new Date(webhook.createdAt).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No webhooks registered for this method.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    handleTestMethod(viewingMethod);
                    setViewingMethod(null);
                  }}
                  className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center"
                  title="Test Method"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => handleInitializeTableClick(viewingMethod)}
                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
                  title="Initialize Table"
                >
                  <Database size={16} />
                </button>
                <button
                  onClick={() => {
                    handleEditMethod(viewingMethod);
                    setViewingMethod(null);
                  }}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="Edit Method"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => {
                    handleDeleteMethod(viewingMethod['namespace-method-id']);
                    setViewingMethod(null);
                  }}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  title="Delete Method"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Method Test Modal */}
      {testingMethod && (
        <MethodTestModal 
          isOpen={isMethodTestModalOpen}
          onClose={() => setIsMethodTestModalOpen(false)}
          namespaceId={testingMethod['namespace-id']}
          methodName={testingMethod['namespace-method-name']}
          methodType={testingMethod['namespace-method-type']}
          namespaceMethodUrlOverride={testingMethod['namespace-method-url-override']}
          saveData={testingMethod['save-data']}
        />
      )}

      {/* Logs Sidebar */}
      {showLogsSidebar && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl z-50 flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Execution Logs</h2>
            <button
              onClick={() => setShowLogsSidebar(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Current Execution Section */}
            {currentExecutionId && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Execution</h3>
                <div className="space-y-4">
                  {executionLogs.map((log) => (
                    <div key={log['child-exec-id']} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          {log['exec-id'] === log['child-exec-id'] ? 'Parent Execution' : `Iteration ${log.data['iteration-no']}`}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.data.status)}`}>
                          {log.data.status || 'In Progress'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>URL: {log.data['request-url']}</div>
                        <div>Items Processed: {log.data['total-items-processed']}</div>
                        <div>Response Status: {log.data['response-status']}</div>
                        {log.data['is-last'] && <div className="text-blue-600">Final Iteration</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Executions Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">All Executions</h3>
              <div className="space-y-4">
                {allExecutions
                  .filter(log => log['exec-id'] === log['child-exec-id']) // Only show parent executions
                  .map((parentLog) => (
                    <div key={parentLog['exec-id']} 
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
                      onClick={() => toggleExpansion(parentLog['exec-id'])}
                    >
                      {/* Parent execution header */}
                      <div className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {expandedExecutions.has(parentLog['exec-id']) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <div className="text-sm font-medium text-gray-900">
                              Execution ID: {parentLog['exec-id']}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(parentLog.data.status)}`}>
                            {parentLog.data.status || 'In Progress'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>URL: {parentLog.data['request-url']}</div>
                          <div>Items Processed: {parentLog.data['total-items-processed']}</div>
                          <div>Response Status: {parentLog.data['response-status']}</div>
                          <div className="text-gray-400">{new Date(parentLog.data.timestamp).toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Child executions */}
                      {expandedExecutions.has(parentLog['exec-id']) && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          <div className="divide-y divide-gray-200">
                            {allExecutions
                              .filter(child => child['exec-id'] === parentLog['exec-id'] && child['child-exec-id'] !== parentLog['exec-id'])
                              .sort((a, b) => a.data['iteration-no'] - b.data['iteration-no'])
                              .map(child => (
                                <div key={child['child-exec-id']} className="p-4 pl-8">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium text-gray-900">
                                      Iteration {child.data['iteration-no']}
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(child.data.status)}`}>
                                      {child.data.status || 'In Progress'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 space-y-1">
                                    <div>Items in Page: {child.data['items-in-current-page']}</div>
                                    <div>Response Status: {child.data['response-status']}</div>
                                    {child.data['is-last'] && <div className="text-blue-600">Final Iteration</div>}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isPolling && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Polling for updates...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NamespacePage;