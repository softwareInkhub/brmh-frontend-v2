import React, { useState, useEffect } from 'react';
import { X, Database } from 'lucide-react';

interface Namespace {
  "namespace-id": string;
  "namespace-name": string;
  "namespace-description"?: string;
  "namespace-url"?: string;
  "namespace-header"?: { key: string; value: string }[];
  "namespace-variables"?: { key: string; value: string }[];
  tags: string[];
}

interface NamespaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (namespace: Partial<Namespace>) => Promise<void>;
  namespace?: Namespace | null;
}

const NamespaceModal: React.FC<NamespaceModalProps> = ({ isOpen, onClose, onSave, namespace }) => {
  const isEdit = !!namespace && !!namespace["namespace-id"];
  const [form, setForm] = useState<Partial<Namespace>>({
    "namespace-name": '',
    "namespace-description": '',
    "namespace-url": '',
    "namespace-header": [],
    "namespace-variables": [],
    tags: [],
    ...namespace
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync form state with namespace prop
  useEffect(() => {
    setForm({
      "namespace-name": '',
      "namespace-description": '',
      "namespace-url": '',
      "namespace-header": [],
      "namespace-variables": [],
      tags: [],
      ...namespace
    });
  }, [namespace, isOpen]);

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }));
  };

  const handleRemoveTag = (idx: number) => {
    setForm(f => ({ ...f, tags: (f.tags || []).filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form["namespace-name"]) {
      setError('Namespace name is required');
      return;
    }
    if (!form["namespace-url"]) {
      setError('Namespace URL is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save namespace');
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
              <Database className="text-blue-600" size={16} />
            </div>
            <h3 className="text-xl font-semibold">
              {isEdit ? 'Edit Namespace' : 'Create New Namespace'}
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
              Namespace Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form["namespace-name"]}
              onChange={e => setForm(f => ({ ...f, "namespace-name": e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="Enter namespace name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namespace URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" /></svg>
              </span>
              <input
                type="text"
                value={form["namespace-url"]}
                onChange={e => setForm(f => ({ ...f, "namespace-url": e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="https://api.example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            {!isEdit ? (
              <input
                type="text"
                value={form.tags?.join(', ') || ''}
                onChange={handleTagInput}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter tags (comma-separated)"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(form.tags || []).map((tag, idx) => (
                  <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 text-blue-400 hover:text-blue-700"
                      onClick={() => handleRemoveTag(idx)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="flex-1 min-w-[120px] px-2 py-1 border rounded focus:ring-2 focus:ring-blue-200 text-xs"
                  placeholder="Add tag and press Enter"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setForm(f => ({ ...f, tags: [...(f.tags || []), e.currentTarget.value.trim()] }));
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            )}
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
            className={`px-4 py-2 ${isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg`}
            disabled={loading}
          >
            {loading ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Update Namespace' : 'Create Namespace'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NamespaceModal; 