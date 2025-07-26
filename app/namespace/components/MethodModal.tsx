"use client"
import React, { useState, useEffect } from 'react';
import { X, Terminal } from 'lucide-react';

interface KeyValuePair {
  key: string;
  value: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

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

interface MethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  method?: Method | null;
  namespaceId: string;
  refreshNamespaceDetails: () => Promise<void>;
}

const MethodModal: React.FC<MethodModalProps> = ({ isOpen, onClose, method, namespaceId, refreshNamespaceDetails }) => {
  const [form, setForm] = useState<Partial<Method>>({
    "namespace-method-name": '',
    "namespace-method-type": 'GET',
    "namespace-method-url-override": '',
    "namespace-method-queryParams": [],
    "namespace-method-header": [],
    "save-data": false,
    "isInitialized": false,
    tags: [],
    ...method
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      "namespace-method-name": '',
      "namespace-method-type": 'GET',
      "namespace-method-url-override": '',
      "namespace-method-queryParams": [],
      "namespace-method-header": [],
      "save-data": false,
      "isInitialized": false,
      tags: [],
      ...method
    });
  }, [method]);

  const handleSave = async () => {
    if (!form["namespace-method-name"]) {
      setError('Method name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isEdit = !!form["namespace-method-id"];
      const url = isEdit
        ? `${API_BASE_URL}/unified/methods/${form["namespace-method-id"]}`
        : `${API_BASE_URL}/unified/namespaces/${namespaceId}/methods`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          "namespace-id": namespaceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save method');
      }

      const savedMethod = await response.json();
      await refreshNamespaceDetails();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save method');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Terminal className="text-blue-600" size={16} />
            </div>
            <h3 className="text-xl font-semibold">
              {method ? 'Edit Method' : 'Create Method'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method Name *
            </label>
            <input
              type="text"
              value={form["namespace-method-name"]}
              onChange={e => setForm(f => ({ ...f, "namespace-method-name": e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Method Type *
            </label>
            <select
              value={form["namespace-method-type"]}
              onChange={e => setForm(f => ({ ...f, "namespace-method-type": e.target.value }))}
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
              value={form["namespace-method-url-override"]}
              onChange={e => setForm(f => ({ ...f, "namespace-method-url-override": e.target.value }))}
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
                onClick={() => setForm(f => ({ ...f, "namespace-method-queryParams": [...(f["namespace-method-queryParams"] || []), { key: '', value: '' }] }))}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Query Parameter
              </button>
            </div>
            <div className="space-y-2">
              {form["namespace-method-queryParams"]?.map((param, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={param.key}
                    onChange={e => {
                      const updated = [...(form["namespace-method-queryParams"] || [])];
                      updated[index] = { ...param, key: e.target.value };
                      setForm(f => ({ ...f, "namespace-method-queryParams": updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={param.value}
                    onChange={e => {
                      const updated = [...(form["namespace-method-queryParams"] || [])];
                      updated[index] = { ...param, value: e.target.value };
                      setForm(f => ({ ...f, "namespace-method-queryParams": updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (form["namespace-method-queryParams"] || []).filter((_, i) => i !== index);
                      setForm(f => ({ ...f, "namespace-method-queryParams": updated }));
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
                onClick={() => setForm(f => ({ ...f, "namespace-method-header": [...(f["namespace-method-header"] || []), { key: '', value: '' }] }))}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Header
              </button>
            </div>
            <div className="space-y-2">
              {form["namespace-method-header"]?.map((header, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={header.key}
                    onChange={e => {
                      const updated = [...(form["namespace-method-header"] || [])];
                      updated[index] = { ...header, key: e.target.value };
                      setForm(f => ({ ...f, "namespace-method-header": updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={header.value}
                    onChange={e => {
                      const updated = [...(form["namespace-method-header"] || [])];
                      updated[index] = { ...header, value: e.target.value };
                      setForm(f => ({ ...f, "namespace-method-header": updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (form["namespace-method-header"] || []).filter((_, i) => i !== index);
                      setForm(f => ({ ...f, "namespace-method-header": updated }));
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
              value={form.tags?.join(', ')}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="save-data"
              checked={form["save-data"]}
              onChange={e => setForm(f => ({ ...f, "save-data": e.target.checked }))}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="save-data" className="text-sm text-gray-700">
              Save Data
            </label>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 ${method ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg`}
            disabled={loading}
          >
            {loading ? 'Saving...' : method ? 'Update Method' : 'Create Method'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MethodModal; 