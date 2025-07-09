import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, User, Plus, X } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5001';

function AllAccountPage({ namespace, onViewAccount }: { namespace?: any, onViewAccount?: (account: any, ns?: any) => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePanel, setSidePanel] = useState<'create' | { account: any } | null>(null);
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [createData, setCreateData] = useState<any>({
    'namespace-account-name': '',
    'namespace-account-url-override': '',
    headers: [{ key: '', value: '' }],
    variables: [{ key: '', value: '' }],
    tags: '',
  });
  const [createMsg, setCreateMsg] = useState('');

  useEffect(() => {
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
    fetchAllAccounts();
  }, [namespace]);

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

  const handleCreateInput = (field: string, value: any) => {
    setCreateData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleHeaderChange = (idx: number, field: 'key' | 'value', value: string) => {
    setCreateData((prev: any) => {
      const headers = [...prev.headers];
      headers[idx][field] = value;
      return { ...prev, headers };
    });
  };
  const addHeader = () => {
    setCreateData((prev: any) => ({ ...prev, headers: [...prev.headers, { key: '', value: '' }] }));
  };
  const removeHeader = (idx: number) => {
    setCreateData((prev: any) => {
      const headers = prev.headers.filter((_: any, i: number) => i !== idx);
      return { ...prev, headers };
    });
  };

  const handleVariableChange = (idx: number, field: 'key' | 'value', value: string) => {
    setCreateData((prev: any) => {
      const variables = [...prev.variables];
      variables[idx][field] = value;
      return { ...prev, variables };
    });
  };
  const addVariable = () => {
    setCreateData((prev: any) => ({ ...prev, variables: [...prev.variables, { key: '', value: '' }] }));
  };
  const removeVariable = (idx: number) => {
    setCreateData((prev: any) => {
      const variables = prev.variables.filter((_: any, i: number) => i !== idx);
      return { ...prev, variables };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    if (!createData['namespace-account-name']) {
      setCreateMsg('Account Name is required.');
      return;
    }
    try {
      const nsId = namespace ? namespace['namespace-id'] : '';
      const body = {
        'namespace-account-name': createData['namespace-account-name'],
        'namespace-account-url-override': createData['namespace-account-url-override'],
        'namespace-account-header': createData.headers.filter((h: any) => h.key),
        variables: createData.variables.filter((v: any) => v.key),
        tags: createData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      };
      const res = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setCreateMsg('Account created successfully!');
        setSidePanel(null);
        setCreateData({
          'namespace-account-name': '',
          'namespace-account-url-override': '',
          headers: [{ key: '', value: '' }],
          variables: [{ key: '', value: '' }],
          tags: '',
        });
        // Refresh accounts
        const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`);
        const nsAccounts = await accRes.json();
        setAccounts((nsAccounts || []).map((acc: any) => ({ ...acc, namespace })));
      } else {
        setCreateMsg('Failed to create account.');
      }
    } catch {
      setCreateMsg('Failed to create account.');
    }
  };

  const renderSidePanel = () => {
    if (sidePanel === 'create') {
      return (
        <>
          <div className="flex items-center gap-2 mb-4 text-lg font-bold text-blue-700 pt-4">
            <User className="bg-blue-100 text-blue-500 rounded-full p-1" size={24} />
            <span>Create Account</span>
            <button type="button" onClick={() => setSidePanel(null)} className="ml-auto text-gray-400 hover:text-gray-700"><X size={22} /></button>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 h-full p-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
            <input
              type="text"
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
              value={createData['namespace-account-name']}
              onChange={e => handleCreateInput('namespace-account-name', e.target.value)}
              required
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition outline-none bg-gray-50 placeholder-gray-400"
              value={createData['namespace-account-url-override']}
              onChange={e => handleCreateInput('namespace-account-url-override', e.target.value)}
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Headers</label>
                <button type="button" className="text-xs text-blue-600 hover:underline" onClick={addHeader}>+ Add Header</button>
              </div>
              {createData.headers.map((h: any, idx: number) => (
                <div key={idx} className="flex flex-wrap gap-x-2 gap-y-1 items-center w-full mb-1">
                  <input
                    type="text"
                    placeholder="Key"
                    className="flex-1 min-w-0 w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={h.key}
                    onChange={e => handleHeaderChange(idx, 'key', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    className="flex-1 min-w-0 w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={h.value}
                    onChange={e => handleHeaderChange(idx, 'value', e.target.value)}
                  />
                  <button type="button" className="text-red-500 ml-1" onClick={() => removeHeader(idx)}><X size={16} /></button>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Variables</label>
                <button type="button" className="text-xs text-blue-600 hover:underline" onClick={addVariable}>+ Add Variable</button>
              </div>
              {createData.variables.map((v: any, idx: number) => (
                <div key={idx} className="flex flex-wrap gap-x-2 gap-y-1 items-center w-full mb-1">
                  <input
                    type="text"
                    placeholder="Key"
                    className="flex-1 min-w-0 w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={v.key}
                    onChange={e => handleVariableChange(idx, 'key', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    className="flex-1 min-w-0 w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={v.value}
                    onChange={e => handleVariableChange(idx, 'value', e.target.value)}
                  />
                  <button type="button" className="text-red-500 ml-1" onClick={() => removeVariable(idx)}><X size={16} /></button>
                </div>
              ))}
            </div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
              value={createData.tags}
              onChange={e => handleCreateInput('tags', e.target.value)}
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
                className="bg-blue-600 text-white rounded-lg px-6 py-2 font-bold text-base shadow-lg hover:bg-blue-700 transition"
              >
                Create Account
              </button>
            </div>
            {createMsg && <div className="text-green-600 text-sm mt-2">{createMsg}</div>}
          </form>
        </>
      );
    }
    if (sidePanel && typeof sidePanel === 'object' && sidePanel.account) {
      const acc = sidePanel.account;
      return (
        <>
          <div className="flex flex-col h-full p-8 relative" style={{ minHeight: '100vh' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-bold">👤</span>
                <span className="text-xl font-bold text-blue-700 hover:underline cursor-pointer" style={{ wordBreak: 'break-all' }}>{acc['namespace-account-name']}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-4 py-1 rounded-lg border border-blue-200 shadow-sm transition-all"
                  style={{ fontSize: '0.95rem' }}
                  onClick={() => { if (typeof onViewAccount === 'function') onViewAccount(acc, acc.namespace); setSidePanel(null); }}
                >
                  Open in Tab
                </button>
                <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
              </div>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div><span className="font-semibold text-gray-500">ID:</span> <span className="font-mono text-gray-700 break-all">{acc['namespace-account-id']}</span></div>
              <div><span className="font-semibold text-gray-500">URL Override:</span> <span className="text-gray-700">{acc['namespace-account-url-override'] || 'None'}</span></div>
              <div><span className="font-semibold text-gray-500">Headers:</span> <pre className="text-gray-700 text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">{JSON.stringify(acc['namespace-account-header'] || [], null, 2)}</pre></div>
              <div><span className="font-semibold text-gray-500">Variables:</span> <pre className="text-gray-700 text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">{JSON.stringify(acc['variables'] || [], null, 2)}</pre></div>
              <div><span className="font-semibold text-gray-500">Tags:</span> {Array.isArray(acc.tags) && acc.tags.length > 0 ? acc.tags.map((tag: string, idx: number) => <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow ml-1">{tag}</span>) : <span className="italic text-gray-400">No tags</span>}</div>
              <div><span className="font-semibold text-gray-500">Namespace ID:</span> <span className="text-gray-700">{acc['namespace-id']}</span></div>
            </div>
          </div>
        </>
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
                <span className="text-base font-semibold text-gray-900 truncate">{acc['namespace-account-name']}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{acc.namespace?.['namespace-name']}</span></div>
              <div className="flex gap-2 mt-1">
                  <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => setSidePanel({ account: acc })}><Eye size={16} /></button>
                <button className="text-green-600 hover:text-green-800 p-1" title="Edit"><Pencil size={16} /></button>
                <button className="text-red-600 hover:text-red-800 p-1" title="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      {/* Side Panel with draggable resizer */}
      <div
        className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-50 transition-transform duration-300 flex flex-col`}
        style={{ minHeight: '100vh', width: sidePanel ? sidePanelWidth : 0, transform: sidePanel ? 'translateX(0)' : `translateX(${sidePanelWidth}px)`, boxShadow: sidePanel ? '0 0 32px 0 rgba(0,0,0,0.10)' : 'none', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 /*, overflow: 'auto'*/ }}
      >
        {/* Draggable resizer */}
        {sidePanel && (
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 10 }}
            onMouseDown={() => setIsResizing(true)}
          >
            <div style={{ width: 4, height: 48, background: '#3b82f6', borderRadius: 2, margin: 'auto', marginTop: 24 }} />
          </div>
        )}
        <div style={{ marginLeft: sidePanel ? 16 : 0, flex: 1, minWidth: 0 }}>{renderSidePanel()}</div>
      </div>
    </div>
  );
}

export default AllAccountPage; 