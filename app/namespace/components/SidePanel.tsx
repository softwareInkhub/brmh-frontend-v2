import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, Filter, Database, Users, Terminal, FileCode, Folder, Layers, List, Box, FileText, Globe, Settings, User, Edit2, Trash2, Download, Upload, RefreshCw, LayoutDashboard } from 'lucide-react';
import NamespacePreviewModal from '../Modals/NamespacePreviewModal';
import { useDrag } from 'react-dnd';

interface SidePanelProps {
  namespaces: any[];
  accounts: Record<string, any[]>; // namespaceId -> accounts
  schemas: any[];
  methods: Record<string, any[]>; // namespaceId -> methods
  webhooks: Record<string, any[]>; // namespaceId -> webhooks
  lambdas: Record<string, any[]>; // namespaceId -> lambdas
  onItemClick: (type: 'namespace' | 'account' | 'schema' | 'method', data: any) => void;
  onAdd: (type: 'namespace' | 'account' | 'schema' | 'method' | 'accountPage' | 'methodPage' | 'allAccounts' | 'allMethods' | 'allSchemas' | 'singleNamespace' | 'webhook' | 'allWebhooks' | 'webhookPage' | 'lambda' | 'allLambdas' | 'lambdaPage', parentData?: any) => void;
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

// Draggable Namespace Component
const DraggableNamespace: React.FC<{ namespace: any; children: React.ReactNode }> = ({ namespace, children }) => {
  const dragRef = useRef<HTMLDivElement>(null);
  
  // Debug: Log namespace structure
  console.log('DraggableNamespace rendered with namespace:', namespace);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'namespace',
    item: () => {
      console.log('Drag started for namespace:', namespace);
      console.log('Namespace keys:', Object.keys(namespace || {}));
      return { namespace };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Connect the drag ref
  drag(dragRef);

  return (
    <div
      ref={dragRef}
      className={`cursor-move ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      title="Drag to AI Agent for context"
    >
      {children}
    </div>
  );
};

const DraggableMethod: React.FC<{ method: any; namespace: any; children: React.ReactNode; onClick: () => void }> = ({ method, namespace, children, onClick }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'METHOD',
    item: { type: 'METHOD', data: method, namespace },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div ref={node => { if (node) drag(node); }} draggable style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}>
      <div onClick={onClick}>
        {children}
      </div>
    </div>
  );
};

const DraggableSchema: React.FC<{ schema: any; children: React.ReactNode; onClick: () => void }> = ({ schema, children, onClick }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'SCHEMA',
    item: { type: 'SCHEMA', data: schema },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div ref={node => { if (node) drag(node); }} draggable style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}>
      <div onClick={onClick}>
        {children}
      </div>
    </div>
  );
};

const SidePanel: React.FC<SidePanelProps> = ({ namespaces, accounts, schemas, methods, webhooks, lambdas, onItemClick, onAdd, fetchNamespaceDetails, selectedSchemaId, onEditSchema, onDeleteSchema, onDeleteNamespace }) => {
  // Debug logs
  console.log('SidePanel namespaces:', namespaces);
  console.log('SidePanel schemas:', schemas);
  console.log('SidePanel lambdas:', lambdas);

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({
    endpoints: true,
    schemas: false,
    components: false,
    requests: false,
  });
  const [expandedNs, setExpandedNs] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState<Record<string, { accounts: boolean; methods: boolean; schemas: boolean; webhooks: boolean; lambdas: boolean }>>({});
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
  const toggleSection = (nsId: string, section: 'accounts' | 'methods' | 'schemas' | 'webhooks' | 'lambdas') => {
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
            {filteredNamespaces.map((ns, nsIdx) => (
              <DraggableNamespace
                key={ns['namespace-id'] || nsIdx}
                namespace={ns}
              >
                <div className="mb-1">
                  <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                    <button
                      className="flex items-center gap-1 px-1 py-1 hover:bg-gray-100 rounded"
                      onClick={e => {
                        e.stopPropagation();
                        toggleNs(ns['namespace-id']);
                      }}
                      type="button"
                      aria-label={expandedNs[ns['namespace-id']] ? 'Collapse namespace' : 'Expand namespace'}
                    >
                      {expandedNs[ns['namespace-id']] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <button
                      className="flex items-center gap-2 px-2 py-1 w-full text-gray-700 hover:bg-gray-50 text-sm font-medium hover:underline cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        // Open namespace tab
                        onAdd('singleNamespace', ns);
                        // Ensure dropdown expands (but doesn't collapse if already open)
                        if (!expandedNs[ns['namespace-id']]) {
                          toggleNs(ns['namespace-id']);
                        } else {
                          // Still prefetch details to keep contents fresh
                          fetchNamespaceDetails(ns['namespace-id']);
                        }
                      }}
                      type="button"
                    >
                      {ns['icon-url'] ? (
                        <img 
                          src={ns['icon-url']} 
                          alt={`${ns['namespace-name']} icon`}
                          className="w-4 h-4 rounded object-cover"
                          onError={(e) => {
                            // Fallback to folder icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Folder size={16} className={`text-gray-600 ${ns['icon-url'] ? 'hidden' : ''}`} />
                      <span className="font-medium text-xs text-gray-900 truncate">
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
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 align-middle inline-block">
                              <Plus size={14} className="text-blue-400" />
                            </span>
                          </button>
                          <button
                            onClick={() => onAdd('account', ns)}
                            className="p-1 rounded hover:bg-blue-50"
                            title="Add Account"
                            type="button"
                          >
                            <Plus size={14} className="text-blue-500" />
                          </button>
                        </div>
                        {expandedSection[ns['namespace-id']]?.accounts && (
                          <div className="space-y-1">
                            {(Array.isArray(accounts[ns['namespace-id']]) ? accounts[ns['namespace-id']] : []).map((acc, accIdx) => (
                              <button
                                key={acc['namespace-account-id'] || accIdx}
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
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 align-middle inline-block">
                              <Plus size={14} className="text-blue-400" />
                            </span>
                          </button>
                          <button
                            onClick={() => onAdd('method', ns)}
                            className="p-1 rounded hover:bg-blue-50"
                            title="Add Method"
                            type="button"
                          >
                            <Plus size={14} className="text-blue-500" />
                          </button>
                        </div>
                        {expandedSection[ns['namespace-id']]?.methods && (
                          <div className="space-y-1">
                            {(methods[ns['namespace-id']] || []).map((method, methodIdx) => (
                              <DraggableMethod
                                key={method['namespace-method-id'] || methodIdx}
                                method={method}
                                namespace={ns}
                                onClick={() => onItemClick('method', method)}
                              >
                                <button className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-gray-50 text-sm group">
                                  {methodIcon(method['namespace-method-type'])}
                                  <span className={`font-bold text-xs ${methodColor(method['namespace-method-type'])}`}>{method['namespace-method-type']}</span>
                                  <span className="truncate group-hover:text-blue-600 text-xs">{method['namespace-method-name']}</span>
                                  <span
                                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={e => {
                                      e.stopPropagation();
                                      onAdd('methodPage', { method: method, namespace: ns });
                                    }}
                                  >
                                    <Plus size={14} className="text-blue-400" />
                                  </span>
                                </button>
                              </DraggableMethod>
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
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 align-middle inline-block">
                              <Plus size={14} className="text-purple-400" />
                            </span>
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
                            {(schemas.filter(s => Array.isArray(ns.schemaIds) && ns.schemaIds.includes(s.id)) || []).map((schema, schemaIdx) => (
                              <DraggableSchema
                                key={schema.id || schemaIdx}
                                schema={schema}
                                onClick={() => onItemClick('schema', schema)}
                              >
                                <button className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-gray-50 text-sm group">
                                  <FileCode size={16} className="text-purple-500" />
                                  <span>{schema.schemaName}</span>
                                </button>
                              </DraggableSchema>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Webhooks */}
                      <div>
                        <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                          <button
                            className="flex items-center gap-1 group hover:underline cursor-pointer"
                            onClick={() => {
                              toggleSection(ns['namespace-id'], 'webhooks');
                              onAdd('allWebhooks', ns);
                            }}
                            type="button"
                          >
                            {expandedSection[ns['namespace-id']]?.webhooks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>Webhooks</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 align-middle inline-block">
                              <Plus size={14} className="text-pink-400" />
                            </span>
                          </button>
                          <button
                            onClick={() => onAdd('webhook', ns)}
                            className="p-1 rounded hover:bg-pink-50"
                            title="Add Webhook"
                            type="button"
                          >
                            <Plus size={14} className="text-pink-500" />
                          </button>
                        </div>
                        {expandedSection[ns['namespace-id']]?.webhooks && (
                          <div className="space-y-1">
                            {(webhooks[ns['namespace-id']] && webhooks[ns['namespace-id']].length > 0) ? (
                              webhooks[ns['namespace-id']].map((wh, whIdx) => (
                                <button
                                  key={wh['webhook-id'] || whIdx}
                                  onClick={() => onAdd('webhookPage', { webhook: wh, namespace: ns })}
                                  className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-pink-50 text-sm group"
                                >
                                  <span className="truncate group-hover:text-pink-600 text-xs">{wh['webhook-name']}</span>
                                </button>
                              ))
                            ) : (
                              <div className="text-xs text-gray-400 pl-2 py-2">No webhooks found</div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Lambdas */}
                      <div>
                        <div className="flex items-center justify-between gap-2 py-1 pr-4 text-xs text-gray-500">
                          <button
                            className="flex items-center gap-1 group hover:underline cursor-pointer"
                            onClick={() => {
                              toggleSection(ns['namespace-id'], 'lambdas');
                              onAdd('allLambdas', ns);
                            }}
                            type="button"
                          >
                            {expandedSection[ns['namespace-id']]?.lambdas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>Lambdas</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 align-middle inline-block">
                              <Plus size={14} className="text-blue-400" />
                            </span>
                          </button>
                          <button
                            onClick={() => onAdd('lambda', ns)}
                            className="p-1 rounded hover:bg-blue-50"
                            title="Add Lambda"
                            type="button"
                          >
                            <Plus size={14} className="text-blue-500" />
                          </button>
                        </div>
                        {expandedSection[ns['namespace-id']]?.lambdas && (
                          <div className="space-y-1">
                            {(lambdas[ns['namespace-id']] && lambdas[ns['namespace-id']].length > 0) ? (
                              lambdas[ns['namespace-id']].map((lambda, lambdaIdx) => (
                                <button
                                  key={lambda.id || lambdaIdx}
                                  onClick={() => onAdd('lambdaPage', { lambda: lambda, namespace: ns })}
                                  className="flex items-center gap-2 px-4 py-2 w-full text-gray-700 hover:bg-blue-50 text-sm group"
                                >
                                  <span className="truncate group-hover:text-blue-600 text-xs">{lambda.functionName}</span>
                                </button>
                              ))
                            ) : (
                              <div className="text-xs text-gray-400 pl-2 py-2">No lambdas found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DraggableNamespace>
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