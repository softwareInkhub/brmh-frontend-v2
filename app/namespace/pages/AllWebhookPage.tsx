import React, { useState, useEffect } from 'react';
import { Plus, Eye, X } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

interface AllWebhookPageProps {
  namespace: any;
  onViewWebhook: (webhook: any, namespace: any) => void;
}

const AllWebhookPage: React.FC<AllWebhookPageProps> = ({ namespace, onViewWebhook }) => {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePanel, setSidePanel] = useState<'create' | { webhook: any } | null>(null);
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [createData, setCreateData] = useState<any>({
    'webhook-name': '',
    'post-exec-url': '',
    'method-id': '',
    'account-id': '',
    'status': 'active',
    'tags': [],
    'tableName': '',
    'pre-exec-url': '',
  });
  const [createMsg, setCreateMsg] = useState('');
  const [methods, setMethods] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    const fetchWebhooks = async () => {
      setLoading(true);
      try {
        const nsId = namespace ? namespace['namespace-id'] : '';
        const res = await fetch(`${API_BASE_URL}/unified/webhooks/namespace/${nsId}`);
        const data = await res.json();
        setWebhooks(Array.isArray(data) ? data : []);
      } catch {
        setWebhooks([]);
      }
      setLoading(false);
    };
    if (namespace) fetchWebhooks();
  }, [namespace]);

  useEffect(() => {
    // Fetch methods and accounts for dropdowns
    const fetchDropdowns = async () => {
      if (!namespace) return;
      try {
        const nsId = namespace['namespace-id'];
        const [methodsRes, accountsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/methods`),
          fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`)
        ]);
        const methodsData = await methodsRes.json();
        const accountsData = await accountsRes.json();
        console.log('Methods API response:', methodsData);
        console.log('Accounts API response:', accountsData);
        setMethods(Array.isArray(methodsData) ? methodsData : (methodsData && Array.isArray(methodsData.body) ? methodsData.body : []));
        setAccounts(Array.isArray(accountsData) ? accountsData : (accountsData && Array.isArray(accountsData.body) ? accountsData.body : []));
      } catch {
        setMethods([]);
        setAccounts([]);
      }
    };
    if (sidePanel === 'create') fetchDropdowns();
  }, [sidePanel, namespace]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    if (!createData['webhook-name'] || !createData['tableName']) {
      setCreateMsg('Webhook Name and Table Name are required.');
      return;
    }
    try {
      const nsId = namespace ? namespace['namespace-id'] : '';
      const body = {
        ...createData,
        'namespace-id': nsId,
        tags: Array.isArray(createData.tags) ? createData.tags : (typeof createData.tags === 'string' ? createData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
      };
      const res = await fetch(`${API_BASE_URL}/unified/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setCreateMsg('Webhook created successfully!');
        setSidePanel(null);
        setCreateData({
          'webhook-name': '',
          'post-exec-url': '',
          'method-id': '',
          'account-id': '',
          'status': 'active',
          'tags': [],
          'tableName': '',
          'pre-exec-url': '',
        });
        // Refresh webhooks
        const nsId = namespace ? namespace['namespace-id'] : '';
        const res2 = await fetch(`${API_BASE_URL}/unified/webhooks/namespace/${nsId}`);
        const data2 = await res2.json();
        setWebhooks(Array.isArray(data2) ? data2 : []);
      } else {
        setCreateMsg('Failed to create webhook.');
      }
    } catch {
      setCreateMsg('Failed to create webhook.');
    }
  };

  const renderSidePanel = () => {
    if (sidePanel === 'create') {
      return (
        <>
          <div className="mb-4 text-lg font-bold text-pink-700 text-center">
            {namespace?.['namespace-name']}
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 h-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-pink-700 flex items-center gap-2">
                <span className="inline-block w-6 h-6 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mr-2">→</span>
                Create Webhook
              </h3>
              <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
            </div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Webhook Name *</label>
            <input
              type="text"
              className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
              value={createData['webhook-name']}
              onChange={e => handleCreateInput('webhook-name', e.target.value)}
              required
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">Post Exec URL</label>
            <input
              type="text"
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
              value={createData['post-exec-url']}
              onChange={e => handleCreateInput('post-exec-url', e.target.value)}
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">Pre Exec URL</label>
            <input
              type="text"
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
              value={createData['pre-exec-url']}
              onChange={e => handleCreateInput('pre-exec-url', e.target.value)}
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">Table Name *</label>
            <input
              type="text"
              className="w-full border border-purple-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition outline-none bg-purple-50 placeholder-gray-400"
              value={createData['tableName']}
              onChange={e => handleCreateInput('tableName', e.target.value)}
              required
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
            <select
              className="w-full border border-green-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-green-400 focus:border-green-400 transition outline-none bg-green-50"
              value={createData['method-id']}
              onChange={e => handleCreateInput('method-id', e.target.value)}
            >
              <option value="">Select Method</option>
              {methods.map((m: any) => (
                <option key={m['namespace-method-id']} value={m['namespace-method-id']}>
                  {m['namespace-method-name']}
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
            <select
              className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition outline-none bg-yellow-50"
              value={createData['account-id']}
              onChange={e => handleCreateInput('account-id', e.target.value)}
            >
              <option value="">Select Account</option>
              {accounts.map((a: any) => (
                <option key={a['namespace-account-id']} value={a['namespace-account-id']}>
                  {a['namespace-account-name']}
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition outline-none bg-gray-50"
              value={createData['status']}
              onChange={e => handleCreateInput('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition outline-none bg-pink-50 placeholder-gray-400"
              value={Array.isArray(createData.tags) ? createData.tags.join(', ') : createData.tags}
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
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg px-6 py-2 font-bold text-base shadow-lg hover:from-pink-600 hover:to-purple-600 transition"
              >
                Create Webhook
              </button>
            </div>
            {createMsg && <div className="text-green-600 text-sm mt-2">{createMsg}</div>}
          </form>
        </>
      );
    }
    if (sidePanel && typeof sidePanel === 'object' && sidePanel.webhook) {
      const wh = sidePanel.webhook;
      return (
        <>
          <div className="flex flex-col h-full p-8 relative" style={{ minHeight: '100vh' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-pink-500 font-bold">🔗</span>
                <span className="text-xl font-bold text-pink-700 hover:underline cursor-pointer" style={{ wordBreak: 'break-all' }}>{wh['webhook-name']}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold px-4 py-1 rounded-lg border border-pink-200 shadow-sm transition-all"
                  style={{ fontSize: '0.95rem' }}
                  onClick={() => { if (typeof onViewWebhook === 'function') onViewWebhook(wh, namespace); setSidePanel(null); }}
                >
                  Open in Tab
                </button>
                <button type="button" onClick={() => setSidePanel(null)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
              </div>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div><span className="font-semibold text-gray-500">ID:</span> <span className="font-mono text-gray-700 break-all">{wh['webhook-id']}</span></div>
              <div><span className="font-semibold text-gray-500">Post Exec URL:</span> <span className="text-gray-700">{wh['post-exec-url']}</span></div>
              <div><span className="font-semibold text-gray-500">Pre Exec URL:</span> <span className="text-gray-700">{wh['pre-exec-url']}</span></div>
              <div><span className="font-semibold text-gray-500">Status:</span> <span className="text-gray-700">{wh['status']}</span></div>
              <div><span className="font-semibold text-gray-500">Tags:</span> {Array.isArray(wh.tags) && wh.tags.length > 0 ? wh.tags.map((tag: string, idx: number) => <span key={idx} className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow ml-1">{tag}</span>) : <span className="italic text-gray-400">No tags</span>}</div>
              <div><span className="font-semibold text-gray-500">Method ID:</span> <span className="text-gray-700">{wh['method-id']}</span></div>
              <div><span className="font-semibold text-gray-500">Account ID:</span> <span className="text-gray-700">{wh['account-id']}</span></div>
              <div><span className="font-semibold text-gray-500">Table Name:</span> <span className="text-gray-700">{wh['tableName'] || wh['table-name']}</span></div>
              <div><span className="font-semibold text-gray-500">Namespace ID:</span> <span className="text-gray-700">{wh['namespace-id']}</span></div>
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
          <h2 className="text-2xl font-bold text-gray-900">All Webhooks</h2>
          <button
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded shadow"
            onClick={() => setSidePanel('create')}
          >
            <Plus size={18} /> Create Webhook
          </button>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {webhooks.length === 0 && <div className="text-gray-400">No webhooks found.</div>}
            {webhooks.map((wh, idx) => (
              <div key={wh['webhook-id'] || idx} className="flex items-center justify-between bg-white border rounded px-4 py-2 shadow-sm">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">{wh['webhook-name']}</span>
                  <span className="text-xs text-gray-500">{wh['post-exec-url']}</span>
                </div>
                <button className="text-pink-600 hover:text-pink-800 p-1" title="View" onClick={() => setSidePanel({ webhook: wh })}><Eye size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Side Panel with draggable resizer */}
      <div
        className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-50 transition-transform duration-300 flex flex-col`}
        style={{ minHeight: '100vh', width: sidePanel ? sidePanelWidth : 0, transform: sidePanel ? 'translateX(0)' : `translateX(${sidePanelWidth}px)`, boxShadow: sidePanel ? '0 0 32px 0 rgba(0,0,0,0.10)' : 'none', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, overflow: 'auto' }}
      >
        {/* Draggable resizer */}
        {sidePanel && (
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 10 }}
            onMouseDown={() => setIsResizing(true)}
          >
            <div style={{ width: 4, height: 48, background: '#f9a8d4', borderRadius: 2, margin: 'auto', marginTop: 24 }} />
          </div>
        )}
        <div style={{ marginLeft: sidePanel ? 16 : 0, flex: 1, minWidth: 0 }}>{renderSidePanel()}</div>
      </div>
    </div>
  );
};

export default AllWebhookPage; 