import React, { useEffect, useState, useRef } from 'react';
import { Eye, Pencil, Trash2, Zap, Send, Database, Plus, X } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export default function AllMethodPage({ namespace, onViewMethod, openCreate = false }: { namespace?: any, onViewMethod?: (method: any, ns?: any) => void, openCreate?: boolean }) {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePanel, setSidePanel] = useState<'create' | { method: any } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createData, setCreateData] = useState<any>({
    "namespace-method-name": '',
    "namespace-method-type": 'GET',
    "namespace-method-url-override": '',
    "namespace-method-queryParams": [],
    "namespace-method-header": [],
    "save-data": false,
    "isInitialized": false,
    "tags": [],
  });
  const [createMsg, setCreateMsg] = useState('');
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const pageRef = useRef<HTMLDivElement>(null);
  const [sheetBounds, setSheetBounds] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateSheetBounds = () => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    setSheetBounds({ left: rect.left + window.scrollX, width: rect.width });
  };

  const fetchAllMethods = async () => {
    setLoading(true);
    try {
      let allMethods: any[] = [];
      if (namespace) {
        const mRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespace['namespace-id']}/methods`);
        const nsMethods = await mRes.json();
        allMethods = (nsMethods || []).map((m: any) => ({ ...m, namespace }));
      } else {
        const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces`);
        const namespaces = await nsRes.json();
        for (const ns of namespaces) {
          const mRes = await fetch(`${API_BASE_URL}/unified/namespaces/${ns['namespace-id']}/methods`);
          const nsMethods = await mRes.json();
          allMethods = allMethods.concat(
            (nsMethods || []).map((m: any) => ({ ...m, namespace: ns }))
          );
        }
      }
      setMethods(allMethods);
    } catch (err) {
      setMethods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMethods();
  }, [namespace]);

  // Auto-open create panel when requested
  useEffect(() => {
    if (openCreate) {
      setSidePanel('create');
    }
  }, [openCreate]);

  // Support query param create=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === '1') setSidePanel('create');
    }
  }, []);

  // Keep bottom sheet aligned with the page container
  useEffect(() => {
    updateSheetBounds();
    if (typeof window === 'undefined') return;
    const handler = () => updateSheetBounds();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler as any);
    };
  }, []);

  const handleDelete = async (methodId: string) => {
    if (!window.confirm('Are you sure you want to delete this method?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/unified/methods/${methodId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete method');
      fetchAllMethods();
      if (sidePanel && typeof sidePanel === 'object' && sidePanel.method && sidePanel.method['namespace-method-id'] === methodId) {
        setSidePanel(null);
      }
    } catch (err) {
      alert('Failed to delete method: ' + (err as Error).message);
    }
  };

  const handleCreateInput = (field: string, value: any) => {
    setCreateData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddQueryParam = () => {
    setCreateData((prev: any) => ({
      ...prev,
      "namespace-method-queryParams": [...(prev["namespace-method-queryParams"] || []), { key: '', value: '' }],
    }));
  };

  const handleRemoveQueryParam = (idx: number) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["namespace-method-queryParams"] || [])];
      arr.splice(idx, 1);
      return { ...prev, "namespace-method-queryParams": arr };
    });
  };

  const handleQueryParamChange = (idx: number, key: string, value: string) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["namespace-method-queryParams"] || [])];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, "namespace-method-queryParams": arr };
    });
  };

  const handleAddHeader = () => {
    setCreateData((prev: any) => ({
      ...prev,
      "namespace-method-header": [...(prev["namespace-method-header"] || []), { key: '', value: '' }],
    }));
  };

  const handleRemoveHeader = (idx: number) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["namespace-method-header"] || [])];
      arr.splice(idx, 1);
      return { ...prev, "namespace-method-header": arr };
    });
  };

  const handleHeaderChange = (idx: number, key: string, value: string) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["namespace-method-header"] || [])];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, "namespace-method-header": arr };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    if (!createData["namespace-method-name"] || !createData["namespace-method-type"]) {
      setCreateMsg('Name and Type are required.');
      return;
    }
    try {
      const nsId = namespace ? namespace['namespace-id'] : '';
      const res = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      if (res.ok) {
        setCreateMsg('Method created successfully!');
        setSidePanel(null);
        setCreateData({
          "namespace-method-name": '',
          "namespace-method-type": 'GET',
          "namespace-method-url-override": '',
          "namespace-method-queryParams": [],
          "namespace-method-header": [],
          "save-data": false,
          "isInitialized": false,
          "tags": [],
        });
        fetchAllMethods();
      } else {
        setCreateMsg('Failed to create method.');
      }
    } catch {
      setCreateMsg('Failed to create method.');
    }
  };

  // Handle mouse events for resizing
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const minWidth = 320;
      const maxWidth = 700;
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, minWidth), maxWidth);
      setSidePanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Side panel content
  const renderSidePanel = () => {
    if (sidePanel === 'create') {
      return (
        <form onSubmit={handleCreate} className="flex flex-col gap-4 h-full p-6 ">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mr-2">→</span>
              Create Method
            </h3>
            <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
          </div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Method Name *</label>
          <input
            type="text"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
            value={createData["namespace-method-name"]}
            onChange={e => handleCreateInput("namespace-method-name", e.target.value)}
            required
          />
          <label className="block text-xs font-medium text-gray-700 mb-1">Method Type *</label>
          <select
            className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50 placeholder-gray-400"
            value={createData["namespace-method-type"]}
            onChange={e => handleCreateInput("namespace-method-type", e.target.value)}
            required
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="OPTIONS">OPTIONS</option>
            <option value="HEAD">HEAD</option>
          </select>
          <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
          <input
            type="text"
            className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
            value={createData["namespace-method-url-override"]}
            onChange={e => handleCreateInput("namespace-method-url-override", e.target.value)}
          />
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700 mb-1">Query Parameters</label>
              <button type="button" className="text-blue-600 text-xs" onClick={handleAddQueryParam}>+ Add Query Parameter</button>
            </div>
            {(createData["namespace-method-queryParams"] || []).map((q: any, idx: number) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input
                  type="text"
                  className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  placeholder="Key"
                  value={q.key || ''}
                  onChange={e => handleQueryParamChange(idx, 'key', e.target.value)}
                />
                <input
                  type="text"
                  className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  placeholder="Value"
                  value={q.value || ''}
                  onChange={e => handleQueryParamChange(idx, 'value', e.target.value)}
                />
                <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveQueryParam(idx)}>Remove</button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700 mb-1">Headers</label>
              <button type="button" className="text-blue-600 text-xs" onClick={handleAddHeader}>+ Add Header</button>
            </div>
            {(createData["namespace-method-header"] || []).map((h: any, idx: number) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input
                  type="text"
                  className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  placeholder="Key"
                  value={h.key || ''}
                  onChange={e => handleHeaderChange(idx, 'key', e.target.value)}
                />
                <input
                  type="text"
                  className="border border-blue-200 rounded px-2 py-1 text-xs flex-1 bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  placeholder="Value"
                  value={h.value || ''}
                  onChange={e => handleHeaderChange(idx, 'value', e.target.value)}
                />
                <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveHeader(idx)}>Remove</button>
              </div>
            ))}
          </div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition outline-none bg-yellow-50 placeholder-gray-400"
            value={Array.isArray(createData.tags) ? createData.tags.join(', ') : ''}
            onChange={e => handleCreateInput('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={!!createData['save-data']}
              onChange={e => handleCreateInput('save-data', e.target.checked)}
              id="save-data-checkbox"
            />
            <label htmlFor="save-data-checkbox" className="text-xs font-medium text-gray-700">Save Data</label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="bg-gray-200 text-gray-700 rounded-lg px-6 py-2 font-semibold text-base hover:bg-gray-300 transition"
              onClick={() => setSidePanel(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg px-6 py-2 font-bold text-base shadow-lg hover:from-blue-600 hover:to-purple-600 transition"
            >
              Create Method
            </button>
          </div>
          {createMsg && <div className="text-green-600 text-sm mt-2">{createMsg}</div>}
        </form>
      );
    }
    if (sidePanel && typeof sidePanel === 'object' && sidePanel.method) {
      const m = sidePanel.method;
      let typeIcon = <Database size={22} className="text-gray-400" />;
      if (m['namespace-method-type'] === 'GET') typeIcon = <Zap size={22} className="text-green-500" />;
      if (m['namespace-method-type'] === 'POST') typeIcon = <Send size={22} className="text-orange-500" />;
      if (m['namespace-method-type'] === 'DELETE') typeIcon = <Trash2 size={22} className="text-red-500" />;
      return (
        <div className="flex flex-col p-6 relative h-[45vh] overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {typeIcon}
              <span className="text-xl font-bold text-blue-700 hover:underline cursor-pointer" style={{ wordBreak: 'break-all' }}>{m['namespace-method-name']}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-1 rounded-lg border border-blue-200 shadow-sm transition-all"
                style={{ fontSize: '0.95rem' }}
                onClick={() => {
                  if (typeof onViewMethod === 'function') onViewMethod(m, m.namespace);
                  setSidePanel(null);
                }}
              >
                Open in Tab
              </button>
              <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-700">
            <div><span className="font-semibold text-gray-500">Type:</span> <span className="font-bold text-gray-900">{m['namespace-method-type']}</span></div>
            <div><span className="font-semibold text-gray-500">ID:</span> <span className="font-mono text-gray-700 break-all">{m['namespace-method-id']}</span></div>
            <div><span className="font-semibold text-gray-500">Namespace:</span> <span className="font-medium text-blue-700">{m.namespace?.['namespace-name']}</span></div>
            <div><span className="font-semibold text-gray-500">URL Override:</span> <span className="text-gray-700">{m['namespace-method-url-override'] || <span className="italic text-gray-400">None</span>}</span></div>
            <div><span className="font-semibold text-gray-500">Tags:</span> {Array.isArray(m.tags) && m.tags.length > 0 ? m.tags.map((tag: string, idx: number) => <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow ml-1">{tag}</span>) : <span className="italic text-gray-400">No tags</span>}</div>
            <div><span className="font-semibold text-gray-500">Save Data:</span> <span className={m['save-data'] ? 'text-green-700 font-semibold' : 'text-gray-400'}>{m['save-data'] ? 'Yes' : 'No'}</span></div>
          </div>
          {/* AI Assistant button (if present) */}
        </div>
      );
    }
    return null;
  };

  // Filtered methods based on search
  const filteredMethods = methods
    .filter(m => m['namespace-method-name']?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const urlA = (a['namespace-method-url-override'] || '').toLowerCase();
      const urlB = (b['namespace-method-url-override'] || '').toLowerCase();
      if (urlA < urlB) return -1;
      if (urlA > urlB) return 1;
      return 0;
    });

  return (
    <div ref={pageRef} className="p-4 w-full flex relative ">
      <div className="flex-1 pr-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">All Methods</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search methods..."
                className="pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Grid view"
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="List view"
              >
                ≡
              </button>
            </div>
            <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              onClick={() => setSidePanel('create')}
            >
              <Plus size={18} /> Create Method
            </button>
          </div>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
            {filteredMethods.map((m, idx) => {
              let typeIcon = <Database size={16} className="text-gray-400" />;
              if (m['namespace-method-type'] === 'GET') typeIcon = <Zap size={16} className="text-green-500" />;
              if (m['namespace-method-type'] === 'POST') typeIcon = <Send size={16} className="text-orange-500" />;
              const typeTextClass = m['namespace-method-type'] === 'GET'
                ? 'text-green-700'
                : m['namespace-method-type'] === 'POST'
                ? 'text-orange-700'
                : m['namespace-method-type'] === 'PUT'
                ? 'text-blue-700'
                : m['namespace-method-type'] === 'DELETE'
                ? 'text-red-700'
                : 'text-gray-700';
              const typeBgClass = m['namespace-method-type'] === 'GET'
                ? 'bg-green-50 ring-green-200'
                : m['namespace-method-type'] === 'POST'
                ? 'bg-orange-50 ring-orange-200'
                : m['namespace-method-type'] === 'PUT'
                ? 'bg-blue-50 ring-blue-200'
                : m['namespace-method-type'] === 'DELETE'
                ? 'bg-red-50 ring-red-200'
                : 'bg-gray-50 ring-gray-200';
              return (
                <div
                  key={m['namespace-method-id'] || idx}
                  className="group relative rounded-xl border border-gray-100 bg-white/80 backdrop-blur-sm px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  onClick={() => setSidePanel({ method: m })}
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-green-600 bg-transparent"
                      title="Edit"
                      onClick={(e) => { e.stopPropagation(); onViewMethod && onViewMethod({ ...m, __openEdit: true }, m.namespace); }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-600 bg-transparent"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); handleDelete(m['namespace-method-id']); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-start gap-3 ">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${typeBgClass} ${typeTextClass}`}>{m['namespace-method-type']}</span>
                        <span className="truncate">{m['namespace-method-name']}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-1">
                        <span className="text-gray-400 mr-1">URL:</span>
                        <span className="font-medium text-gray-700" title={m['namespace-method-url-override'] || ''}>{m['namespace-method-url-override'] || <span className='italic text-gray-400'>No URL override</span>}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="divide-y">
              {filteredMethods.map((m, idx) => {
                const typeTextClass = m['namespace-method-type'] === 'GET'
                  ? 'text-green-700'
                  : m['namespace-method-type'] === 'POST'
                  ? 'text-orange-700'
                  : m['namespace-method-type'] === 'PUT'
                  ? 'text-blue-700'
                  : m['namespace-method-type'] === 'DELETE'
                  ? 'text-red-700'
                  : 'text-gray-700';
                const typeBgClass = m['namespace-method-type'] === 'GET'
                  ? 'bg-green-50 ring-green-200'
                  : m['namespace-method-type'] === 'POST'
                  ? 'bg-orange-50 ring-orange-200'
                  : m['namespace-method-type'] === 'PUT'
                  ? 'bg-blue-50 ring-blue-200'
                  : m['namespace-method-type'] === 'DELETE'
                  ? 'bg-red-50 ring-red-200'
                  : 'bg-gray-50 ring-gray-200';
                return (
                <div key={m['namespace-method-id'] || idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSidePanel({ method: m })}>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${typeBgClass} ${typeTextClass}`}>{m['namespace-method-type']}</span>
                      <span className="truncate">{m['namespace-method-name']}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">URL: <span className="font-medium text-gray-700" title={m['namespace-method-url-override'] || ''}>{m['namespace-method-url-override'] || <span className='italic text-gray-400'>No URL override</span>}</span></div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button className="text-green-600 hover:text-green-800 p-1" title="Edit" onClick={(e) => { e.stopPropagation(); onViewMethod && onViewMethod({ ...m, __openEdit: true }, m.namespace); }}><Pencil size={16} /></button>
                    <button className="text-red-600 hover:text-red-800 p-1" title="Delete" onClick={() => handleDelete(m['namespace-method-id'])}><Trash2 size={16} /></button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>
      {/* Bottom Sheet Panel: create (right) retained, details (bottom) */}
      {/* Create side panel (right) */}
      {sidePanel === 'create' && (
        <div
          ref={panelRef}
          className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-50 transition-transform duration-300 flex flex-col`}
          style={{ minHeight: '100vh', width: sidePanel ? sidePanelWidth : 0, transform: sidePanel ? 'translateX(0)' : `translateX(${sidePanelWidth}px)`, boxShadow: sidePanel ? '0 0 32px 0 rgba(0,0,0,0.10)' : 'none', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, overflow: 'auto' }}
        >
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 10 }}
            onMouseDown={() => setIsResizing(true)}
          >
            <div style={{ width: 4, height: 48, background: '#e5e7eb', borderRadius: 2, margin: 'auto', marginTop: 24 }} />
          </div>
          <div style={{ marginLeft: 16, flex: 1, minWidth: 0 }}>{renderSidePanel()}</div>
        </div>
      )}

      {/* Bottom details sheet */}
      {sidePanel && typeof sidePanel === 'object' && sidePanel.method && (
        <div className="fixed bottom-0 z-20 " style={{ left: Math.max(0, sheetBounds.left - 16), width: sheetBounds.width + 52 }}>
          <div className=" border border-gray-200 bg-white ">
            {renderSidePanel()}
          </div>
        </div>
      )}
    </div>
  );
} 