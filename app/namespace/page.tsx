'use client';
import React, { useState, useEffect, useCallback, MouseEvent, SetStateAction, useMemo } from 'react';
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
  Play
} from 'react-feather';
import { toast, Toaster } from 'react-hot-toast';
import MethodTestModal from '../components/MethodTestModal';
import { log } from 'console';

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

interface DynamoDBItem {
  id: string;
  data: {
    'namespace-name': { S: string };
    'namespace-url': { S: string };
    tags?: { L: Array<{ S: string }> };
  };
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
  const [tokenProcessing, setTokenProcessing] = useState<string | null>(null);
  const [initializingTable, setInitializingTable] = useState<string | null>(null);

  // Add new state variables after other state declarations
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [methodForTable, setMethodForTable] = useState<Method | null>(null);

  const [isMethodTestModalOpen, setIsMethodTestModalOpen] = useState(false);
  const [testingMethod, setTestingMethod] = useState<any>(null);

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
  const accountsList = accounts.filter(account => {
    const searchLower = accountSearchQuery.toLowerCase();
    return (
      account['namespace-account-name'].toLowerCase().includes(searchLower) ||
      account['namespace-account-url-override']?.toLowerCase().includes(searchLower) ||
      account.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // Update methods list to use filteredMethods
  const methodsList = methods.filter(method => {
    const searchLower = methodSearchQuery.toLowerCase();
    return (
      method['namespace-method-name'].toLowerCase().includes(searchLower) ||
      method['namespace-method-type'].toLowerCase().includes(searchLower) ||
      method.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

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
  const handleNamespaceClick = (namespace: Namespace, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('button')) {
      setSelectedNamespace(namespace);
      fetchNamespaceDetails(namespace['namespace-id']);
    }
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
      const transformedData = rawData.map((item: DynamoDBItem) => ({
        'namespace-id': item.id,
        'namespace-name': item.data['namespace-name'].S,
        'namespace-url': item.data['namespace-url'].S,
        'tags': Array.isArray(item.data.tags?.L) ? item.data.tags.L.map((tag) => tag.S) : []
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
  const handleDeleteNamespace = async (namespaceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this namespace?')) {
      try {
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
      }
    }
  };

  /**
   * Handles editing a namespace
   */
  const handleEditNamespace = async () => {
    try {
      if (!editingNamespace) return;

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
    }
  };

  /**
   * Opens the edit form for a namespace
   */
  const handleEditClick = (namespace: Namespace, event: React.MouseEvent) => {
    event.stopPropagation();
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
    console.log('Editing account:', account);
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
    console.log('Editing method:', method);
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
        } catch (e) {
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
    }
  };

  const handleUpdateMethod = async () => {
    try {
      // Validate required fields
      if (!editFormData.method['namespace-method-name'] || !editFormData.method['namespace-method-type']) {
        alert('Method name and type are required');
        return;
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
        } catch (e) {
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
    }
  };

  // Add OAuth redirect handler
  const handleOAuthRedirect = useCallback(async (account: Account) => {
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
  }, []);

  const handleFetchToken = useCallback(async (code: string, accountDetails: AccountDetails) => {
    try {
      setTokenProcessing(accountDetails.accountId);
      
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
        } catch (e) {
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
      setTokenProcessing(null);
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
  };

  // Update the handleInitializeTable function
  const handleInitializeTable = async (method: Method, account: Account) => {
    try {
      if (!selectedNamespace) return;
      
      setInitializingTable(method['namespace-method-id']);

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
      setInitializingTable(null);
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
  };

  // Add this new function at the component level to handle outside clicks
  const handleOutsideClick = (e: React.MouseEvent, closeFunction: () => void) => {
    // Only close if the click was directly on the backdrop (the outer div)
    if (e.target === e.currentTarget) {
      closeFunction();
    }
  };

  // Function to handle testing a method
  const handleTestMethod = (method: any) => {
    setTestingMethod(method);
    setIsMethodTestModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      <div className="p-6 md:p-8 max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search namespaces..."
                value={searchQuery}
                className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  title="Clear search"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setEditingNamespace(null);
              setNewNamespace({
                'namespace-name': '',
                'namespace-url': '',
                tags: []
              });
              setIsAddingNamespace(true);
            }}
            className="w-full sm:w-auto p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
            title="Create Namespace"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Namespaces Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {filteredNamespaces.length > 0 ? (
            filteredNamespaces.map((namespace) => (
              <div 
                key={namespace['namespace-id']} 
                className={`bg-white rounded-lg shadow-sm border ${
                  selectedNamespace?.['namespace-id'] === namespace['namespace-id']
                    ? 'border-blue-500'
                    : 'border-gray-100'
                } p-2 sm:p-2.5 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group relative`}
                onClick={(e) => handleNamespaceClick(namespace, e)}
              >
                <h2 className="text-sm font-medium text-gray-800 truncate pr-12 group-hover:text-blue-600 transition-colors">
                  {namespace['namespace-name'] || 'Unnamed Namespace'}
                </h2>
                <div 
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1"
                >
                  <button
                    onClick={(e) => handleEditClick(namespace, e)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all"
                    title="Edit Namespace"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteNamespace(namespace['namespace-id'], e)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                    title="Delete Namespace"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center py-8 sm:py-12 text-gray-500">
              <p className="text-center">No namespaces found</p>
            </div>
          )}
        </div>

        {/* Accounts and Methods Section */}
        {selectedNamespace && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {/* Accounts Section */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Users className="text-blue-600" size={20} />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Accounts</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-56"
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
                      setTimeout(() => {
                        setIsEditingAccount(true);
                      }, 0);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Accounts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
                {accountsList.map((account) => (
                  <div 
                    key={account['namespace-account-id']} 
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 sm:p-3 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group relative"
                    onClick={() => handleViewAccount(account)}
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mb-1.5">
                      <User className="text-blue-600" size={12} />
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 truncate pr-12 mb-0.5">
                      {account['namespace-account-name']}
                    </h3>
                    
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAccount(account);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all"
                        title="Edit Account"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleDeleteAccount(account['namespace-account-id']);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                        title="Delete Account"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {accountsList.length === 0 && (
                  <div className="col-span-full flex items-center justify-center py-6 sm:py-8 text-gray-500">
                    <p className="text-center">No accounts found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Methods Section */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Code className="text-blue-600" size={20} />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Methods</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search methods..."
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-56"
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
                      setTimeout(() => {
                        setIsEditingMethod(true);
                      }, 0);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Methods Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
                {methodsList.map((method) => (
                  <div 
                    key={method['namespace-method-id']} 
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 sm:p-3 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group relative"
                    onClick={() => handleViewMethod(method)}
                  >
                    <div className={`inline-block px-1.5 py-0.5 text-[10px] rounded-full font-medium mb-1.5 ${
                      method['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' :
                      method['namespace-method-type'] === 'POST' ? 'bg-blue-100 text-blue-700' :
                      method['namespace-method-type'] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                      method['namespace-method-type'] === 'DELETE' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {method['namespace-method-type']}
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 truncate pr-12 mb-0.5">
                      {method['namespace-method-name']}
                    </h3>
                    
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestMethod(method);
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-all"
                        title="Test Method"
                      >
                        <Play size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMethod(method);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all"
                        title="Edit Method"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMethod(method['namespace-method-id']);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                        title="Delete Method"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {methodsList.length === 0 && (
                  <div className="col-span-full flex items-center justify-center py-6 sm:py-8 text-gray-500">
                    <p className="text-center">No methods found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Namespace Modal */}
        {isAddingNamespace && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => handleOutsideClick(e, () => {
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
            onClick={(e) => handleOutsideClick(e, () => {
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
            onClick={(e) => handleOutsideClick(e, () => {
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
            onClick={(e) => handleOutsideClick(e, () => {
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
            onClick={(e) => handleOutsideClick(e, () => {
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
            onClick={(e) => handleOutsideClick(e, () => {
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
            onClick={(e) => handleOutsideClick(e, () => setViewingAccount(null))}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="text-blue-600" size={18} />
                  </div>
                  <h3 className="text-xl font-semibold">{viewingAccount['namespace-account-name']}</h3>
                </div>
                <button
                  onClick={() => setViewingAccount(null)}
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
                  <p className="text-sm font-mono">{viewingAccount['namespace-account-id']}</p>
                </div>
                
                {viewingAccount['namespace-account-url-override'] && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500 mb-1">URL Override</p>
                    <p className="text-sm font-mono">{viewingAccount['namespace-account-url-override']}</p>
                  </div>
                )}
              </div>
              
              {viewingAccount['namespace-account-header'] && viewingAccount['namespace-account-header'].length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Headers</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {viewingAccount['namespace-account-header'].map((header, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-700">{header.key}</div>
                        <div className="text-sm text-gray-600 font-mono truncate">{header.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingAccount['variables'] && viewingAccount['variables'].length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Variables</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {viewingAccount['variables'].map((variable, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-gray-700">{variable.key}</div>
                        <div className="text-sm text-gray-600 font-mono truncate">{variable.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {viewingAccount.tags && viewingAccount.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingAccount.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => handleOAuthRedirect(viewingAccount)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Key size={16} />
                  Fetch Token
                </button>
                <button
                  onClick={() => {
                    handleEditAccount(viewingAccount);
                    setViewingAccount(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Account
                </button>
                <button
                  onClick={() => {
                    handleDeleteAccount(viewingAccount['namespace-account-id']);
                    setViewingAccount(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* View Method Modal */}
        {viewingMethod && (
          <div 
            className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => handleOutsideClick(e, () => setViewingMethod(null))}
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
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    handleTestMethod(viewingMethod);
                    setViewingMethod(null);
                  }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                >
                  <Play size={16} />
                  Test Method
                </button>
                <button
                  onClick={() => handleInitializeTableClick(viewingMethod)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <Database size={16} />
                  Initialize Table
                </button>
                <button
                  onClick={() => {
                    handleEditMethod(viewingMethod);
                    setViewingMethod(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Method
                </button>
                <button
                  onClick={() => {
                    handleDeleteMethod(viewingMethod['namespace-method-id']);
                    setViewingMethod(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
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
          methodId={testingMethod['namespace-method-id']}
          methodName={testingMethod['namespace-method-name']}
          methodType={testingMethod['namespace-method-type']}
        />
      )}
    </div>
  );
};

export default NamespacePage;