import React, { useEffect, useState, useRef } from 'react';
import { Eye, Pencil, Trash2, User, Plus, X } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5001';

function AllAccountPage({ namespace, onViewAccount }: { namespace?: any, onViewAccount?: (account: any, ns?: any) => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePanel, setSidePanel] = useState<'create' | { account: any } | null>(null);
  const [createData, setCreateData] = useState<any>({
    "namespace-account-name": '',
    "namespace-account-url-override": '',
    "namespace-account-header": [],
    "variables": [],
    "tags": [],
  });
  const [createMsg, setCreateMsg] = useState('');
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchAllAccounts = async () => {
    setLoading(true);
    try {
      let allAccounts: any[] = [];
      if (namespace) {
        const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespace['namespace-id']}/accounts`);
        const nsAccounts = await accRes.json();
        allAccounts = (nsAccounts || []).map((acc: any) => ({ ...acc, namespace }));
      } else {
        const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces`);
        const namespaces = await nsRes.json();
        for (const ns of namespaces) {
          const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${ns['namespace-id']}/accounts`);
          const nsAccounts = await accRes.json();
          allAccounts = allAccounts.concat(
            (nsAccounts || []).map((acc: any) => ({ ...acc, namespace: ns }))
          );
        }
      }
      setAccounts(allAccounts);
    } catch (err) {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, [namespace]);

  const handleDelete = async (accountId: string) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/unified/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete account');
      fetchAllAccounts();
      if (sidePanel && typeof sidePanel === 'object' && sidePanel.account && sidePanel.account['namespace-account-id'] === accountId) {
        setSidePanel(null);
      }
    } catch (err) {
      alert('Failed to delete account: ' + (err as Error).message);
    }
  };

  const handleCreateInput = (field: string, value: any) => {
    setCreateData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddHeader = () => {
    setCreateData((prev: any) => ({
      ...prev,
      "namespace-account-header": [...(prev["namespace-account-header"] || []), { key: '', value: '' }],
    }));
  };

  const handleRemoveHeader = (idx: number) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["namespace-account-header"] || [])];
      arr.splice(idx, 1);
      return { ...prev, "namespace-account-header": arr };
    });
  };

  const handleHeaderChange = (idx: number, key: string, value: string) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["namespace-account-header"] || [])];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, "namespace-account-header": arr };
    });
  };

  const handleAddVariable = () => {
    setCreateData((prev: any) => ({
      ...prev,
      "variables": [...(prev["variables"] || []), { key: '', value: '' }],
    }));
  };

  const handleRemoveVariable = (idx: number) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["variables"] || [])];
      arr.splice(idx, 1);
      return { ...prev, "variables": arr };
    });
  };

  const handleVariableChange = (idx: number, key: string, value: string) => {
    setCreateData((prev: any) => {
      const arr = [...(prev["variables"] || [])];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...prev, "variables": arr };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    if (!createData["namespace-account-name"]) {
      setCreateMsg('Account Name is required.');
      return;
    }
    try {
      const nsId = namespace ? namespace['namespace-id'] : '';
      const res = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      if (res.ok) {
        setCreateMsg('Account created successfully!');
        setSidePanel(null);
        setCreateData({
          "namespace-account-name": '',
          "namespace-account-url-override": '',
          "namespace-account-header": [],
          "variables": [],
          "tags": [],
        });
        fetchAllAccounts();
      } else {
        setCreateMsg('Failed to create account.');
      }
    } catch {
      setCreateMsg('Failed to create account.');
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
        <form onSubmit={handleCreate} className="flex flex-col gap-4 h-full p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mr-2">→</span>
              Create Account
            </h3>
            <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
          </div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
          <input
            type="text"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
            value={createData["namespace-account-name"]}
            onChange={e => handleCreateInput("namespace-account-name", e.target.value)}
            required
          />
          <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
          <input
            type="text"
            className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50 placeholder-gray-400"
            value={createData["namespace-account-url-override"]}
            onChange={e => handleCreateInput("namespace-account-url-override", e.target.value)}
          />
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700 mb-1">Headers</label>
              <button type="button" className="text-blue-600 text-xs" onClick={handleAddHeader}>+ Add Header</button>
            </div>
            {(createData["namespace-account-header"] || []).map((h: any, idx: number) => (
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
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700 mb-1">Variables</label>
              <button type="button" className="text-blue-600 text-xs" onClick={handleAddVariable}>+ Add Variable</button>
            </div>
            {(createData["variables"] || []).map((v: any, idx: number) => (
              <div key={idx} className="flex gap-2 mb-1">
                <input
                  type="text"
                  className="border border-purple-200 rounded px-2 py-1 text-xs flex-1 bg-purple-50 focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  placeholder="Key"
                  value={v.key || ''}
                  onChange={e => handleVariableChange(idx, 'key', e.target.value)}
                />
                <input
                  type="text"
                  className="border border-purple-200 rounded px-2 py-1 text-xs flex-1 bg-purple-50 focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  placeholder="Value"
                  value={v.value || ''}
                  onChange={e => handleVariableChange(idx, 'value', e.target.value)}
                />
                <button type="button" className="text-red-500 text-xs" onClick={() => handleRemoveVariable(idx)}>Remove</button>
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
              Create Account
            </button>
          </div>
          {createMsg && <div className="text-green-600 text-sm mt-2">{createMsg}</div>}
        </form>
      );
    }
    if (sidePanel && typeof sidePanel === 'object' && sidePanel.account) {
      const acc = sidePanel.account;
      return (
        <div className="flex flex-col h-full p-8 relative" style={{ minHeight: '100vh' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <User size={24} className="text-blue-500" />
              <span className="text-xl font-bold text-blue-700 hover:underline cursor-pointer" style={{ wordBreak: 'break-all' }}>{acc['namespace-account-name']}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-1 rounded-lg border border-blue-200 shadow-sm transition-all"
                style={{ fontSize: '0.95rem' }}
                onClick={() => {
                  if (typeof onViewAccount === 'function') onViewAccount(acc, acc.namespace);
                  setSidePanel(null);
                }}
              >
                Open in Tab
              </button>
              <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-700">
            <div><span className="font-semibold text-gray-500">ID:</span> <span className="font-mono text-gray-700 break-all">{acc['namespace-account-id']}</span></div>
            <div><span className="font-semibold text-gray-500">Namespace:</span> <span className="font-medium text-blue-700">{acc.namespace?.['namespace-name']}</span></div>
            <div><span className="font-semibold text-gray-500">URL Override:</span> <span className="text-gray-700">{acc['namespace-account-url-override'] || <span className="italic text-gray-400">None</span>}</span></div>
            <div><span className="font-semibold text-gray-500">Tags:</span> {Array.isArray(acc.tags) && acc.tags.length > 0 ? acc.tags.map((tag: string, idx: number) => <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow ml-1">{tag}</span>) : <span className="italic text-gray-400">No tags</span>}</div>
            {acc['namespace-account-header'] && acc['namespace-account-header'].length > 0 && (
              <div>
                <span className="font-semibold text-gray-500">Headers:</span>
                <div className="mt-1 space-y-1">
                  {acc['namespace-account-header'].map((header: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 rounded px-2 py-1 text-xs">
                      <span className="font-medium">{header.key}:</span> <span className="text-gray-600">{header.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {acc.variables && acc.variables.length > 0 && (
              <div>
                <span className="font-semibold text-gray-500">Variables:</span>
                <div className="mt-1 space-y-1">
                  {acc.variables.map((variable: any, idx: number) => (
                    <div key={idx} className="bg-purple-50 rounded px-2 py-1 text-xs">
                      <span className="font-medium">{variable.key}:</span> <span className="text-gray-600">{variable.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 w-full flex relative">
      <div className="flex-1 pr-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">All Accounts</h2>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
            onClick={() => setSidePanel('create')}
          >
            <Plus size={18} /> Create Account
          </button>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map(acc => (
              <div key={acc['namespace-account-id']} className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 min-w-0 bg-white" style={{ width: '260px', margin: '0' }}>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-400" />
                  <span className="text-base font-semibold text-gray-900 truncate cursor-pointer" onClick={() => setSidePanel({ account: acc })}>{acc['namespace-account-name']}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{acc.namespace?.['namespace-name']}</span></div>
                <div className="flex gap-2 mt-1">
                  <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => setSidePanel({ account: acc })}><Eye size={16} /></button>
                  <button className="text-green-600 hover:text-green-800 p-1" title="Edit"><Pencil size={16} /></button>
                  <button className="text-red-600 hover:text-red-800 p-1" title="Delete" onClick={() => handleDelete(acc['namespace-account-id'])}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Side Panel with draggable resizer */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-50 transition-transform duration-300 flex flex-col`}
        style={{ minHeight: '100vh', width: sidePanel ? sidePanelWidth : 0, transform: sidePanel ? 'translateX(0)' : `translateX(${sidePanelWidth}px)`, boxShadow: sidePanel ? '0 0 32px 0 rgba(0,0,0,0.10)' : 'none', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, overflow: 'auto' }}
      >
        {/* Draggable resizer */}
        {sidePanel && (
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 10 }}
            onMouseDown={() => setIsResizing(true)}
          >
            <div style={{ width: 4, height: 48, background: '#e5e7eb', borderRadius: 2, margin: 'auto', marginTop: 24 }} />
          </div>
        )}
        <div style={{ marginLeft: sidePanel ? 16 : 0, flex: 1, minWidth: 0 }}>{renderSidePanel()}</div>
      </div>
    </div>
  );
}

export default AllAccountPage; 