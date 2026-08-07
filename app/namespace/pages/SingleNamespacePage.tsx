'use client'
import React, { useEffect, useState } from 'react';
import { Database, Globe, FileCode, Terminal, User, Link2, Copy, MoreVertical, Trash2, Search, Play } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export default function SingleNamespacePage({ namespaceId, initialNamespace, onViewAccount, onViewMethod, onViewSchema, onTestMethod }: { namespaceId: string, initialNamespace?: any, onViewAccount?: (account: any, ns?: any) => void, onViewMethod?: (method: any, ns?: any) => void, onViewSchema?: (schema: any, ns?: any) => void, onTestMethod?: (method: any, ns?: any) => void }) {
  const [namespace, setNamespace] = useState<any>(initialNamespace || null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query
  const filteredAccounts = accounts.filter(acc => 
    acc['namespace-account-name']?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredMethods = methods.filter(m => 
    m['namespace-method-name']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m['namespace-method-type']?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredSchemas = schemas.filter(s => 
    s.schemaName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeBadgeClasses = (t: string) => {
    switch ((t || '').toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-700 border border-green-200';
      case 'POST': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'PUT': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border border-red-200';
      case 'PATCH': return 'bg-purple-100 text-purple-700 border border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleMenu = (menuId: string) => {
    setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const deleteItem = async (type: 'account' | 'method' | 'schema', id: string) => {
    try {
      let url = '';
      if (type === 'account') {
        url = `${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts/${id}`;
      } else if (type === 'method') {
        url = `${API_BASE_URL}/unified/namespaces/${namespaceId}/methods/${id}`;
      } else if (type === 'schema') {
        url = `${API_BASE_URL}/unified/schema/${id}`;
      }
      
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        // Refresh the data
        if (type === 'account') {
          setAccounts(prev => prev.filter(acc => acc['namespace-account-id'] !== id));
        } else if (type === 'method') {
          setMethods(prev => prev.filter(method => method['namespace-method-id'] !== id));
        } else if (type === 'schema') {
          setSchemas(prev => prev.filter(schema => schema.id !== id));
        }
      } else {
        console.error(`Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    }
    setOpenMenus({});
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside any menu
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
        setOpenMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchNamespace = async () => {
      setLoading(true);
      if (!namespaceId) {
        console.error('No namespaceId provided!');
        setAccounts([]);
        setMethods([]);
        setSchemas([]);
        setLoading(false);
        return;
      }
      try {
        if (!initialNamespace) {
          const nsRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}`);
          const ns = await nsRes.json();
          if (ns && Object.keys(ns).length > 0) {
            setNamespace(ns);
          }
          // else, keep the initialNamespace
        }
        console.log('Fetching accounts for namespaceId:', namespaceId);
        const accRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/accounts`);
        const accData = await accRes.json();
        console.log('Accounts:', accData);
        setAccounts(Array.isArray(accData) ? accData : []);

        console.log('Fetching methods for namespaceId:', namespaceId);
        const methRes = await fetch(`${API_BASE_URL}/unified/namespaces/${namespaceId}/methods`);
        const methData = await methRes.json();
        console.log('Methods:', methData);
        setMethods(Array.isArray(methData) ? methData : []);

        console.log('Fetching schemas for namespaceId:', namespaceId);
        const schRes = await fetch(`${API_BASE_URL}/unified/schema`);
        const schData = await schRes.json();
        console.log('Schemas:', schData);
        setSchemas(Array.isArray(schData) 
          ? schData.filter((s: any) => s.namespaceId === namespaceId)
          : []);
      } catch (err) {
        // do not overwrite namespace if initialNamespace exists
        if (!initialNamespace) setNamespace(null);
        setAccounts([]);
        setMethods([]);
        setSchemas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNamespace();
  }, [namespaceId, initialNamespace]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!namespace || Object.keys(namespace).length === 0) return <div className="p-8">Namespace not found.</div>;

  return (
    <div className="p-8 w-full bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4  justify-between">
          {/* Icon */}
         
          <div className="min-w-0 flex justify-center items-center gap-4">
          <div className="flex-shrink-0">
            {namespace['icon-url'] ? (
              <img
                src={namespace['icon-url']}
                alt={`${namespace['namespace-name']} icon`}
                className="w-12 h-12 rounded-lg object-cover shadow-sm"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Database size={20} className="text-blue-600" />
              </div>
            )}
          </div>
            <h2 className="text-2xl font-bold text-gray-900 truncate">{namespace['namespace-name']}</h2>
            <div className="mt-2 flex flex-wrap gap-3 text-gray-700">
              <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1">
                <span className="text-xs text-gray-500">ID</span>
                <span className="font-mono text-xs text-gray-800 truncate max-w-[280px]">{namespace['namespace-id']}</span>
                <button
                  onClick={() => copyToClipboard(namespace['namespace-id'])}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy ID"
                >
                  <Copy size={12} />
                </button>
              </div>
              {namespace['namespace-url'] && (
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1">
                  <Globe size={14} className="text-gray-500" />
                  <span className="font-mono text-xs text-gray-800 truncate max-w-[320px]">{namespace['namespace-url']}</span>
                </div>
              )}
            </div>
          </div>
           {/* Search Box */}
       <div className="mb-6">
         <div className="relative max-w-md">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search size={16} className="text-gray-400" />
           </div>
           <input
             type="text"
             placeholder="Search accounts, methods, schemas..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
           />
           {searchQuery && (
             <button
               onClick={() => setSearchQuery('')}
               className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
             >
               ×
             </button>
           )}
         </div>
       </div>
        </div>
             </div>

      

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
        {/* Accounts Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm h-[66vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
            Accounts <span className="text-xs text-gray-500 font-normal">({filteredAccounts.length}/{accounts.length})</span>
            </h3>
            <button
              onClick={() => {
                // Ask parent to open All Accounts tab for this namespace
                // We can't directly open tabs here, but parent passes onViewAccount for items.
                // We'll dispatch a custom event the parent page listens to.
                const event = new CustomEvent('open-all-accounts-tab', { detail: { namespaceId } });
                window.dispatchEvent(event);
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >Add Account</button>
          </div>
          <div className="mt-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {filteredAccounts.length === 0 ? (
              <div className="text-gray-400">{searchQuery ? 'No accounts match your search.' : 'No accounts found.'}</div>
            ) : (
                             <ul className="space-y-2">
               {filteredAccounts.map((acc: any, idx: number) => (
                <li key={acc['namespace-account-id'] || idx} className="relative group">
                  <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition"
                       onClick={() => onViewAccount && onViewAccount(acc, namespace)}
                  >
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center"><User size={14} className="text-blue-600"/></div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-gray-800 leading-tight">{acc['namespace-account-name']}</span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(`account-${acc['namespace-account-id']}`);
                        }}
                        className="menu-button p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenus[`account-${acc['namespace-account-id']}`] && (
                        <div className="menu-dropdown absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem('account', acc['namespace-account-id']);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            )}
          </div>
        </div>
        {/* Methods Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm h-[66vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            Methods <span className="text-xs text-gray-500 font-normal">({filteredMethods.length}/{methods.length})</span>
            </h3>
            <button
              onClick={() => {
                const event = new CustomEvent('open-all-methods-tab', { detail: { namespaceId } });
                window.dispatchEvent(event);
              }}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
            >Add Method</button>
          </div>
          <div className="mt-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {filteredMethods.length === 0 ? (
              <div className="text-gray-400">{searchQuery ? 'No methods match your search.' : 'No methods found.'}</div>
            ) : (
                             <ul className="space-y-2">
               {filteredMethods.map((m: any, idx: number) => (
                <li key={m['namespace-method-id'] || idx} className="relative group">
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-green-300 hover:bg-green-50/40 transition"
                       onClick={() => onViewMethod && onViewMethod(m, namespace)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center"><Terminal size={14} className="text-green-600"/></div>
                      <span className="font-medium text-gray-800 truncate">{m['namespace-method-name']}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${typeBadgeClasses(m['namespace-method-type'])}`}>{m['namespace-method-type']}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTestMethod && onTestMethod(m, namespace);
                        }}
                        className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                        title="Test method"
                        aria-label="Test method"
                      >
                        <Play size={14} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(`method-${m['namespace-method-id']}`);
                          }}
                          className="menu-button p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openMenus[`method-${m['namespace-method-id']}`] && (
                          <div className="menu-dropdown absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteItem('method', m['namespace-method-id']);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            )}
          </div>
        </div>
        {/* Schemas Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm h-[66vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2 text-gray-900">
            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
            Schemas <span className="text-xs text-gray-500 font-normal">({filteredSchemas.length}/{schemas.length})</span>
            </h3>
            <button
              onClick={() => {
                const event = new CustomEvent('open-create-schema-tab', { detail: { namespaceId } });
                window.dispatchEvent(event);
              }}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
            >Add Schema</button>
          </div>
          <div className="mt-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {filteredSchemas.length === 0 ? (
              <div className="text-gray-400">{searchQuery ? 'No schemas match your search.' : 'No schemas found.'}</div>
            ) : (
                             <ul className="space-y-2">
               {filteredSchemas.map((s: any, idx: number) => (
                <li key={s.id || idx} className="relative group">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/40 transition"
                       onClick={() => onViewSchema && onViewSchema(s, namespace)}
                  >
                    <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center"><FileCode size={14} className="text-purple-600"/></div>
                    <span className="font-medium text-gray-800 flex-1">{s.schemaName}</span>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(`schema-${s.id}`);
                        }}
                        className="menu-button p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenus[`schema-${s.id}`] && (
                        <div className="menu-dropdown absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem('schema', s.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 