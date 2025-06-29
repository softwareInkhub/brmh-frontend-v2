'use client';
import React, { useState, useEffect } from 'react';
import SidePanel from './components/SidePanel';
import UnifiedNamespace, { UnifiedNamespaceModalTrigger } from './components/UnifiedNamespace';
import Namespace from './components/Namespace';
import SchemaService from './components/SchemaService';
import Tables from './components/Tables';
import LLMTerminal from './components/LLMTerminal';
import EnhancedLLMTerminal from './components/EnhancedLLMTerminal';
import SchemaModal from './Modals/SchemaModal';
import { NestedFieldsEditor, schemaToFields } from './components/SchemaService';
import { User, X, Plus, MoreHorizontal, Menu, Zap, Box, FileText, GitBranch, Database, Sparkles } from 'lucide-react';
import AccountModal from './Modals/AccountModal';
import MethodModal from './components/MethodModal';
import NamespaceModal from './Modals/NamespaceModal';
import AccountPreviewModal from './Modals/AccountPreviewModal';
import MethodPreviewModal from './Modals/MethodPreviewModal';
import MethodTestModal from '../components/MethodTestModal';
import UnifiedSchemaModal from './Modals/UnifiedSchemaModal';
import SchemaPreviewModal from './Modals/SchemaPreviewModal';
import { useSidePanel } from "../components/SidePanelContext";
import SchemaCreatePage from './pages/SchemaCreatePage';
import AllAccountPage from './pages/AllAccountPage';
import AllMethodPage from './pages/AllMethodPage';
import AccountPage from './pages/AccountPage';
import MethodPage from './pages/MethodPage';
import AllSchemaPage from './pages/AllSchemaPage';
import SingleNamespacePage from './pages/SingleNamespacePage';
import MethodTestPage from './pages/MethodTestPage';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const SIDEBAR_WIDTH = 80; // px, w-20
const SIDEPANEL_WIDTH = 256; // px, w-64

const initialTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'new', label: 'New Tab', italic: true, bold: true },
];

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

function NamespacePage(props: React.PropsWithChildren<{}>) {
  const { isCollapsed } = useSidePanel();
  const [activeTab, setActiveTab] = useState('overview');
  const [tabs, setTabs] = useState(initialTabs);

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

  // Add state for all accounts/methods tabs
  const [allAccountsTabs, setAllAccountsTabs] = useState<{ key: string; namespace?: any }[]>([]);
  const [allMethodsTabs, setAllMethodsTabs] = useState<{ key: string; namespace?: any }[]>([]);

  // Add state for account/method tabs
  const [accountPageTabs, setAccountPageTabs] = useState<{ key: string; account: any; namespace: any }[]>([]);
  const [methodPageTabs, setMethodPageTabs] = useState<{ key: string; method: any; namespace: any }[]>([]);

  // Add state for LLMTerminal
  const [llmTerminalOpen, setLlmTerminalOpen] = useState(false);
  const [llmTerminalPlacement, setLlmTerminalPlacement] = useState<'right'>('right');
  const [llmTerminalWidth, setLlmTerminalWidth] = useState(500);

  // Add state for schema page tabs
  const [schemaPageTabs, setSchemaPageTabs] = useState<{ key: string; schema?: any; mode: 'create' | 'preview'; initialSchemaName?: string; namespace?: any; methodId?: string }[]>([]);

  // Add state for all schemas tabs
  const [allSchemasTabs, setAllSchemasTabs] = useState<{ key: string; namespace?: any }[]>([]);

  // Add state for single namespace tabs
  const [singleNamespaceTabs, setSingleNamespaceTabs] = useState<{ key: string; namespace: any }[]>([]);

  // Add state for method test tabs
  const [methodTestTabs, setMethodTestTabs] = useState<{ key: string; method: any; namespace: any }[]>([]);

  // Derive accounts and methods from namespaceDetailsMap for SidePanel
  const accounts = Object.fromEntries(
    Object.entries(namespaceDetailsMap).map(([nsId, v]) => [nsId, v.accounts])
  );
  const methods = Object.fromEntries(
    Object.entries(namespaceDetailsMap).map(([nsId, v]) => [nsId, v.methods])
  );

  // Fetch namespaces and schemas for SidePanel
  useEffect(() => {
    console.log('Fetching namespaces and schemas...');
    
    // Fetch namespaces
    fetch(`http://localhost:5001/unified/namespaces`)
      .then(res => {
        console.log('Namespaces response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Namespaces data received:', data);
        setNamespaces(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Error fetching namespaces:', error);
        setNamespaces([]);
      });

    // Fetch schemas
    fetch(`http://localhost:5001/unified/schema`)
      .then(res => {
        console.log('Schemas response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Schemas data received:', data);
        setSchemas(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Error fetching schemas:', error);
        setSchemas([]);
      });
  }, []);

  // Fetch accounts and methods for a namespace
  const fetchNamespaceDetails = async (namespaceId: string) => {
    try {
      const [accountsRes, methodsRes] = await Promise.all([
        fetch(`http://localhost:5001/unified/namespaces/${namespaceId}/accounts`),
        fetch(`http://localhost:5001/unified/namespaces/${namespaceId}/methods`)
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
      // Open a tab for the method, do not open a modal
      const key = `methodPage-${data['namespace-method-id']}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: `Method: ${data['namespace-method-name']}` }]);
      }
      setActiveTab(key);
      setMethodPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, method: data, namespace: namespaces.find(ns => ns['namespace-id'] === data['namespace-id']) }];
      });
      return;
    } else if (type === 'schema') {
      const key = `schema-preview-${data.id}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: data.schemaName || 'Schema Preview' }]);
      }
      setActiveTab(key);
      setSchemaPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, schema: data.schema, mode: 'preview', initialSchemaName: data.schemaName, namespace: data.namespace }];
      });
      setSelectedSchemaId(data.id);
      return;
    }
  };
  const handleSidePanelAdd = (type: string, parentData?: any) => {
    if (type === 'namespace') {
      setNamespaceModal({ isOpen: true, namespace: null });
    } else if (type === 'account') {
      setAccountModal({ isOpen: true, account: null });
    } else if (type === 'method') {
      setMethodModal({ isOpen: true, method: null });
    } else if (type === 'schema') {
      const ns = parentData || namespaces[0];
      const nsId = ns?.['namespace-id'] || '';
      const nsName = ns?.['namespace-name'] || '';
      const key = `schema-create-${nsId}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: nsName ? `New Schema: ${nsName}` : 'New Schema' }]);
      }
      setActiveTab(key);
      setSchemaPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, mode: 'create', namespace: ns }];
      });
      return;
    } else if (type === 'allAccounts') {
      const key = parentData ? `allAccounts-${parentData['namespace-id']}` : 'allAccounts';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData ? `Accounts: ${parentData['namespace-name']}` : 'All Accounts' }]);
      }
      setActiveTab(key);
      setAllAccountsTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
    } else if (type === 'allMethods') {
      const key = parentData ? `allMethods-${parentData['namespace-id']}` : 'allMethods';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData ? `Methods: ${parentData['namespace-name']}` : 'All Methods' }]);
      }
      setActiveTab(key);
      setAllMethodsTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
    } else if (type === 'accountPage' && parentData?.account) {
      const key = `accountPage-${parentData.account['namespace-account-id']}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: `Account: ${parentData.account['namespace-account-name']}` }]);
      }
      setActiveTab(key);
      setAccountPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, account: parentData.account, namespace: parentData.namespace }];
      });
      return;
    } else if (type === 'methodPage' && parentData?.method) {
      const key = `methodPage-${parentData.method['namespace-method-id']}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: `Method: ${parentData.method['namespace-method-name']}` }]);
      }
      setActiveTab(key);
      setMethodPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, method: parentData.method, namespace: parentData.namespace }];
      });
      return;
    } else if (type === 'allSchemas') {
      const key = parentData ? `allSchemas-${parentData['namespace-id']}` : 'allSchemas';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData ? `Schemas: ${parentData['namespace-name']}` : 'All Schemas' }]);
      }
      setActiveTab(key);
      setAllSchemasTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
    } else if (type === 'singleNamespace') {
      const key = `singleNamespace-${parentData['namespace-id']}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData['namespace-name'] }]);
      }
      setActiveTab(key);
      setSingleNamespaceTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
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
        ? `http://localhost:5001/unified/namespaces/${namespace["namespace-id"]}`
        : `http://localhost:5001/unified/namespaces`;
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
      const response = await fetch(`http://localhost:5001/unified/namespaces/${namespace["namespace-id"]}`, {
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

  const handleAddTab = () => {
    const newKey = `tab-${tabs.length + 1}`;
    setTabs([...tabs, { key: newKey, label: 'New Tab', italic: true, bold: true }]);
    setActiveTab(newKey);
  };

  const handleCloseTab = (key: string) => {
    const filteredTabs = tabs.filter(tab => tab.key !== key);
    setTabs(filteredTabs);
    if (activeTab === key) {
      setActiveTab('overview');
    }
    // Remove closed tab's state from all tab arrays
    setAllAccountsTabs(prev => prev.filter(t => t.key !== key));
    setAllMethodsTabs(prev => prev.filter(t => t.key !== key));
    setAccountPageTabs(prev => prev.filter(t => t.key !== key));
    setMethodPageTabs(prev => prev.filter(t => t.key !== key));
    setSchemaPageTabs(prev => prev.filter(t => t.key !== key));
  };

  // --- NewTabContent moved inside component to access handleOpenTab ---
  function handleOpenTab(type: string) {
    if (type === 'schema') {
      // Open a tab for schema creation
      const key = 'schema';
      const existingTab = tabs.find(tab => tab.key === key);
      if (existingTab) {
        setActiveTab(key);
        return;
      }
      // If on a placeholder tab, replace it
      if (activeTab === 'new' || activeTab.startsWith('tab-')) {
        setTabs(prevTabs => prevTabs.map(tab =>
          tab.key === activeTab
            ? { key, label: 'New Schema' }
            : tab
        ));
        setActiveTab(key);
        return;
      }
      setTabs([...tabs, { key, label: 'New Schema' }]);
      setActiveTab(key);
      return;
    }
    const key = type;
    // If current tab is a 'New Tab' (key === 'new' or starts with 'tab-'), replace it or activate existing
    if (activeTab === 'new' || activeTab.startsWith('tab-')) {
      const existingTab = tabs.find(tab => tab.key === key);
      if (existingTab) {
        // Remove the placeholder tab and activate the existing one
        setTabs(prevTabs => prevTabs.filter(tab => tab.key !== activeTab));
        setActiveTab(key);
        return;
      }
      // Otherwise, replace the placeholder tab
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.key === activeTab
          ? { key, label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}` }
          : tab
      ));
      setActiveTab(key);
      return;
    }
    // Otherwise, open a new tab if it doesn't exist
    const existingTab = tabs.find(tab => tab.key === key);
    if (existingTab) {
      setActiveTab(key);
      return;
    }
    setTabs([...tabs, { key, label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}` }]);
    setActiveTab(key);
  }

  function NewTabContent({ onOpenTab }: { onOpenTab: (type: string) => void }) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="flex gap-6 mb-8 flex-wrap justify-center">
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-8 w-56 hover:shadow-lg transition cursor-pointer" onClick={() => onOpenTab('namespace')}>
            <Database size={40} className="text-blue-400 mb-4" />
            <div className="font-semibold text-gray-800">New Namespace</div>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-8 w-56 hover:shadow-lg transition cursor-pointer" onClick={() => onOpenTab('endpoint')}>
            <GitBranch size={40} className="text-pink-400 mb-4" />
            <div className="font-semibold text-gray-800">New Endpoint</div>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-8 w-56 hover:shadow-lg transition cursor-pointer" onClick={() => onOpenTab('schema')}>
            <Box size={40} className="text-purple-400 mb-4" />
            <div className="font-semibold text-gray-800">New Schema</div>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-8 w-56 hover:shadow-lg transition cursor-pointer" onClick={() => onOpenTab('markdown')}>
            <FileText size={40} className="text-blue-400 mb-4" />
            <div className="font-semibold text-gray-800">New Markdown</div>
          </div>
          <div className="flex flex-col items-center bg-white rounded-xl shadow p-8 w-56 hover:shadow-lg transition cursor-pointer" onClick={() => onOpenTab('request')}>
            <Zap size={40} className="text-blue-300 mb-4" />
            <div className="font-semibold text-gray-800">New Request</div>
          </div>
        </div>
        <div className="mb-4">
          <button className="text-gray-600 text-sm font-medium px-4 py-2 rounded hover:bg-gray-100 transition flex items-center gap-1">
            More <span className="text-lg">&#9660;</span>
          </button>
        </div>
        <div className="bg-purple-100 text-purple-700 px-6 py-3 rounded-full shadow text-sm font-medium flex items-center gap-2">
          Support importing Swagger, Postman, cURL and more.
          <button className="ml-2 text-purple-700 font-bold">×</button>
        </div>
      </div>
    );
  }

  // Add this handler function:
  const handleOpenSchemaTabFromTest = (schema: any, schemaName: any, namespace: any, methodId?: string) => {
    const key = `schema-create-from-test-${schemaName}`;
    if (!tabs.find(tab => tab.key === key)) {
      setTabs([...tabs, { key, label: `Create Schema: ${schemaName}` }]);
    }
    setActiveTab(key);
    setSchemaPageTabs(prev => {
      if (prev.find(t => t.key === key)) return prev;
      return [...prev, { key, schema, mode: 'create', initialSchemaName: schemaName, namespace, methodId }];
    });
  };

  return (
    <div className="relative h-full w-full">
      {/* Floating AI Assistant Button */}
      <button
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all text-base font-semibold"
        onClick={() => setLlmTerminalOpen(true)}
        style={{ boxShadow: '0 4px 24px rgba(80,0,200,0.15)' }}
      >
        <Sparkles className="w-6 h-6" />
        AI Assistant
      </button>
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-col h-full w-full">
          <div className="bg-[#f7f8fa] min-h-screen">
            <div className="flex h-screen">
              {/* SidePanel (always visible) */}
              <div
                style={{
                  width: isCollapsed ? 0 : 256,
                  minWidth: isCollapsed ? 0 : 256,
                  maxWidth: isCollapsed ? 0 : 256,
                  background: '#fff',
                  borderRight: isCollapsed ? 'none' : '1px solid #f0f0f0',
                  height: '100vh',
                  zIndex: 20,
                  overflow: isCollapsed ? 'hidden' : 'auto',
                  transition: 'width 0.2s, min-width 0.2s, max-width 0.2s',
                }}
              >
                {!isCollapsed && (
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
                          const response = await fetch(`http://localhost:5001/unified/schema/${schema.id}`, {
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
                )}
              </div>
              {/* Main Content */}
              <div 
                className="flex-1 min-h-0 overflow-y-auto transition-all duration-200"
                style={llmTerminalOpen ? { marginRight: llmTerminalWidth } : {}}
              >
                {/* Header with Dashboard title */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4 bg-[#f7f8fa]">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                  </div>
                  {/* Removed Open AI Assistant button, now floating globally */}
                </div>
                
                {/* Tab Section (always flush left) */}
                <div className="flex items-center border-b bg-white px-4 py-2">
                  <div className="flex items-center gap-1">
                    {tabs.map(tab => (
                      <div key={tab.key} className="flex items-center group">
                        <button
                          className={`px-4 py-2 text-sm rounded-t-lg transition
                            ${activeTab === tab.key ? 'font-medium text-gray-700 border-b-2 border-blue-600 bg-white' : 'text-gray-700 hover:bg-gray-100'}
                            ${tab.bold ? 'font-bold' : ''}
                            ${tab.italic ? 'italic' : ''}
                          `}
                          onClick={() => {
                            setActiveTab(tab.key);
                          }}
                        >
                          {tab.label}
                        </button>
                        {tab.key !== 'overview' && (
                          <button
                            className="ml-1 text-gray-400 hover:text-red-500 text-xs px-1 focus:outline-none"
                            onClick={() => handleCloseTab(tab.key)}
                            title="Close tab"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="px-2 py-2 text-gray-500 hover:bg-gray-100 rounded-full"
                      onClick={handleAddTab}
                    >
                      <Plus size={16} />
                    </button>
                    <button className="px-2 py-2 text-gray-500 hover:bg-gray-100 rounded-full">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg">
                      Testing Env <span className="ml-1">&#9660;</span>
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                      <Menu size={18} />
                    </button>
                  </div>
                </div>
                {/* Main Tab Content with conditional left padding */}
                <div className={`${isCollapsed ? 'pl-0' : 'pl-8'} pr-8 w-full pt-4 transition-all duration-200`}>
                  {activeTab === 'overview' && (
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
                  {activeTab === 'schema' && <SchemaCreatePage onSchemaNameChange={name => {
                    setTabs(tabs => tabs.map(tab =>
                      tab.key === 'schema'
                        ? { ...tab, label: name.trim() ? name : 'New Schema' }
                        : tab
                    ));
                  }} />}
                  {(activeTab === 'new' || activeTab.startsWith('tab-')) && (
                    <NewTabContent onOpenTab={handleOpenTab} />
                  )}
                  {allAccountsTabs.map(({ key, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <AllAccountPage
                        namespace={namespace}
                        onViewAccount={(account, ns) => {
                          const tabKey = `accountPage-${account['namespace-account-id']}`;
                          if (!tabs.find(tab => tab.key === tabKey)) {
                            setTabs([...tabs, { key: tabKey, label: `Account: ${account['namespace-account-name']}` }]);
                          }
                          setActiveTab(tabKey);
                          setAccountPageTabs(prev => {
                            if (prev.find(t => t.key === tabKey)) return prev;
                            return [...prev, { key: tabKey, account, namespace: ns }];
                          });
                        }}
                      />
                    </div>
                  ))}
                  {allMethodsTabs.map(({ key, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <AllMethodPage
                        namespace={namespace}
                        onViewMethod={(method, ns) => {
                          const tabKey = `methodPage-${method['namespace-method-id']}`;
                          if (!tabs.find(tab => tab.key === tabKey)) {
                            setTabs([...tabs, { key: tabKey, label: `Method: ${method['namespace-method-name']}` }]);
                          }
                          setActiveTab(tabKey);
                          setMethodPageTabs(prev => {
                            if (prev.find(t => t.key === tabKey)) return prev;
                            return [...prev, { key: tabKey, method, namespace: ns }];
                          });
                        }}
                      />
                    </div>
                  ))}
                  {accountPageTabs.map(({ key, account, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <AccountPage account={account} namespace={namespace} />
                    </div>
                  ))}
                  {methodPageTabs.map(({ key, method, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <MethodPage
                        method={method}
                        namespace={namespace}
                        onTest={(m, ns) => {
                          const testKey = `methodTest-${m['namespace-method-id']}`;
                          if (!tabs.find(tab => tab.key === testKey)) {
                            setTabs([...tabs, { key: testKey, label: `Test: ${m['namespace-method-name']}` }]);
                          }
                          setActiveTab(testKey);
                          setMethodTestTabs(prev => {
                            if (prev.find(t => t.key === testKey)) return prev;
                            return [...prev, { key: testKey, method: m, namespace: ns }];
                          });
                        }}
                      />
                    </div>
                  ))}
                  {methodTestTabs.map(({ key, method, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <MethodTestPage
                        method={method}
                        namespace={namespace}
                        onOpenSchemaTab={(schema, schemaName) => handleOpenSchemaTabFromTest(schema, schemaName, namespace, method['namespace-method-id'])}
                      />
                    </div>
                  ))}
                  {schemaPageTabs.map(({ key, schema, mode, initialSchemaName, namespace, methodId }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <SchemaCreatePage
                        initialSchema={schema}
                        initialSchemaName={initialSchemaName}
                        namespace={namespace}
                        mode={mode === 'create' ? 'create' : 'edit'}
                        methodId={methodId}
                        onSuccess={() => {
                          if (mode === 'create' && namespace?.['namespace-id']) {
                            fetchNamespaceDetails(namespace['namespace-id']);
                          }
                        }}
                      />
                    </div>
                  ))}
                  {allSchemasTabs.map(({ key, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <AllSchemaPage
                        namespace={namespace}
                        onViewSchema={(schema, ns) => {
                          const tabKey = `schema-preview-${schema.id}`;
                          if (!tabs.find(tab => tab.key === tabKey)) {
                            setTabs([...tabs, { key: tabKey, label: schema.schemaName || 'Schema Preview' }]);
                          }
                          setActiveTab(tabKey);
                          setSchemaPageTabs(prev => {
                            if (prev.find(t => t.key === tabKey)) return prev;
                            return [...prev, { key: tabKey, schema: schema.schema, mode: 'preview', initialSchemaName: schema.schemaName, namespace: ns }];
                          });
                        }}
                      />
                    </div>
                  ))}
                  {singleNamespaceTabs.map(({ key, namespace }) => (
                    <div
                      key={key}
                      style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                    >
                      <SingleNamespacePage namespaceId={namespace['namespace-id']} initialNamespace={namespace} />
                    </div>
                  ))}
                  {activeTab !== 'overview' &&
                    activeTab !== 'namespace' &&
                    activeTab !== 'schemaService' &&
                    activeTab !== 'tables' &&
                    activeTab !== 'unifiedNamespace' &&
                    activeTab !== 'new' &&
                    !activeTab.startsWith('tab-') && (
                      <div className="text-gray-400 text-center py-20 text-lg">This is the <span className="font-semibold">{tabs.find(t => t.key === activeTab)?.label}</span> tab.</div>
                  )}
                </div>
                <EnhancedLLMTerminal 
                  open={llmTerminalOpen}
                  setOpen={setLlmTerminalOpen}
                  placement={llmTerminalPlacement}
                  setPlacement={setLlmTerminalPlacement}
                  width={llmTerminalWidth}
                  setWidth={setLlmTerminalWidth}
                  openSchemaModal={(name, schema) => {
                    setShowSchemaModal(true);
                    setSchemaName(name);
                    setJsonSchema(JSON.stringify(schema, null, 2));
                  }}
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
                        const response = await fetch(`http://localhost:5001/unified/schema/${schema.id}`, {
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
                  const response = await fetch(`http://localhost:5001/unified/accounts/${account["namespace-account-id"]}`, {
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
                  const response = await fetch(`http://localhost:5001/unified/schema/${schema.id}`, {
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
      </DndProvider>
    </div>
  );
}

export default NamespacePage;