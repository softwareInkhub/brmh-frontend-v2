import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, Filter, Database, Users, Terminal, FileCode, Folder, Layers, List, Box, FileText, Globe, Settings, User, Edit2, Trash2, Download, Upload, RefreshCw, LayoutDashboard } from 'lucide-react';
import NamespacePreviewModal from '../Modals/NamespacePreviewModal';

interface SidePanelProps {
  namespaces: any[];
  accounts: Record<string, any[]>; // namespaceId -> accounts
  schemas: any[];
  methods: Record<string, any[]>; // namespaceId -> methods
  onItemClick: (type: 'namespace' | 'account' | 'schema' | 'method', data: any) => void;
  onAdd: (type: 'namespace' | 'account' | 'schema' | 'method' | 'accountPage' | 'methodPage' | 'allAccounts' | 'allMethods' | 'allSchemas' | 'singleNamespace', parentData?: any, options?: { openForm?: boolean }) => void;
  fetchNamespaceDetails: (namespaceId: string) => void;
  selectedSchemaId?: string | null;
  onEditSchema?: (schema: any) => void;
  onDeleteSchema?: (schema: any) => void;
  onDeleteNamespace?: (namespace: any) => void;
}

const methodColor = (type: string) => {
  switch (type) {
    case 'GET': return 'text-green-600';
    case 'POST': return 'text-orange-500';
    case 'PUT': return 'text-blue-600';
    case 'DELETE': return 'text-red-600';
    case 'PATCH': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
};

const methodIcon = (type: string) => {
  switch (type) {
    case 'GET': return <Download size={16} className="text-green-600" />;
    case 'POST': return <Upload size={16} className="text-orange-500" />;
    case 'PUT': return <Edit2 size={16} className="text-blue-600" />;
    case 'DELETE': return <Trash2 size={16} className="text-red-600" />;
    case 'PATCH': return <RefreshCw size={16} className="text-yellow-600" />;
    default: return <FileCode size={16} className="text-gray-600" />;
  }
};

const SidePanel: React.FC<SidePanelProps> = ({ namespaces, accounts, schemas, methods, onItemClick, onAdd, fetchNamespaceDetails, selectedSchemaId, onEditSchema, onDeleteSchema, onDeleteNamespace }) => {
  // Debug logs
  console.log('SidePanel namespaces:', namespaces);
  console.log('SidePanel schemas:', schemas);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({
    endpoints: true,
    schemas: false,
    components: false,
    requests: false,
  });
  const [expandedNs, setExpandedNs] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState<Record<string, { accounts: boolean; methods: boolean; schemas: boolean }>>({});
  const [viewingNamespace, setViewingNamespace] = useState<any>(null);
  const [expandedNamespaces, setExpandedNamespaces] = useState(true);

  const toggle = (section: keyof typeof expanded) => setExpanded(e => ({ ...e, [section]: !e[section] }));
  const toggleNs = (nsId: string) => {
    setExpandedNs(e => {
      const newState = { ...e, [nsId]: !e[nsId] };
      if (newState[nsId]) {
        fetchNamespaceDetails(nsId);
      }
      return newState;
    });
  };
  const toggleSection = (nsId: string, section: 'accounts' | 'methods' | 'schemas') => {
    setExpandedSection(e => ({
      ...e,
      [nsId]: {
        ...e[nsId],
        [section]: !e[nsId]?.[section],
      },
    }));
  };

  // Robust filter logic
  const filteredNamespaces = Array.isArray(namespaces)
    ? namespaces.filter(ns => (ns['namespace-name'] || '').toLowerCase().includes(search.toLowerCase()))
    : [];

  const filteredSchemas = Array.isArray(schemas)
    ? schemas.filter(s => (s.schemaName || '').toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 h-full flex flex-col shadow-sm p-0 overflow-y-auto select-none scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 rounded-lg px-3 py-2 mb-2">
        <LayoutDashboard className="text-blue-600" size={20} />
        <span className="font-bold text-lg text-gray-900">BRMH</span>
      </div>
      {/* Search/Filter/Add Row */}
      <div className="flex items-center px-3 py-2 space-x-2 border-b border-gray-100 bg-white">
        <div className="flex-1 flex items-center bg-gray-50 rounded-md px-2">
          <Search size={16} className="text-gray-400" />
          <input
            className="flex-1 bg-transparent px-2 py-1 text-sm outline-none"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="p-2 rounded hover:bg-gray-100" title="Filter (coming soon)"><Filter size={16} className="text-gray-400" /></button>
      </div>
      {/* Overview
      <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 w-full text-sm">
        <Globe size={16} className="text-gray-400" /> Overview
      </button> */}
      {/* Endpoints Section */}
      <div>
        <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500 mt-4">
          <button
            className="flex items-center gap-1"
            onClick={() => setExpandedNamespaces(exp => !exp)}
            type="button"
          >
            {expandedNamespaces ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Box size={14} />
            <span>Namespaces</span>
          </button>
          <button
            onClick={() => onAdd('namespace')}
            className="ml-1 p-1 rounded hover:bg-blue-50"
            title="Add Namespace"
            type="button"
          >
            <Plus size={16} className="text-blue-500" />
          </button>
        </div>
        {expandedNamespaces && (
          <div className="pl-2">
            {filteredNamespaces.length === 0 && (
              <div className="text-xs text-gray-400 pl-2 py-2">No namespaces found</div>
            )}
            {filteredNamespaces.map(ns => (
              <div key={ns['namespace-id']} className="mb-1">
                <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                  <button
                    className="flex items-center gap-2 px-2 py-1 w-full text-gray-700 hover:bg-gray-50 text-sm font-semibold hover:underline cursor-pointer"
                    onClick={() => {
                      toggleNs(ns['namespace-id']);
                      onAdd('singleNamespace', ns);
                    }}
                    type="button"
                  >
                    {expandedNs[ns['namespace-id']] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Folder size={16} className="text-blue-500" />
                    <span className="font-medium text-sm text-gray-800 group-hover:text-blue-600 truncate">
                      {ns['namespace-name']}
                    </span>
                  </button>
                </div>
                {expandedNs[ns['namespace-id']] && (
                  <div className="ml-6 mt-1 space-y-1">
                    {/* Accounts */}
                    <div>
                      <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                        <button
                          className="flex items-center gap-1 group hover:underline cursor-pointer"
                          onClick={() => {
                            toggleSection(ns['namespace-id'], 'accounts');
                            onAdd('allAccounts', ns);
                          }}
                          type="button"
                        >
                          {expandedSection[ns['namespace-id']]?.accounts ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>Accounts</span>
                          
                        </button>
                        <button
                          onClick={() =>{  toggleSection(ns['namespace-id'], 'accounts');
                            onAdd('allAccounts', ns, { openForm: true });}}
                          className="p-1 rounded hover:bg-blue-50"
                          title="Add Account"
                          type="button"
                        >
                          <Plus size={14} className="text-blue-500" />
                        </button>
                      </div>
                      {expandedSection[ns['namespace-id']]?.accounts && (
                        <div className="space-y-1">
                          {(accounts[ns['namespace-id']] || []).map((acc, idx) => (
                            <button
                              key={acc['namespace-account-id'] || idx}
                              onClick={() => onAdd('accountPage', { account: acc, namespace: ns })}
                              className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-gray-50 text-sm group"
                            >
                              <User size={16} className="text-blue-500" />
                              <span>{acc['namespace-account-name']}</span>
                              <span
                                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => {
                                  e.stopPropagation();
                                  onAdd('accountPage', { account: acc, namespace: ns });
                                }}
                              >
                                <Plus size={14} className="text-blue-400" />
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Methods */}
                    <div>
                      <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                        <button
                          className="flex items-center gap-1 group hover:underline cursor-pointer"
                          onClick={() => {
                            toggleSection(ns['namespace-id'], 'methods');
                            onAdd('allMethods', ns);
                          }}
                          type="button"
                        >
                          {expandedSection[ns['namespace-id']]?.methods ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>Methods</span>
                         
                        </button>
                        <button
                          onClick={() =>{toggleSection(ns['namespace-id'], 'methods');
                            onAdd('allMethods', ns, { openForm: true });}}
                          className="p-1 rounded hover:bg-blue-50"
                          title="Add Method"
                          type="button"
                        >
                          <Plus size={14} className="text-blue-500" />
                        </button>
                      </div>
                      {expandedSection[ns['namespace-id']]?.methods && (
                        <div className="space-y-1">
                          {(methods[ns['namespace-id']] || []).map((m, idx) => (
                            <button
                              key={m['namespace-method-id'] || idx}
                              onClick={() => onItemClick('method', m)}
                              className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-gray-50 text-sm group"
                            >
                              {methodIcon(m['namespace-method-type'])}
                              <span className={`font-bold text-xs ${methodColor(m['namespace-method-type'])}`}>{m['namespace-method-type']}</span>
                              <span className="truncate group-hover:text-blue-600 text-xs">{m['namespace-method-name']}</span>
                              <span
                                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => {
                                  e.stopPropagation();
                                  onAdd('methodPage', { method: m, namespace: ns });
                                }}
                              >
                                <Plus size={14} className="text-blue-400" />
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Schemas */}
                    <div>
                      <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                        <button
                          className="flex items-center gap-1 group hover:underline cursor-pointer"
                          onClick={() => {
                            toggleSection(ns['namespace-id'], 'schemas');
                            onAdd('allSchemas', ns);
                          }}
                          type="button"
                        >
                          {expandedSection[ns['namespace-id']]?.schemas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>Schemas</span>
                          
                        </button>
                        <button
                          onClick={() => onAdd('schema', ns)}
                          className="p-1 rounded hover:bg-purple-50"
                          title="Add Schema"
                          type="button"
                        >
                          <Plus size={14} className="text-purple-500" />
                        </button>
                      </div>
                      {expandedSection[ns['namespace-id']]?.schemas && (
                        <div className="space-y-1">
                          {(
                            schemas.filter(
                              s =>
                                Array.isArray(ns.schemaIds) &&
                                ns.schemaIds.includes(s.id)
                            ) || []
                          ).map((schema, idx) => (
                            <button
                              key={schema.id || idx}
                              onClick={() => onItemClick('schema', schema)}
                              className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-gray-50 text-sm group"
                            >
                              <FileCode size={16} className="text-purple-500" />
                              <span>{schema.schemaName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <NamespacePreviewModal
        isOpen={!!viewingNamespace}
        onClose={() => setViewingNamespace(null)}
        namespace={viewingNamespace}
        onEdit={ns => {
          onItemClick('namespace', ns);
          setViewingNamespace(null);
        }}
        onDelete={ns => {
          if (onDeleteNamespace) onDeleteNamespace(ns);
          setViewingNamespace(null);
        }}
      />
    </aside>
  );
};

export default SidePanel; 

/* Custom scrollbar styles for 3px width */
<style jsx global>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f3f4f6;
  }
`}</style> 