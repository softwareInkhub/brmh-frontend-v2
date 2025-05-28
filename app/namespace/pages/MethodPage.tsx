import React, { useState, useEffect } from 'react';
import { Edit3, Hash, Type, Link2, Tag, Sliders, CheckCircle } from 'lucide-react';
import MethodTestModal from '@/app/components/MethodTestModal';

type Method = { id: string; name: string };
type Props = { onSelect?: (m: Method) => void; method?: any; namespace?: any; onTest?: (method: any, namespace: any) => void };

const methods = [
  { id: 'm1', name: 'GET /users' },
  { id: 'm2', name: 'POST /login' },
  { id: 'm3', name: 'DELETE /item' },
];

export default function MethodPage({ onSelect, method, namespace, onTest }: Props) {
  const [editMethod, setEditMethod] = useState<any>(method || {});
  const [saveMsg, setSaveMsg] = useState('');
  const [editMode, setEditMode] = useState(false);

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
        setEditMode(false);
      } else {
        setSaveMsg('Failed to update method.');
      }
    } catch {
      setSaveMsg('Failed to update method.');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-gradient-to-br flex flex-col h-full p-0 m-0">
      <div className="bg-white p-8 flex flex-col gap-6 w-full h-full m-0">
        {!editMode ? (
          <>
            <div className="flex items-center gap-3 mb-2 justify-between">
              <div className="flex items-center gap-3">
                <Sliders className="text-blue-500" size={28} />
                <h2 className="text-2xl font-bold text-blue-700 tracking-tight">Method Details</h2>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 items-center">
                <button
                  title="Test Method"
                  className="w-10 h-10 flex items-center justify-center bg-green-100 hover:bg-green-200 text-green-700 shadow transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                  onClick={() => {
                    if (onTest) onTest(editMethod, namespace);
                  }}
                >
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button
                  title="Edit"
                  className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                  onClick={() => setEditMode(true)}
                >
                  <svg width="23" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-2"><path d="M17 3a2.828 2.828 0 0 1 4 4L7 21H3v-4L17 3z"></path></svg>
                </button>
            <button
                  title="Delete"
                  className="w-10 h-10 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white shadow transition-colors"
                  style={{ borderRadius: '0.5rem' }}
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this method?')) {
                      try {
                        const res = await fetch(`/api/namespace/method`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: editMethod["namespace-method-id"] }),
                        });
                        if (!res.ok) throw new Error('Failed to delete method');
                        window.location.reload();
                      } catch {
                        alert('Failed to delete method');
                      }
                    }
                  }}
            >
                  <svg width="24" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Edit3 size={16} className="text-blue-400" /> Name</div>
                <div className="text-lg font-semibold text-gray-900">{editMethod["namespace-method-name"] || ''}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Hash size={16} className="text-purple-400" /> ID</div>
                <div className="text-base font-mono text-gray-700">{editMethod["namespace-method-id"] || ''}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Type size={16} className="text-green-400" /> Type</div>
                <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm font-bold shadow-sm">{editMethod["namespace-method-type"] || ''}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Link2 size={16} className="text-pink-400" /> URL Override</div>
                <div className="text-base text-gray-700">{editMethod["namespace-method-url-override"] || <span className="italic text-gray-400">None</span>}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Tag size={16} className="text-yellow-400" /> Tags</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(editMethod.tags) && editMethod.tags.length > 0 ? (
                    editMethod.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow">{tag}</span>
                    ))
                  ) : (
                    <span className="italic text-gray-400">No tags</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Sliders size={16} className="text-blue-400" /> Query Params</div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(editMethod["namespace-method-queryParams"]) ? editMethod["namespace-method-queryParams"] : []).length > 0 ? (
                    (editMethod["namespace-method-queryParams"] || []).map((q: any, idx: number) => (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono shadow-sm">{q.key || ''} = {q.value || ''}</span>
                    ))
                  ) : (
                    <span className="italic text-gray-400">No query params</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                <CheckCircle size={18} className={editMethod['save-data'] ? 'text-green-500' : 'text-gray-300'} />
                <span className={editMethod['save-data'] ? 'text-green-700 font-semibold' : 'text-gray-400'}>Save Data</span>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Edit3 className="text-blue-500" size={24} />
              <h2 className="text-xl font-bold text-blue-700 tracking-tight">Edit Method</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                  value={editMethod["namespace-method-name"] || ''}
                  onChange={e => handleInput("namespace-method-name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base bg-gray-100"
                  value={editMethod["namespace-method-id"] || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <input
                  type="text"
                  className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50 placeholder-gray-400"
                  value={editMethod["namespace-method-type"] || ''}
                  onChange={e => handleInput("namespace-method-type", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
                <input
                  type="text"
                  className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
                  value={editMethod["namespace-method-url-override"] || ''}
                  onChange={e => handleInput("namespace-method-url-override", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition outline-none bg-yellow-50 placeholder-gray-400"
                  value={Array.isArray(editMethod.tags) ? editMethod.tags.join(', ') : ''}
                  onChange={e => handleInput('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Query Params</label>
                <div className="space-y-2">
                  {(Array.isArray(editMethod["namespace-method-queryParams"]) ? editMethod["namespace-method-queryParams"] : []).map((q: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        placeholder="Key"
                        value={q.key || ''}
                        onChange={e => handleArrayInput("namespace-method-queryParams", idx, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
              <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={!!editMethod['save-data']}
                  onChange={e => handleInput('save-data', e.target.checked)}
                  id="save-data-checkbox"
                />
                <label htmlFor="save-data-checkbox" className="text-xs font-medium text-gray-700">Save Data</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="bg-gray-200 text-gray-700 rounded-lg px-6 py-2 font-semibold text-base hover:bg-gray-300 transition"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-2 font-bold text-base shadow-lg hover:from-blue-600 hover:to-purple-600 transition"
              >
                Save
              </button>
            </div>
            {saveMsg && <div className="text-green-600 text-sm mt-2">{saveMsg}</div>}
          </form>
        )}
      </div>
    </div>
  );
} 