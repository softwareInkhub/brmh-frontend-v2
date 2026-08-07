'use client';
import React, { useState, useEffect } from 'react';
import SidePanel from './components/SidePanel';
import UnifiedNamespace, { UnifiedNamespaceModalTrigger } from './components/UnifiedNamespace';
import Namespace from './components/Namespace';
import SchemaService from './components/SchemaService';
import Tables from './components/Tables';

import dynamic from 'next/dynamic';
import { NestedFieldsEditor, schemaToFields } from './components/SchemaService';
import { User, X, Plus, MoreHorizontal,  Zap, Box, FileText, GitBranch, Database, Sparkles, View, LayoutGrid, LayoutPanelLeft, Pin, PinOff } from 'lucide-react';
import AccountModal from './Modals/AccountModal';
import MethodModal from './components/MethodModal';
import NamespaceModal from './Modals/NamespaceModal';
import AccountPreviewModal from './Modals/AccountPreviewModal';
import MethodPreviewModal from './Modals/MethodPreviewModal';
import MethodTestModal from '../components/MethodTestModal';
import UnifiedSchemaModal from './Modals/UnifiedSchemaModal';
import SchemaPreviewModal from './Modals/SchemaPreviewModal';
import { useSidePanel } from "../components/SidePanelContext";
import { useNamespaceContext } from "../components/NamespaceContext";
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
import AllWebhookPage from './pages/AllWebhookPage';
import WebhookPage from './pages/WebhookPage';
import AllLambdasPage from './pages/AllLambdasPage';
import LambdaPage from './pages/LambdaPage';




const SIDEBAR_WIDTH = 80; // px, w-20
const SIDEPANEL_WIDTH = 256; // px, w-64

const initialTabs = [
  { key: 'overview', label: 'Overview', pinned: false },
  { key: 'new', label: 'New Tab', italic: true, bold: true, pinned: false },
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
  const { setCurrentNamespace } = useNamespaceContext();
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
  const [allAccountsTabs, setAllAccountsTabs] = useState<{ key: string; namespace?: any; openCreate?: boolean }[]>([]);
  const [allMethodsTabs, setAllMethodsTabs] = useState<{ key: string; namespace?: any; openCreate?: boolean }[]>([]);

  // Add state for account/method tabs
  const [accountPageTabs, setAccountPageTabs] = useState<{ key: string; account: any; namespace: any; openEdit?: boolean }[]>([]);
  const [methodPageTabs, setMethodPageTabs] = useState<{ key: string; method: any; namespace: any; openEdit?: boolean }[]>([]);



  // Add state for schema page tabs
  const [schemaPageTabs, setSchemaPageTabs] = useState<{ key: string; schema?: any; mode: 'create' | 'preview' | 'edit'; initialSchemaName?: string; namespace?: any; methodId?: string }[]>([]);

  // Add state for all schemas tabs
  const [allSchemasTabs, setAllSchemasTabs] = useState<{ key: string; namespace?: any }[]>([]);

  // Add state for single namespace tabs
  const [singleNamespaceTabs, setSingleNamespaceTabs] = useState<{ key: string; namespace: any }[]>([]);

  // Add state for method test tabs
  const [methodTestTabs, setMethodTestTabs] = useState<{ key: string; method: any; namespace: any }[]>([]);



  // Add state for AI Agent Workspace


  // Add state for tab layout
  const [tabLayout, setTabLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  // Add state for all webhooks tabs
  const [allWebhooksTabs, setAllWebhooksTabs] = useState<{ key: string; namespace?: any }[]>([]);

  // Add state for webhooks per namespace
  const [webhooksMap, setWebhooksMap] = useState<Record<string, any[]>>({});

  // Add state for webhookPage tabs
  const [webhookPageTabs, setWebhookPageTabs] = useState<{ key: string; webhook: any; namespace: any }[]>([]);
  
  // Add state for lambdas per namespace
  const [lambdasMap, setLambdasMap] = useState<Record<string, any[]>>({});
  
  // Add state for all lambdas tabs
  const [allLambdasTabs, setAllLambdasTabs] = useState<{ key: string; namespace?: any }[]>([]);
  
  // Add state for lambdaPage tabs
  const [lambdaPageTabs, setLambdaPageTabs] = useState<{ key: string; lambda: any; namespace: any }[]>([]);

  // Derive accounts and methods from namespaceDetailsMap for SidePanel
  const accounts = Object.fromEntries(
    Object.entries(namespaceDetailsMap).map(([nsId, v]) => [nsId, v.accounts])
  );
  const methods = Object.fromEntries(
    Object.entries(namespaceDetailsMap).map(([nsId, v]) => [nsId, v.methods])
  );

  // Fetch namespaces and schemas for SidePanel
  useEffect(() => {
    const fetchData = async () => {
      console.log('Fetching namespaces and schemas...');
      
      // Add a small delay to ensure backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
    // Fetch namespaces
        const namespacesRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces`);
        console.log('Namespaces response status:', namespacesRes.status);
        if (!namespacesRes.ok) {
          throw new Error(`HTTP error! status: ${namespacesRes.status}`);
        }
        const namespacesData = await namespacesRes.json();
        console.log('Namespaces data received:', namespacesData);
        // Fix: Handle both formats - direct array or wrapped in body
        const namespacesArray = Array.isArray(namespacesData) ? namespacesData : 
                               (namespacesData && Array.isArray(namespacesData.body) ? namespacesData.body : []);
        setNamespaces(namespacesArray);
      } catch (error) {
        console.error('Error fetching namespaces:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name
          });
        } else {
          console.error('Unknown error type:', error);
        }
        setNamespaces([]);
      }

      try {
    // Fetch schemas
        const schemasRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/schema`);
        console.log('Schemas response status:', schemasRes.status);
        if (!schemasRes.ok) {
          throw new Error(`HTTP error! status: ${schemasRes.status}`);
        }
        const schemasData = await schemasRes.json();
        console.log('Schemas data received:', schemasData);
        // Fix: Handle both formats - direct array or wrapped in body
        const schemasArray = Array.isArray(schemasData) ? schemasData : 
                           (schemasData && Array.isArray(schemasData.body) ? schemasData.body : []);
        setSchemas(schemasArray);
      } catch (error) {
        console.error('Error fetching schemas:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name
          });
        } else {
          console.error('Unknown error type:', error);
        }
        setSchemas([]);
      }
    };

    fetchData();
  }, []);

  // Listen to SingleNamespacePage events to open tabs in-place
  useEffect(() => {
    const onOpenAllAccounts = (e: any) => {
      const ns = namespaces.find(n => n['namespace-id'] === (e?.detail?.namespaceId || ''));
      const key = ns ? `allAccounts-${ns['namespace-id']}` : 'allAccounts';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs(prev => [...prev, { key, label: ns ? `Accounts: ${ns['namespace-name']}` : 'All Accounts', pinned: false }]);
      }
      setActiveTab(key);
      setAllAccountsTabs(prev => {
        const exists = prev.find(t => t.key === key);
        if (exists) {
          return prev.map(t => t.key === key ? { ...t, openCreate: true } : t);
        }
        return [...prev, { key, namespace: ns, openCreate: true }];
      });
    };
    const onOpenAllMethods = (e: any) => {
      const ns = namespaces.find(n => n['namespace-id'] === (e?.detail?.namespaceId || ''));
      const key = ns ? `allMethods-${ns['namespace-id']}` : 'allMethods';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs(prev => [...prev, { key, label: ns ? `Methods: ${ns['namespace-name']}` : 'All Methods', pinned: false }]);
      }
      setActiveTab(key);
      setAllMethodsTabs(prev => {
        const exists = prev.find(t => t.key === key);
        if (exists) {
          return prev.map(t => t.key === key ? { ...t, openCreate: true } : t);
        }
        return [...prev, { key, namespace: ns, openCreate: true }];
      });
    };
    const onOpenCreateSchema = (e: any) => {
      const ns = namespaces.find(n => n['namespace-id'] === (e?.detail?.namespaceId || ''));
      const key = ns ? `schema-create-${ns['namespace-id']}` : 'schema';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs(prev => [...prev, { key, label: ns ? `New Schema: ${ns['namespace-name']}` : 'New Schema', pinned: false }]);
      }
      setActiveTab(key);
      setSchemaPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, mode: 'create', namespace: ns }];
      });
    };
    window.addEventListener('open-all-accounts-tab', onOpenAllAccounts as any);
    window.addEventListener('open-all-methods-tab', onOpenAllMethods as any);
    window.addEventListener('open-create-schema-tab', onOpenCreateSchema as any);
    return () => {
      window.removeEventListener('open-all-accounts-tab', onOpenAllAccounts as any);
      window.removeEventListener('open-all-methods-tab', onOpenAllMethods as any);
      window.removeEventListener('open-create-schema-tab', onOpenCreateSchema as any);
    };
  }, [namespaces, tabs]);

  // Fetch webhooks for a namespace
  const fetchNamespaceWebhooks = async (namespaceId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/webhooks/namespace/${namespaceId}`);
      if (!res.ok) throw new Error('Failed to fetch webhooks');
      const data = await res.json();
      setWebhooksMap(prev => ({ ...prev, [namespaceId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      setWebhooksMap(prev => ({ ...prev, [namespaceId]: [] }));
    }
  };

  // Fetch lambdas for a namespace
  const fetchNamespaceLambdas = async (namespaceId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/workspace/lambdas/${namespaceId}`);
      if (!res.ok) throw new Error('Failed to fetch lambdas');
      const data = await res.json();
      setLambdasMap(prev => ({ ...prev, [namespaceId]: Array.isArray(data.lambdas) ? data.lambdas : [] }));
    } catch (err) {
      setLambdasMap(prev => ({ ...prev, [namespaceId]: [] }));
    }
  };

  // Update fetchNamespaceDetails to also fetch webhooks and lambdas
  const fetchNamespaceDetails = async (namespaceId: string) => {
    try {
      const [accountsRes, methodsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces/${namespaceId}/accounts`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces/${namespaceId}/methods`)
      ]);
      const [accounts, methods] = await Promise.all([
        accountsRes.json(),
        methodsRes.json()
      ]);
      setNamespaceDetailsMap(prev => ({ ...prev, [namespaceId]: { accounts, methods } }));
      // Fetch webhooks and lambdas for this namespace
      fetchNamespaceWebhooks(namespaceId);
      fetchNamespaceLambdas(namespaceId);
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
        setTabs([...tabs, { key, label: `Method: ${data['namespace-method-name']}`, pinned: false }]);
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
        setTabs([...tabs, { key, label: data.schemaName || 'Schema Preview', pinned: false }]);
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
        setTabs([...tabs, { key, label: nsName ? `New Schema: ${nsName}` : 'New Schema', pinned: false }]);
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
        setTabs([...tabs, { key, label: parentData ? `Accounts: ${parentData['namespace-name']}` : 'All Accounts', pinned: false }]);
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
        setTabs([...tabs, { key, label: parentData ? `Methods: ${parentData['namespace-name']}` : 'All Methods', pinned: false }]);
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
        setTabs([...tabs, { key, label: `Account: ${parentData.account['namespace-account-name']}`, pinned: false }]);
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
        setTabs([...tabs, { key, label: `Method: ${parentData.method['namespace-method-name']}`, pinned: false }]);
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
        setTabs([...tabs, { key, label: parentData ? `Schemas: ${parentData['namespace-name']}` : 'All Schemas', pinned: false }]);
      }
      setActiveTab(key);
      setAllSchemasTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
    } else if (type === 'singleNamespace') {
      console.log('Opening single namespace:', parentData);
      const key = `singleNamespace-${parentData['namespace-id']}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData['namespace-name'], pinned: false }]);
      }
      setActiveTab(key);
      setSingleNamespaceTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      // Set current namespace context
      console.log('Setting current namespace context:', parentData);
      setCurrentNamespace(parentData);
      return;
    } else if (type === 'allWebhooks') {
      const key = parentData ? `allWebhooks-${parentData['namespace-id']}` : 'allWebhooks';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData ? `Webhooks: ${parentData['namespace-name']}` : 'All Webhooks', pinned: false }]);
      }
      setActiveTab(key);
      setAllWebhooksTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
    } else if (type === 'webhookPage' && parentData?.webhook) {
      const key = `webhookPage-${parentData.webhook['webhook-id']}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: `Webhook: ${parentData.webhook['webhook-name']}`, pinned: false }]);
      }
      setActiveTab(key);
      setWebhookPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, webhook: parentData.webhook, namespace: parentData.namespace }];
      });
      return;
    } else if (type === 'allLambdas') {
      const key = parentData ? `allLambdas-${parentData['namespace-id']}` : 'allLambdas';
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: parentData ? `Lambdas: ${parentData['namespace-name']}` : 'All Lambdas', pinned: false }]);
      }
      setActiveTab(key);
      setAllLambdasTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, namespace: parentData }];
      });
      return;
    } else if (type === 'lambdaPage' && parentData?.lambda) {
      const key = `lambdaPage-${parentData.lambda.id}`;
      if (!tabs.find(tab => tab.key === key)) {
        setTabs([...tabs, { key, label: `Lambda: ${parentData.lambda.functionName}`, pinned: false }]);
      }
      setActiveTab(key);
      setLambdaPageTabs(prev => {
        if (prev.find(t => t.key === key)) return prev;
        return [...prev, { key, lambda: parentData.lambda, namespace: parentData.namespace }];
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

 

  const handleSaveNamespace = async (namespaceData: any) => {
    try {
      const isEdit = !!namespaceData["namespace-id"];
      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces/${namespaceData["namespace-id"]}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/unified/namespaces`;
      const method = isEdit ? 'PUT' : 'POST';
      
      // Check if it's FormData (has icon) or regular object
      const isFormData = namespaceData instanceof FormData;
      
      const headers: Record<string, string> = {};
      let body: string | FormData;
      
      if (isFormData) {
        // Handle FormData for file upload
        body = namespaceData;
        // Don't set Content-Type header for FormData, let browser set it with boundary
        
        // Log FormData contents
        console.log('=== NAMESPACE CREATE/UPDATE REQUEST ===');
        console.log('URL:', url);
        console.log('Method:', method);
        console.log('Content-Type: multipart/form-data (auto-set by browser)');
        console.log('FormData contents:');
        for (let [key, value] of namespaceData.entries()) {
          if (key === 'icon') {
            console.log(`${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes, ${value.type})` : value);
          } else {
            console.log(`${key}:`, value);
          }
        }
      } else {
        // Handle regular JSON data
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          "namespace-name": namespaceData["namespace-name"],
          "namespace-url": namespaceData["namespace-url"],
          "tags": namespaceData.tags || []
        });
        
        // Log JSON request
        console.log('=== NAMESPACE CREATE/UPDATE REQUEST ===');
        console.log('URL:', url);
        console.log('Method:', method);
        console.log('Headers:', headers);
        console.log('Body:', body);
      }

      console.log('Sending request...');
      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      console.log('=== NAMESPACE CREATE/UPDATE RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error Response Body:', errorText);
        throw new Error(`Failed to save namespace: ${response.status} ${response.statusText}`);
      }

      const savedNamespace = await response.json();
      console.log('Success Response Body:', savedNamespace);
      
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

  const handleAddTab = () => {
    const newKey = `tab-${tabs.length + 1}`;
    setTabs([...tabs, { key: newKey, label: 'New Tab', italic: true, bold: true, pinned: false }]);
    setActiveTab(newKey);
  };

  const handleCloseTab = (key: string) => {
    const tab = tabs.find(t => t.key === key);
    if (tab && tab.pinned) return; // Prevent closing pinned tabs
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
            ? { key, label: 'New Schema', pinned: false }
            : tab
        ));
        setActiveTab(key);
        return;
      }
      setTabs([...tabs, { key, label: 'New Schema', pinned: false }]);
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
          ? { key, label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, pinned: false }
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
    setTabs([...tabs, { key, label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, pinned: false }]);
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
          <div 
            className="flex flex-col items-center bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow p-8 w-56 hover:shadow-lg transition cursor-pointer text-white" 
            onClick={() => {
              const key = 'ai-agent';
              if (!tabs.find(tab => tab.key === key)) {
                setTabs([...tabs, { key, label: 'AI Agent', pinned: false }]);
              }
              setActiveTab(key);
      
            }}
          >
    

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
      setTabs([...tabs, { key, label: `Create Schema: ${schemaName}`, pinned: false }]);
    }
    setActiveTab(key);
    setSchemaPageTabs(prev => {
      if (prev.find(t => t.key === key)) return prev;
      return [...prev, { key, schema, mode: 'create', initialSchemaName: schemaName, namespace, methodId }];
    });
  };



  return (
    <div className="relative h-full w-full">

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
              webhooks={webhooksMap}
              lambdas={lambdasMap}
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
          )}
        </div>
        {/* Main Content */}
        <div 
          className="flex-1 min-h-0  overflow-y-auto transition-all duration-200"
        >
               
                
                {/* Tab Layout: Horizontal or Vertical */}
                {tabLayout === 'horizontal' ? (
                  <>
                    <div className="border-b bg-white px-4 py-2 overflow-x-auto whitespace-nowrap relative scrollbar-thin-x">
                      <div className="flex items-center gap-1" style={{ minWidth: 'fit-content', width: 'fit-content', display: 'inline-flex' }}>
                        {/* Sticky container for view button and Overview tab */}
                        <div className="sticky left-0 z-10 bg-white flex items-center pr-2" style={{ boxShadow: '2px 0 4px -2px rgba(0,0,0,0.04)' }}>
                          <button
                            className="px-2 py-2 rounded-full transition-colors text-gray-500 hover:bg-gray-100"
                            title={`Switch to ${tabLayout === 'horizontal' ? 'Vertical' : 'Horizontal'} Tabs View`}
                            onClick={() => setTabLayout(tabLayout === 'horizontal' ? 'vertical' : 'horizontal')}
                          >
                            {tabLayout === 'horizontal' ? <LayoutPanelLeft size={18} /> : <LayoutGrid size={18} />}
                          </button>
                          {tabs.filter(tab => tab.key === 'overview').map(tab => (
                <div key={tab.key} className="flex items-center group">
                  <button
                    className={`px-4 py-2 text-sm rounded-t-lg transition
                      ${activeTab === tab.key ? 'font-medium text-gray-700 border-b-2 border-blue-600 bg-white' : 'text-gray-700 hover:bg-gray-100'}
                      ${tab.bold ? 'font-bold' : ''}
                      ${tab.italic ? 'italic' : ''}
                    `}
                                onClick={() => {
                                  setActiveTab(tab.key);
                                  // Clear namespace context if switching to overview or non-namespace tabs
                                  if (tab.key === 'overview' || tab.key === 'namespace' || tab.key === 'schemaService' || tab.key === 'tables' || tab.key === 'unifiedNamespace') {
                                    setCurrentNamespace(null);
                                  }
                                }}
                  >
                                {tab.label}
                  </button>
                            </div>
                          ))}
                          {/* Pinned tabs (sticky) */}
                          {tabs.filter(tab => tab.pinned && tab.key !== 'overview').map(tab => (
                            <div key={tab.key} className="flex items-center group">
                              <button
                                className={`px-4 py-2 text-sm rounded-t-lg transition
                                  ${activeTab === tab.key ? 'font-medium text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-gray-700 hover:bg-gray-100'}
                                  ${tab.bold ? 'font-bold' : ''}
                                  ${tab.italic ? 'italic' : ''}
                                `}
                                onClick={() => {
                                  setActiveTab(tab.key);
                                  // Clear namespace context if switching to overview or non-namespace tabs
                                  if (tab.key === 'overview' || tab.key === 'namespace' || tab.key === 'schemaService' || tab.key === 'tables' || tab.key === 'unifiedNamespace') {
                                    setCurrentNamespace(null);
                                  }
                                }}
                              >
                                {tab.label}
                              </button>
                              <button
                                className="ml-1 text-yellow-500 hover:text-yellow-700 text-xs px-1 focus:outline-none"
                                onClick={() => setTabs(tabs => tabs.map(t => t.key === tab.key ? { ...t, pinned: false } : t))}
                                title="Unpin tab"
                              >
                                <Pin size={16} fill="currentColor" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {/* Scrollable tabs except Overview and pinned */}
                        {tabs.filter(tab => !tab.pinned && tab.key !== 'overview').map(tab => (
                          <div key={tab.key} className="flex items-center group">
                            <button
                              className={`px-4 py-2 text-sm rounded-t-lg transition
                                ${activeTab === tab.key ? 'font-medium text-gray-700 border-b-2 border-blue-600 bg-white' : 'text-gray-700 hover:bg-gray-100'}
                                ${tab.bold ? 'font-bold' : ''}
                                ${tab.italic ? 'italic' : ''}
                              `}
                              onClick={() => {
                                setActiveTab(tab.key);
                                // Clear namespace context if switching to overview or non-namespace tabs
                                if (tab.key === 'overview' || tab.key === 'namespace' || tab.key === 'schemaService' || tab.key === 'tables' || tab.key === 'unifiedNamespace') {
                                  setCurrentNamespace(null);
                                }
                              }}
                            >
                              {tab.label}
                            </button>
                            <button
                              className="ml-1 text-gray-400 hover:text-yellow-500 text-xs px-1 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                              onClick={() => setTabs(tabs => tabs.map(t => t.key === tab.key ? { ...t, pinned: true } : t))}
                              title="Pin tab"
                            >
                              <PinOff size={16} />
                            </button>
                    <button
                      className="ml-1 text-gray-400 hover:text-red-500 text-xs px-1 focus:outline-none"
                      onClick={() => handleCloseTab(tab.key)}
                      title="Close tab"
                              disabled={tab.pinned}
                              style={tab.pinned ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                    >
                      ×
                    </button>
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
                          onViewAccount={(account, ns) => {
                            const tabKey = `accountPage-${account['namespace-account-id']}`;
                            if (!tabs.find(tab => tab.key === tabKey)) {
                              setTabs([...tabs, { key: tabKey, label: `Account: ${account['namespace-account-name']}`, pinned: false }]);
                            }
                            setActiveTab(tabKey);
                            setAccountPageTabs(prev => {
                              if (prev.find(t => t.key === tabKey)) return prev;
                              return [...prev, { key: tabKey, account, namespace: ns, openEdit: !!(account as any).__openEdit }];
                            });
                          }}
                          onViewMethod={(method, ns) => {
                            const tabKey = `methodPage-${method['namespace-method-id']}`;
                            if (!tabs.find(tab => tab.key === tabKey)) {
                              setTabs([...tabs, { key: tabKey, label: `Method: ${method['namespace-method-name']}`, pinned: false }]);
                            }
                            setActiveTab(tabKey);
                            setMethodPageTabs(prev => {
                              if (prev.find(t => t.key === tabKey)) return prev;
                              return [...prev, { key: tabKey, method, namespace: ns, openEdit: !!(method as any).__openEdit }];
                            });
                          }}
                          onViewSchema={(schema, ns) => {
                            const tabKey = `schemaPage-${schema.id}`;
                            if (!tabs.find(tab => tab.key === tabKey)) {
                              setTabs([...tabs, { key: tabKey, label: `Schema: ${schema.schemaName}`, pinned: false }]);
                            }
                            setActiveTab(tabKey);
                            setSchemaPageTabs(prev => {
                              if (prev.find(t => t.key === tabKey)) return prev;
                              return [...prev, { key: tabKey, schema, mode: 'edit', initialSchemaName: schema.schemaName, namespace: ns }];
                            });
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
                          onViewAccount={(account, ns) => {
                            const tabKey = `accountPage-${account['namespace-account-id']}`;
                            if (!tabs.find(tab => tab.key === tabKey)) {
                              setTabs([...tabs, { key: tabKey, label: `Account: ${account['namespace-account-name']}`, pinned: false }]);
                            }
                            setActiveTab(tabKey);
                            setAccountPageTabs(prev => {
                              if (prev.find(t => t.key === tabKey)) return prev;
                              return [...prev, { key: tabKey, account, namespace: ns, openEdit: !!(account as any).__openEdit }];
                            });
                          }}
                          onViewMethod={(method, ns) => {
                            const tabKey = `methodPage-${method['namespace-method-id']}`;
                            if (!tabs.find(tab => tab.key === tabKey)) {
                              setTabs([...tabs, { key: tabKey, label: `Method: ${method['namespace-method-name']}`, pinned: false }]);
                            }
                            setActiveTab(tabKey);
                            setMethodPageTabs(prev => {
                              if (prev.find(t => t.key === tabKey)) return prev;
                              return [...prev, { key: tabKey, method, namespace: ns, openEdit: !!(method as any).__openEdit }];
                            });
                          }}
                          onViewSchema={(schema, ns) => {
                            const tabKey = `schemaPage-${schema.id}`;
                            if (!tabs.find(tab => tab.key === tabKey)) {
                              setTabs([...tabs, { key: tabKey, label: `Schema: ${schema.schemaName}`, pinned: false }]);
                            }
                            setActiveTab(tabKey);
                            setSchemaPageTabs(prev => {
                              if (prev.find(t => t.key === tabKey)) return prev;
                              return [...prev, { key: tabKey, schema, mode: 'edit', initialSchemaName: schema.schemaName, namespace: ns }];
                            });
                          }}
                        />
                      )}
                      {activeTab === 'schema' && <SchemaCreatePage onSchemaNameChange={name => {
                        setTabs(tabs => tabs.map(tab =>
                          tab.key === 'schema'
                            ? { ...tab, label: name.trim() ? name : 'New Schema', pinned: false }
                            : tab
                        ));
                      }} />}
                      {(activeTab === 'new' || activeTab.startsWith('tab-')) && (
                        <NewTabContent onOpenTab={handleOpenTab} />
                      )}
                      {allAccountsTabs.map(({ key, namespace, openCreate }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <AllAccountPage
                            namespace={namespace}
                            openCreate={!!openCreate}
                            onViewAccount={(account, ns) => {
                              const tabKey = `accountPage-${account['namespace-account-id']}`;
                              if (!tabs.find(tab => tab.key === tabKey)) {
                                setTabs([...tabs, { key: tabKey, label: `Account: ${account['namespace-account-name']}`, pinned: false }]);
                              }
                              setActiveTab(tabKey);
                              setAccountPageTabs(prev => {
                                if (prev.find(t => t.key === tabKey)) return prev;
                                return [...prev, { key: tabKey, account, namespace: ns, openEdit: !!(account as any).__openEdit }];
                              });
                            }}
                          />
                        </div>
                      ))}
                      {allMethodsTabs.map(({ key, namespace, openCreate }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <AllMethodPage
                            namespace={namespace}
                            openCreate={!!openCreate}
                            onViewMethod={(method, ns) => {
                              const tabKey = `methodPage-${method['namespace-method-id']}`;
                              if (!tabs.find(tab => tab.key === tabKey)) {
                                setTabs([...tabs, { key: tabKey, label: `Method: ${method['namespace-method-name']}`, pinned: false }]);
                              }
                              setActiveTab(tabKey);
                              setMethodPageTabs(prev => {
                                if (prev.find(t => t.key === tabKey)) return prev;
                                return [...prev, { key: tabKey, method, namespace: ns, openEdit: !!(method as any).__openEdit }];
                              });
                            }}
                          />
                        </div>
                      ))}
                      {accountPageTabs.map(({ key, account, namespace, openEdit }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <AccountPage account={account} namespace={namespace} openEdit={openEdit} />
                        </div>
                      ))}
                      {methodPageTabs.map(({ key, method, namespace, openEdit }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <MethodPage
                            method={method}
                            namespace={namespace}
                            openEdit={openEdit}
                            onTest={(m, ns) => {
                              const testKey = `methodTest-${m['namespace-method-id']}`;
                              if (!tabs.find(tab => tab.key === testKey)) {
                                setTabs([...tabs, { key: testKey, label: `Test: ${m['namespace-method-name']}`, pinned: false }]);
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
                                setTabs([...tabs, { key: tabKey, label: schema.schemaName || 'Schema Preview', pinned: false }]);
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
                          <SingleNamespacePage 
                            namespaceId={namespace['namespace-id']} 
                            initialNamespace={namespace}
                            onViewAccount={(account, ns) => {
                              const tabKey = `accountPage-${account['namespace-account-id']}`;
                              if (!tabs.find(tab => tab.key === tabKey)) {
                                setTabs([...tabs, { key: tabKey, label: `Account: ${account['namespace-account-name']}`, pinned: false }]);
                              }
                              setActiveTab(tabKey);
                              setAccountPageTabs(prev => {
                                if (prev.find(t => t.key === tabKey)) return prev;
                                return [...prev, { key: tabKey, account, namespace: ns || namespace }];
                              });
                            }}
                            onViewMethod={(method, ns) => {
                              const tabKey = `methodPage-${method['namespace-method-id']}`;
                              if (!tabs.find(tab => tab.key === tabKey)) {
                                setTabs([...tabs, { key: tabKey, label: `Method: ${method['namespace-method-name']}`, pinned: false }]);
                              }
                              setActiveTab(tabKey);
                              setMethodPageTabs(prev => {
                                if (prev.find(t => t.key === tabKey)) return prev;
                                return [...prev, { key: tabKey, method, namespace: ns || namespace, openEdit: !!(method as any).__openEdit }];
                              });
                            }}
                            onTestMethod={(m, ns) => {
                              const testKey = `methodTest-${m['namespace-method-id']}`;
                              if (!tabs.find(tab => tab.key === testKey)) {
                                setTabs([...tabs, { key: testKey, label: `Test: ${m['namespace-method-name']}`, pinned: false }]);
                              }
                              setActiveTab(testKey);
                              setMethodTestTabs(prev => {
                                if (prev.find(t => t.key === testKey)) return prev;
                                return [...prev, { key: testKey, method: m, namespace: ns || namespace }];
                              });
                            }}
                            onViewSchema={(schema, ns) => {
                              const tabKey = `schema-preview-${schema.id}`;
                              if (!tabs.find(tab => tab.key === tabKey)) {
                                setTabs([...tabs, { key: tabKey, label: schema.schemaName || 'Schema Preview', pinned: false }]);
                              }
                              setActiveTab(tabKey);
                              setSchemaPageTabs(prev => {
                                if (prev.find(t => t.key === tabKey)) return prev;
                                return [...prev, { key: tabKey, schema: schema.schema, mode: 'preview', initialSchemaName: schema.schemaName, namespace: ns || namespace }];
                              });
                            }}
                          />
                        </div>
                      ))}
                      {allWebhooksTabs.map(({ key, namespace }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <AllWebhookPage
                            namespace={namespace}
                            onViewWebhook={(webhook, ns) => {
                              // (Optional) Open single webhook tab here
                            }}
                          />
                        </div>
                      ))}
                      {webhookPageTabs.map(({ key, webhook, namespace }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <WebhookPage webhook={webhook} namespace={namespace} />
                        </div>
                      ))}
                      {allLambdasTabs.map(({ key, namespace }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <AllLambdasPage
                            namespace={namespace}
                            onViewLambda={(lambda, ns) => {
                              // (Optional) Open single lambda tab here
                            }}
                          />
                        </div>
                      ))}
                      {lambdaPageTabs.map(({ key, lambda, namespace }) => (
                        <div
                          key={key}
                          style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
                        >
                          <LambdaPage lambda={lambda} namespace={namespace} />
                        </div>
                      ))}

                    </div>
                  </>
                ) : (
                  <div className="flex w-full h-full">
                    {/* Vertical Tabs */}
                    <div className="flex flex-col border-r bg-white py-2 px-1 min-w-[160px] max-w-[220px] w-[18vw] overflow-y-auto scrollbar-thin-x max-h-[90vh]">
                      <button
                        className="mb-2 px-2 py-2 rounded-full bg-blue-100 text-blue-700 transition-colors"
                        title="Switch to Horizontal Tabs View"
                        onClick={() => setTabLayout('horizontal')}
                      >
                        <LayoutGrid size={18} />
              </button>
                      {tabs.map(tab => (
                        <div key={tab.key} className="flex items-center group mb-1">
                          <button
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition
                              ${activeTab === tab.key ? 'font-medium text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'}
                              ${tab.bold ? 'font-bold' : ''}
                              ${tab.italic ? 'italic' : ''}
                            `}
                            onClick={() => {
                              setActiveTab(tab.key);
                            }}
                          >
                            {tab.label}
              </button>
                          {/* Pin/unpin logic for vertical view */}
                          {tab.key !== 'overview' && !tab.pinned && (
                            <button
                              className="ml-1 text-gray-400 hover:text-yellow-500 text-xs px-1 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                              onClick={() => setTabs(tabs => tabs.map(t => t.key === tab.key ? { ...t, pinned: true } : t))}
                              title="Pin tab"
                            >
                              <PinOff size={16} />
                            </button>
                          )}
                          {tab.key !== 'overview' && tab.pinned && (
                            <button
                              className="ml-1 text-yellow-500 hover:text-yellow-700 text-xs px-1 focus:outline-none"
                              onClick={() => setTabs(tabs => tabs.map(t => t.key === tab.key ? { ...t, pinned: false } : t))}
                              title="Unpin tab"
                            >
                              <Pin size={16} fill="currentColor" />
                            </button>
                          )}
                          {tab.key !== 'overview' && (
                            <button
                              className="ml-1 text-gray-400 hover:text-red-500 text-xs px-1 focus:outline-none"
                              onClick={() => handleCloseTab(tab.key)}
                              title="Close tab"
                              disabled={tab.pinned}
                              style={tab.pinned ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                            >
                              ×
                            </button>
                          )}
            </div>
                      ))}
                      <button
                        className="mt-2 px-2 py-2 text-gray-500 hover:bg-gray-100 rounded-full"
                        onClick={handleAddTab}
                      >
                        <Plus size={16} />
                      </button>
          </div>
                    {/* Tab Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto transition-all duration-200 pl-4 pr-8 pt-4">
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
                            ? { ...tab, label: name.trim() ? name : 'New Schema', pinned: false }
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
                                setTabs([...tabs, { key: tabKey, label: `Account: ${account['namespace-account-name']}`, pinned: false }]);
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
                                setTabs([...tabs, { key: tabKey, label: `Method: ${method['namespace-method-name']}`, pinned: false }]);
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
            {accountPageTabs.map(({ key, account, namespace, openEdit }) => (
              <div
                key={key}
                style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
              >
                <AccountPage account={account} namespace={namespace} openEdit={openEdit} />
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
                                setTabs([...tabs, { key: testKey, label: `Test: ${m['namespace-method-name']}`, pinned: false }]);
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
                                setTabs([...tabs, { key: tabKey, label: schema.schemaName || 'Schema Preview', pinned: false }]);
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
            {allWebhooksTabs.map(({ key, namespace }) => (
              <div
                key={key}
                style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
              >
                <AllWebhookPage
                  namespace={namespace}
                  onViewWebhook={(webhook, ns) => {
                    // (Optional) Open single webhook tab here
                  }}
                />
              </div>
            ))}
            {webhookPageTabs.map(({ key, webhook, namespace }) => (
              <div
                key={key}
                style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
              >
                <WebhookPage webhook={webhook} namespace={namespace} />
              </div>
            ))}
            {allLambdasTabs.map(({ key, namespace }) => (
              <div
                key={key}
                style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
              >
                <AllLambdasPage
                  namespace={namespace}
                  onViewLambda={(lambda, ns) => {
                    // (Optional) Open single lambda tab here
                  }}
                />
              </div>
            ))}
            {lambdaPageTabs.map(({ key, lambda, namespace }) => (
              <div
                key={key}
                style={{ display: activeTab === key ? 'block' : 'none', width: '100%', height: '100%' }}
              >
                <LambdaPage lambda={lambda} namespace={namespace} />
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
                  </div>
                )}

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
                  const response = await fetch(`/unified/accounts/${account["namespace-account-id"]}`, {
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
      </DndProvider>
    </div>
  );
}

export default NamespacePage;

/* Add this to the bottom of the file or in a global CSS file if not already present */
/* Custom scrollbar for tab bar */
<style jsx global>{`
  .scrollbar-thin::-webkit-scrollbar {
    height: 4px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
`}</style>