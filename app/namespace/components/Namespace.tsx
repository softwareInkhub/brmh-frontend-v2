'use client';
import React, { useState, useEffect } from 'react';
import { NamespaceInput } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Database, 
  Save, 
  Key, 
  Users, 
  Search, 
  Code,
  User,
  Play,
  Bell,
  Edit,
  X,
  Activity,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Globe,
  Copy,
  Grid,
  List as ListIcon,
} from 'react-feather';



const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';




type ExecutionStatus = 'success' | 'completed' | 'error' | 'in-progress';

const getStatusColor = (status: ExecutionStatus | undefined): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  switch (status) {
    case 'success':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Replace the multiple selection states with a single selection state
interface Selection {
  type: 'namespace' | 'account' | 'method';
  id: string;
}

// Add Namespace type definition
interface Namespace {
  'namespace-id': string;
  'namespace-name': string;
  'namespace-url': string;
  tags: string[];
}

/**
 * NamespacePage Component
 * Displays a list of namespaces with their basic information and statistics
 */
export default function NamespacePage() {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedNamespace, setSelectedNamespace] = useState<Namespace | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    async function fetchNamespaces() {
      try {
        const response = await fetch(`${API_BASE_URL}/unified/namespaces`);
        const data = await response.json();
        const namespacesArray = Array.isArray(data) ? data : 
                               (data && Array.isArray(data.body) ? data.body : []);
        setNamespaces(namespacesArray);
      } catch (error) {
        setNamespaces([]);
      }
    }
    fetchNamespaces();
  }, []);

  useEffect(() => {
    if (selectedNamespace) {
      setEditName(selectedNamespace['namespace-name'] || '');
      setEditUrl(selectedNamespace['namespace-url'] || '');
      setEditTags((selectedNamespace.tags || []).join(', '));
    }
  }, [selectedNamespace]);

  const filteredNamespaces = namespaces.filter(ns =>
    ns['namespace-name'].toLowerCase().includes(search.toLowerCase()) ||
    ns['namespace-url'].toLowerCase().includes(search.toLowerCase()) ||
    (ns.tags && ns.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-2 sm:p-4 md:p-6 lg:p-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Database className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Namespaces</h2>
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
                <input
                  type="text"
                  placeholder="Search namespaces..."
              className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 180 }}
            />
            <button
              className={`p-1 rounded ${view === 'grid' ? 'bg-blue-100' : 'bg-white'} border border-gray-200 ml-1`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              className={`p-1 rounded ${view === 'list' ? 'bg-blue-100' : 'bg-white'} border border-gray-200`}
              onClick={() => setView('list')}
              title="List view"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
        {view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredNamespaces.length === 0 ? (
              <div className="text-gray-500 text-center py-20 text-lg col-span-full">No namespaces found.</div>
            ) : (
              filteredNamespaces.map((ns, idx) => (
                <div
                  key={ns['namespace-id'] || idx}
                  className="bg-white rounded-lg shadow p-2 text-xs cursor-pointer border border-gray-100 hover:border-blue-300 transition-all"
                  onClick={() => { setSelectedNamespace(ns); setShowPanel(true); }}
                  style={{ minHeight: 70 }}
                >
                  <div className="font-bold text-sm mb-0.5 truncate">{ns['namespace-name']}</div>
                  <div className="text-gray-700 mb-0.5 break-all truncate">URL: <span className="text-gray-500">{ns['namespace-url']}</span></div>
                  {ns.tags && ns.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ns.tags.map((tag: string, tagIdx: number) => (
                        <span key={tagIdx} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredNamespaces.length === 0 ? (
              <div className="text-gray-500 text-center py-20 text-lg">No namespaces found.</div>
            ) : (
              filteredNamespaces.map((ns, idx) => (
                <div
                  key={ns['namespace-id'] || idx}
                  className="bg-white rounded-lg shadow p-2 text-xs cursor-pointer border border-gray-100 hover:border-blue-300 transition-all flex items-center gap-2"
                  onClick={() => { setSelectedNamespace(ns); setShowPanel(true); }}
                >
                  <div className="font-bold text-sm truncate w-32">{ns['namespace-name']}</div>
                  <div className="text-gray-700 break-all truncate flex-1">URL: <span className="text-gray-500">{ns['namespace-url']}</span></div>
                  {ns.tags && ns.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ns.tags.map((tag: string, tagIdx: number) => (
                        <span key={tagIdx} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
              ))
            )}
          </div>
        )}

        {/* Side Panel for Namespace Details */}
        {showPanel && selectedNamespace && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 animate-slide-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Database className="text-blue-600" size={18} />
                <span className="font-semibold text-base text-gray-900">Namespace Details</span>
                </div>
                          <button
                className="p-1.5 rounded-full hover:bg-gray-100"
                onClick={() => setShowPanel(false)}
              >
                <X size={18} />
                          </button>
                    </div>
            <div className="flex-1 overflow-y-auto p-4">
              <form
                className="space-y-4"
                onSubmit={async e => {
                  e.preventDefault();
                  // PATCH request to update namespace
                  try {
                    const res = await fetch(`${API_BASE_URL}/unified/namespaces/${selectedNamespace['namespace-id']}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        'namespace-name': editName,
                        'namespace-url': editUrl,
                        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
                      }),
                    });
                    if (res.ok) {
                      const updated = { ...selectedNamespace, 'namespace-name': editName, 'namespace-url': editUrl, tags: editTags.split(',').map(t => t.trim()).filter(Boolean) };
                      setSelectedNamespace(updated);
                      setNamespaces(nsArr => nsArr.map(ns => ns['namespace-id'] === updated['namespace-id'] ? updated : ns));
                    }
                  } catch {}
                }}
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                  />
                </div>
                    <button
                  type="submit"
                  className="w-full bg-blue-600 text-white rounded py-1.5 font-semibold text-sm hover:bg-blue-700 transition"
                >
                  Save
                    </button>
              </form>
            </div>
          </div>
        )}
                </div>
      <style jsx global>{`
        .animate-slide-in {
          animation: slideInRight 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}