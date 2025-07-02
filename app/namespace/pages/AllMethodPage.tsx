import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, Zap, Send, Database, Plus, Code2, KeyRound, List, Tag } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function AllMethodPage({ namespace, onViewMethod, openForm = false }: { namespace?: any, onViewMethod?: (method: any, ns?: any) => void, openForm?: boolean }) {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    'namespace-method-name': '',
    'namespace-method-type': 'GET',
    'namespace-method-url-override': '',
    'namespace-method-queryParams': [],
    'namespace-method-header': [],
    'tags': ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryParams, setQueryParams] = useState([{ key: '', value: '' }]);
  const [headerInputs, setHeaderInputs] = useState([{ key: '', value: '' }]);

  useEffect(() => {
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
    fetchAllMethods();
  }, [namespace]);

  const handleAddQueryParam = () => setQueryParams([...queryParams, { key: '', value: '' }]);
  const handleRemoveQueryParam = (idx: number) => setQueryParams(queryParams.filter((_, i) => i !== idx));
  const handleQueryParamChange = (idx: number, field: string, value: string) => {
    setQueryParams(inputs => inputs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleAddHeader = () => setHeaderInputs([...headerInputs, { key: '', value: '' }]);
  const handleRemoveHeader = (idx: number) => setHeaderInputs(headerInputs.filter((_, i) => i !== idx));
  const handleHeaderChange = (idx: number, field: string, value: string) => {
    setHeaderInputs(inputs => inputs.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form['namespace-method-name']) return setError('Method name is required');
    setCreating(true);
    setError(null);
    try {
      const nsId = namespace?.['namespace-id'] || '';
      if (!nsId) throw new Error('Namespace required to add method');
      const queryParamsArr = queryParams.filter(q => q.key).map(q => ({ key: q.key, value: q.value }));
      const headersArr = headerInputs.filter(h => h.key).map(h => ({ key: h.key, value: h.value }));
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        'namespace-method-name': form['namespace-method-name'],
        'namespace-method-type': form['namespace-method-type'],
        'namespace-method-url-override': form['namespace-method-url-override'],
        'namespace-method-queryParams': queryParamsArr,
        'namespace-method-header': headersArr,
        'tags': tags
      };
      const res = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create method');
      setShowForm(false);
      setForm({
        'namespace-method-name': '',
        'namespace-method-type': 'GET',
        'namespace-method-url-override': '',
        'namespace-method-queryParams': [],
        'namespace-method-header': [],
        'tags': ''
      });
      setQueryParams([{ key: '', value: '' }]);
      setHeaderInputs([{ key: '', value: '' }]);
      // Refresh list
      const mRes = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/methods`);
      const nsMethods = await mRes.json();
      setMethods((nsMethods || []).map((m: any) => ({ ...m, namespace })));
    } catch (err: any) {
      setError(err.message || 'Error creating method');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (openForm && namespace) {
      setShowForm(true);
    }
  }, [openForm, namespace]);

  return (
    <div className="p-8 w-full">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex-1">All Methods</h2>
        {namespace && !showForm && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} /> Add Method
          </button>
        )}
      </div>
      {/* Inline Add Method Form */}
      {showForm && (
        <div className="mb-8 w-full bg-gradient-to-br from-green-50 via-white to-blue-50 rounded-xl shadow-lg border-t-4 border-green-400 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="text-green-500" size={26} />
            <h3 className="text-2xl font-bold text-green-700">Add Method</h3>
          </div>
          <form onSubmit={handleAddMethod} className="flex flex-col gap-5">
            <label className="text-base font-semibold">Method Name
              <input
                className="mt-1 border border-green-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                value={form['namespace-method-name']}
                onChange={e => setForm(f => ({ ...f, 'namespace-method-name': e.target.value }))}
                required
                placeholder="Enter method name"
              />
            </label>
            <label className="text-base font-semibold">Method Type
              <select
                className="mt-1 border border-blue-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={form['namespace-method-type']}
                onChange={e => setForm(f => ({ ...f, 'namespace-method-type': e.target.value }))}
                required
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>
            <label className="text-base font-semibold">URL Override
              <input
                className="mt-1 border border-blue-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={form['namespace-method-url-override']}
                onChange={e => setForm(f => ({ ...f, 'namespace-method-url-override': e.target.value }))}
                placeholder="https://example.com/api"
              />
            </label>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <List className="text-green-400" size={18} />
                <span className="text-base font-semibold text-green-700">Query Parameters</span>
                <button type="button" className="ml-auto text-xs text-blue-600" onClick={handleAddQueryParam}>+ Add Query Parameter</button>
              </div>
              {queryParams.map((q, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <input
                    className="border border-green-100 rounded px-2 py-1 flex-1 bg-white"
                    placeholder="Key"
                    value={q.key}
                    onChange={e => handleQueryParamChange(idx, 'key', e.target.value)}
                  />
                  <input
                    className="border border-green-100 rounded px-2 py-1 flex-1 bg-white"
                    placeholder="Value"
                    value={q.value}
                    onChange={e => handleQueryParamChange(idx, 'value', e.target.value)}
                  />
                  <button type="button" className="text-red-500" onClick={() => handleRemoveQueryParam(idx)} disabled={queryParams.length === 1}>×</button>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="text-blue-400" size={18} />
                <span className="text-base font-semibold text-blue-700">Headers</span>
                <button type="button" className="ml-auto text-xs text-blue-600" onClick={handleAddHeader}>+ Add Header</button>
              </div>
              {headerInputs.map((h, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <input
                    className="border border-blue-100 rounded px-2 py-1 flex-1 bg-white"
                    placeholder="Key"
                    value={h.key}
                    onChange={e => handleHeaderChange(idx, 'key', e.target.value)}
                  />
                  <input
                    className="border border-blue-100 rounded px-2 py-1 flex-1 bg-white"
                    placeholder="Value"
                    value={h.value}
                    onChange={e => handleHeaderChange(idx, 'value', e.target.value)}
                  />
                  <button type="button" className="text-red-500" onClick={() => handleRemoveHeader(idx)} disabled={headerInputs.length === 1}>×</button>
                </div>
              ))}
            </div>
            <label className="text-base font-semibold flex items-center gap-2"><Tag className="text-purple-400" size={18} />Tags (comma separated)
              <input
                className="mt-1 border border-purple-100 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, ..."
              />
            </label>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" className="bg-gray-200 px-6 py-2 rounded font-semibold hover:bg-gray-300" onClick={() => setShowForm(false)} disabled={creating}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {methods.map((m, idx) => {
            let typeIcon = <Database size={16} className="text-gray-400" />;
            if (m['namespace-method-type'] === 'GET') typeIcon = <Zap size={16} className="text-green-500" />;
            if (m['namespace-method-type'] === 'POST') typeIcon = <Send size={16} className="text-orange-500" />;
            return (
              <div key={m['namespace-method-id'] || idx} className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 min-w-0 bg-white" style={{ width: '260px', margin: '0' }}>
                <div className="flex items-center gap-2">
                  {typeIcon}
                  <span className="text-base font-semibold text-gray-900 truncate">{m['namespace-method-name']}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${m['namespace-method-type'] === 'GET' ? 'bg-green-100 text-green-700' : m['namespace-method-type'] === 'POST' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700'}`}>{m['namespace-method-type']}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{m.namespace?.['namespace-name']}</span></div>
                <div className="flex gap-2 mt-1">
                  <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => onViewMethod && onViewMethod(m, m.namespace)}><Eye size={16} /></button>
                  <button className="text-green-600 hover:text-green-800 p-1" title="Edit"><Pencil size={16} /></button>
                  <button className="text-red-600 hover:text-red-800 p-1" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 