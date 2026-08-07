import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';

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

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
  namespaceId: string;
  refreshNamespaceDetails: () => Promise<void>;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, account, namespaceId, refreshNamespaceDetails }) => {
  const [form, setForm] = useState<Partial<Account>>({
    "namespace-account-name": '',
    "namespace-account-url-override": '',
    "namespace-account-header": [],
    variables: [],
    tags: [],
    ...account
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  useEffect(() => {
    setForm({
      "namespace-account-name": '',
      "namespace-account-url-override": '',
      "namespace-account-header": [],
      variables: [],
      tags: [],
      ...account
    });
  }, [account]);

  const handleSave = async () => {
    if (!form["namespace-account-name"]) {
      setError('Account name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isEdit = !!form["namespace-account-id"];
      const url = isEdit
        ? `${API_BASE_URL}/unified/accounts/${form["namespace-account-id"]}`
        : `${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts`;

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
        throw new Error('Failed to save account');
      }

      await refreshNamespaceDetails();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
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
              <User className="text-blue-600" size={16} />
            </div>
            <h3 className="text-xl font-semibold">
              {account ? 'Edit Account' : 'Create Account'}
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
              Account Name *
            </label>
            <input
              type="text"
              value={form["namespace-account-name"]}
              onChange={e => setForm(f => ({ ...f, "namespace-account-name": e.target.value }))}
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
              value={form["namespace-account-url-override"]}
              onChange={e => setForm(f => ({ ...f, "namespace-account-url-override": e.target.value }))}
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
                onClick={() => setForm(f => ({ ...f, "namespace-account-header": [...(f["namespace-account-header"] || []), { key: '', value: '' }] }))}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Header
              </button>
            </div>
            <div className="space-y-2">
              {form["namespace-account-header"]?.map((header, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={header.key}
                    onChange={e => {
                      const updated = [...(form["namespace-account-header"] || [])];
                      updated[index] = { ...header, key: e.target.value };
                      setForm(f => ({ ...f, "namespace-account-header": updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={header.value}
                    onChange={e => {
                      const updated = [...(form["namespace-account-header"] || [])];
                      updated[index] = { ...header, value: e.target.value };
                      setForm(f => ({ ...f, "namespace-account-header": updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (form["namespace-account-header"] || []).filter((_, i) => i !== index);
                      setForm(f => ({ ...f, "namespace-account-header": updated }));
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
                onClick={() => setForm(f => ({ ...f, variables: [...(f.variables || []), { key: '', value: '' }] }))}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Variable
              </button>
            </div>
            <div className="space-y-2">
              {form.variables?.map((variable, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key"
                    value={variable.key}
                    onChange={e => {
                      const updated = [...(form.variables || [])];
                      updated[index] = { ...variable, key: e.target.value };
                      setForm(f => ({ ...f, variables: updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={variable.value}
                    onChange={e => {
                      const updated = [...(form.variables || [])];
                      updated[index] = { ...variable, value: e.target.value };
                      setForm(f => ({ ...f, variables: updated }));
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (form.variables || []).filter((_, i) => i !== index);
                      setForm(f => ({ ...f, variables: updated }));
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
            className={`px-4 py-2 ${account ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg`}
            disabled={loading}
          >
            {loading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountModal; 