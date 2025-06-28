import React, { useState, useRef, useEffect } from 'react';
import {Sparkles, Zap, Code, Database, Globe, Play, Save, Copy, ExternalLink, Search, Download } from 'lucide-react';
import lambdaAutomationService from '../../services/lambda-automation';
import { useDrop } from 'react-dnd';

interface EnhancedLLMTerminalProps {
  openSchemaModal: (name: string, schema: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placement: 'right';
  setPlacement: (placement: 'right') => void;
  width: number;
  setWidth: (width: number) => void;
}

const EnhancedLLMTerminal: React.FC<EnhancedLLMTerminalProps> = ({ 
  openSchemaModal, 
  open, 
  setOpen, 
  placement, 
  setPlacement, 
  width, 
  setWidth 
}) => {
  // State for automation features
  const [automationMode, setAutomationMode] = useState<'schema' | 'lambda' | 'namespace' | 'method' | 'external-namespace'>('schema');
  const [userPrompt, setUserPrompt] = useState('');
  const [namespaceName, setNamespaceName] = useState('');
  const [methodName, setMethodName] = useState('');
  const [externalNamespaceUrl, setExternalNamespaceUrl] = useState('');
  const [externalNamespaceName, setExternalNamespaceName] = useState('');
  const [generatedLambdaConfig, setGeneratedLambdaConfig] = useState<any>(null);
  const [lambdaUrl, setLambdaUrl] = useState<string | null>(null);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [generatedSchemas, setGeneratedSchemas] = useState<{ name: string; schema: any }[]>([]);
  const [methods, setMethods] = useState<any>({});
  const [handlers, setHandlers] = useState<any>({});
  const [externalMethods, setExternalMethods] = useState<any[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(new Set());
  const [targetNamespace, setTargetNamespace] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('');
  const [droppedType, setDroppedType] = useState<string | null>(null);
  const [droppedData, setDroppedData] = useState<any>(null);

  const minWidth = 400;
  const maxWidth = 1100;
  const isResizing = useRef(false);

  // Drop target for react-dnd
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['NAMESPACE', 'METHOD', 'SCHEMA'],
    drop: (item: any) => {
      setDroppedType(item.type);
      setDroppedData(item.data);
      // Optionally, update the LLM terminal's state for inspection/editing
      if (item.type === 'NAMESPACE') {
        setNamespaceName(item.data['namespace-name'] || '');
        setUserPrompt(`Inspect or modify the namespace: ${item.data['namespace-name']}`);
      } else if (item.type === 'METHOD') {
        setMethodName(item.data['namespace-method-name'] || '');
        setUserPrompt(`Inspect or modify the method: ${item.data['namespace-method-name']}`);
        setAutomationResult(item.data);
      } else if (item.type === 'SCHEMA') {
        setUserPrompt(`Inspect or modify the schema: ${item.data.schemaName || ''}`);
        setAutomationResult(item.data);
        setGeneratedSchemas([{ name: item.data.schemaName || 'Schema', schema: item.data.schema }]);
      }
      return item;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Automated schema generation
  const handleAutomatedSchemaGeneration = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a description of the API endpoint you want to create');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);
    setDeploymentStatus('');

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

  // Lambda function generation with URL - Now creates actual Lambda function
  const handleLambdaGeneration = async () => {
    if (!automationResult) {
      setError('Please generate a schema first');
      return;
    }

    setLoading(true);
    setError(null);
    setDeploymentStatus('Creating Lambda function...');

    try {
      // Use the Lambda automation service to create the actual function
      const result = await lambdaAutomationService.automateLambdaCreation(
        automationResult,
        namespaceName || 'Default',
        methodName || 'Auto-generated'
      );

      if (result.success) {
        setGeneratedLambdaConfig({
          functionName: lambdaAutomationService.generateFunctionName(namespaceName || 'Default', methodName || 'Auto-generated'),
          runtime: 'nodejs18.x',
          handler: 'index.handler',
          memorySize: 128,
          timeout: 30
        });
        setLambdaUrl(result.functionUrl);
        setDeploymentStatus('Lambda function created successfully!');
        setResponse(JSON.stringify({
          success: true,
          functionArn: result.functionArn,
          functionUrl: result.functionUrl,
          message: 'Lambda function deployed successfully'
        }, null, 2));
      } else {
        setError(result.error || 'Failed to create Lambda function');
        setDeploymentStatus('Deployment failed');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create Lambda function');
      setDeploymentStatus('Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  // Complete namespace automation
  const handleNamespaceAutomation = async () => {
    if (!userPrompt.trim() || !namespaceName.trim()) {
      setError('Please enter both a description and namespace name');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);
    setDeploymentStatus('');

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

  // Method creation automation
  const handleMethodCreation = async () => {
    if (!userPrompt.trim() || !methodName.trim()) {
      setError('Please enter both a method name and description');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);
    setDeploymentStatus('');

    try {
      const res = await fetch(`http://localhost:5001/llm/generate-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          methodName,
          namespaceName: namespaceName || 'Default'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAutomationResult(data.data);
        setResponse(JSON.stringify(data.data, null, 2));
        
        // Extract method configuration
        if (data.data.methodConfig) {
          setMethods({ [data.data.methodConfig.method]: data.data.methodConfig });
        }
        
        // Extract schemas
        const schemas = [];
        if (data.data.requestSchema) {
          schemas.push({ name: `${methodName} Request Schema`, schema: data.data.requestSchema });
        }
        if (data.data.responseSchema) {
          schemas.push({ name: `${methodName} Response Schema`, schema: data.data.responseSchema });
        }
        setGeneratedSchemas(schemas);
        
        // Extract handler code
        if (data.data.lambdaHandler) {
          setHandlers({ [methodName]: data.data.lambdaHandler });
        }
      } else {
        setError(data.error || 'Failed to generate method');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate method');
    } finally {
      setLoading(false);
    }
  };

  // External namespace method fetching
  const handleExternalNamespaceFetch = async () => {
    if (!externalNamespaceUrl.trim() || !externalNamespaceName.trim()) {
      setError('Please enter both namespace URL and name');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);
    setDeploymentStatus('Fetching methods from external namespace...');

    try {
      const res = await fetch(`http://localhost:5001/llm/fetch-external-namespace-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceUrl: externalNamespaceUrl,
          namespaceName: externalNamespaceName,
          userPrompt: userPrompt || 'Analyze and extract all available methods'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAutomationResult(data.data);
        setResponse(JSON.stringify(data.data, null, 2));
        setExternalMethods(data.data.methods || []);
        setDeploymentStatus('Successfully fetched methods from external namespace!');
        
        // Extract schemas if available
        if (data.data.schemas) {
          setGeneratedSchemas(data.data.schemas.map((s: any) => ({ name: s.name, schema: s.schema })));
        }
      } else {
        setError(data.error || 'Failed to fetch external namespace methods');
        setDeploymentStatus('Fetch failed');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch external namespace methods');
      setDeploymentStatus('Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle method selection
  const handleMethodSelection = (methodId: string, checked: boolean) => {
    const newSelected = new Set(selectedMethods);
    if (checked) {
      newSelected.add(methodId);
    } else {
      newSelected.delete(methodId);
    }
    setSelectedMethods(newSelected);
  };

  // Handle select all methods
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allMethodIds = externalMethods.map((_, index) => `method-${index}`);
      setSelectedMethods(new Set(allMethodIds));
    } else {
      setSelectedMethods(new Set());
    }
  };

  // Add selected methods to namespace
  const handleAddSelectedMethods = async () => {
    if (selectedMethods.size === 0) {
      setError('Please select at least one method to add');
      return;
    }

    if (!targetNamespace.trim()) {
      setError('Please enter a target namespace name');
      return;
    }

    setLoading(true);
    setError(null);
    setDeploymentStatus('Adding selected methods to namespace...');

    try {
      const selectedMethodData = externalMethods.filter((_, index) => 
        selectedMethods.has(`method-${index}`)
      );

      const res = await fetch(`http://localhost:5001/llm/add-methods-to-namespace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceName: targetNamespace,
          methods: selectedMethodData,
          sourceNamespace: automationResult?.namespace?.name || 'External'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeploymentStatus('Successfully added methods to namespace!');
        setResponse(JSON.stringify(data.data, null, 2));
        // Clear selections after successful addition
        setSelectedMethods(new Set());
      } else {
        setError(data.error || 'Failed to add methods to namespace');
        setDeploymentStatus('Failed to add methods');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to add methods to namespace');
      setDeploymentStatus('Failed to add methods');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserPrompt('');
    setNamespaceName('');
    setMethodName('');
    setExternalNamespaceUrl('');
    setExternalNamespaceName('');
    setTargetNamespace('');
    setResponse(null);
    setError(null);
    setGeneratedSchemas([]);
    setMethods({});
    setHandlers({});
    setExternalMethods([]);
    setSelectedMethods(new Set());
    setAutomationResult(null);
    setGeneratedLambdaConfig(null);
    setLambdaUrl(null);
    setDeploymentStatus('');
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
      ref={drop}
      className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col transition-all ${isOver && canDrop ? 'ring-4 ring-purple-300' : ''}`}
      style={{ width: `${width}px` }}
    >
      {/* Optional: Show a message when dragging over */}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-purple-100 bg-opacity-60 flex items-center justify-center z-50 pointer-events-none">
          <span className="text-lg font-semibold text-purple-700">Drop to Inspect/Edit in AI Assistant</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Automation Assistant</h3>
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

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col p-4 space-y-4">
          {/* Automation Mode Selection */}
          <div className="flex flex-wrap gap-2">
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
              onClick={() => setAutomationMode('method')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                automationMode === 'method'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Method Creation
            </button>
            <button
              onClick={() => setAutomationMode('external-namespace')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                automationMode === 'external-namespace'
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              External Namespace
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
            {/* Namespace Name - shown for most modes */}
            {(automationMode !== 'external-namespace') && (
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
            )}

            {/* Method Name - shown for schema and method modes */}
            {(automationMode === 'schema' || automationMode === 'method') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method Name {automationMode === 'method' ? '' : '(Optional)'}
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

            {/* External Namespace URL - shown for external-namespace mode */}
            {automationMode === 'external-namespace' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    External Namespace URL
                  </label>
                  <input
                    type="url"
                    value={externalNamespaceUrl}
                    onChange={(e) => setExternalNamespaceUrl(e.target.value)}
                    placeholder="https://api.example.com/swagger.json or https://api.example.com/openapi.yaml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Namespace Name
                  </label>
                  <input
                    type="text"
                    value={externalNamespaceName}
                    onChange={(e) => setExternalNamespaceName(e.target.value)}
                    placeholder="e.g., ExternalAPI, ThirdPartyService"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </>
            )}

            {/* User Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {automationMode === 'external-namespace' 
                  ? 'Analysis Instructions (Optional)' 
                  : automationMode === 'method'
                  ? 'Method Description'
                  : automationMode === 'namespace' 
                  ? 'Describe your API system'
                  : 'Describe your API endpoint'
                }
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={
                  automationMode === 'external-namespace'
                    ? "Optional: Provide specific instructions for analyzing the external API, e.g., 'Focus on user management endpoints'"
                    : automationMode === 'method'
                    ? "Describe the method you want to create, e.g., 'Create a method for user authentication that accepts email and password'"
                    : automationMode === 'namespace' 
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
                  : automationMode === 'method'
                  ? handleMethodCreation
                  : automationMode === 'external-namespace'
                  ? handleExternalNamespaceFetch
                  : handleAutomatedSchemaGeneration
              }
              disabled={
                loading || 
                !userPrompt.trim() || 
                (automationMode === 'namespace' && !namespaceName.trim()) ||
                (automationMode === 'method' && !methodName.trim()) ||
                (automationMode === 'external-namespace' && (!externalNamespaceUrl.trim() || !externalNamespaceName.trim()))
              }
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {automationMode === 'namespace' 
                  ? 'Generate Complete Namespace' 
                  : automationMode === 'lambda' 
                  ? 'Generate Schema' 
                  : automationMode === 'method'
                  ? 'Generate Method'
                  : automationMode === 'external-namespace'
                  ? 'Fetch External Methods'
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
                <span>Deploy Lambda + URL</span>
              </button>
            )}

            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Reset
            </button>
          </div>

          {/* Deployment Status */}
          {deploymentStatus && (
            <div className={`p-3 rounded-lg ${
              deploymentStatus.includes('successfully') 
                ? 'bg-green-50 border border-green-200' 
                : deploymentStatus.includes('failed') 
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${
                deploymentStatus.includes('successfully') 
                  ? 'text-green-800' 
                  : deploymentStatus.includes('failed') 
                  ? 'text-red-800'
                  : 'text-blue-800'
              }`}>
                {deploymentStatus}
              </p>
            </div>
          )}

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

                {/* External Methods Display */}
                {externalMethods.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">External Namespace Methods</h4>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedMethods.size === externalMethods.length && externalMethods.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Select All</span>
                        </label>
                        <span className="text-sm text-gray-600">
                          {selectedMethods.size} of {externalMethods.length} selected
                        </span>
                      </div>
                    </div>

                    {/* Content Analysis Info */}
                    {automationResult && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Content Analysis</span>
                        </div>
                        <div className="text-xs text-blue-700 space-y-1">
                          <div><strong>Source:</strong> {automationResult.namespace?.url || 'Unknown'}</div>
                          <div><strong>Content Type:</strong> {response && JSON.parse(response).content_type || 'Unknown'}</div>
                          <div><strong>Methods Found:</strong> {externalMethods.length}</div>
                          {automationResult.summary && (
                            <div><strong>Summary:</strong> {automationResult.summary}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Target Namespace Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Namespace Name
                      </label>
                      <input
                        type="text"
                        value={targetNamespace}
                        onChange={(e) => setTargetNamespace(e.target.value)}
                        placeholder="Enter the namespace name where you want to add these methods"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If the namespace doesn't exist, it will be created automatically.
                      </p>
                    </div>

                    {/* Add Selected Methods Button */}
                    <div className="mb-4">
                      <button
                        onClick={handleAddSelectedMethods}
                        disabled={selectedMethods.size === 0 || !targetNamespace.trim() || loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        <span>Add Selected Methods to Namespace</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {externalMethods.map((method, index) => (
                        <div key={index} className="bg-white rounded border p-3">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedMethods.has(`method-${index}`)}
                              onChange={(e) => handleMethodSelection(`method-${index}`, e.target.checked)}
                              className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-sm">{method.method} {method.path}</span>
                                  <p className="text-xs text-gray-600 mt-1">{method.description}</p>
                                  {method.parameters && method.parameters.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs text-gray-500">Parameters:</span>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {method.parameters.map((param: any, i: number) => (
                                          <span key={i} className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                                            {param.name}: {param.type}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(method.requestSchema || method.responseSchema) && (
                                    <div className="mt-2">
                                      <span className="text-xs text-gray-500">Schemas:</span>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {method.requestSchema && (
                                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1">
                                            Request Schema
                                          </span>
                                        )}
                                        {method.responseSchema && (
                                          <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
                                            Response Schema
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {method.method}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
      </div>

      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-300"
        onMouseDown={startResize}
      />
    </div>
  );
};

export default EnhancedLLMTerminal; 