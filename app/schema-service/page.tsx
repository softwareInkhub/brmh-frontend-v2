'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Eye, Save, X, MoreVertical, FileText, Copy as CopyIcon, Download as DownloadIcon, Trash2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { API_BASE_URL } from '../config';
import MockServerModal from '../components/MockServerModal';

interface Schema {
  id: string;
  methodId: string;
  methodName: string;
  schemaName?: string;
  namespaceId: string;
  schemaType: string;
  schema: any;
  isArray: boolean;
  originalType: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

// Helper: Field types
const FIELD_TYPES = ['string', 'number', 'boolean', 'object', 'array'];

// Helper: Render tree view
function SchemaTree({ schema, path = [] }: { schema: any; path?: (string | number)[] }) {
  if (typeof schema !== 'object' || schema === null) {
    return <span className="text-blue-700">{String(schema)}</span>;
  }
  if (Array.isArray(schema)) {
    return (
      <div className="ml-4 border-l-2 border-pink-200 pl-2">
        [
        {schema.map((item: any, idx: number) => (
          <div key={idx}>
            <SchemaTree schema={item} path={[...path, idx]} />
          </div>
        ))}
        ]
      </div>
    );
  }
  return (
    <div className="ml-4 border-l-2 border-blue-200 pl-2">
      {Object.entries(schema).map(([key, value]: [string, any]) => (
        <div key={key} className="mb-1">
          <span className="font-mono text-xs text-purple-700">{key}</span>: <SchemaTree schema={value} path={[...path, key]} />
        </div>
      ))}
    </div>
  );
}

interface Field {
  name: string;
  type: string;
  children?: Field[];
}

interface SchemaFieldFormProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

// Helper: Dynamic field form
function SchemaFieldForm({ fields, onChange }: SchemaFieldFormProps) {
  const handleFieldChange = (idx: number, key: string, value: any) => {
    const updated = fields.map((f, i) => i === idx ? { ...f, [key]: value } : f);
    onChange(updated);
  };
  const handleAddField = () => {
    onChange([...fields, { name: '', type: 'string', children: [] }]);
  };
  const handleRemoveField = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  };
  const handleChildrenChange = (idx: number, children: Field[]) => {
    const updated = fields.map((f, i) => i === idx ? { ...f, children } : f);
    onChange(updated);
  };
  return (
    <div>
      {fields.map((field, idx) => (
        <div key={idx}>
          <div className="flex gap-2 mb-2 items-center">
            <input
              className="border rounded px-2 py-1 text-xs w-24"
              placeholder="Field name"
              value={field.name}
              onChange={e => handleFieldChange(idx, 'name', e.target.value)}
            />
            <select
              className="border rounded px-2 py-1 text-xs"
              value={field.type}
              onChange={e => handleFieldChange(idx, 'type', e.target.value)}
            >
              {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="text-xs text-gray-400 hover:text-red-500 px-1" onClick={() => handleRemoveField(idx)}>Remove</button>
          </div>
          {['object', 'array'].includes(field.type) && (
            <div className="ml-6 border-l-2 border-gray-200 pl-4 mb-2">
              <SchemaFieldForm
                fields={field.children || []}
                onChange={children => handleChildrenChange(idx, children)}
              />
            </div>
          )}
        </div>
      ))}
      <button className="text-xs text-blue-500 hover:underline mt-2" onClick={handleAddField}>+ Add Field</button>
    </div>
  );
}

// Helper: Convert field form to schema object
function fieldsToSchema(fields: Field[]): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const field of fields) {
    if (field.type === 'object') {
      obj[field.name] = fieldsToSchema(field.children || []);
    } else if (field.type === 'array') {
      obj[field.name] = [fieldsToSchema(field.children || [])];
    } else {
      obj[field.name] = field.type;
    }
  }
  return obj;
}

// Helper: Convert schema object to field form
function schemaToFields(schema: any): Field[] {
  if (typeof schema !== 'object' || schema === null) return [];
  return Object.entries(schema).map(([name, value]: [string, any]) => {
    if (Array.isArray(value)) {
      return { name, type: 'array', children: schemaToFields(value[0] || {}) };
    } else if (typeof value === 'object') {
      return { name, type: 'object', children: schemaToFields(value) };
    } else {
      return { name, type: value };
    }
  });
}

// Dropdown menu for card actions
function CardMenu({ onView, onEdit, onPreview, onDuplicate, onCopy, onDownload, onDelete }: {
  onView: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onPreview?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="p-2 text-gray-400 hover:text-blue-600 transition"
        onClick={e => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Open menu"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-10">
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onPreview && onPreview(); }}><Eye size={14} /> Preview</button>
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onView(e); }}><FileText size={14} /> View</button>
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}><Edit2 size={14} /> Edit</button>
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate && onDuplicate(); }}><CopyIcon size={14} /> Duplicate</button>
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onCopy && onCopy(); }}><CopyIcon size={14} /> Copy</button>
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onDownload && onDownload(); }}><DownloadIcon size={14} /> Download</button>
          <button className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete && onDelete(); }}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </div>
  );
}

const SchemaServicePage = () => {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockServerModalOpen, setIsMockServerModalOpen] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    schemaName: '',
    namespaceId: '',
    schemaType: 'response',
    schema: {},
    isArray: false,
    originalType: 'object',
    url: ''
  });

  // Fetch all schemas
  const fetchSchemas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/schema/list`);
      if (!response.ok) throw new Error('Failed to fetch schemas');
      const data = await response.json();
      setSchemas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schemas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemas();
  }, []);

  // Handle schema creation
  const handleCreateSchema = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schema/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create schema');
      
      await fetchSchemas();
      setIsCreateModalOpen(false);
      setFormData({
        schemaName: '',
        namespaceId: '',
        schemaType: 'response',
        schema: {},
        isArray: false,
        originalType: 'object',
        url: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schema');
    }
  };

  // Handle schema update
  const handleUpdateSchema = async () => {
    if (!selectedSchema) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/schema/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId: selectedSchema.id,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to update schema');
      
      await fetchSchemas();
      setIsCreateModalOpen(false);
      setSelectedSchema(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schema');
    }
  };

  // Open view modal
  const handleViewSchema = (schema: Schema) => {
    setSelectedSchema(schema);
    setIsViewModalOpen(true);
  };

  // Open edit modal
  const handleEditSchema = (schema: Schema) => {
    setSelectedSchema(schema);
    setFormData({
      schemaName: schema.schemaName || schema.methodName || '',
      namespaceId: schema.namespaceId,
      schemaType: schema.schemaType,
      schema: schema.schema,
      isArray: schema.isArray,
      originalType: schema.originalType,
      url: schema.url
    });
    setIsCreateModalOpen(true);
  };

  // Handle schema deletion
  const handleDeleteSchema = async (schemaId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schema/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId })
      });

      if (!response.ok) throw new Error('Failed to delete schema');
      
      await fetchSchemas();
      setIsCreateModalOpen(false);
      setSelectedSchema(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schema');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 md:p-6 lg:p-6 xl:p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schema Service</h1>
            <p className="text-gray-600 mt-2">Manage and configure your schema services</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsMockServerModalOpen(true)}
              className="bg-gray-100 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-100 border border-blue-200"
            >
              Mock Server
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus size={20} />
              Create Schema
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">Loading schemas...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 auto-rows-min" style={{gridAutoFlow: 'row dense'}}>
            {schemas.map((schema) => (
              <div
                key={schema.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-150 border border-gray-100 p-2 flex flex-col gap-1 min-h-[70px] relative group text-xs max-w-xs w-full cursor-pointer"
                onClick={() => handleViewSchema(schema)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-gray-900 truncate flex-1">
                    {schema.schemaName || <span className='italic text-gray-400'>No Name</span>}
                  </h3>
                  <CardMenu
                    onView={(e) => handleViewSchema(schema)}
                    onEdit={() => handleEditSchema(schema)}
                    onPreview={() => handleViewSchema(schema)}
                    onDuplicate={() => {/* TODO: Implement duplicate logic */}}
                    onCopy={() => { navigator.clipboard.writeText(JSON.stringify(schema, null, 2)); }}
                    onDownload={() => {
                      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${schema.schemaName || 'schema'}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    onDelete={() => handleDeleteSchema(schema.id)}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span className="ml-auto text-gray-400">Updated: {new Date(schema.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-gray-400 break-all">
                  <span className="font-mono">ID: {schema.methodId || <span className='italic text-gray-300'>N/A</span>}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm bg-white/30">
            <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
              {/* Gradient accent bar */}
              <div className="h-2 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2" />
              <div className="p-4 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedSchema ? 'Edit Schema' : 'Create Schema'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setSelectedSchema(null);
                    }}
                    className="text-gray-400 hover:text-pink-500 transition-colors p-2 rounded-full hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-300"
                    aria-label="Close"
                  >
                    <X size={28} />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  {/* Left: Schema Name and Dynamic Field Form */}
                  <div className="flex-1 min-w-[250px] border-r pr-4">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Schema Name</label>
                      <input
                        type="text"
                        value={formData.schemaName}
                        onChange={e => setFormData({ ...formData, schemaName: e.target.value })}
                        className="w-64 px-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base bg-white placeholder-gray-400"
                        placeholder="Enter schema name"
                      />
                    </div>
                    <h3 className="font-semibold mb-2 text-blue-700">Schema Fields</h3>
                    <SchemaFieldForm
                      fields={schemaToFields(formData.schema)}
                      onChange={fields => setFormData({ ...formData, schema: fieldsToSchema(fields) })}
                    />
                  </div>
                  {/* Right: JSON Editor */}
                  <div className="flex-1 min-w-[250px] pl-4">
                    <h3 className="font-semibold mb-2 text-purple-700">Schema (Advanced JSON Editor)</h3>
                    <div className="mt-1 border rounded-md h-[300px]">
                      <Editor
                        height="300px"
                        defaultLanguage="json"
                        value={JSON.stringify(formData.schema, null, 2)}
                        onChange={(value) => {
                          try {
                            const parsed = value ? JSON.parse(value) : {};
                            setFormData({ ...formData, schema: parsed });
                          } catch (e) {
                            // Invalid JSON, don't update
                          }
                        }}
                        options={{
                          minimap: { enabled: false },
                          formatOnPaste: true,
                          formatOnType: true
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-6">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setSelectedSchema(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={selectedSchema ? handleUpdateSchema : handleCreateSchema}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto"
                  >
                    <Save size={20} />
                    {selectedSchema ? 'Update Schema' : 'Create Schema'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && selectedSchema && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm bg-white/30">
            <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
              {/* Gradient accent bar */}
              <div className="h-2 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2" />
              <div className="p-4 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Schema Details</h2>
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setSelectedSchema(null);
                    }}
                    className="text-gray-400 hover:text-pink-500 transition-colors p-2 rounded-full hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-300"
                    aria-label="Close"
                  >
                    <X size={28} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Schema Name</h3>
                    <p className="text-lg font-medium text-gray-900 bg-blue-50 rounded px-2 py-1 break-all">{selectedSchema.schemaName}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-1">Method ID</h3>
                    <p className="text-xs font-mono text-gray-700 bg-purple-50 rounded px-2 py-1 break-all">{selectedSchema.methodId}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-pink-500 uppercase tracking-wide mb-2">Schema</h3>
                  <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-pink-200 rounded-lg p-4 max-h-48 overflow-auto">
                    <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-800">
                      {JSON.stringify(selectedSchema.schema, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</h3>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 shadow-sm">
                      {selectedSchema.schemaType}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Is Array</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${selectedSchema.isArray ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'}`}>{selectedSchema.isArray ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">URL</h3>
                  <p className="text-sm text-blue-700 font-mono break-all">{selectedSchema.url}</p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end mt-6 gap-2 sm:gap-4">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setSelectedSchema(null);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-lg font-semibold shadow hover:from-pink-500 hover:to-blue-500 transition-all w-full sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <MockServerModal isOpen={isMockServerModalOpen} onClose={() => setIsMockServerModalOpen(false)} />
      {/* Fade-in animation */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </>
  );
};

export default SchemaServicePage;