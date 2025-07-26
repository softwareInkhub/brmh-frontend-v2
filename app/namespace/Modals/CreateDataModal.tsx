import React, { useState } from 'react';
import { DynamicForm } from '../components/SchemaService';

interface CreateDataModalProps {
  open: boolean;
  onClose: () => void;
  schema: any;
  tableName: string;
  onSuccess?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// Recursive schema form
function RenderSchemaForm({ schema, formData, setFormData, path = '' }: { schema: any, formData: any, setFormData: (d: any) => void, path?: string }) {
  if (!schema || !schema.properties) return null;

  return (
    <form className="space-y-4">
      {Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
        const fullKey = path ? `${path}.${key}` : key;
        const value = formData[key] ?? '';

        // Enum
        if (prop.enum) {
          return (
            <div key={fullKey}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{key}</label>
              <select
                className="border border-gray-300 p-2 rounded w-full text-xs"
                value={value}
                onChange={e => setFormData({ ...formData, [key]: e.target.value })}
              >
                <option value="">Select...</option>
                {prop.enum.map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          );
        }

        // Array of strings/numbers
        if (prop.type === 'array' && prop.items && (prop.items.type === 'string' || prop.items.type === 'number')) {
          return (
            <div key={fullKey}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{key} (array)</label>
              <input
                className="border border-gray-300 p-2 rounded w-full text-xs"
                type="text"
                value={Array.isArray(value) ? value.join(',') : ''}
                onChange={e => setFormData({ ...formData, [key]: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) })}
                placeholder="Comma separated values"
              />
            </div>
          );
        }

        // Nested object
        if (prop.type === 'object') {
          return (
            <div key={fullKey} className="border-l-2 pl-3 ml-2 bg-gray-50 rounded">
              <label className="block text-xs font-semibold text-gray-700 mb-1">{key} (object)</label>
              <RenderSchemaForm
                schema={prop}
                formData={value || {}}
                setFormData={(subData: any) => setFormData({ ...formData, [key]: subData })}
                path={fullKey}
              />
            </div>
          );
        }

        // String/number/boolean
        return (
          <div key={fullKey}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{key} ({prop.type})</label>
            <input
              className="border border-gray-300 p-2 rounded w-full text-xs"
              type={prop.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={e => setFormData({ ...formData, [key]: prop.type === 'number' ? Number(e.target.value) : e.target.value })}
            />
          </div>
        );
      })}
    </form>
  );
}

const CreateDataModal: React.FC<CreateDataModalProps> = ({ open, onClose, schema, tableName, onSuccess }) => {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const itemToSave = { ...formData };
      const res = await fetch(`${API_URL}/unified/schema/table/${tableName}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: itemToSave
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        let errMsg = data.error || 'Unknown error';
        if (res.status === 404) {
          errMsg = `Table "${tableName}" does not exist. Please create the table first.`;
        }
        setError('Failed to save data: ' + errMsg);
      }
    } catch (err) {
      setError('Failed to save data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col relative z-10 max-h-[95vh] border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">Create Data for {tableName}</h2>
          <button className="text-gray-500 hover:text-gray-700 text-xl" onClick={onClose}>✕</button>
        </div>
        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Schema view */}
          <div className="w-1/2 border-r bg-gray-50 p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 64px - 64px)' }}>
            <div className="font-semibold text-sm mb-2">Schema</div>
            <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">{JSON.stringify(schema, null, 2)}</pre>
          </div>
          {/* Data form */}
          <div className="w-1/2 p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 64px - 64px)' }}>
            <RenderSchemaForm schema={schema} formData={formData} setFormData={setFormData} />
          </div>
        </div>
        {/* Sticky action bar */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white rounded-b-2xl z-10">
          {error && <div className="text-red-600 text-sm mr-auto">{error}</div>}
          <button
            type="button"
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDataModal; 