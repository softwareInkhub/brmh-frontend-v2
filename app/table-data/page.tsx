'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, RefreshCw, Search, Download, Copy, Filter, X,  Eye, EyeOff, DollarSign, Package, Clock, AlertCircle } from 'react-feather';
import { redisCache as cache } from '../../utils/redis-cache';
import dynamic from 'next/dynamic';

// Define styles as a constant
const styles = `
  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-modal-slide-up {
    animation: modalSlideUp 0.3s ease-out forwards;
  }
`;

interface DynamoDBValue {
  S?: string;
  N?: string;
  BOOL?: boolean;
  L?: DynamoDBValue[];
  M?: Record<string, DynamoDBValue>;
}

interface KeyValuePair {
  key: string;
  value: string;
}

interface Method {
  'namespace-method-id': string;
  'namespace-method-name': string;
  'namespace-method-type': string;
  'namespace-method-url-override'?: string;
  'namespace-method-queryParams': KeyValuePair[];
  'namespace-method-header': KeyValuePair[];
  'save-data': boolean;
}

interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  'namespace-accounts': Account[];
  'namespace-methods': Method[];
}

interface Account {
  'namespace-account-id': string;
  'namespace-account-name': string;
  'namespace-account-url-override'?: string;
  'namespace-account-header': KeyValuePair[];
}

interface TableItem {
  Item?: Record<string, DynamoDBValue>;
  [key: string]: unknown;
}

interface LastEvaluatedKey {
  id: string;
  index: number;
}

interface LoopRequestParams {
  maxIterations?: number;
  pageSize?: number;
  lastEvaluatedKey?: LastEvaluatedKey;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
}

interface LoopResponse {
  items: TableItem[];
  count: number;
  lastEvaluatedKey: LastEvaluatedKey | null;
  iterations: number;
}

// JSONTree component for displaying nested data
interface JSONTreeProps {
  data: unknown;
  initialExpanded?: boolean;
}

// Add type guard function
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArrayOfRecords(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(item => isRecord(item));
}

const JSONTree = ({ data, initialExpanded = true }: JSONTreeProps) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  if (!isRecord(data) && !Array.isArray(data)) {
    return <span className="text-gray-800">{JSON.stringify(data)}</span>;
  }

  const isArray = Array.isArray(data);
  const items = isArray ? (isArrayOfRecords(data) ? data : []) : Object.entries(data);
  const isEmpty = isArray ? data.length === 0 : Object.keys(data).length === 0;

  if (isEmpty) {
    return <span className="text-gray-500">{isArray ? '[]' : '{}'}</span>;
  }

  return (
    <div className="pl-4">
      <div 
        className="flex items-center gap-1 cursor-pointer hover:text-blue-600" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown size={16} className="shrink-0" />
        ) : (
          <ChevronRight size={16} className="shrink-0" />
        )}
        <span className="text-gray-500">{isArray ? '[' : '{'}</span>
      </div>
      
      {isExpanded && (
        <div className="pl-4 border-l border-gray-200">
          {isArray ? (
            (items as Record<string, unknown>[]).map((item, index) => (
              <div key={index} className="py-1">
                <JSONTree data={item} initialExpanded={false} />
                {index < items.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))
          ) : (
            (items as [string, unknown][]).map(([key, value], index) => (
              <div key={key} className="py-1">
                <span className="text-blue-600">&quot;{key}&quot;</span>
                <span className="text-gray-600">: </span>
                <JSONTree data={value} initialExpanded={false} />
                {index < items.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="pl-4">
        <span className="text-gray-500">{isArray ? ']' : '}'}</span>
      </div>
    </div>
  );
};

// Add this helper function at the top level
const getDynamoValue = (attribute: DynamoDBValue | Record<string, unknown>): unknown => {
  if (!attribute) return '-';
  
  // If it's already a plain object, return as is
  if (typeof attribute === 'object' && !('S' in attribute) && !('N' in attribute) && !('BOOL' in attribute) && !('L' in attribute) && !('M' in attribute)) {
    return attribute;
  }

  const dynamo = attribute as DynamoDBValue;
  if (dynamo.S) return dynamo.S;
  if (dynamo.N) return dynamo.N;
  if (dynamo.BOOL !== undefined) return dynamo.BOOL.toString();
  if (dynamo.L) return dynamo.L.map(getDynamoValue);
  if (dynamo.M) {
    const result: Record<string, unknown> = {};
    Object.entries(dynamo.M).forEach(([key, value]) => {
      result[key] = getDynamoValue(value);
    });
    return result;
  }
  return JSON.stringify(attribute);
};

// Add this helper function after getDynamoValue
const getIdentifierField = (itemData: Record<string, unknown>): { field: string; value: string } => {
  // Common identifier fields in order of priority
  const idFields = [
    'id',
    'confirmation_number',
    'pin_id',
    'board_id',
    'order_id',
    'order_number',
    'tracking_number'
  ];

  for (const field of idFields) {
    if (itemData[field]) {
      return { field, value: String(itemData[field]) };
    }
  }

  // If no common ID field is found, return the first field as identifier
  const firstField = Object.keys(itemData)[0];
  return { field: firstField, value: String(itemData[firstField]) };
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TableItem | null;
}

// Enhanced Modal component
const Modal = ({ isOpen, onClose, data }: ModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']));
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'organized' | 'json'>('organized');

  if (!isOpen || !data) return null;

  const handleCopyField = (key: string, value: unknown) => {
    navigator.clipboard.writeText(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleAllSections = () => {
    if (expandedSections.size > 0) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(['main', 'billing', 'shipping', 'line_items', 'customer']));
    }
  };

  // Group data into logical sections
  const sections = {
    main: {
      title: 'Main Information',
      fields: ['id', 'order_number', 'financial_status', 'fulfillment_status', 'processed_at', 'created_at', 'updated_at', 'cancelled_at']
    },
    billing: {
      title: 'Billing Details',
      fields: ['billing_address', 'total_price', 'subtotal_price', 'total_tax', 'currency']
    },
    shipping: {
      title: 'Shipping Information',
      fields: ['shipping_address', 'shipping_lines']
    },
    line_items: {
      title: 'Line Items',
      fields: ['line_items']
    },
    customer: {
      title: 'Customer Information',
      fields: ['customer', 'email', 'phone']
    }
  };

  

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 transition-all duration-300">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold text-gray-800">Item Details</h3>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('organized')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'organized' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Organized View
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'json' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                JSON Tree
              </button>
            </div>
            <button
              onClick={handleCopyAll}
              className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
              title="Copy all data"
            >
              {copiedField === 'all' ? (
                <span className="text-green-600 text-sm">Copied!</span>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Copy All</span>
                </>
              )}
            </button>
            {viewMode === 'organized' && (
              <button
                onClick={toggleAllSections}
                className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                title={expandedSections.size > 0 ? "Collapse all" : "Expand all"}
              >
                {expandedSections.size > 0 ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {viewMode === 'organized' ? (
            // Organized View
            Object.entries(sections).map(([sectionKey, section]) => {
              const sectionData = section.fields.map(field => [field, data[field]]).filter(([key]) => 
                !searchTerm || 
                String(key).toLowerCase().includes(searchTerm.toLowerCase()) ||
                JSON.stringify(data[String(key)]).toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (sectionData.length === 0) return null;

              return (
                <div key={sectionKey} className="mb-6 last:mb-0">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => toggleSection(sectionKey)}
                  >
                    {expandedSections.has(sectionKey) ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <h4 className="text-lg font-medium text-gray-700">{section.title}</h4>
                  </div>

                  {expandedSections.has(sectionKey) && (
                    <div className="mt-2 pl-4">
                      {sectionData.map(([key, value]) => (
                        <div key={String(key)} className="py-2 flex items-start gap-4 group">
                          <div className="w-1/3 text-sm font-medium text-gray-600">{String(key)}</div>
                          <div className="w-2/3 text-sm text-gray-800 break-all">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                {typeof value === 'object' ? (
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                                ) : (
                                  String(value || '-')
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyField(String(key), value);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy value"
                              >
                                {copiedField === key ? (
                                  <span className="text-green-600 text-xs">Copied!</span>
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // JSON Tree View
            <div className="bg-gray-50 rounded-lg p-4">
              <JSONTree data={data} initialExpanded={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AnalyticsProps {
  data: TableItem[];
}

// Add Analytics Component
const Analytics = ({ data }: AnalyticsProps) => {
  const stats = useMemo(() => {
    const total = data.length;
    const statusCounts: { [key: string]: number } = {};
    let totalAmount = 0;
    let fulfilledCount = 0;
    let cancelledCount = 0;
    let processingCount = 0;

    data.forEach(item => {
      const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      if (!isRecord(rawItemData)) return;
      
      const itemData = rawItemData;
      
      // Count financial statuses
      const financialStatus = String(itemData.financial_status || 'unknown');
      statusCounts[financialStatus] = (statusCounts[financialStatus] || 0) + 1;

      // Sum total amount
      const price = parseFloat(String(itemData.total_price || '0'));
      if (!isNaN(price)) {
        totalAmount += price;
      }

      // Count fulfillment statuses
      if (itemData.fulfillment_status === 'fulfilled') fulfilledCount++;
      if (itemData.cancelled_at) cancelledCount++;
      if (itemData.fulfillment_status === 'processing') processingCount++;
    });

    return {
      total,
      avgAmount: total > 0 ? (totalAmount / total).toFixed(2) : '0',
      totalAmount: totalAmount.toFixed(2),
      statusCounts,
      fulfilledCount,
      cancelledCount,
      processingCount,
      fulfillmentRate: total > 0 ? ((fulfilledCount / total) * 100).toFixed(1) : '0'
    };
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Analytics Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Orders Card */}
        <div className="bg-blue-50/50 hover:bg-blue-50 rounded-lg p-4 transition-colors border border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-blue-400" />
          </div>
          <div className="mt-2 text-sm text-blue-600">
            <span className="font-medium">${stats.totalAmount}</span> total value
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-green-50/50 hover:bg-green-50 rounded-lg p-4 transition-colors border border-green-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Average Order Value</p>
              <p className="text-2xl font-bold text-green-700 mt-1">${stats.avgAmount}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
          <div className="mt-2 text-sm text-green-600">
            <span className="font-medium">${stats.avgAmount}</span> per order
          </div>
        </div>

        {/* Fulfillment Rate */}
        <div className="bg-purple-50/50 hover:bg-purple-50 rounded-lg p-4 transition-colors border border-purple-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Fulfillment Rate</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats.fulfillmentRate}%</p>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
          <div className="mt-2 text-sm text-purple-600">
            <span className="font-medium">{stats.fulfilledCount}</span> orders fulfilled
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-orange-50/50 hover:bg-orange-50 rounded-lg p-4 transition-colors border border-orange-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Order Status</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">{stats.processingCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          <div className="mt-2 text-sm text-orange-600">
            <span className="font-medium">{stats.cancelledCount}</span> orders cancelled
          </div>
        </div>
      </div>
    </div>
  );
};

// Create a client-side only component for style injection


// Create a client-side only wrapper component
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};

// Create the main content component
const TableDataContent = () => {
  const [mounted, setMounted] = useState(false);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<TableItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<LastEvaluatedKey | null>(null);
  const [virtualStart, setVirtualStart] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const ROWS_PER_PAGE = 50;

  const fetchNamespaceAccounts = useCallback(async (namespaceId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/namespaces/${namespaceId}/accounts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const accountsData = await response.json();
      setNamespaces(currentNamespaces => {
        return currentNamespaces.map(namespace => {
          if (namespace['namespace-id'] === namespaceId) {
            return {
              ...namespace,
              'namespace-accounts': accountsData
            };
          }
          return namespace;
        });
      });
    } catch (error) {
      console.error(`Error fetching accounts for namespace ${namespaceId}:`, error);
    }
  }, []);

  const fetchNamespaceMethods = useCallback(async (namespaceId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${backendUrl}/api/namespaces/${namespaceId}/methods`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      const transformedMethods = rawData.map((method: {
        'namespace-method-id'?: string;
        'namespace-method-name'?: string;
        'namespace-method-type'?: string;
        'namespace-method-url-override'?: string;
        'namespace-method-queryParams'?: KeyValuePair[];
        'namespace-method-header'?: KeyValuePair[];
        'save-data'?: boolean;
      }) => ({
        'namespace-method-id': method['namespace-method-id'] || '',
        'namespace-method-name': method['namespace-method-name'] || '',
        'namespace-method-type': method['namespace-method-type'] || 'GET',
        'namespace-method-url-override': method['namespace-method-url-override'] || '',
        'namespace-method-queryParams': Array.isArray(method['namespace-method-queryParams']) 
          ? method['namespace-method-queryParams']
          : [],
        'namespace-method-header': Array.isArray(method['namespace-method-header'])
          ? method['namespace-method-header']
          : [],
        'save-data': method['save-data'] || false
      }))
      .filter((method: Method) => method['namespace-method-id'] && method['namespace-method-name']);

      setNamespaces(currentNamespaces => {
        return currentNamespaces.map(namespace => {
          if (namespace['namespace-id'] === namespaceId) {
            return {
              ...namespace,
              'namespace-methods': transformedMethods
            };
          }
          return namespace;
        });
      });
    } catch (error) {
      console.error(`Error fetching methods for namespace ${namespaceId}:`, error);
    }
  }, []);

  const fetchNamespaces = useCallback(async () => {
    try {
      console.log('🔄 Fetching namespaces...');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      console.log('📡 Using backend URL:', backendUrl);
      
      const response = await fetch(`${backendUrl}/api/namespaces`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      console.log('📥 Raw namespace data:', rawData);

      if (!Array.isArray(rawData)) {
        console.error('❌ Expected array of namespaces, got:', typeof rawData);
        setNamespaces([]);
        return;
      }

      const transformedNamespaces = rawData
        .filter(item => item && item.data)
        .map(item => {
          const data = item.data;
          return {
            'namespace-id': data['namespace-id']?.S || '',
            'namespace-name': data['namespace-name']?.S || '',
            'namespace-url': data['namespace-url']?.S || '',
            'namespace-accounts': [],
            'namespace-methods': [],
            'tags': Array.isArray(data['tags']?.L) 
              ? data['tags'].L.map((tag: { S?: string }) => tag.S || '')
              : []
          };
        })
        .filter(namespace => namespace['namespace-id'] && namespace['namespace-name']);

      console.log('✨ Transformed namespaces:', transformedNamespaces);

      if (transformedNamespaces.length === 0) {
        console.log('⚠️ No valid namespaces found after transformation');
        setNamespaces([]);
      } else {
        console.log('✅ Setting namespaces:', transformedNamespaces.length);
        setNamespaces(transformedNamespaces);
        transformedNamespaces.forEach(namespace => {
          fetchNamespaceAccounts(namespace['namespace-id']);
          fetchNamespaceMethods(namespace['namespace-id']);
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchNamespaces:', error);
      setNamespaces([]);
    }
  }, [fetchNamespaceAccounts, fetchNamespaceMethods]);

  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  useEffect(() => {
    setMounted(true);
    // Inject styles only on client side
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  useEffect(() => {
    if (columns.length > 0) {
      // Show only essential columns by default
      const defaultColumns = new Set([
        'order_number',
        'financial_status',
        'total_price',
        'created_at',
        'email',
        'fulfillment_status'
      ]);
      
      // Add any available columns from default set
      const initialVisibleColumns = new Set(
        columns.filter(col => defaultColumns.has(col))
      );
      
      // If we have less than 6 columns, add more until we reach 6
      const remainingColumns = columns.filter(col => !initialVisibleColumns.has(col));
      while (initialVisibleColumns.size < 6 && remainingColumns.length > 0) {
        initialVisibleColumns.add(remainingColumns.shift()!);
      }
      
      setVisibleColumns(initialVisibleColumns);
    }
  }, [columns]);

  const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNamespace(e.target.value);
    setSelectedAccount('');
    setSelectedMethod('');
    setTableData([]);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAccount(e.target.value);
    setSelectedMethod('');
    setTableData([]);
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMethod(e.target.value);
    setTableData([]);
  };

  const extractColumns = (data: TableItem[]) => {
    const columnSet = new Set<string>();
    data.forEach(item => {
      const itemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      if (itemData && typeof itemData === 'object') {
        Object.keys(itemData).forEach(key => columnSet.add(key));
      }
    });
    return Array.from(columnSet);
  };

  const fetchTableData = async (params: LoopRequestParams = {}) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const namespace = namespaces.find(n => n['namespace-id'] === selectedNamespace);
      const method = namespace?.['namespace-methods']?.find(m => m['namespace-method-id'] === selectedMethod);
      const account = namespace?.['namespace-accounts']?.find(a => a['namespace-account-id'] === selectedAccount);

      if (!namespace || !method || !account) {
        throw new Error('Required data not found');
      }

      const namespaceName = namespace['namespace-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
      const accountName = account['namespace-account-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
      const methodName = method['namespace-method-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
      const tableName = `${namespaceName}_${accountName}_${methodName}`;

      // Create cache key based on current chunk
      const index = params.lastEvaluatedKey?.index || 0;
      const currentChunk = Math.floor(index / 100);
      const cacheKey = `table_data:${tableName}:${currentChunk}:${params.maxIterations || 'inf'}`;

      console.log('🔍 Checking cache for key:', cacheKey);

      try {
        // Check cache first
        const cachedData = await cache.get<LoopResponse>(cacheKey);
        if (cachedData) {
          console.log('✅ Using cached data for:', tableName);
          return cachedData;
        }
      } catch (error) {
        console.warn('⚠️ Cache read failed:', error);
        // Continue with fetch if cache read fails
      }

      console.log('🔄 Cache miss, fetching from server for:', tableName);
      
      // Format the lastEvaluatedKey properly for DynamoDB
      const formattedLastKey = params.lastEvaluatedKey ? {
        id: { S: params.lastEvaluatedKey.id },
        index: { N: String(params.lastEvaluatedKey.index) }
      } : undefined;

      console.log('📝 Request parameters:', {
        maxIterations: params.maxIterations || undefined,
        pageSize: 100,
        lastEvaluatedKey: formattedLastKey,
        ...params
      });

      const response = await fetch(`${backendUrl}/api/dynamodb/tables/${tableName}/items/loop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxIterations: params.maxIterations || undefined,
          pageSize: 100,
          lastEvaluatedKey: formattedLastKey,
          ...params
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', {
          status: response.status,
          message: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      // Transform the data if needed
      const transformedData = Array.isArray(data.items) ? data.items.map((item: Record<string, DynamoDBValue>) => {
        if (item && typeof item === 'object' && !item.Item) {
          return { Item: item };
        }
        return item;
      }) : [];

      const processedData: LoopResponse = {
        items: transformedData,
        count: data.count || transformedData.length,
        lastEvaluatedKey: data.lastEvaluatedKey ? {
          id: data.lastEvaluatedKey.id as string,
          index: index + transformedData.length
        } : null,
        iterations: data.iterations || 1
      };

      // Cache the processed data
      try {
        await cache.set(cacheKey, processedData);
        console.log('✅ Cached data for:', tableName);
      } catch (error) {
        console.warn('⚠️ Cache write failed:', error);
      }

      return processedData;
    } catch (error) {
      console.error('❌ Error fetching table data:', error);
      throw error;
    }
  };

  // Add a function to clear cache for specific table
  const clearTableCache = async () => {
    try {
      const namespace = namespaces.find(n => n['namespace-id'] === selectedNamespace);
      const method = namespace?.['namespace-methods']?.find(m => m['namespace-method-id'] === selectedMethod);
      const account = namespace?.['namespace-accounts']?.find(a => a['namespace-account-id'] === selectedAccount);

      if (!namespace || !method || !account) return;

      const namespaceName = namespace['namespace-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
      const accountName = account['namespace-account-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
      const methodName = method['namespace-method-name'].toLowerCase().replace(/[^a-z0-9]/g, '_');
      const tableName = `${namespaceName}_${accountName}_${methodName}`;
      
      // Clear all cache entries for this table
      const cachePrefix = `table_data:${tableName}:`;
      await cache.clear(cachePrefix);
      console.log('Cache cleared for table:', tableName);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const handleFetchClick = async () => {
    if (!selectedNamespace || !selectedAccount || !selectedMethod) {
      setError('Please select namespace, account, and method');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastEvaluatedKey(null);
    setHasMore(true);
    setTableData([]); // Clear existing data

    try {
      console.log('Starting fetch with selections:', {
        namespace: selectedNamespace,
        account: selectedAccount,
        method: selectedMethod,
      });

      const data = await fetchTableData();
      
      console.log('Processed data for UI:', data);

      if (!data || !Array.isArray(data.items)) {
        throw new Error('Invalid response format from server');
      }

      // Extract columns before setting the data
      const extractedColumns = extractColumns(data.items);
      console.log('Extracted columns:', extractedColumns);
      setColumns(extractedColumns);

      // Set the data
      setTableData(data.items);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setHasMore(!!data.lastEvaluatedKey);
      
      // Reset filters and selections
      setActiveFilters({});
      setSearchTerm('');
      setSelectedRows(new Set());
      setSelectAll(false);

      console.log('UI state updated with data length:', data.items.length);
    } catch (error) {
      console.error('Error in handleFetchClick:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch table data');
      setTableData([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !lastEvaluatedKey) return;

    setIsLoadingMore(true);
    try {
      const data = await fetchTableData({
        lastEvaluatedKey,
        maxIterations: 1,
        pageSize: 100
      });

      setTableData(prev => [...prev, ...data.items]);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setHasMore(!!data.lastEvaluatedKey);
    } catch (error) {
      console.error('Error loading more data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load more data');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Function to format column header
  const formatColumnHeader = (column: string) => {
    return column
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Function to format cell value based on type
  const formatCellValue = (value: unknown) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') {
      const stringified = JSON.stringify(value);
      return stringified.length > 50 ? stringified.substring(0, 50) + '...' : stringified;
    }
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string' && value.includes('http')) return (
      <a 
        href={value} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-600 hover:text-blue-800 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {value.length > 30 ? value.substring(0, 30) + '...' : value}
      </a>
    );
    return String(value);
  };

  // Filter and search the table data
  const filteredData = useMemo(() => {
    return tableData.filter(item => {
      const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      if (!isRecord(rawItemData)) return false;
      const itemData = rawItemData;
      
      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        Object.values(itemData).some(value => 
          String(value).toLowerCase().includes(searchLower)
        );

      // Active filters
      const matchesFilters = Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        return String(itemData[key]).toLowerCase().includes(value.toLowerCase());
      });

      return matchesSearch && matchesFilters;
    });
  }, [tableData, searchTerm, activeFilters]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map((_, index) => index)));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === filteredData.length);
  };

  const downloadCSV = () => {
    const selectedData = Array.from(selectedRows).map(index => {
      const item = filteredData[index];
      const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      return isRecord(rawItemData) ? rawItemData : {};
    });

    const data = selectedData.length > 0 ? selectedData : filteredData.map(item => {
      const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      return isRecord(rawItemData) ? rawItemData : {};
    });

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => JSON.stringify(row[header] || '')).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'table_data.csv';
    link.click();
  };

  const copyToClipboard = () => {
    const selectedData = Array.from(selectedRows).map(index => {
      const item = filteredData[index];
      const itemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      return itemData;
    });

    const dataToCopy = selectedData.length > 0 ? selectedData : filteredData.map(item => {
      const itemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
      return itemData;
    });

    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
  };

  const handleItemClick = (item: TableItem) => {
    const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
    if (isRecord(rawItemData)) {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  const ColumnSelector = () => (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">Select Visible Columns</h3>
        <button
          onClick={() => setShowColumnSelector(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {columns.map(column => (
          <label key={column} className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.has(column)}
              onChange={(e) => {
                const newVisibleColumns = new Set(visibleColumns);
                if (e.target.checked) {
                  newVisibleColumns.add(column);
                } else {
                  newVisibleColumns.delete(column);
                }
                setVisibleColumns(newVisibleColumns);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 truncate" title={formatColumnHeader(column)}>
              {formatColumnHeader(column)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const rowHeight = 53; // Approximate height of each row
    const newStart = Math.floor(scrollTop / rowHeight);
    setVirtualStart(newStart);

    // Load more data when scrolling near bottom
    if (scrollHeight - scrollTop - clientHeight < clientHeight * 0.5) {
      if (hasMore && !isLoadingMore) {
        loadMore();
      }
    }
  };

 

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto">
          {/* Selection Controls */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Namespace Selector */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Namespace
                </label>
                <select
                  value={selectedNamespace}
                  onChange={handleNamespaceChange}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                >
                  <option value="">Select Namespace</option>
                  {namespaces.map((namespace) => (
                    <option 
                      key={namespace['namespace-id']}
                      value={namespace['namespace-id']}
                    >
                      {namespace['namespace-name']}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Selector */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  disabled={!selectedNamespace}
                >
                  <option value="">Select Account</option>
                  {namespaces
                    .find(n => n['namespace-id'] === selectedNamespace)
                    ?.['namespace-accounts']
                    ?.map((account) => (
                      <option 
                        key={account['namespace-account-id']}
                        value={account['namespace-account-id']}
                      >
                        {account['namespace-account-name']}
                      </option>
                    )) || []}
                </select>
              </div>

              {/* Method Selector */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Method
                </label>
                <select
                  value={selectedMethod}
                  onChange={handleMethodChange}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  disabled={!selectedNamespace}
                >
                  <option value="">Select Method</option>
                  {namespaces
                    .find(n => n['namespace-id'] === selectedNamespace)
                    ?.['namespace-methods']
                    ?.map((method) => (
                      <option 
                        key={method['namespace-method-id']}
                        value={method['namespace-method-id']}
                      >
                        {method['namespace-method-name']}
                      </option>
                    )) || []}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={handleFetchClick}
                  disabled={isLoading || !selectedNamespace || !selectedAccount || !selectedMethod}
                  className={`
                    px-3 py-2 rounded-lg font-medium text-sm
                    flex items-center justify-center gap-2 transition-all duration-200 min-w-[90px]
                    transform active:scale-95 hover:-translate-y-0.5
                    ${isLoading || !selectedNamespace || !selectedAccount || !selectedMethod
                      ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Fetching</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className={`w-4 h-4 transition-transform duration-200 hover:rotate-180`} />
                      <span>Fetch</span>
                    </>
                  )}
                </button>

                <button
                  onClick={async () => {
                    await clearTableCache();
                    handleFetchClick();
                  }}
                  disabled={isLoading || !selectedNamespace || !selectedAccount || !selectedMethod}
                  className={`
                    px-3 py-2 rounded-lg font-medium text-sm
                    flex items-center justify-center gap-2 transition-all duration-200
                    transform active:scale-95 hover:-translate-y-0.5
                    ${isLoading || !selectedNamespace || !selectedAccount || !selectedMethod
                      ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:shadow-md'
                    }
                  `}
                >
                  <RefreshCw className={`w-4 h-4 transition-transform duration-200 hover:rotate-180`} />
                  <span>Clear Cache</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 sm:px-6 py-4 rounded-lg mb-4 sm:mb-8 flex items-center gap-2 text-sm">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              {error}
            </div>
          )}

          {/* Analytics and Table Section */}
          {tableData.length > 0 && (
            <React.Fragment>
              <Analytics data={tableData} />
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                        Items returned ({filteredData.length.toLocaleString()})
                        {selectedRows.size > 0 && (
                          <span className="ml-2 text-sm font-medium text-blue-600">
                            • {selectedRows.size.toLocaleString()} selected
                          </span>
                        )}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowColumnSelector(!showColumnSelector)}
                          className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Select Columns"
                        >
                          <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button 
                          onClick={downloadCSV}
                          className={`
                            p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors
                            ${selectedRows.size > 0 ? 'relative' : ''}
                          `}
                          title="Download CSV"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                          {selectedRows.size > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              {selectedRows.size}
                            </span>
                          )}
                        </button>
                        <button 
                          onClick={copyToClipboard}
                          className={`
                            p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors
                            ${selectedRows.size > 0 ? 'relative' : ''}
                          `}
                          title="Copy to Clipboard"
                        >
                          <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                          {selectedRows.size > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              {selectedRows.size}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="relative w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  {showColumnSelector && <ColumnSelector />}
                </div>
                
                {/* Table Container */}
                <div 
                  className="max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-400px)] overflow-auto"
                  onScroll={handleScroll}
                >
                  <div className="min-w-max relative">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] sm:min-w-[200px] sticky left-[65px] bg-gray-50 z-20">
                            Identifier
                          </th>
                          {Array.from(visibleColumns).map(column => (
                            <th 
                              key={column}
                              scope="col" 
                              className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] sm:min-w-[150px]"
                            >
                              {formatColumnHeader(column)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {/* Add spacer for items above */}
                        <tr style={{ height: `${virtualStart * 53}px` }} />
                        
                        {filteredData.slice(
                          virtualStart,
                          virtualStart + ROWS_PER_PAGE
                        ).map((item, index) => {
                          const actualIndex = virtualStart + index;
                          const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
                          if (!isRecord(rawItemData)) return null;
                          const itemData = rawItemData;
                          const identifier = getIdentifierField(itemData);
                          
                          return (
                            <tr key={actualIndex} className="hover:bg-gray-50">
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-20">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.has(actualIndex)}
                                  onChange={() => handleRowSelect(actualIndex)}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                              </td>
                              <td 
                                onClick={() => handleItemClick(item)}
                                className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer hover:text-blue-800 hover:underline sticky left-[65px] bg-white z-20 font-medium group"
                              >
                                <div className="flex items-center gap-2">
                                  {identifier.value}
                                  <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </td>
                              {Array.from(visibleColumns).map(column => {
                                const rawItemData = item.Item ? getDynamoValue(item.Item) : getDynamoValue(item);
                                if (!isRecord(rawItemData)) return null;
                                const itemData = rawItemData;
                                const cellValue = itemData[column];
                                const isLink = typeof cellValue === 'string' && cellValue.includes('http');
                                
                                return (
                                  <td 
                                    key={column}
                                    onClick={() => !isLink && handleItemClick(item)}
                                    className={`
                                      px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500
                                      ${isLink ? '' : 'cursor-pointer hover:bg-blue-50/50 group'}
                                      ${typeof cellValue === 'object' ? 'max-w-[300px] truncate' : ''}
                                    `}
                                  >
                                    <div className="flex items-center gap-2">
                                      {formatCellValue(cellValue)}
                                      {!isLink && (
                                        <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                        
                        {/* Add spacer for items below */}
                        <tr style={{ height: `${Math.max(0, filteredData.length - (virtualStart + ROWS_PER_PAGE)) * 53}px` }} />
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </React.Fragment>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={selectedItem}
        />
      </div>
    </React.Fragment>
  );
};

// Create a dynamic version of the content component
const DynamicTableDataContent = dynamic(() => Promise.resolve(TableDataContent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  )
});

// Main component that wraps everything
const TableData = () => {
  return (
    <ClientOnly>
      <DynamicTableDataContent />
    </ClientOnly>
  );
};

export default TableData;