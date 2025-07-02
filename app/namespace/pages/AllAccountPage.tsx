import React, { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, User, UserPlus, KeyRound, List, Tag } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function AllAccountPage({ namespace, onViewAccount, openForm = false }: { namespace?: any, onViewAccount?: (account: any, ns?: any) => void, openForm?: boolean }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    'namespace-account-name': '',
    'namespace-account-url-override': '',
    'namespace-account-header': [],
    'variables': [],
    'tags': ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerInputs, setHeaderInputs] = useState([{ key: '', value: '' }]);
  const [variableInputs, setVariableInputs] = useState([{ key: '', value: '' }]);

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

  useEffect(() => {
    if (openForm && namespace) {
      setShowModal(true);
    }
  }, [openForm, namespace]);

  const handleAddHeader = () => setHeaderInputs([...headerInputs, { key: '', value: '' }]);
  const handleRemoveHeader = (idx: number) => setHeaderInputs(headerInputs.filter((_, i) => i !== idx));
  const handleHeaderChange = (idx: number, field: string, value: string) => {
    setHeaderInputs(inputs => inputs.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const handleAddVariable = () => setVariableInputs([...variableInputs, { key: '', value: '' }]);
  const handleRemoveVariable = (idx: number) => setVariableInputs(variableInputs.filter((_, i) => i !== idx));
  const handleVariableChange = (idx: number, field: string, value: string) => {
    setVariableInputs(inputs => inputs.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form['namespace-account-name']) return setError('Account name is required');
    setCreating(true);
    setError(null);
    try {
      const nsId = namespace?.['namespace-id'] || '';
      if (!nsId) throw new Error('Namespace required to add account');
      // Prepare headers and variables arrays
      const headers = headerInputs.filter(h => h.key).map(h => ({ key: h.key, value: h.value }));
      const variables = variableInputs.filter(v => v.key).map(v => ({ key: v.key, value: v.value }));
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        'namespace-account-name': form['namespace-account-name'],
        'namespace-account-url-override': form['namespace-account-url-override'],
        'namespace-account-header': headers,
        'variables': variables,
        'tags': tags
      };
      const res = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create account');
      setShowModal(false);
      setForm({
        'namespace-account-name': '',
        'namespace-account-url-override': '',
        'namespace-account-header': [],
        'variables': [],
        'tags': ''
      });
      setHeaderInputs([{ key: '', value: '' }]);
      setVariableInputs([{ key: '', value: '' }]);
      // Refresh list
      const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`);
      const nsAccounts = await accRes.json();
      setAccounts((nsAccounts || []).map((acc: any) => ({ ...acc, namespace })));
    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/unified/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete account');
      // Refresh list
      if (namespace) {
        const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespace['namespace-id']}/accounts`);
        const nsAccounts = await accRes.json();
        setAccounts((nsAccounts || []).map((acc: any) => ({ ...acc, namespace })));
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting account');
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex-1">All Accounts</h2>
        {namespace && !showModal && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={() => setShowModal(true)}
          >
            + Add Account
          </button>
        )}
      </div>
      {/* Inline Add Account Form */}
      {showModal && (
        <div className="mb-8 w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl shadow-lg border-t-4 border-blue-400 p-8">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="text-blue-500" size={26} />
            <h3 className="text-2xl font-bold text-blue-700">Add Account</h3>
          </div>
          <form onSubmit={handleAddAccount} className="flex flex-col gap-5">
            <label className="text-base font-semibold">Account Name
              <input
                className="mt-1 border border-blue-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={form['namespace-account-name']}
                onChange={e => setForm(f => ({ ...f, 'namespace-account-name': e.target.value }))}
                required
                placeholder="Enter account name"
              />
            </label>
            <label className="text-base font-semibold">URL Override
              <input
                className="mt-1 border border-purple-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                value={form['namespace-account-url-override']}
                onChange={e => setForm(f => ({ ...f, 'namespace-account-url-override': e.target.value }))}
                placeholder="https://example.com/api"
              />
            </label>
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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <List className="text-green-400" size={18} />
                <span className="text-base font-semibold text-green-700">Variables</span>
                <button type="button" className="ml-auto text-xs text-blue-600" onClick={handleAddVariable}>+ Add Variable</button>
              </div>
              {variableInputs.map((v, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <input
                    className="border border-green-100 rounded px-2 py-1 flex-1 bg-white"
                    placeholder="Key"
                    value={v.key}
                    onChange={e => handleVariableChange(idx, 'key', e.target.value)}
                  />
                  <input
                    className="border border-green-100 rounded px-2 py-1 flex-1 bg-white"
                    placeholder="Value"
                    value={v.value}
                    onChange={e => handleVariableChange(idx, 'value', e.target.value)}
                  />
                  <button type="button" className="text-red-500" onClick={() => handleRemoveVariable(idx)} disabled={variableInputs.length === 1}>×</button>
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
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" className="bg-gray-200 px-6 py-2 rounded font-semibold hover:bg-gray-300" onClick={() => setShowModal(false)} disabled={creating}>
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
          {accounts.map(acc => (
            <div key={acc['namespace-account-id']} className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 min-w-0 bg-white" style={{ width: '260px', margin: '0' }}>
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-400" />
                <span className="text-base font-semibold text-gray-900 truncate">{acc['namespace-account-name']}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">Namespace: <span className="font-medium text-gray-700">{acc.namespace?.['namespace-name']}</span></div>
              <div className="flex gap-2 mt-1">
                <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => onViewAccount && onViewAccount(acc, acc.namespace)}><Eye size={16} /></button>
                <button className="text-green-600 hover:text-green-800 p-1" title="Edit"><Pencil size={16} /></button>
                <button className="text-red-600 hover:text-red-800 p-1" title="Delete" onClick={() => handleDeleteAccount(acc['namespace-account-id'])}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AllAccountPage; 