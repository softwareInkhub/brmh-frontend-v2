'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { NamespaceInput } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2, 
  Copy, 
  Globe, 
  Tag, 
  Clock, 
  Database, 
  Server, 
  CheckCircle, 
  Save, 
  Box, 
  Key, 
  Users, 
  Search, 
  Shield,
  Settings,
  Code,
  User
} from 'react-feather';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface KeyValuePair {
  key: string;
  value: string;
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
  'sample-request'?: Record<string, any>;
  'sample-response'?: Record<string, any>;
  'request-schema'?: Record<string, any>;
  'response-schema'?: Record<string, any>;
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

/**
 * NamespacePage Component
 * Displays a list of namespaces with their basic information and statistics
 */
const NamespacePage = () => {
  const router = useRouter();
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
  const [selectedAccountForTable, setSelectedAccountForTable] = useState<Account | null>(null);
  const [methodForTable, setMethodForTable] = useState<Method | null>(null);

  // Add missing state variables
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [methodSearch, setMethodSearch] = useState('');

  // Filter functions
  const filteredNamespaces = namespaces.filter(namespace => {
    const searchLower = searchQuery.toLowerCase();
    return (
      namespace['namespace-name'].toLowerCase().includes(searchLower) ||
      namespace['namespace-url'].toLowerCase().includes(searchLower) ||
      namespace.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const filteredAccounts = accounts.filter(account => {
    const searchLower = accountSearchQuery.toLowerCase();
    return (
      account['namespace-account-name'].toLowerCase().includes(searchLower) ||
      account['namespace-account-url-override']?.toLowerCase().includes(searchLower) ||
      account.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const filteredMethods = methods.filter(method => {
    const searchLower = methodSearchQuery.toLowerCase();
    return (
      method['namespace-method-name'].toLowerCase().includes(searchLower) ||
      method['namespace-method-type'].toLowerCase().includes(searchLower) ||
      method.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  // Fetch accounts and methods for selected namespace
  const fetchNamespaceDetails = async (namespaceId: string) => {
    try {
      console.log('Fetching namespace details for ID:', namespaceId);
      
      const [accountsResponse, methodsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}/accounts`),
        fetch(`${API_BASE_URL}/api/namespaces/${namespaceId}/methods`)
      ]);

      console.log('Accounts Response Status:', accountsResponse.status);
      console.log('Methods Response Status:', methodsResponse.status);
      
      if (!accountsResponse.ok || !methodsResponse.ok) {
        throw new Error('Failed to fetch namespace details');
      }

      const accountsData = await accountsResponse.json();
      const methodsData = await methodsResponse.json();

      console.log('Accounts Response Data:', JSON.stringify(accountsData, null, 2));
      console.log('Methods Response Data:', JSON.stringify(methodsData, null, 2));

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
  const fetchNamespaces = async () => {
    try {
      console.log('Fetching namespaces...');
      const response = await fetch(`${API_BASE_URL}/api/namespaces`);
      const responseData = await response.json();
      console.log('Fetched namespaces:', responseData);

      // Transform the data structure
      const transformedData = responseData.map((item: any) => ({
        'namespace-id': item.id,
        'namespace-name': item.data['namespace-name'].S,
        'namespace-url': item.data['namespace-url'].S,
        'tags': Array.isArray(item.data.tags?.L) ? item.data.tags.L.map((tag: any) => tag.S) : []
      }));

      console.log('Transformed namespaces:', transformedData);
      setNamespaces(transformedData);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    }
  };

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
      if (!editingAccount) return;

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

      const cleanedVariables = editFormData.account['variables']
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

      console.log('Current editing account:', editingAccount);
      console.log('Edit form data:', editFormData.account);
      console.log('Cleaned payload for update:', payload);
      console.log('Account ID:', editingAccount['namespace-account-id']);

      const response = await fetch(`${API_BASE_URL}/api/accounts/${editingAccount['namespace-account-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Update account response status:', response.status);

      if (response.status === 404) {
        throw new Error('Account not found');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        if (response.status === 500) {
          throw new Error('Server error occurred while updating account');
        }
        throw new Error(errorData?.message || `Failed to update account (${response.status})`);
      }

      const updatedAccount = await response.json();
      console.log('Updated account data:', updatedAccount);

      // Verify the update was successful by comparing sent and received data
      const fieldsToCompare = ['namespace-account-name', 'namespace-account-url-override', 'tags'] as const;
      type FieldsToCompare = typeof fieldsToCompare[number];
      
      const differences = fieldsToCompare.filter(field => 
        JSON.stringify(payload[field]) !== JSON.stringify(updatedAccount[field])
      );
      
      if (differences.length > 0) {
        console.warn('Differences detected between sent and received data:', {
          fields: differences,
          sent: differences.map(field => ({ [field]: payload[field as FieldsToCompare] })),
          received: differences.map(field => ({ [field]: updatedAccount[field] }))
        });
      }

      // Update the accounts list with the updated account
      setAccounts(accounts.map(acc => 
        acc['namespace-account-id'] === editingAccount['namespace-account-id'] ? updatedAccount : acc
      ));
      setIsEditingAccount(false);
      setEditingAccount(null);
      
      // Refresh accounts list
      if (selectedNamespace) {
        await fetchNamespaceDetails(selectedNamespace['namespace-id']);
        
        // Verify the account was updated in the fetched data
        const fetchedAccount = accounts.find(acc => acc['namespace-account-id'] === editingAccount['namespace-account-id']);
        if (fetchedAccount) {
          console.log('Account after refresh:', fetchedAccount);
        } else {
          console.warn('Updated account not found in refreshed data');
        }
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateMethod = async () => {
    try {
      if (!editingMethod) return;

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
        'isInitialized': editingMethod.isInitialized || false,
        'tags': cleanedTags.length > 0 ? cleanedTags : undefined
      };

      console.log('Current editing method:', editingMethod);
      console.log('Edit form data:', editFormData.method);
      console.log('Cleaned payload for update:', payload);
      console.log('Method ID:', editingMethod['namespace-method-id']);

      const response = await fetch(`${API_BASE_URL}/api/methods/${editingMethod['namespace-method-id']}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Update method response status:', response.status);
      console.log('Request payload:', JSON.stringify(payload, null, 2));

      if (response.status === 404) {
        throw new Error('Method not found');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('Failed to parse error response as JSON');
        }
        console.error('Error response:', errorData);
        
        if (response.status === 400) {
          throw new Error(`Bad request: ${errorText || 'Invalid method data'}`);
        }
        if (response.status === 500) {
          throw new Error('Server error occurred while updating method');
        }
        throw new Error(errorData?.message || `Failed to update method (${response.status})`);
      }

      const updatedMethod = await response.json();
      console.log('Updated method:', updatedMethod);

      // Verify the update was successful by comparing sent and received data
      const fieldsToCompare = [
        'namespace-method-name',
        'namespace-method-type',
        'namespace-method-url-override',
        'save-data',
        'isInitialized'
      ] as const;
      
      const differences = fieldsToCompare.filter(field => 
        JSON.stringify(payload[field]) !== JSON.stringify(updatedMethod[field])
      );
      
      if (differences.length > 0) {
        console.warn('Differences detected between sent and received data:', {
          fields: differences,
          sent: differences.map(field => ({ [field]: payload[field] })),
          received: differences.map(field => ({ [field]: updatedMethod[field] }))
        });
      }

      // Update the methods list with the updated method
      setMethods(methods.map(m => 
        m['namespace-method-id'] === editingMethod['namespace-method-id'] 
          ? updatedMethod : m
      ));
      setIsEditingMethod(false);
      setEditingMethod(null);

      // Refresh methods list
      if (selectedNamespace) {
        await fetchNamespaceDetails(selectedNamespace['namespace-id']);
        
        // Verify the method was updated in the fetched data
        const fetchedMethod = methods.find(m => m['namespace-method-id'] === editingMethod['namespace-method-id']);
        if (fetchedMethod) {
          console.log('Method after refresh:', fetchedMethod);
        } else {
          console.warn('Updated method not found in refreshed data');
        }
      }
    } catch (error) {
      console.error('Error updating method:', error);
      alert('Failed to update method: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  // Add useEffect for handling OAuth code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      const storedDetails = sessionStorage.getItem('pinterestAccountDetails');
      if (storedDetails) {
        const accountDetails = JSON.parse(storedDetails);
        handleFetchToken(code, accountDetails);
        // Clear stored details
        sessionStorage.removeItem('pinterestAccountDetails');
      }
    }
  }, []);

  const handleFetchToken = async (code: string, accountDetails: any) => {
    try {
      setTokenProcessing(accountDetails.accountId);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/pinterest/token`, {
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token');
      }

      const token = await response.json();
      console.log('Pinterest OAuth Token:', token);
      
      // Fetch current accounts and get the data directly
      const accountsResponse = await fetch(`${API_BASE_URL}/namespaces/${selectedNamespace?.['namespace-id']}/accounts`);
      if (!accountsResponse.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const accountsData = await accountsResponse.json();
      const currentAccount = accountsData.find((a: Account) => a['namespace-account-id'] === accountDetails.accountId);
      
      if (currentAccount) {
        // Create updated account data with the new token
        const updatedAccount = {
          ...currentAccount,
          'namespace-account-header': [
            ...(currentAccount['namespace-account-header'] || []).filter((h: KeyValuePair) => h.key !== 'Authorization'),
            { key: 'Authorization', value: `Bearer ${token}` }
          ]
        };

        // Update the account on the backend
        const updateResponse = await fetch(`${API_BASE_URL}/accounts/${accountDetails.accountId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedAccount)
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update account with token');
        }

        // Update local state with the new accounts data
        setAccounts(accounts.map((acc) => 
          acc['namespace-account-id'] === accountDetails.accountId ? updatedAccount : acc
        ));

        // Remove code from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.replaceState({}, '', url.toString());

        alert('Pinterest token saved successfully!');
      } else {
        throw new Error('Account not found');
      }
    } catch (error) {
      console.error('Error fetching Pinterest token:', error);
      alert('Failed to fetch Pinterest token. Please try again.');
    } finally {
      setTokenProcessing(null);
    }
  };

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

      const tableExists = existingTables.some((table: any) => {
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
        setSelectedAccountForTable(null);
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
      setSelectedAccountForTable(null);
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
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 md:p-8 max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1">
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
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
            title="Create Namespace"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Namespaces Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
          {filteredNamespaces.length > 0 ? (
            filteredNamespaces.map((namespace) => (
              <div 
                key={namespace['namespace-id']} 
                className={`bg-white rounded-lg shadow-sm border ${
                  selectedNamespace?.['namespace-id'] === namespace['namespace-id']
                    ? 'border-blue-500'
                    : 'border-gray-100'
                } px-3 py-2.5 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group relative`}
                onClick={(e) => handleNamespaceClick(namespace, e)}
              >
                <h2 className="text-sm font-medium text-gray-800 truncate pr-14 group-hover:text-blue-600 transition-colors">
                  {namespace['namespace-name'] || 'Unnamed Namespace'}
                </h2>
                <div 
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
                >
                  <button
                    onClick={(e) => handleEditClick(namespace, e)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-all"
                    title="Edit Namespace"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteNamespace(namespace['namespace-id'], e)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                    title="Delete Namespace"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center py-12 text-gray-500">
              <p className="text-center">No namespaces found</p>
            </div>
          )}
        </div>

        {/* Accounts and Methods Section */}
        {selectedNamespace && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accounts Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      value={accountSearchQuery}
                      onChange={(e) => setAccountSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setIsAddingAccount(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Plus size={16} />
                    Create Account
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {accounts.map((account) => (
                  <div 
                    key={account['namespace-account-id']} 
                    className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="text-blue-600" size={16} />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{account['namespace-account-name']}</h3>
                        </div>
                        <p className="text-sm text-gray-500 font-mono">{account['namespace-account-id']}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOAuthRedirect(account)}
                          className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                            tokenProcessing === account['namespace-account-id']
                              ? 'bg-blue-50 text-blue-600 cursor-wait'
                              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          disabled={tokenProcessing === account['namespace-account-id']}
                          title="Fetch Token"
                        >
                          <Key size={16} />
                          <span className="text-sm font-medium">
                            {tokenProcessing === account['namespace-account-id'] ? 'Fetching...' : 'Fetch Token'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                          title="Edit Account"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account['namespace-account-id'])}
                          className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                          title="Delete Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {account['namespace-account-url-override'] && (
                      <div className="flex items-center gap-2 text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
                        <Globe size={14} />
                        <p className="text-sm font-medium">{account['namespace-account-url-override']}</p>
                      </div>
                    )}

                    {account['namespace-account-header'] && account['namespace-account-header'].length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="text-gray-400" size={14} />
                          <h4 className="text-sm font-medium text-gray-700">Headers</h4>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          {account['namespace-account-header'].map((header, headerIndex) => (
                            <div key={headerIndex} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">{header.key}:</span>
                              <span className="text-gray-600 font-mono">{header.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {account['variables'] && account['variables'].length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="text-gray-400" size={14} />
                          <h4 className="text-sm font-medium text-gray-700">Variables</h4>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          {account['variables'].map((variable, variableIndex) => (
                            <div key={variableIndex} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">{variable.key}:</span>
                              <span className="text-gray-600 font-mono">{variable.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Methods Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Code className="text-blue-600" size={24} />
                  <h2 className="text-xl font-semibold text-gray-900">Methods</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search methods..."
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      value={methodSearchQuery}
                      onChange={(e) => setMethodSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setIsAddingMethod(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Plus size={16} />
                    Create Method
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {methods.map((method) => (
                  <div 
                    key={method['namespace-method-id']} 
                    className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-3 py-1 text-xs rounded-full font-medium ${
                            method['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' :
                            method['namespace-method-type'] === 'POST' ? 'bg-blue-100 text-blue-700' :
                            method['namespace-method-type'] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                            method['namespace-method-type'] === 'DELETE' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {method['namespace-method-type']}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{method['namespace-method-name']}</h3>
                        </div>
                        <p className="text-sm text-gray-500 font-mono">{method['namespace-method-id']}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInitializeTableClick(method)}
                          disabled={initializingTable === method['namespace-method-id']}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                            initializingTable === method['namespace-method-id']
                              ? 'bg-blue-100 text-blue-700 cursor-wait'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } transition-all`}
                        >
                          <Database size={14} />
                          {initializingTable === method['namespace-method-id'] ? 'Initializing...' : 'Initialize Table'}
                        </button>
                        <button
                          onClick={() => handleEditMethod(method)}
                          className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                          title="Edit Method"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMethod(method['namespace-method-id'])}
                          className="p-2 text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                          title="Delete Method"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {method['namespace-method-url-override'] && (
                      <div className="flex items-center gap-2 text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
                        <Globe size={14} />
                        <p className="text-sm font-medium">{method['namespace-method-url-override']}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {method['namespace-method-queryParams'] && method['namespace-method-queryParams'].length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="text-gray-400" size={14} />
                            <h4 className="text-sm font-medium text-gray-700">Query Parameters</h4>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            {method['namespace-method-queryParams'].map((param, paramIndex) => (
                              <div key={paramIndex} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700">{param.key}:</span>
                                <span className="text-gray-600 font-mono">{param.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {method['namespace-method-header'] && method['namespace-method-header'].length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="text-gray-400" size={14} />
                            <h4 className="text-sm font-medium text-gray-700">Headers</h4>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            {method['namespace-method-header'].map((header, headerIndex) => (
                              <div key={headerIndex} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700">{header.key}:</span>
                                <span className="text-gray-600 font-mono">{header.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Save className="text-gray-400" size={14} />
                        <span className="text-sm text-gray-600">Save Data:</span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          method['save-data'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {method['save-data'] ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Namespace Modal */}
        {isAddingNamespace && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

        {/* Edit Account Modal */}
        {isEditingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Edit Account</h3>
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
                  Update Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Method Modal */}
        {isEditingMethod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Edit Method</h3>
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
                    id="save-data"
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
                  <label htmlFor="save-data" className="text-sm text-gray-700">
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
                  Update Method
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Selection Modal */}
        {showAccountSelector && methodForTable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
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
                    setSelectedAccountForTable(null);
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
      </div>
    </div>
  );
};

export default NamespacePage;