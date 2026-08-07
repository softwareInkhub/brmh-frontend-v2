import React, { useState, useEffect, useRef } from 'react';
import { X, Database, Upload, Image } from 'lucide-react';

interface Namespace {
  "namespace-id": string;
  "namespace-name": string;
  "namespace-description"?: string;
  "namespace-url"?: string;
  "icon-url"?: string;
  "namespace-header"?: { key: string; value: string }[];
  "namespace-variables"?: { key: string; value: string }[];
  tags: string[];
  "schemaId"?: string;
  "schemaIds"?: string[];
}

interface NamespaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (namespace: Partial<Namespace>) => Promise<void>;
  namespace?: Namespace | null;
}

const NamespaceModal: React.FC<NamespaceModalProps> = ({ isOpen, onClose, onSave, namespace }) => {
  const isEdit = !!namespace && !!namespace["namespace-id"];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<Namespace>>({
    "namespace-name": '',
    "namespace-description": '',
    "namespace-url": '',
    "namespace-header": [],
    "namespace-variables": [],
    tags: [],
    ...namespace
  });
  const [selectedIcon, setSelectedIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
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
    
    // Set icon preview if namespace has icon
    if (namespace?.["icon-url"]) {
      setIconPreview(namespace["icon-url"]);
    } else {
      setIconPreview(null);
    }
    setSelectedIcon(null);
  }, [namespace, isOpen]);

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) }));
  };

  const handleRemoveTag = (idx: number) => {
    setForm(f => ({ ...f, tags: (f.tags || []).filter((_, i) => i !== idx) }));
  };

  const handleIconSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }

      setSelectedIcon(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconRemove = () => {
    setSelectedIcon(null);
    setIconPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('namespace-name', form["namespace-name"] || '');
      formData.append('namespace-url', form["namespace-url"] || '');
      if (form.tags) {
        formData.append('tags', JSON.stringify(form.tags));
      }
      
      // Add icon file if selected
      if (selectedIcon) {
        formData.append('icon', selectedIcon);
      }
      
      await onSave(formData);
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
          {/* Icon Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Namespace Icon
            </label>
            <div className="flex items-center gap-4">
              {/* Icon Preview */}
              <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {iconPreview ? (
                  <img 
                    src={iconPreview} 
                    alt="Namespace icon" 
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <Image className="w-6 h-6 text-gray-400" />
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconSelect}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {iconPreview ? 'Change Icon' : 'Upload Icon'}
                  </button>
                  {iconPreview && (
                    <button
                      type="button"
                      onClick={handleIconRemove}
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 128x128px, max 5MB
                </p>
              </div>
            </div>
          </div>

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

          {isEdit && namespace && Array.isArray(namespace["schemaIds"]) && namespace["schemaIds"].length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schema IDs</label>
              <ul className="list-disc pl-5 text-xs text-gray-700 bg-gray-100 rounded p-2">
                {namespace["schemaIds"].map((id: string) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
          )}
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