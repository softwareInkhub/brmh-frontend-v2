import React, { useEffect, useState } from 'react';
import { X, Terminal, Edit2, Trash2, Play, Database, Link } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface KeyValuePair {
  key: string;
  value: string;
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
  "namespace-name"?: string;
  "namespace-account-name"?: string;
}

interface MethodPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: Method | null;
  onTest?: (method: Method) => void;
  onTable?: (method: Method, tableName: string) => void;
  onEdit?: (method: Method) => void;
  onDelete?: (method: Method) => void;
  onRegisterWebhook?: (method: Method) => void;
}

const methodTypeColor = (type: string) => {
  switch (type) {
    case 'GET': return 'bg-green-100 text-green-700';
    case 'POST': return 'bg-blue-100 text-blue-700';
    case 'PUT': return 'bg-yellow-100 text-yellow-700';
    case 'DELETE': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};


const MethodPreviewModal: React.FC<MethodPreviewModalProps> = ({ isOpen, onClose, method, onTest, onTable, onEdit, onDelete, onRegisterWebhook }) => {
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookRoute, setWebhookRoute] = useState('');
  const [webhookTable, setWebhookTable] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState('');
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [allWebhooks, setAllWebhooks] = useState<any[]>([]);
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');

  // Fetch all webhooks and filter for this method
  useEffect(() => {
    const fetchAllWebhooks = async () => {
      if (!method) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/webhooks/items`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch webhooks');
        const data = await response.json();
        const webhooksList = (data.items || []).map((item: any) => ({
          id: item.id.S,
          methodId: item.methodId.S,
          route: item.route.S,
          tableName: item.tableName.S,
          createdAt: item.createdAt.S
        }));
        setAllWebhooks(webhooksList);
        setWebhooks(webhooksList.filter((w: any) => w.methodId === method["namespace-method-id"]));
      } catch (error) {
        console.error('Error fetching webhooks:', error);
        setWebhooks([]);
      }
    };
    if (isOpen && method) fetchAllWebhooks();
  }, [isOpen, method]);

  // Helper to generate default table name
  const getDefaultTableName = () => {
    if (!method) return '';
    // Use placeholders if not present
    const ns = method["namespace-name"] || 'namespace';
    const acc = method["namespace-account-name"] || 'account';
    const mth = method["namespace-method-name"] || 'method';
    return `${ns}_${acc}_${mth}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  };

  useEffect(() => {
    if (showTableModal && method) {
      setTableNameInput(getDefaultTableName());
    }
    // eslint-disable-next-line
  }, [showTableModal, method]);

  const handleAddWebhook = async () => {
    setWebhookLoading(true);
    setWebhookError('');
    try {
      if (!webhookRoute || !webhookTable) {
        setWebhookError('Route and Table Name are required');
        setWebhookLoading(false);
        return;
      }
      const webhookData = {
        id: crypto.randomUUID(),
        methodId: currentMethod['namespace-method-id'],
        route: webhookRoute,
        tableName: webhookTable,
        createdAt: new Date().toISOString()
      };
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/webhooks/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData)
      });
      if (!response.ok) {
        throw new Error('Failed to save webhook');
      }
      toast.success('Webhook added successfully');
      setShowWebhookForm(false);
      setWebhookRoute('');
      setWebhookTable('');
      setWebhooks(prev => [...prev, webhookData]);
      setAllWebhooks(prev => [...prev, webhookData]);
    } catch (error: any) {
      setWebhookError(error.message || 'Failed to add webhook');
      console.error('Add Webhook Error:', error);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dynamodb/tables/webhooks/items/${webhookId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        let errorData = null;
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : null;
        } catch {}
        throw new Error(errorData?.message || 'Failed to delete webhook');
      }
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      setAllWebhooks(prev => prev.filter(w => w.id !== webhookId));
      toast.success('Webhook deleted successfully');
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleTableCreation = async (tableName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/unified/table/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create table');
      }

      const result = await response.json();
      toast.success(`Table "${tableName}" created successfully!`);
      if (onTable) onTable(currentMethod, tableName);
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create table');
    }
  };

  if (!isOpen || !method) {
    return null;
  }

  // At this point we know method is not null
  const currentMethod = method as Method;

  return (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full mr-2 ${methodTypeColor(currentMethod["namespace-method-type"])}`}>{currentMethod["namespace-method-type"]}</span>
          <h2 className="text-2xl font-bold text-gray-900 flex-1 truncate">{currentMethod["namespace-method-name"]}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        {/* ID and URL Override */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1 font-medium">ID</div>
            <div className="text-xs font-mono break-all text-gray-800">{currentMethod["namespace-method-id"]}</div>
          </div>
          {currentMethod["namespace-method-url-override"] && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1 font-medium">URL Override</div>
              <div className="text-xs font-mono break-all text-gray-800">{currentMethod["namespace-method-url-override"]}</div>
            </div>
          )}
        </div>
        {/* Query Parameters */}
        {currentMethod["namespace-method-queryParams"]?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-700 mb-2">Query Parameters</div>
            <div className="flex flex-wrap gap-2">
              {currentMethod["namespace-method-queryParams"].map((param, idx) => (
                <div key={idx} className="bg-gray-100 rounded-lg px-4 py-2 flex gap-6 min-w-[120px] text-xs">
                  <span className="font-medium text-gray-700">{param.key}</span>
                  <span className="text-gray-500">{param.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Tags */}
        <div className="mb-2">
          <div className="text-xs font-medium text-gray-700 mb-2">Tags</div>
          <div className="flex flex-wrap gap-2">
            {currentMethod.tags && currentMethod.tags.length > 0 ? (
              currentMethod.tags.map((tag, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
              ))
            ) : (
              <span className="text-xs text-gray-400">No tags</span>
            )}
          </div>
        </div>
        {/* Save Data */}
        <div className="flex items-center gap-2 text-xs text-gray-700 mb-4">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4" /></svg>
            Save Data:
          </span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${currentMethod["save-data"] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{currentMethod["save-data"] ? 'Yes' : 'No'}</span>
        </div>
        <hr className="my-4" />
        {/* Webhooks Section */}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-medium text-gray-700 text-sm">Webhooks</span>
          {!showWebhookForm ? (
            <button
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              onClick={() => setShowWebhookForm(true)}
            >
              <Terminal className="w-4 h-4 mr-1 text-purple-500" /> Register Webhook
            </button>
          ) : (
            <button
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              onClick={() => setShowWebhookForm(false)}
            >
              <Terminal className="w-4 h-4 mr-1 text-purple-500" /> Cancel
            </button>
          )}
        </div>
        {!showWebhookForm && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 mb-2">
            {webhooks.length === 0 ? (
              <span>No webhooks registered for this method.</span>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{webhook.route}</p>
                      <p className="text-xs text-gray-500">Table: {webhook.tableName}</p>
                      <p className="text-xs text-gray-400 mt-1">Created: {new Date(webhook.createdAt).toLocaleString('en-GB')}</p>
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
            )}
          </div>
        )}
        {showWebhookForm && (
          <div className="bg-gray-50 rounded-lg p-6 mb-2">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Route *</label>
              <input
                type="text"
                value={webhookRoute}
                onChange={e => setWebhookRoute(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter webhook route"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Table Name *</label>
              <input
                type="text"
                value={webhookTable}
                onChange={e => setWebhookTable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter table name"
              />
            </div>
            {webhookError && <div className="text-xs text-red-600 mb-2">{webhookError}</div>}
            <div className="flex justify-end">
              <button
                onClick={handleAddWebhook}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                disabled={webhookLoading}
              >
                {webhookLoading ? 'Adding...' : 'Add Webhook'}
              </button>
            </div>
          </div>
        )}
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-8">
          <button
            title="Test Method"
            className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            onClick={() => onTest && onTest(currentMethod)}
          >
            <Play size={18} />
          </button>
          <button
            title="Table"
            className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            onClick={() => setShowTableModal(true)}
          >
            <Database size={18} />
          </button>
          <button
            title="Edit"
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => onEdit && onEdit(currentMethod)}
          >
            <Edit2 size={18} />
          </button>
          <button
            title="Delete"
            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete this method?')) {
                try {
                  const response = await fetch(
                    `${API_BASE_URL}/unified/methods/${currentMethod['namespace-method-id']}`,
                    { method: 'DELETE' }
                  );
                  if (!response.ok) throw new Error('Failed to delete method');
                  if (typeof window !== 'undefined' && window.location) window.location.reload();
                } catch (error) {
                  alert('Failed to delete method');
                }
              }
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
        {/* Table Name Modal */}
        {showTableModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowTableModal(false)}>
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Choose Table Name</h3>
              <input
                type="text"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-4"
                value={tableNameInput}
                onChange={e => setTableNameInput(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  onClick={() => setShowTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => {
                    setShowTableModal(false);
                    handleTableCreation(tableNameInput);
                  }}
                >
                  Create Table
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MethodPreviewModal; 