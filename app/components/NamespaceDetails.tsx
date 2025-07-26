'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Globe, Users, Code } from 'react-feather';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  tags: string[];
}

export interface Account {
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': KeyValuePair[];
  variables: KeyValuePair[];
  tags: string[];
}

export interface Method {
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override'?: string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
  isInitialized?: boolean;
  tags: string[];
}

export interface NamespaceDetailsProps {
  onError?: (error: string) => void;
  className?: string;
  namespace: Namespace;
}

const NamespaceDetails: React.FC<NamespaceDetailsProps> = ({ 
  onError,
  className = '',
  namespace
}) => {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string>(namespace['namespace-id']);
  const [namespaceDetails, setNamespaceDetails] = useState<Namespace | null>(namespace);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchNamespaces = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/namespaces`);

      if (!response.ok) {
        throw new Error(`Failed to fetch namespaces: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();

      if (!Array.isArray(rawData)) {
        console.error('Expected array of namespaces, got:', typeof rawData);
        setNamespaces([]);
        setLoading(false);
        return;
      }

      const transformedData: Namespace[] = rawData
        .filter((item): item is Record<string, unknown> => {
          return item && typeof item === 'object';
        })
        .map((item) => ({
          'namespace-id': String(item['namespace-id'] || ''),
          'namespace-name': String(item['namespace-name'] || ''),
          'namespace-url': String(item['namespace-url'] || ''),
          'tags': Array.isArray(item.tags) ? item.tags : []
        }))
        .filter(item => Boolean(item['namespace-id']));

      setNamespaces(transformedData);
    } catch (error) {
      console.error('Error in fetchNamespaces:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to fetch namespaces');
      setNamespaces([]);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const fetchAccounts = async (id: string): Promise<Account[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/namespaces/${id}/accounts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching accounts:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to fetch accounts');
      return [];
    }
  };

  const fetchMethods = async (id: string): Promise<Method[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/namespaces/${id}/methods`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch methods');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching methods:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to fetch methods');
      return [];
    }
  };

  const handleNamespaceChange = async (id: string) => {
    setSelectedNamespaceId(id);
    if (!id) {
      setNamespaceDetails(null);
      setAccounts([]);
      setMethods([]);
      return;
    }

    setLoadingDetails(true);
    setError(null);

    try {
      // Fetch namespace details
      const namespaceResponse = await fetch(`${API_BASE_URL}/namespaces/${id}`);
      if (!namespaceResponse.ok) {
        throw new Error('Failed to fetch namespace details');
      }
      const namespaceData = await namespaceResponse.json();
      setNamespaceDetails(namespaceData);

      // Fetch accounts and methods in parallel
      const [accountsData, methodsData] = await Promise.all([
        fetchAccounts(id),
        fetchMethods(id)
      ]);

      setAccounts(accountsData);
      setMethods(methodsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch details';
      console.error('Error fetching details:', error);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  if (loading && !namespaces.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Database className="text-gray-400 animate-pulse" size={24} />
          <p className="text-gray-600">Loading namespaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Namespace Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">Select Namespace</h2>
          </div>
          <select
            value={selectedNamespaceId}
            onChange={(e) => handleNamespaceChange(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option key="default" value="">Select a namespace</option>
            {namespaces.map((ns) => (
              <option key={ns['namespace-id']} value={ns['namespace-id']}>
                {ns['namespace-name'] || ns['namespace-id']}
              </option>
            ))}
          </select>
        </div>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Database className="text-gray-400 animate-pulse" size={24} />
              <p className="text-gray-600">Loading details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-red-500">
              <p>Error: {error}</p>
              <button 
                onClick={() => selectedNamespaceId && handleNamespaceChange(selectedNamespaceId)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        ) : namespaceDetails ? (
          <>
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="text-blue-600" size={24} />
                    <h1 className="text-2xl font-bold text-gray-900">{namespaceDetails['namespace-name']}</h1>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Globe size={16} />
                    <p className="text-sm">{namespaceDetails['namespace-url']}</p>
                  </div>
                  {namespaceDetails.tags && namespaceDetails.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {namespaceDetails.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Accounts Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Accounts</h2>
              </div>
              {accounts.length > 0 ? (
                <div className="grid gap-4">
                  {accounts.map((account, index) => (
                    <div key={index} className="p-4 border border-gray-100 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900 mb-1">{account['namespace-account-name']}</p>
                          <p className="text-sm text-gray-600 mb-2">ID: {account['namespace-account-id']}</p>
                        </div>
                        {account.tags && account.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {account.tags.map((tag: string, tagIndex: number) => (
                              <span key={tagIndex} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {account['namespace-account-url-override'] && (
                        <div className="flex items-center gap-2 text-gray-600 mb-3">
                          <Globe size={14} />
                          <p className="text-sm">{account['namespace-account-url-override']}</p>
                        </div>
                      )}

                      {account['namespace-account-header'] && account['namespace-account-header'].length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">Headers:</p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            {account['namespace-account-header'].map((header: KeyValuePair, headerIndex: number) => (
                              <div key={headerIndex} className="flex gap-2 text-sm">
                                <span className="text-gray-600">{header.key}:</span>
                                <span className="text-gray-900">{header.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No accounts found</p>
              )}
            </div>

            {/* Methods Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Code className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Methods</h2>
              </div>
              {methods.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {methods.map((method, index) => (
                    <div key={index} className="p-4 border border-gray-100 rounded-lg">
                      {/* Method Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-gray-900">{method['namespace-method-name']}</p>
                            <span className={`px-2 py-1 text-xs rounded ${
                              method['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' :
                              method['namespace-method-type'] === 'POST' ? 'bg-blue-100 text-blue-700' :
                              method['namespace-method-type'] === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                              method['namespace-method-type'] === 'DELETE' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {method['namespace-method-type']}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">ID: {method['namespace-method-id']}</p>
                        </div>
                        {method.tags && method.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {method.tags.map((tag: string, tagIndex: number) => (
                              <span key={tagIndex} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {method['namespace-method-url-override'] && (
                        <div className="flex items-center gap-2 text-gray-600 mb-3">
                          <Globe size={14} />
                          <p className="text-sm">{method['namespace-method-url-override']}</p>
                        </div>
                      )}

                      {method['namespace-method-queryParams'] && method['namespace-method-queryParams'].length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Query Parameters:</p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            {method['namespace-method-queryParams'].map((param: KeyValuePair, paramIndex: number) => (
                              <div key={paramIndex} className="flex gap-2 text-sm">
                                <span className="text-gray-600">{param.key}:</span>
                                <span className="text-gray-900">{param.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {method['namespace-method-header'] && method['namespace-method-header'].length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Headers:</p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            {method['namespace-method-header'].map((header: KeyValuePair, headerIndex: number) => (
                              <div key={headerIndex} className="flex gap-2 text-sm">
                                <span className="text-gray-600">{header.key}:</span>
                                <span className="text-gray-900">{header.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="mt-3 flex gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Save Data:</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            method['save-data'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {method['save-data'] ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Initialized:</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            method['isInitialized'] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {method['isInitialized'] ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No methods found</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default NamespaceDetails; 