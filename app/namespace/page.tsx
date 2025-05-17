'use client';
import React, { useState, useEffect } from 'react';
import SidePanel from './components/SidePanel';
import UnifiedNamespace, { UnifiedNamespaceModalTrigger } from './components/UnifiedNamespace';
import Namespace from './components/Namespace';
import SchemaService from './components/SchemaService';
import Tables from './components/Tables';
import LLMTerminal from './components/LLMTerminal';
import SchemaModal from './components/SchemaModal';
import { NestedFieldsEditor, schemaToFields } from './components/SchemaService';
import { User, X } from 'lucide-react';
import AccountModal from './components/AccountModal';
import MethodModal from './components/MethodModal';
import NamespaceModal from './components/NamespaceModal';
import AccountPreviewModal from './components/AccountPreviewModal';
import MethodPreviewModal from './components/MethodPreviewModal';
import MethodTestModal from '../components/MethodTestModal';
import UnifiedSchemaModal from './components/UnifiedSchemaModal';
import SchemaPreviewModal from './components/SchemaPreviewModal';

const SIDEBAR_WIDTH = 80; // px, w-20
const SIDEPANEL_WIDTH = 256; // px, w-64

function fieldsToSchema(fields: any[]): Record<string, any> {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const field of fields) {
    let type: any = field.type;
    if (field.allowNull) {
      type = [field.type, 'null'];
    }
    let property: any = { type };
    if (field.type === 'enum') {
      property = {
        type: field.allowNull ? ['string', 'null'] : 'string',
        enum: field.enumValues || []
      };
    } else if (field.type === 'object') {
      const nested = fieldsToSchema(field.fields || []);
      property = { ...property, ...nested };
    } else if (field.type === 'array') {
      if (field.itemType === 'object') {
        property.items = fieldsToSchema(field.itemFields || []);
      } else {
        property.items = { type: field.allowNull ? [field.itemType, 'null'] : field.itemType };
      }
    }
    properties[field.name] = property;
    if (field.required) {
      required.push(field.name);
    }
  }
  const schema: any = {
    type: 'object',
    properties
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

export default function NamespacePage() {
  const [activeTab, setActiveTab] = useState('namespace');

  // Modal state for schema creation
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [schemaName, setSchemaName] = useState('');
  const [jsonSchema, setJsonSchema] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [saveMessage, setSaveMessage] = useState('');

  // --- SidePanel and UnifiedNamespace shared state ---
  const [namespaces, setNamespaces] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [namespaceDetailsMap, setNamespaceDetailsMap] = useState<Record<string, { accounts: any[]; methods: any[] }>>({});
  const [sidePanelModal, setSidePanelModal] = useState<UnifiedNamespaceModalTrigger | null>(null);
  const [previewAccount, setPreviewAccount] = useState(null);
  const [previewMethod, setPreviewMethod] = useState(null);
  const [previewSchema, setPreviewSchema] = useState(null);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);

  // New state for AccountModal and MethodModal
  const [accountModal, setAccountModal] = useState<{ isOpen: boolean; account: any | null }>({ isOpen: false, account: null });
  const [methodModal, setMethodModal] = useState<{ isOpen: boolean; method: any | null }>({ isOpen: false, method: null });
  const [namespaceModal, setNamespaceModal] = useState<{ isOpen: boolean; namespace: any | null }>({ isOpen: false, namespace: null });

  // New state for MethodTestModal
  const [testMethodModal, setTestMethodModal] = useState<{ isOpen: boolean; method: any | null }>({ isOpen: false, method: null });

  // New state for UnifiedSchemaModal
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Derive accounts and methods from namespaceDetailsMap for SidePanel
  const accounts = Object.fromEntries(
    Object.entries(namespaceDetailsMap).map(([nsId, v]) => [nsId, v.accounts])
  );
  const methods = Object.fromEntries(
    Object.entries(namespaceDetailsMap).map(([nsId, v]) => [nsId, v.methods])
  );

  // Fetch all namespaces and schemas
  useEffect(() => {
    if (activeTab !== 'unifiedNamespace') return;
    const fetchData = async () => {
      try {
        const [nsRes, schemaRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/unified/namespaces`),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/unified/schema`)
        ]);
        const [nsData, schemaData] = await Promise.all([
          nsRes.json(),
          schemaRes.json()
        ]);
        setNamespaces(nsData);
        setSchemas(Array.isArray(schemaData) ? schemaData : []);
      } catch (err) {
        // handle error
      }
    };
    fetchData();
  }, [activeTab]);

  // Fetch accounts and methods for a namespace
  const fetchNamespaceDetails = async (namespaceId: string) => {
    try {
      const [accountsRes, methodsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/unified/namespaces/${namespaceId}/accounts`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/unified/namespaces/${namespaceId}/methods`)
      ]);
      const [accounts, methods] = await Promise.all([
        accountsRes.json(),
        methodsRes.json()
      ]);
      setNamespaceDetailsMap(prev => ({ ...prev, [namespaceId]: { accounts, methods } }));
    } catch (err) {
      // handle error
    }
  };

  // SidePanel handlers
  const handleSidePanelClick = (type: 'namespace' | 'account' | 'schema' | 'method', data: any) => {
    if (type === 'namespace') {
      setNamespaceModal({ isOpen: true, namespace: data });
    } else if (type === 'account') {
      setPreviewAccount(data);
    } else if (type === 'method') {
      setPreviewMethod(data);
    } else if (type === 'schema') {
      setPreviewSchema(data);
      setSelectedSchemaId(data.id);
    }
  };
  const handleSidePanelAdd = (type: 'namespace' | 'account' | 'schema' | 'method', parentData?: any) => {
    if (type === 'namespace') {
      setNamespaceModal({ isOpen: true, namespace: null });
    } else if (type === 'account') {
      setAccountModal({ isOpen: true, account: null });
    } else if (type === 'method') {
      setMethodModal({ isOpen: true, method: null });
    } else if (type === 'schema') {
      setShowSchemaModal(true);
    }
  };

  // Bidirectional sync
  useEffect(() => {
    setJsonSchema(JSON.stringify(fieldsToSchema(fields), null, 2));
    // eslint-disable-next-line
  }, [fields]);

  const handleValidate = async (fieldsArg: any[], jsonSchemaArg: string) => {
    setValidationResult(null);
    try {
      const parsed = JSON.parse(jsonSchemaArg);
      setJsonError(null);
      // Make API call to validate schema
      const response = await fetch('http://localhost:5000/schema/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema: parsed })
      });
      if (!response.ok) {
        throw new Error('Validation failed');
      }
      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating schema:', error);
      setJsonError('Invalid JSON or validation failed');
      setValidationResult({ valid: false, message: 'Validation failed. Please check your schema.' });
    }
  };

  const handleSave = async (fieldsArg: any[], jsonSchemaArg: string) => {
    if (!schemaName.trim()) {
      setSaveMessage('Schema name is required.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonSchemaArg);
      setJsonError(null);
      // Make API call to save schema
      const response = await fetch('http://localhost:5000/schema/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schemaName: schemaName.trim(),
          schema: parsed
        })
      });
      if (!response.ok) {
        throw new Error('Failed to save schema');
      }
      const result = await response.json();
      if (result && (result.schemaId || result.id)) {
        setSaveMessage('Schema created successfully!');
        setShowModal(false);
        resetForm();
      } else {
        setSaveMessage(result?.error || 'Failed to save schema. Please try again.');
      }
    } catch (error) {
      console.error('Error saving schema:', error);
      setJsonError('Invalid JSON or save failed');
      setSaveMessage('Failed to save schema. Please try again.');
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonSchema(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setJsonError(null);
      setFields(schemaToFields(parsed));
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  const resetForm = () => {
    setSchemaName('');
    setJsonSchema('{}');
    setFields([]);
    setJsonError(null);
    setRawFields('');
    setRawFieldsError(null);
    setCollapsedNodes(new Set());
    setValidationResult(null);
    setSaveMessage('');
  };

  // Function to open modal from LLMTerminal
  const openSchemaModal = (name: string, schema: any) => {
    setSchemaName(name);
    setJsonSchema(JSON.stringify(schema, null, 2));
    setFields(schemaToFields(schema));
    setShowModal(true);
  };

  // On mount, update from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastTab = localStorage.getItem('brhm-last-tab');
      if (lastTab && lastTab !== activeTab) {
        setActiveTab(lastTab);
      }
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('brhm-last-tab', activeTab);
    }
  }, [activeTab]);

  const handleSchemaModalSave = (schemaName: string, jsonSchema: string) => {
    handleSave([], jsonSchema); // You may want to adapt this to use fields if needed
  };

  const handleSaveAccount = async (account: any) => {
    try {
      const response = await fetch('/api/namespace/account', {
        method: account["namespace-account-id"] ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...account,
          "namespace-id": namespaces[0]?.["namespace-id"],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save account');
      }

      const savedAccount = await response.json();
      setNamespaceDetailsMap(prev => ({
        ...prev,
        [namespaces[0]?.["namespace-id"]]: {
          accounts: [
            ...(prev[namespaces[0]?.["namespace-id"]]?.accounts || []).filter((a: any) => a["namespace-account-id"] !== savedAccount["namespace-account-id"]),
            savedAccount,
          ],
          methods: prev[namespaces[0]?.["namespace-id"]]?.methods || [],
        },
      }));
    } catch (error) {
      console.error('Error saving account:', error);
      throw error;
    }
  };

  const handleSaveNamespace = async (namespace: any) => {
    try {
      const isEdit = !!namespace["namespace-id"];
      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces/${namespace["namespace-id"]}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces`;
      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "namespace-name": namespace["namespace-name"],
          "namespace-url": namespace["namespace-url"],
          "tags": namespace.tags || []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save namespace');
      }

      const savedNamespace = await response.json();
      if (isEdit) {
        setNamespaces(prev => prev.map(ns => ns["namespace-id"] === savedNamespace["namespace-id"] ? savedNamespace : ns));
      } else {
        setNamespaces(prev => [...prev, savedNamespace]);
      }
      setNamespaceModal({ isOpen: false, namespace: null });
    } catch (error) {
      console.error('Error saving namespace:', error);
      throw error;
    }
  };

  const handleDeleteNamespace = async (namespace: any) => {
    if (!namespace || !namespace["namespace-id"]) return;
    if (!window.confirm('Are you sure you want to delete this namespace?')) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces/${namespace["namespace-id"]}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete namespace');
      }
      setNamespaces(prev => prev.filter(ns => ns["namespace-id"] !== namespace["namespace-id"]));
      setNamespaceModal({ isOpen: false, namespace: null });
      // Optionally clear details
      setPreviewAccount(null);
      setPreviewMethod(null);
      setPreviewSchema(null);
    } catch (error) {
      alert('Failed to delete namespace');
      console.error('Error deleting namespace:', error);
    }
  };

  return (
    <div className="bg-[#f7f8fa] min-h-screen">
      <div className="flex h-screen ml-20">
        {/* SidePanel (only for Unified Namespace tab) */}
        {activeTab === 'unifiedNamespace' && (
          <div
            style={{
              width: 256,
              minWidth: 256,
              maxWidth: 256,
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              height: '100vh',
              zIndex: 20,
            }}
          >
            <SidePanel
              namespaces={namespaces}
              accounts={accounts}
              schemas={schemas}
              methods={methods}
              onItemClick={handleSidePanelClick}
              onAdd={handleSidePanelAdd}
              fetchNamespaceDetails={fetchNamespaceDetails}
              selectedSchemaId={selectedSchemaId}
              onEditSchema={schema => {
                setShowSchemaModal(true);
                setPreviewSchema(null);
                setSelectedSchemaId(schema.id);
              }}
              onDeleteSchema={async (schema) => {
                if (confirm('Are you sure you want to delete this schema?')) {
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/schema/${schema.id}`, {
                      method: 'DELETE',
                    });
                    if (!response.ok) throw new Error('Failed to delete schema');
                    setSchemas(schemas => schemas.filter(s => s.id !== schema.id));
                    setPreviewSchema(null);
                    setSelectedSchemaId(null);
                  } catch (error) {
                    console.error('Error deleting schema:', error);
                    alert('Failed to delete schema');
                  }
                }
              }}
              onDeleteNamespace={handleDeleteNamespace}
            />
          </div>
        )}
        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pl-8">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-gray-100 mb-6">
            {/* <button
              className={`px-6 text-sm font-medium transition-all relative ${activeTab === 'namespace' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('namespace')}
            >
              Namespace
              {activeTab === 'namespace' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>}
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium transition-all relative ${activeTab === 'schemaService' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('schemaService')}
            >
              Schema Service
              {activeTab === 'schemaService' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>}
            </button>
            <button
              className={`px-6 py-2 text-sm font-medium transition-all relative ${activeTab === 'tables' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('tables')}
            >
              Tables
              {activeTab === 'tables' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>}
            </button> */}
            <button
              className={`px-6 py-2 text-sm font-medium transition-all relative ${activeTab === 'unifiedNamespace' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('unifiedNamespace')}
            >
              Overview  
              {activeTab === 'unifiedNamespace' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>}
            </button>
          </div>
          {/* Main Tab Content */}
          <div className="w-full pt-4">
            {activeTab === 'namespace' && <Namespace />}
            {activeTab === 'schemaService' && <SchemaService />}
            {activeTab === 'tables' && <Tables />}
            {activeTab === 'unifiedNamespace' && (
              <UnifiedNamespace
                externalModalTrigger={sidePanelModal}
                onModalClose={() => setSidePanelModal(null)}
                fetchNamespaceDetails={fetchNamespaceDetails}
                namespaceDetailsMap={namespaceDetailsMap}
                setNamespaceDetailsMap={setNamespaceDetailsMap}
                refreshData={() => {
                  // re-fetch all data
                  setNamespaceDetailsMap({});
                  // trigger fetchData in useEffect
                  setNamespaces([]);
                }}
              />
            )}
          </div>
          <LLMTerminal openSchemaModal={openSchemaModal} />
          <SchemaModal
            key={showModal ? schemaName : 'closed'}
            showModal={showModal}
            setShowModal={setShowModal}
            resetForm={resetForm}
            editingSchemaId={null}
            schemaName={schemaName}
            setSchemaName={setSchemaName}
            fields={fields}
            setFields={setFields}
            collapsedNodes={collapsedNodes}
            setCollapsedNodes={setCollapsedNodes}
            rawFields={rawFields}
            setRawFields={setRawFields}
            handleConvertRawFields={() => {}}
            rawFieldsError={rawFieldsError}
            jsonSchema={jsonSchema}
            setJsonSchema={setJsonSchema}
            handleJsonChange={handleJsonChange}
            jsonError={jsonError}
            onSave={handleSchemaModalSave}
            isSaving={false}
            NestedFieldsEditor={NestedFieldsEditor}
          />
          <MethodPreviewModal
            isOpen={!!previewMethod}
            onClose={() => setPreviewMethod(null)}
            method={previewMethod}
            onEdit={method => {
              setMethodModal({ isOpen: true, method });
              setPreviewMethod(null);
            }}
            onTest={method => {
              setTestMethodModal({ isOpen: true, method });
              setPreviewMethod(null);
            }}
          />
          {previewAccount && (
            <div 
              className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setPreviewAccount(null)}
            >
              <div className="bg-white rounded-xl p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="text-blue-600" size={16} />
                    </div>
                    <h3 className="text-base sm:text-xl font-semibold truncate">{previewAccount["namespace-account-name"]}</h3>
                  </div>
                  <button
                    onClick={() => setPreviewAccount(null)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">ID</p>
                    <p className="text-xs sm:text-sm font-mono break-all">{previewAccount["namespace-account-id"]}</p>
                  </div>
                  {previewAccount["namespace-account-url-override"] && (
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">URL Override</p>
                      <p className="text-xs sm:text-sm font-mono break-all">{previewAccount["namespace-account-url-override"]}</p>
                    </div>
                  )}
                </div>
                {/* Add more account details as needed */}
              </div>
            </div>
          )}
        </div>
      </div>

      <AccountModal
        isOpen={accountModal.isOpen}
        onClose={() => setAccountModal({ isOpen: false, account: null })}
        account={accountModal.account}
        namespaceId={namespaces[0]?.["namespace-id"] || ''}
        refreshNamespaceDetails={() => fetchNamespaceDetails(namespaces[0]?.["namespace-id"])}
      />

      <MethodModal
        isOpen={methodModal.isOpen}
        onClose={() => setMethodModal({ isOpen: false, method: null })}
        method={methodModal.method}
        namespaceId={namespaces[0]?.["namespace-id"]}
        refreshNamespaceDetails={() => fetchNamespaceDetails(namespaces[0]?.["namespace-id"])}
      />

      <NamespaceModal
        isOpen={namespaceModal.isOpen}
        onClose={() => setNamespaceModal({ isOpen: false, namespace: null })}
        onSave={handleSaveNamespace}
        namespace={namespaceModal.namespace}
      />

      <AccountPreviewModal
        isOpen={!!previewAccount}
        onClose={() => setPreviewAccount(null)}
        account={previewAccount}
        onEdit={account => {
          setAccountModal({ isOpen: true, account });
          setPreviewAccount(null);
        }}
        onDelete={async (account) => {
          if (confirm('Are you sure you want to delete this account?')) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/accounts/${account["namespace-account-id"]}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Failed to delete account');
              await fetchNamespaceDetails(namespaces[0]?.["namespace-id"]);
              setPreviewAccount(null);
            } catch (error) {
              console.error('Error deleting account:', error);
              alert('Failed to delete account');
            }
          }
        }}
      />

      <MethodTestModal
        isOpen={testMethodModal.isOpen}
        onClose={() => setTestMethodModal({ isOpen: false, method: null })}
        namespaceId={testMethodModal.method?.['namespace-id'] || ''}
        methodName={testMethodModal.method?.['namespace-method-name'] || ''}
        methodType={testMethodModal.method?.['namespace-method-type'] || ''}
        namespaceMethodUrlOverride={testMethodModal.method?.['namespace-method-url-override'] || ''}
        saveData={!!testMethodModal.method?.['save-data']}
        methodId={testMethodModal.method?.['namespace-method-id'] || ''}
      />

      <UnifiedSchemaModal
        showModal={showSchemaModal}
        setShowModal={setShowSchemaModal}
        onSuccess={() => setShowSchemaModal(false)}
      />

      <SchemaPreviewModal
        open={!!previewSchema}
        onClose={() => setPreviewSchema(null)}
        schema={previewSchema}
        onEdit={schema => {
          setShowSchemaModal(true);
          setPreviewSchema(null);
        }}
        onDelete={async (schema) => {
          if (confirm('Are you sure you want to delete this schema?')) {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/schema/${schema.id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Failed to delete schema');
              setSchemas(schemas => schemas.filter(s => s.id !== schema.id));
              setPreviewSchema(null);
            } catch (error) {
              console.error('Error deleting schema:', error);
              alert('Failed to delete schema');
            }
          }
        }}
      />
    </div>
  );
}