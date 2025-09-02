import React, { useEffect, useState } from 'react';
import { User, Hash, Tag, Edit3, CheckCircle, Globe, Key, List, X, Edit2, Trash2, Link as LinkIcon, Database } from 'lucide-react';

type Props = {
  account: any;
  namespace?: any;
  openEdit?: boolean;
};

export default function AccountPage({ account, namespace, openEdit }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(account || {});
  const [saveMsg, setSaveMsg] = useState('');

  // Auto-open in edit mode when requested
  useEffect(() => {
    if (openEdit) {
      setEditMode(true);
    }
  }, [openEdit]);

  // Editable headers/variables helpers
  const updateHeaderAtIndex = (index: number, field: 'key' | 'value', value: string) => {
    setEditAccount((prev: any) => {
      const headers = Array.isArray(prev['namespace-account-header']) ? [...prev['namespace-account-header']] : [];
      const row = { ...(headers[index] || { key: '', value: '' }), [field]: value };
      headers[index] = row;
      return { ...prev, 'namespace-account-header': headers };
    });
  };

  const addHeaderRow = () => {
    setEditAccount((prev: any) => ({
      ...prev,
      'namespace-account-header': [
        ...(Array.isArray(prev['namespace-account-header']) ? prev['namespace-account-header'] : []),
        { key: '', value: '' }
      ]
    }));
  };

  const removeHeaderRow = (index: number) => {
    setEditAccount((prev: any) => {
      const headers = Array.isArray(prev['namespace-account-header']) ? [...prev['namespace-account-header']] : [];
      headers.splice(index, 1);
      return { ...prev, 'namespace-account-header': headers };
    });
  };

  const updateVariableAtIndex = (index: number, field: 'key' | 'value', value: string) => {
    setEditAccount((prev: any) => {
      const keyName = Array.isArray(prev['variables']) ? 'variables' : 'namespace-account-variables';
      const list = Array.isArray(prev[keyName]) ? [...prev[keyName]] : [];
      const row = { ...(list[index] || { key: '', value: '' }), [field]: value };
      list[index] = row;
      return { ...prev, [keyName]: list };
    });
  };

  const addVariableRow = () => {
    setEditAccount((prev: any) => {
      const keyName = Array.isArray(prev['variables']) ? 'variables' : 'namespace-account-variables';
      const list = Array.isArray(prev[keyName]) ? [...prev[keyName]] : [];
      list.push({ key: '', value: '' });
      return { ...prev, [keyName]: list };
    });
  };

  const removeVariableRow = (index: number) => {
    setEditAccount((prev: any) => {
      const keyName = Array.isArray(prev['variables']) ? 'variables' : 'namespace-account-variables';
      const list = Array.isArray(prev[keyName]) ? [...prev[keyName]] : [];
      list.splice(index, 1);
      return { ...prev, [keyName]: list };
    });
  };


  const handleInput = (field: string, value: any) => {
    setEditAccount((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg('');
    // TODO: Implement save logic (API call)
    setSaveMsg('Account updated!');
    setEditMode(false);
  };

  // Helper to render header variables if present
  const renderHeaderVars = (headers: any) => {
    if (!headers || typeof headers !== 'object') return <span className="italic text-gray-400">None</span>;
  return (
      <ul className="space-y-1 mt-1">
        {Object.entries(headers).map(([key, value]) => (
          <li key={key} className="flex items-center gap-2 text-xs">
            <Key size={14} className="text-blue-400" />
            <span className="font-mono text-gray-700">{key}</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded ml-2">{String(value)}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Helper to render account variables if present
  const renderAccountVars = (variables: any) => {
    if (!variables || !Array.isArray(variables) || variables.length === 0) return <span className="italic text-gray-400">None</span>;
    return (
      <ul className="space-y-1 mt-1">
        {variables.map((variable: any, index: number) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <Key size={14} className="text-green-400" />
            <span className="font-mono text-gray-700">{variable.key}</span>
            <span className="bg-green-100 text-gray-700 px-2 py-0.5 rounded ml-2">{String(variable.value)}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Helper to render table names if present
  const renderTableNames = (tableName: any) => {
    if (!tableName) return <span className="italic text-gray-400">No tables</span>;
    
    // Handle DynamoDB structure
    let tableNameMap: Record<string, string> = {};
    if (tableName.M) {
      // Extract from DynamoDB format
      tableNameMap = Object.fromEntries(
        Object.entries(tableName.M).map(([key, value]: [string, any]) => [
          key, 
          value.S || value
        ])
      );
    } else if (typeof tableName === 'object') {
      // Handle plain object format
      tableNameMap = tableName;
    }
    
    if (Object.keys(tableNameMap).length === 0) {
      return <span className="italic text-gray-400">No tables</span>;
    }
    
    return (
      <div className="space-y-2 mt-1">
        {Object.entries(tableNameMap).map(([methodName, tableNameValue]) => (
          <div key={methodName} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Database size={14} className="text-blue-400" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-700">{methodName}</div>
              <div className="text-xs text-gray-500 font-mono">{tableNameValue}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper to render account headers if present
  const renderAccountHeaders = (headers: any) => {
    if (!headers || !Array.isArray(headers) || headers.length === 0) return <span className="italic text-gray-400">None</span>;
    return (
      <ul className="space-y-1 mt-1">
        {headers.map((header: any, index: number) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <Key size={14} className="text-purple-400" />
            <span className="font-mono text-gray-700">{header.key}</span>
            <span className="bg-purple-100 text-gray-700 px-2 py-0.5 rounded ml-2">{String(header.value)}</span>
          </li>
        ))}
      </ul>
    );
  };

  // Pinterest OAuth redirect logic
  const handleOAuthRedirect = (account: any) => {
    console.log('🔗 Starting Pinterest OAuth redirect process...');
    console.log('📋 Account details:', {
      accountId: account['namespace-account-id'],
      accountName: account['namespace-account-name'],
      variables: account["variables"] || account["namespace-account-variables"]
    });

    const variables = (account["variables"] || account["namespace-account-variables"] || []);
    const clientId = variables.find((v: any) => v.key === 'client_id')?.value;
    const clientSecret = variables.find((v: any) => v.key === 'secret_key')?.value;
    const redirectUrl = variables.find((v: any) => v.key === 'redirect_uri')?.value;

    console.log('🔑 Extracted OAuth credentials:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUrl: !!redirectUrl,
      redirectUrl: redirectUrl
    });

    if (!clientId || !redirectUrl || !clientSecret) {
      console.error('❌ Missing required OAuth credentials:', {
        missingClientId: !clientId,
        missingClientSecret: !clientSecret,
        missingRedirectUrl: !redirectUrl
      });
      alert('Missing client_id, secret_key, or redirect_uri in account variables');
      return;
    }

    const scopes = ['boards:read', 'boards:write', 'pins:read', 'pins:write'];
    const authUrl = new URL('https://www.pinterest.com/oauth/');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(','));

    const accountDetails = {
      clientId,
      clientSecret,
      redirectUrl,
      accountId: account['namespace-account-id']
    };

    console.log('💾 Storing account details in sessionStorage:', {
      accountId: accountDetails.accountId,
      redirectUrl: accountDetails.redirectUrl,
      hasClientId: !!accountDetails.clientId,
      hasClientSecret: !!accountDetails.clientSecret
    });

    sessionStorage.setItem('pinterestAccountDetails', JSON.stringify(accountDetails));

    console.log('🌐 Redirecting to Pinterest OAuth URL:', authUrl.toString());
    console.log('📤 OAuth parameters:', {
      client_id: clientId.substring(0, 10) + '...',
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: scopes.join(',')
    });

    window.location.href = authUrl.toString();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/accounts/${editAccount['namespace-account-id']}`,
          { method: 'DELETE' }
        );
        if (!response.ok) throw new Error('Failed to delete account');
        // Optionally: close tab or show a message
        alert('Account deleted!');
        // window.location.reload();
      } catch (error) {
        alert('Failed to delete account');
      }
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-gradient-to-br flex flex-col h-full p-0 m-0">
      <div className="bg-white p-8 flex flex-col gap-6 w-full h-full m-0">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-2">
         
          <button
            title="Link"
            className="p-2 rounded-lg bg-gray-100 text-blue-700 hover:bg-blue-50 transition-colors"
            onClick={() => handleOAuthRedirect(editAccount)}
          >
            <LinkIcon size={18} />
          </button>
          <button
            title="Edit"
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => setEditMode(true)}
          >
            <Edit2 size={18} />
          </button>
          <button
            title="Delete"
            className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={handleDelete}
          >
            <Trash2 size={18} />
          </button>
        </div>
        {!editMode ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <User className="text-blue-500" size={28} />
              <h2 className="text-2xl font-bold text-blue-700 tracking-tight">Account Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><User size={16} className="text-blue-400" /> Name</div>
                <div className="text-lg font-semibold text-gray-900">{editAccount["namespace-account-name"] || ''}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Hash size={16} className="text-purple-400" /> ID</div>
                <div className="text-base font-mono text-gray-700">{editAccount["namespace-account-id"] || ''}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Globe size={16} className="text-green-400" /> Namespace ID</div>
                <div className="text-base font-mono text-gray-700">{editAccount["namespace-id"] || (namespace && namespace["namespace-id"]) || <span className="italic text-gray-400">None</span>}</div>
              </div>
              {editAccount["namespace-account-url-override"] && (
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Globe size={16} className="text-pink-400" /> URL Override</div>
                  <div className="text-base text-gray-700">{editAccount["namespace-account-url-override"]}</div>
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Tag size={16} className="text-yellow-400" /> Tags</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(editAccount.tags) && editAccount.tags.length > 0 ? (
                    editAccount.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold shadow">{tag}</span>
                    ))
                  ) : (
                    <span className="italic text-gray-400">No tags</span>
                  )}
                </div>
              </div>
              {editAccount["header-variables"] && (
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><List size={16} className="text-blue-400" /> Header Variables</div>
                  {renderHeaderVars(editAccount["header-variables"])}
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Key size={16} className="text-purple-400" /> Account Headers</div>
                {renderAccountHeaders(editAccount["namespace-account-header"])}
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Key size={16} className="text-green-400" /> Account Variables</div>
                {renderAccountVars(editAccount["variables"] || editAccount["namespace-account-variables"])}
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Database size={16} className="text-blue-400" /> Tables</div>
                {renderTableNames(editAccount.data?.M?.tableName || editAccount.tableName)}
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-green-700 font-semibold">Active</span>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Edit3 className="text-blue-500" size={24} />
              <h2 className="text-xl font-bold text-blue-700 tracking-tight">Edit Account</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-blue-50 placeholder-gray-400"
                  value={editAccount["namespace-account-name"] || ''}
                  onChange={e => handleInput("namespace-account-name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base bg-gray-100"
                  value={editAccount["namespace-account-id"] || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Namespace ID</label>
                <input
                  type="text"
                  className="w-full border border-green-200 rounded-lg px-3 py-2 text-base bg-green-50"
                  value={editAccount["namespace-id"] || (namespace && namespace["namespace-id"]) || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL Override</label>
                <input
                  type="text"
                  className="w-full border border-pink-200 rounded-lg px-3 py-2 text-base bg-pink-50"
                  value={editAccount["namespace-account-url-override"] || ''}
                  readOnly
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition outline-none bg-yellow-50 placeholder-gray-400"
                  value={Array.isArray(editAccount.tags) ? editAccount.tags.join(', ') : ''}
                  onChange={e => handleInput('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                />
              </div>
              {editAccount["header-variables"] && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Header Variables</label>
                  {renderHeaderVars(editAccount["header-variables"])}
                </div>
              )}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Account Headers</label>
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={addHeaderRow}>+ Add Header</button>
                </div>
                <div className="space-y-2">
                  {(Array.isArray(editAccount['namespace-account-header']) ? editAccount['namespace-account-header'] : []).map((h: any, idx: number) => (
                    <div key={idx} className="flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Key"
                        className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm"
                        value={h.key || ''}
                        onChange={e => updateHeaderAtIndex(idx, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm"
                        value={h.value || ''}
                        onChange={e => updateHeaderAtIndex(idx, 'value', e.target.value)}
                      />
                      <button type="button" className="text-red-500 px-2" onClick={() => removeHeaderRow(idx)}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Account Variables</label>
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={addVariableRow}>+ Add Variable</button>
                </div>
                <div className="space-y-2">
                  {(Array.isArray(editAccount['variables']) ? editAccount['variables'] : (Array.isArray(editAccount['namespace-account-variables']) ? editAccount['namespace-account-variables'] : [])).map((v: any, idx: number) => (
                    <div key={idx} className="flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Key"
                        className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm"
                        value={v.key || ''}
                        onChange={e => updateVariableAtIndex(idx, 'key', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm"
                        value={v.value || ''}
                        onChange={e => updateVariableAtIndex(idx, 'value', e.target.value)}
                      />
                      <button type="button" className="text-red-500 px-2" onClick={() => removeVariableRow(idx)}><X size={16} /></button>
                    </div>
                  ))}
                </div>
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