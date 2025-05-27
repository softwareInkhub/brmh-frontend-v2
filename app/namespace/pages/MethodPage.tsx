import React, { useState, useEffect } from 'react';

type Method = { id: string; name: string };
type Props = { onSelect?: (m: Method) => void; method?: any; namespace?: any };

const methods = [
  { id: 'm1', name: 'GET /users' },
  { id: 'm2', name: 'POST /login' },
  { id: 'm3', name: 'DELETE /item' },
];

export default function MethodPage({ onSelect, method, namespace }: Props) {
  const [editMethod, setEditMethod] = useState<any>(method || {});
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setEditMethod(method || {});
  }, [method]);

  const handleInput = (field: string, value: any) => {
    setEditMethod((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleArrayInput = (field: string, idx: number, key: string, value: any) => {
    setEditMethod((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const handleAddArrayItem = (field: string, template: any) => {
    setEditMethod((prev: any) => ({
      ...prev,
      [field]: [...(Array.isArray(prev[field]) ? prev[field] : []), template],
    }));
  };

  const handleRemoveArrayItem = (field: string, idx: number) => {
    setEditMethod((prev: any) => {
      const arr = Array.isArray(prev[field]) ? [...prev[field]] : [];
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg('');
    try {
      // PATCH/PUT request to update method
      const res = await fetch(`/api/namespace/method`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMethod),
      });
      if (res.ok) {
        setSaveMsg('Method updated successfully!');
      } else {
        setSaveMsg('Failed to update method.');
      }
    } catch {
      setSaveMsg('Failed to update method.');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#f7f8fa] flex items-start">
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow p-4 flex flex-col gap-4 border border-gray-100 w-full">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
            value={editMethod["namespace-method-name"] || ''}
            onChange={e => handleInput("namespace-method-name", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">ID</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-gray-100"
            value={editMethod["namespace-method-id"] || ''}
            readOnly
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
            value={editMethod["namespace-method-type"] || ''}
            onChange={e => handleInput("namespace-method-type", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
            value={editMethod["namespace-method-url-override"] || ''}
            onChange={e => handleInput("namespace-method-url-override", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma separated)</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
            value={Array.isArray(editMethod.tags) ? editMethod.tags.join(', ') : ''}
            onChange={e => handleInput('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Query Params</label>
          <div className="space-y-2">
            {(Array.isArray(editMethod["namespace-method-queryParams"]) ? editMethod["namespace-method-queryParams"] : []).map((q: any, idx: number) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="border border-gray-200 rounded px-2 py-1 text-xs flex-1"
                  placeholder="Key"
                  value={q.key || ''}
                  onChange={e => handleArrayInput("namespace-method-queryParams", idx, 'key', e.target.value)}
                />
                <input
                  type="text"
                  className="border border-gray-200 rounded px-2 py-1 text-xs flex-1"
                  placeholder="Value"
                  value={q.value || ''}
                  onChange={e => handleArrayInput("namespace-method-queryParams", idx, 'value', e.target.value)}
                />
                <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveArrayItem("namespace-method-queryParams", idx)}>Remove</button>
              </div>
            ))}
            <button type="button" className="text-blue-600 text-xs mt-1" onClick={() => handleAddArrayItem("namespace-method-queryParams", { key: '', value: '' })}>+ Add Query Param</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!editMethod['save-data']}
            onChange={e => handleInput('save-data', e.target.checked)}
            id="save-data-checkbox"
          />
          <label htmlFor="save-data-checkbox" className="text-xs font-medium text-gray-700">Save Data</label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="bg-blue-500 text-white rounded px-4 py-2 font-semibold text-sm hover:bg-blue-600 transition" onClick={() => { console.log('Test method', editMethod); }}>Test</button>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold text-sm hover:bg-blue-700 transition">Save</button>
        </div>
        {saveMsg && <div className="text-green-600 text-sm mt-2">{saveMsg}</div>}
      </form>
    </div>
  );
} 