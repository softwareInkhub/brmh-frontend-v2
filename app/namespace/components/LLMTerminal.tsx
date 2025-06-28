import React, { useState, useRef, useEffect } from 'react';
import {Sparkles, Zap, Code, Database, Globe, Play, Save, Copy, ExternalLink } from 'lucide-react';

interface LLMTerminalProps {
  openSchemaModal: (name: string, schema: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placement: 'right';
  setPlacement: (placement: 'right') => void;
  width: number;
  setWidth: (width: number) => void;
}

const LLMTerminal: React.FC<LLMTerminalProps> = ({ openSchemaModal, open, setOpen, placement, setPlacement, width, setWidth }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSchemas, setGeneratedSchemas] = useState<{ name: string; schema: any }[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<{ name: string; schema: any } | null>(null);
  const [subSchemas, setSubSchemas] = useState<{ name: string, schema: any }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [schemaName, setSchemaName] = useState('');
  const [jsonSchema, setJsonSchema] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [height, setHeight] = useState(420);
  const minHeight = 220;
  const maxHeight = 700;
  const isResizing = useRef(false);
  const [namespaceData, setNamespaceData] = useState<any>(null);
  const [methods, setMethods] = useState<any>({});
  const [handlers, setHandlers] = useState<any>({});
  const [showRawHandlers, setShowRawHandlers] = useState(false);
  const [rawHandlersOutput, setRawHandlersOutput] = useState<string | null>(null);

  // New state for automated features
  const [automationMode, setAutomationMode] = useState<'schema' | 'lambda' | 'namespace'>('schema');
  const [userPrompt, setUserPrompt] = useState('');
  const [namespaceName, setNamespaceName] = useState('');
  const [methodName, setMethodName] = useState('');
  const [generatedLambdaConfig, setGeneratedLambdaConfig] = useState<any>(null);
  const [lambdaUrl, setLambdaUrl] = useState<string | null>(null);
  const [automationResult, setAutomationResult] = useState<any>(null);

  const tabList = [
    { key: 'automation', label: 'AI Automation', icon: Sparkles },
    { key: 'methods', label: 'Methods', icon: Globe },
    { key: 'handlers', label: 'Handlers', icon: Code },
    { key: 'schema', label: 'Schema', icon: Database },
    { key: 'test', label: 'Test', icon: Play },
  ];
  const [activeTab, setActiveTab] = useState<'automation' | 'methods' | 'handlers' | 'schema' | 'test'>('automation');

  const [projectName, setProjectName] = useState('');
  const [desiredHandlers, setDesiredHandlers] = useState('');
  const [desiredEntities, setDesiredEntities] = useState('');
  const [desiredOperations, setDesiredOperations] = useState('');

  const [prompts, setPrompts] = useState({
    namespace: `Generate a namespace for the project: "{projectName}". Return a JSON object with 'name' and 'description' fields. The name should be concise and descriptive, and the description should clearly explain the purpose of the namespace. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "name": "ECommerceApp",\n  "description": "A namespace for managing an e-commerce platform with products, orders, and user management."\n}`,
    schema: `Generate JSON schemas for the entities in the project: "{projectName}". The entities should include: {entities}. Return a JSON object where each key is the entity name and each value is the JSON schema for that entity. Include appropriate data types, validation rules, and relationships between entities. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "Product": { "type": "object", "properties": { "id": {"type": "string"}, "name": {"type": "string"}, "price": {"type": "number"}, "stock": {"type": "integer"} }, "required": ["id", "name", "price"] },\n  "Order": { "type": "object", "properties": { "id": {"type": "string"}, "userId": {"type": "string"}, "items": {"type": "array", "items": {"type": "object"}} }, "required": ["id", "userId", "items"] }\n}`,
    methods: `Generate API method definitions for CRUD operations on the entities in the project: "{projectName}". The operations should include: {operations}. Return a JSON object where each key is the method name and each value is an object with 'method' (HTTP verb), 'path' (endpoint), and 'handler' (handler name). Include appropriate HTTP methods (GET, POST, PUT, DELETE) and RESTful paths. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "createProduct": { "method": "POST", "path": "/products", "handler": "createProductHandler" },\n  "getProducts": { "method": "GET", "path": "/products", "handler": "getProductsHandler" },\n  "updateProduct": { "method": "PUT", "path": "/products/:id", "handler": "updateProductHandler" },\n  "deleteProduct": { "method": "DELETE", "path": "/products/:id", "handler": "deleteProductHandler" }\n}`,
    handlers: `Generate AWS Lambda handler functions in Node.js for the project: "{projectName}". The handlers should include: {handlers}. Return a single JSON object. Each key should be the handler name, and each value should be the complete handler code as a string. Include proper error handling, input validation, and DynamoDB operations. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "createProductHandler": "// code here as a string",\n  "getProductsHandler": "// code here as a string",\n  "updateProductHandler": "// code here as a string",\n  "deleteProductHandler": "// code here as a string"\n}`
  });

  const minWidth = 400;
  const maxWidth = 1100;

  // New function for automated schema generation
  const handleAutomatedSchemaGeneration = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a description of the API endpoint you want to create');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);

    try {
      const res = await fetch(`http://localhost:5001/llm/generate-schema-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          namespaceName: namespaceName || 'Default',
          methodName: methodName || 'Auto-generated'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAutomationResult(data.data);
        setResponse(JSON.stringify(data.data, null, 2));
        
        // Extract schemas for display
        const schemas = [];
        if (data.data.requestSchema) {
          schemas.push({ name: `${data.data.schemaName || 'Request'} Schema`, schema: data.data.requestSchema });
        }
        if (data.data.responseSchema) {
          schemas.push({ name: `${data.data.schemaName || 'Response'} Schema`, schema: data.data.responseSchema });
        }
        setGeneratedSchemas(schemas);
        
        // Set method configuration
        if (data.data.methodConfig) {
          setMethods({ [data.data.methodConfig.method]: data.data.methodConfig });
        }
        
        // Set handler code
        if (data.data.lambdaHandler) {
          setHandlers({ [data.data.methodConfig?.method || 'handler']: data.data.lambdaHandler });
        }
      } else {
        setError(data.error || 'Failed to generate schema');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate schema');
    } finally {
      setLoading(false);
    }
  };

  // New function for Lambda function generation with URL
  const handleLambdaGeneration = async () => {
    if (!automationResult) {
      setError('Please generate a schema first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5001/llm/generate-lambda-with-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaData: automationResult,
          namespaceName: namespaceName || 'Default',
          methodName: methodName || 'Auto-generated'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedLambdaConfig(data.lambdaConfig);
        setLambdaUrl(data.estimatedUrl);
        setResponse(JSON.stringify(data, null, 2));
      } else {
        setError(data.error || 'Failed to generate Lambda function');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate Lambda function');
    } finally {
      setLoading(false);
    }
  };

  // New function for complete namespace automation
  const handleNamespaceAutomation = async () => {
    if (!userPrompt.trim() || !namespaceName.trim()) {
      setError('Please enter both a description and namespace name');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);

    try {
      const res = await fetch(`http://localhost:5001/llm/automate-namespace-creation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          namespaceName
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAutomationResult(data.data);
        setResponse(JSON.stringify(data.data, null, 2));
        
        // Extract schemas
        if (data.data.schemas) {
          setGeneratedSchemas(data.data.schemas.map((s: any) => ({ name: s.name, schema: s.schema })));
        }
        
        // Extract methods
        if (data.data.methods) {
          const methodMap = {};
          data.data.methods.forEach((m: any) => {
            methodMap[m.name] = m;
          });
          setMethods(methodMap);
        }
        
        // Extract handlers
        if (data.data.methods) {
          const handlerMap = {};
          data.data.methods.forEach((m: any) => {
            if (m.lambdaHandler) {
              handlerMap[m.name] = m.lambdaHandler;
            }
          });
          setHandlers(handlerMap);
        }
      } else {
        setError(data.error || 'Failed to automate namespace creation');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to automate namespace creation');
    } finally {
      setLoading(false);
    }
  };

  const handleTabPrompt = async (tab: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    if (tab === 'handlers') setRawHandlersOutput(null);
    try {
      let prompt = prompts[tab as keyof typeof prompts];
      prompt = prompt.replace('{projectName}', projectName);
      
      switch(tab) {
        case 'handlers':
          prompt = prompt.replace('{handlers}', desiredHandlers);
          break;
        case 'schema':
          prompt = prompt.replace('{entities}', desiredEntities);
          break;
        case 'methods':
          prompt = prompt.replace('{operations}', desiredOperations);
          break;
      }
      
      const res = await fetch('http://localhost:5000/llm/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.llm_output || JSON.stringify(data.schema, null, 2));
        let json = data.llm_output || JSON.stringify(data.schema, null, 2);
        // Try to extract JSON from code fences
        let match = json.match(/```json\n([\s\S]*?)```/);
        if (match) {
          json = match[1];
        } else {
          // Try to extract the first {...} block
          const firstBrace = json.indexOf('{');
          const lastBrace = json.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            json = json.substring(firstBrace, lastBrace + 1);
          }
        }
        if (tab === 'handlers') setRawHandlersOutput(json);
        try {
          const parsed = JSON.parse(json);
          switch(tab) {
            case 'namespace':
              setNamespaceData(parsed);
              break;
            case 'schema':
              const schemasArr = Object.entries(parsed).map(([name, schema]) => ({ name, schema }));
              setGeneratedSchemas(schemasArr);
              break;
            case 'methods':
              setMethods(parsed);
              break;
            case 'handlers':
              setHandlers(parsed);
              break;
          }
        } catch (e) {
          setError("Failed to parse JSON. Raw output:\n" + json);
          return;
        }
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch('http://localhost:5000/llm/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.llm_output || JSON.stringify(data.schema, null, 2));
        // Try to parse and add to generatedSchemas
        let json = data.llm_output || JSON.stringify(data.schema, null, 2);
        const match = json.match(/```json\n([\s\S]*?)```/);
        if (match) json = match[1];
        try {
          const parsed = JSON.parse(json);
          // Set namespace data
          if (parsed.namespace) {
            setNamespaceData(parsed.namespace);
          }
          // Set methods
          if (parsed.methods) {
            setMethods(parsed.methods);
          }
          // Set handlers
          if (parsed.handlers) {
            setHandlers(parsed.handlers);
          }
          // Handle schemas (existing logic)
          if (parsed.schemas) {
            const schemasArr = Object.entries(parsed.schemas).map(([name, schema]) => ({ name, schema }));
            setGeneratedSchemas(schemasArr);
            setSubSchemas([]);
          } else {
            // Existing schema parsing logic
            let schemasArr = [];
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              if (Object.keys(parsed).length === 1) {
                const rootKey = Object.keys(parsed)[0];
                const rootVal = parsed[rootKey];
                if (rootVal && typeof rootVal === 'object' && !Array.isArray(rootVal)) {
                  if ('type' in rootVal || 'properties' in rootVal) {
                    setGeneratedSchemas([{ name: rootKey, schema: rootVal }]);
                  } else if (Object.keys(rootVal).length > 0) {
                    schemasArr = Object.entries(rootVal).map(([name, schema]) => ({ name, schema }));
                    setGeneratedSchemas(schemasArr);
                  }
                }
              } else if (Object.keys(parsed).length > 1) {
                schemasArr = Object.entries(parsed).map(([name, schema]) => ({ name, schema }));
                setGeneratedSchemas(schemasArr);
              }
            }
          }
        } catch (e) {
          setGeneratedSchemas([]);
          setSubSchemas([]);
          setNamespaceData(null);
          setMethods({});
          setHandlers({});
        }
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setResponse(null);
    setError(null);
    setGeneratedSchemas([]);
    setSubSchemas([]);
    setNamespaceData(null);
    setMethods({});
    setHandlers({});
    setRawHandlersOutput(null);
    setAutomationResult(null);
    setGeneratedLambdaConfig(null);
    setLambdaUrl(null);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const onMouseMove = (e: MouseEvent) => {
      if (isResizing.current) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX - 20));
        setWidth(newWidth);
      }
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openLambdaUrl = (url: string) => {
    window.open(url, '_blank');
  };

  if (!open) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col`}
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabList.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'automation' && (
          <div className="h-full flex flex-col p-4 space-y-4">
            {/* Automation Mode Selection */}
            <div className="flex space-x-2">
              <button
                onClick={() => setAutomationMode('schema')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  automationMode === 'schema'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Single Schema
              </button>
              <button
                onClick={() => setAutomationMode('lambda')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  automationMode === 'lambda'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Schema + Lambda
              </button>
              <button
                onClick={() => setAutomationMode('namespace')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  automationMode === 'namespace'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Complete Namespace
              </button>
            </div>

            {/* Input Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {automationMode === 'namespace' ? 'Namespace Name' : 'Namespace Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={namespaceName}
                  onChange={(e) => setNamespaceName(e.target.value)}
                  placeholder="e.g., UserManagement, ECommerceAPI"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {automationMode === 'schema' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={methodName}
                    onChange={(e) => setMethodName(e.target.value)}
                    placeholder="e.g., registerUser, getProducts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe your API endpoint
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={
                    automationMode === 'namespace' 
                      ? "Describe the complete API system you want to create, e.g., 'Create a complete e-commerce API with user management, product catalog, and order processing'"
                      : "Describe the API endpoint you want to create, e.g., 'Create an API endpoint for user registration that accepts email, password, and name'"
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={
                  automationMode === 'namespace' 
                    ? handleNamespaceAutomation 
                    : automationMode === 'lambda' 
                    ? handleAutomatedSchemaGeneration 
                    : handleAutomatedSchemaGeneration
                }
                disabled={loading || !userPrompt.trim() || (automationMode === 'namespace' && !namespaceName.trim())}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {automationMode === 'namespace' 
                    ? 'Generate Complete Namespace' 
                    : automationMode === 'lambda' 
                    ? 'Generate Schema' 
                    : 'Generate Schema'
                  }
                </span>
              </button>

              {automationMode === 'lambda' && automationResult && (
                <button
                  onClick={handleLambdaGeneration}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4" />
                  <span>Generate Lambda + URL</span>
                </button>
              )}
            </div>

            {/* Results Display */}
            {automationResult && (
              <div className="flex-1 overflow-auto">
                <div className="space-y-4">
                  {/* Schema Results */}
                  {generatedSchemas.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Generated Schemas</h4>
                      <div className="space-y-2">
                        {generatedSchemas.map((schema, index) => (
                          <div key={index} className="bg-white rounded border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{schema.name}</span>
                              <button
                                onClick={() => openSchemaModal(schema.name, schema.schema)}
                                className="text-purple-600 hover:text-purple-700 text-sm"
                              >
                                Open in Schema Editor
                              </button>
                            </div>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(schema.schema, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Method Configuration */}
                  {Object.keys(methods).length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Method Configuration</h4>
                      <div className="space-y-2">
                        {Object.entries(methods).map(([key, method]: [string, any]) => (
                          <div key={key} className="bg-white rounded border p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-sm">{method.method} {method.path}</span>
                                <p className="text-xs text-gray-600 mt-1">{method.description}</p>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {method.method}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lambda Configuration */}
                  {generatedLambdaConfig && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Lambda Function</h4>
                      <div className="bg-white rounded border p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Function Name:</span>
                          <span className="text-sm text-gray-600">{generatedLambdaConfig.functionName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Runtime:</span>
                          <span className="text-sm text-gray-600">{generatedLambdaConfig.runtime}</span>
                        </div>
                        {lambdaUrl && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Function URL:</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-blue-600">{lambdaUrl}</span>
                              <button
                                onClick={() => openLambdaUrl(lambdaUrl)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => copyToClipboard(lambdaUrl)}
                                className="text-gray-600 hover:text-gray-700"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Raw Response */}
                  {response && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Raw Response</h4>
                        <button
                          onClick={() => copyToClipboard(response)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                        {response}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-gray-600">Generating...</span>
              </div>
            )}
          </div>
        )}

        {/* Existing tabs content */}
        {activeTab === 'methods' && (
          <div className="h-full flex flex-col p-4 space-y-4">
            {/* Methods content - existing implementation */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., ECommerceApp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Operations</label>
                <textarea
                  value={desiredOperations}
                  onChange={(e) => setDesiredOperations(e.target.value)}
                  placeholder="e.g., CRUD operations for users, products, orders"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <button
                onClick={() => handleTabPrompt('methods')}
                disabled={loading || !projectName.trim() || !desiredOperations.trim()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Methods
              </button>
            </div>

            {Object.keys(methods).length > 0 && (
              <div className="flex-1 overflow-auto">
                <h4 className="font-medium text-gray-900 mb-2">Generated Methods</h4>
                <div className="space-y-2">
                  {Object.entries(methods).map(([key, method]: [string, any]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{key}</span>
                          <p className="text-xs text-gray-600 mt-1">
                            {method.method} {method.path}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {method.method}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'handlers' && (
          <div className="h-full flex flex-col p-4 space-y-4">
            {/* Handlers content - existing implementation */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., ECommerceApp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Handlers</label>
                <textarea
                  value={desiredHandlers}
                  onChange={(e) => setDesiredHandlers(e.target.value)}
                  placeholder="e.g., createUser, getUser, updateUser, deleteUser"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <button
                onClick={() => handleTabPrompt('handlers')}
                disabled={loading || !projectName.trim() || !desiredHandlers.trim()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Handlers
              </button>
            </div>

            {Object.keys(handlers).length > 0 && (
              <div className="flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Generated Handlers</h4>
                  <button
                    onClick={() => setShowRawHandlers(!showRawHandlers)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    {showRawHandlers ? 'Show Formatted' : 'Show Raw'}
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(handlers).map(([key, handler]: [string, any]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{key}</span>
                        <button
                          onClick={() => copyToClipboard(handler)}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                        {handler}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="h-full flex flex-col p-4 space-y-4">
            {/* Schema content - existing implementation */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., ECommerceApp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Entities</label>
                <textarea
                  value={desiredEntities}
                  onChange={(e) => setDesiredEntities(e.target.value)}
                  placeholder="e.g., User, Product, Order, Comment"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <button
                onClick={() => handleTabPrompt('schema')}
                disabled={loading || !projectName.trim() || !desiredEntities.trim()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Schemas
              </button>
            </div>

            {generatedSchemas.length > 0 && (
              <div className="flex-1 overflow-auto">
                <h4 className="font-medium text-gray-900 mb-2">Generated Schemas</h4>
                <div className="space-y-2">
                  {generatedSchemas.map((schema, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{schema.name}</span>
                        <button
                          onClick={() => openSchemaModal(schema.name, schema.schema)}
                          className="text-purple-600 hover:text-purple-700 text-sm"
                        >
                          Open in Schema Editor
                        </button>
                      </div>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                        {JSON.stringify(schema.schema, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="h-full flex flex-col p-4 space-y-4">
            {/* Test content - existing implementation */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your custom prompt here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSend}
                  disabled={loading || !prompt.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>

            {response && (
              <div className="flex-1 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Response</h4>
                  <button
                    onClick={() => copyToClipboard(response)}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <pre className="text-xs bg-gray-100 p-3 rounded border overflow-auto max-h-64">
                  {response}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-300"
        onMouseDown={startResize}
      />
    </div>
  );
};

export default LLMTerminal; 