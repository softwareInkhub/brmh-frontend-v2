'use client';
import React, { useState, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Sparkles, Zap, X, Copy, ExternalLink, MessageSquare, Settings, RotateCcw } from 'lucide-react';
import { LambdaAutomationService } from '@/app/services/lambda-automation';
import { logger } from '@/app/utils/logger';

interface EnhancedLLMTerminalProps {
  openSchemaModal: (name: string, schema: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placement: 'right' | 'bottom';
  setPlacement: (placement: 'right' | 'bottom') => void;
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
  // Main automation state
  const [automationMode, setAutomationMode] = useState<'schema' | 'lambda' | 'external-namespace' | 'complete-namespace'>('schema');
  const [lambdaSubMode, setLambdaSubMode] = useState<'from-description' | 'from-schema'>('from-description');
  
  // Common state
  const [userPrompt, setUserPrompt] = useState('');
  const [namespaceName, setNamespaceName] = useState('');
  const [methodName, setMethodName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  
  // Lambda specific state
  const [lambdaFunctionName, setLambdaFunctionName] = useState('');
  const [lambdaRuntime, setLambdaRuntime] = useState('nodejs18.x');
  const [lambdaMemory, setLambdaMemory] = useState(128);
  const [lambdaTimeout, setLambdaTimeout] = useState(30);
  const [lambdaDescription, setLambdaDescription] = useState('');
  const [lambdaCode, setLambdaCode] = useState('');
  const [lambdaUrl, setLambdaUrl] = useState<string | null>(null);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('');
  
  // Schema input state (for schema-to-lambda mode)
  const [inputSchema, setInputSchema] = useState('');
  
  // External namespace state
  const [externalNamespaceUrl, setExternalNamespaceUrl] = useState('');
  const [externalNamespaceName, setExternalNamespaceName] = useState('');

  // Complete namespace state
  const [completeNamespaceName, setCompleteNamespaceName] = useState('');
  const [applicationDescription, setApplicationDescription] = useState('');
  const [completeNamespaceResult, setCompleteNamespaceResult] = useState<any>(null);

  const minWidth = 400;
  const maxWidth = 1100;
  const isResizing = useRef(false);

  // Get the Lambda automation service instance
  const lambdaAutomationService = LambdaAutomationService.getInstance();

  // Get backend URL from env or default
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  // Drop target for react-dnd
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['NAMESPACE', 'METHOD', 'SCHEMA'],
    drop: (item: any) => {
      if (item.type === 'NAMESPACE') {
        setNamespaceName(item.data['namespace-name'] || '');
        setUserPrompt(`Describe or generate Lambda for namespace: ${item.data['namespace-name']}`);
      } else if (item.type === 'METHOD') {
        setMethodName(item.data['namespace-method-name'] || '');
        setUserPrompt(`Describe or generate Lambda for method: ${item.data['namespace-method-name']}`);
      }
      return item;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Clear results when switching modes
  const clearResults = () => {
    setAutomationResult(null);
    setLambdaCode('');
    setLambdaUrl(null);
    setResponse(null);
    setError(null);
    setDeploymentStatus('');
    setCompleteNamespaceResult(null);
  };

  // Handle mode changes
  const handleModeChange = (newMode: 'schema' | 'lambda' | 'external-namespace' | 'complete-namespace') => {
    if (automationMode !== newMode) {
      clearResults();
      setAutomationMode(newMode);
    }
  };

  // Handle Lambda sub-mode changes
  const handleLambdaSubModeChange = (newSubMode: 'from-description' | 'from-schema') => {
    if (lambdaSubMode !== newSubMode) {
      clearResults();
      setLambdaSubMode(newSubMode);
    }
  };

  // Single Schema Generation (keep as is)
  const handleAutomatedSchemaGeneration = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a description of the API endpoint you want to create');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    setAutomationResult(null);
    setLambdaCode('');
    try {
      const res = await fetch(`${backendUrl}/llm/generate-schema-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt,
          namespaceName: 'GeneratedNamespace',
          methodName: 'GeneratedMethod'
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Extract only the schema parts for display
        const schemaOnly = {
          requestSchema: data.data.requestSchema,
          responseSchema: data.data.responseSchema,
          methodConfig: data.data.methodConfig
        };
        setAutomationResult(schemaOnly);
        setResponse(JSON.stringify(schemaOnly, null, 2));
        if (data.data.lambdaHandler) {
          setLambdaCode(data.data.lambdaHandler);
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

  // Generate Lambda from Description
  const handleLambdaFromDescription = async () => {
    if (!lambdaFunctionName.trim()) {
      setError('Function name is required');
      return;
    }
    if (!userPrompt.trim()) {
      setError('Please describe what the Lambda function should do');
      return;
    }
    setLoading(true);
    setError(null);
    setDeploymentStatus('Generating Lambda from description...');
    try {
      // Generate Lambda code from description
      const res = await fetch(`${backendUrl}/llm/generate-lambda-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: lambdaFunctionName,
          description: userPrompt,
          runtime: lambdaRuntime,
          memorySize: lambdaMemory,
          timeout: lambdaTimeout
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLambdaCode(data.data.code);
        setResponse(JSON.stringify(data, null, 2));
        setDeploymentStatus('Lambda code generated successfully!');
      } else {
        setError(data.error || 'Failed to generate Lambda from description');
        setDeploymentStatus('Generation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setDeploymentStatus('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Schema to Lambda Generation
  const handleSchemaToLambda = async () => {
    if (!inputSchema.trim()) {
      setError('Schema is required');
      return;
    }
    if (!lambdaFunctionName.trim()) {
      setError('Function name is required');
      return;
    }
    setLoading(true);
    setError(null);
    setDeploymentStatus('Generating Lambda from schema...');
    try {
      // Parse the input schema
      const schemaData = JSON.parse(inputSchema);
      
      // Generate Lambda code from schema using the same endpoint but with schema context
      const res = await fetch(`${backendUrl}/llm/generate-lambda-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: lambdaFunctionName,
          description: `Create a Lambda function that processes data according to this schema: ${JSON.stringify(schemaData)}`,
          runtime: lambdaRuntime,
          memorySize: lambdaMemory,
          timeout: lambdaTimeout
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLambdaCode(data.data.code);
        setResponse(JSON.stringify(data, null, 2));
        setDeploymentStatus('Lambda code generated successfully!');
      } else {
        setError(data.error || 'Failed to generate Lambda from schema');
        setDeploymentStatus('Generation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setDeploymentStatus('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Create Lambda Function (separate function)
  const handleCreateLambdaFunction = async () => {
    if (!lambdaFunctionName.trim()) {
      setError('Function name is required');
      return;
    }
    if (!lambdaCode.trim()) {
      setError('Lambda code is required. Please generate code first.');
      return;
    }
    setLoading(true);
    setError(null);
    setDeploymentStatus('Creating Lambda function...');
    try {
      // Create the Lambda function
      const config = {
        functionName: lambdaFunctionName.trim(),
        runtime: lambdaRuntime,
        handler: 'index.handler',
        code: lambdaCode,
        memorySize: lambdaMemory,
        timeout: lambdaTimeout,
        description: lambdaDescription || `Lambda function: ${lambdaFunctionName}`,
        environment: {
          REGION: process.env.AWS_REGION || 'us-east-1'
        }
      };
      const result = await lambdaAutomationService.createLambdaFunction(config);
      if (result.success) {
        setLambdaUrl(result.functionUrl);
        setDeploymentStatus('Lambda function created successfully!');
      } else {
        setError(result.error || 'Failed to create Lambda function');
        setDeploymentStatus('Creation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setDeploymentStatus('Creation failed');
    } finally {
      setLoading(false);
    }
  };

  // External Namespace Fetch
  const handleExternalNamespaceFetch = async () => {
    console.log('External namespace values:', {
      url: externalNamespaceUrl,
      name: externalNamespaceName,
      urlTrimmed: externalNamespaceUrl.trim(),
      nameTrimmed: externalNamespaceName.trim()
    });
    
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      console.log('Making API call to:', `${backendUrl}/llm/fetch-external-namespace-methods`);
      console.log('Request body:', {
        namespaceUrl: externalNamespaceUrl,
        namespaceName: externalNamespaceName
      });
      
      const res = await fetch(`${backendUrl}/llm/fetch-external-namespace-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceUrl: externalNamespaceUrl,
          namespaceName: externalNamespaceName
        }),
      });
      
      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok && data.success) {
        setAutomationResult(data.data);
        setResponse(JSON.stringify(data.data, null, 2));
      } else {
        const errorMessage = data.error || data.message || `HTTP ${res.status}: ${res.statusText}`;
        console.error('API Error:', errorMessage);
        setError(errorMessage);
      }
    } catch (e: any) {
      console.error('Network/JSON Error:', e);
      setError(`Network error: ${e.message || 'Failed to fetch external namespace'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteNamespaceGeneration = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const response = await fetch(`${backendUrl}/llm/automate-namespace-creation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespaceName: completeNamespaceName,
          userPrompt: applicationDescription,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setCompleteNamespaceResult(result.data);
        setResponse(JSON.stringify(result.data, null, 2));
      } else {
        setError(result.error || 'Failed to generate complete namespace');
      }
    } catch (err) {
      console.error('Error generating complete namespace:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate complete namespace');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllMethods = async () => {
    if (!automationResult || !automationResult.methods || !externalNamespaceName) {
      setError('No methods to save or namespace name missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/llm/add-methods-to-namespace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namespaceName: externalNamespaceName,
          methods: automationResult.methods,
          sourceNamespace: automationResult.namespace?.name || 'External API'
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setResponse(JSON.stringify(result.data, null, 2));
        setError(null);
      } else {
        setError(result.error || 'Failed to save methods');
      }
    } catch (err) {
      console.error('Error saving methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to save methods');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserPrompt('');
    setNamespaceName('');
    setMethodName('');
    setAutomationResult(null);
    setLambdaCode('');
    setLambdaUrl(null);
    setResponse(null);
    setError(null);
    setDeploymentStatus('');
    setLambdaFunctionName('');
    setLambdaDescription('');
    setInputSchema('');
    setExternalNamespaceUrl('');
    setExternalNamespaceName('');
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

  const openFunctionUrl = (url: string) => {
    window.open(url, '_blank');
  };

  if (!open) return null;

  return (
    <div
      ref={drop}
      className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl transition-all duration-300 flex flex-col ${
        placement === 'right' 
          ? `right-4 top-4 ${automationMode === 'complete-namespace' ? 'bottom-4' : 'bottom-4'}`
          : `bottom-4 left-4 right-4 ${automationMode === 'complete-namespace' ? 'top-4' : 'top-1/2'}`
      } ${isOver && canDrop ? 'border-blue-400 bg-blue-50' : ''}`}
      style={{ 
        width: placement === 'right' ? width : 'auto',
        height: automationMode === 'complete-namespace' ? 'calc(100vh - 2rem)' : 'auto'
      }}
    >
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-blue-100">
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Automation</h3>
            <p className="text-xs text-gray-500">Generate schemas and Lambda functions</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPlacement(placement === 'right' ? 'bottom' : 'right')}
            className="p-1 rounded hover:bg-gray-100"
            title="Toggle placement"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Main Mode Selection */}
        <div className="flex space-x-2 flex-shrink-0">
          <button
            onClick={() => handleModeChange('schema')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              automationMode === 'schema'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Single Schema
          </button>
          <button
            onClick={() => handleModeChange('lambda')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              automationMode === 'lambda'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Lambda Creation
          </button>
          <button
            onClick={() => handleModeChange('external-namespace')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              automationMode === 'external-namespace'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            External Namespace
          </button>
          <button
            onClick={() => handleModeChange('complete-namespace')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              automationMode === 'complete-namespace'
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Complete Namespace
          </button>
        </div>

        {/* Lambda Sub-mode Selection */}
        {automationMode === 'lambda' && (
          <div className="flex space-x-2 flex-shrink-0">
            <button
              onClick={() => handleLambdaSubModeChange('from-description')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                lambdaSubMode === 'from-description'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Generate from Description
            </button>
            <button
              onClick={() => handleLambdaSubModeChange('from-schema')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                lambdaSubMode === 'from-schema'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Generate from Schema
            </button>
          </div>
        )}

        {/* Single Schema Mode */}
        {automationMode === 'schema' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe your API endpoint
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Describe the API endpoint you want to create, e.g., 'Create an API endpoint for user registration that accepts email, password, and name'"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
            <button
              onClick={handleAutomatedSchemaGeneration}
              disabled={loading || !userPrompt.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Schema</span>
            </button>
          </div>
        )}

        {/* Lambda Creation Mode */}
        {automationMode === 'lambda' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Function Name *
              </label>
              <input
                type="text"
                value={lambdaFunctionName}
                onChange={(e) => setLambdaFunctionName(e.target.value)}
                placeholder="my-lambda-function"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Runtime
                </label>
                <select
                  value={lambdaRuntime}
                  onChange={(e) => setLambdaRuntime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="nodejs18.x">Node.js 18.x</option>
                  <option value="nodejs20.x">Node.js 20.x</option>
                  <option value="python3.9">Python 3.9</option>
                  <option value="python3.10">Python 3.10</option>
                  <option value="java11">Java 11</option>
                  <option value="dotnet6">.NET 6</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memory (MB)
                </label>
                <select
                  value={lambdaMemory}
                  onChange={(e) => setLambdaMemory(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={128}>128 MB</option>
                  <option value={256}>256 MB</option>
                  <option value={512}>512 MB</option>
                  <option value={1024}>1024 MB</option>
                  <option value={2048}>2048 MB</option>
                  <option value={4096}>4096 MB</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <select
                value={lambdaTimeout}
                onChange={(e) => setLambdaTimeout(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>

            {/* Description Input for Generate from Description mode */}
            {lambdaSubMode === 'from-description' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Function Description *
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Describe what the Lambda function should do, e.g., 'Create a Lambda function that processes user registration data and sends a welcome email'"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            {/* Schema Input for Schema-to-Lambda mode */}
            {lambdaSubMode === 'from-schema' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Schema *
                </label>
                <textarea
                  value={inputSchema}
                  onChange={(e) => setInputSchema(e.target.value)}
                  placeholder="Paste your JSON schema here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}

            {/* Lambda Code Display (read-only) */}
            {lambdaCode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generated Lambda Code
                </label>
                <textarea
                  value={lambdaCode}
                  readOnly
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-gray-50"
                />
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={lambdaSubMode === 'from-description' ? handleLambdaFromDescription : handleSchemaToLambda}
              disabled={loading || !lambdaFunctionName.trim() || 
                (lambdaSubMode === 'from-description' && !userPrompt.trim()) ||
                (lambdaSubMode === 'from-schema' && !inputSchema.trim())}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              <span>
                {lambdaSubMode === 'from-description' ? 'Generate Lambda Code' : 'Generate Lambda Code'}
              </span>
            </button>

            {/* Create Lambda Function Button (appears after code generation) */}
            {lambdaCode && (
              <button
                onClick={handleCreateLambdaFunction}
                disabled={loading || !lambdaFunctionName.trim() || !lambdaCode.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>Create Lambda Function</span>
              </button>
            )}
          </div>
        )}

        {/* External Namespace Mode */}
        {automationMode === 'external-namespace' && (
          <div className="space-y-3">
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
            <button
              onClick={handleExternalNamespaceFetch}
              disabled={loading || !externalNamespaceUrl.trim() || !externalNamespaceName.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fetch External Namespace</span>
            </button>
          </div>
        )}

        {/* External Namespace Mode - Show Fetched Data */}
        {automationMode === 'external-namespace' && automationResult && (
          <div className="space-y-4">
            {/* Summary */}
            {automationResult.namespace && (
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">API Summary</h4>
                <p className="text-sm text-blue-700">
                  <strong>Name:</strong> {automationResult.namespace.name}<br />
                  <strong>Description:</strong> {automationResult.namespace.description}<br />
                  <strong>URL:</strong> {automationResult.namespace.url}
                </p>
              </div>
            )}

            {/* Methods List */}
            {automationResult.methods && automationResult.methods.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">
                    Extracted Methods ({automationResult.methods.length})
                  </h4>
                  <button
                    onClick={handleSaveAllMethods}
                    disabled={loading}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Save All Methods</span>
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {automationResult.methods.map((method: any, index: number) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded font-mono ${
                          method.method === 'GET' ? 'bg-green-100 text-green-800' :
                          method.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          method.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          method.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {method.method}
                        </span>
                        <span className="font-mono text-sm text-gray-700">{method.path}</span>
                      </div>
                      {method.description && (
                        <p className="text-sm text-gray-600 mb-2">{method.description}</p>
                      )}
                      {method.parameters && method.parameters.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <strong>Parameters:</strong> {method.parameters.length}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raw API Data
              </label>
              <textarea
                value={JSON.stringify(automationResult, null, 2)}
                readOnly
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-gray-50"
              />
            </div>
          </div>
        )}

        {/* Complete Namespace Mode */}
        {automationMode === 'complete-namespace' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Namespace Name *
              </label>
              <input
                type="text"
                value={completeNamespaceName}
                onChange={(e) => setCompleteNamespaceName(e.target.value)}
                placeholder="e.g., UserManagement, ECommerceAPI, InventorySystem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Description *
              </label>
              <textarea
                value={applicationDescription}
                onChange={(e) => setApplicationDescription(e.target.value)}
                placeholder="Describe your complete application, e.g., 'Create a user management system with user registration, login, profile management, and password reset functionality. Include email verification and role-based access control.'"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
            <button
              onClick={handleCompleteNamespaceGeneration}
              disabled={loading || !completeNamespaceName.trim() || !applicationDescription.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Complete Namespace</span>
            </button>
          </div>
        )}

        {/* Complete Namespace Mode - Show Generated Data */}
        {automationMode === 'complete-namespace' && completeNamespaceResult && (
          <div className="space-y-2 max-h-full overflow-y-auto pr-2">
            {/* Namespace Summary */}
            {completeNamespaceResult.namespace && (
              <div className="p-2 rounded-md bg-blue-50 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-1 text-sm">Generated Namespace</h4>
                <p className="text-xs text-blue-700">
                  <strong>Name:</strong> {completeNamespaceResult.namespace.name}<br />
                  <strong>Description:</strong> {completeNamespaceResult.namespace.description}<br />
                  <strong>Version:</strong> {completeNamespaceResult.namespace.version}
                </p>
              </div>
            )}

            {/* Schemas Section */}
            {completeNamespaceResult.schemas && completeNamespaceResult.schemas.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  Generated Schemas ({completeNamespaceResult.schemas.length})
                </h4>
                <div className="space-y-1">
                  {completeNamespaceResult.schemas.map((schema: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-md">
                      <div className="p-1 bg-gray-50 border-b border-gray-200">
                        <h5 className="font-medium text-gray-800 text-xs">{schema.name}</h5>
                        {schema.description && (
                          <p className="text-xs text-gray-600 mt-1">{schema.description}</p>
                        )}
                      </div>
                      <div className="p-1">
                        <textarea
                          value={JSON.stringify(schema.schema, null, 2)}
                          readOnly
                          rows={3}
                          className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-xs bg-gray-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Methods Section */}
            {completeNamespaceResult.methods && completeNamespaceResult.methods.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  Generated Methods ({completeNamespaceResult.methods.length})
                </h4>
                <div className="space-y-1">
                  {completeNamespaceResult.methods.map((method: any, index: number) => (
                    <div key={index} className="p-1 border border-gray-200 rounded-md bg-gray-50">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-1 py-0.5 text-xs rounded font-mono ${
                          method.method === 'GET' ? 'bg-green-100 text-green-800' :
                          method.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          method.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          method.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {method.method}
                        </span>
                        <span className="font-mono text-xs text-gray-700">{method.path}</span>
                        <span className="text-xs font-medium text-gray-800">{method.name}</span>
                      </div>
                      {method.description && (
                        <p className="text-xs text-gray-600 mb-1">{method.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {method.requestSchema && (
                          <div>
                            <strong>Request Schema:</strong>
                            <textarea
                              value={JSON.stringify(method.requestSchema, null, 2)}
                              readOnly
                              rows={1}
                              className="w-full mt-1 px-1 py-0.5 border border-gray-300 rounded font-mono text-xs bg-white"
                            />
                          </div>
                        )}
                        {method.responseSchema && (
                          <div>
                            <strong>Response Schema:</strong>
                            <textarea
                              value={JSON.stringify(method.responseSchema, null, 2)}
                              readOnly
                              rows={1}
                              className="w-full mt-1 px-1 py-0.5 border border-gray-300 rounded font-mono text-xs bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lambda Functions Section */}
            {completeNamespaceResult.lambdaFunctions && completeNamespaceResult.lambdaFunctions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  Generated Lambda Functions ({completeNamespaceResult.lambdaFunctions.length})
                </h4>
                <div className="space-y-1">
                  {completeNamespaceResult.lambdaFunctions.map((lambda: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-md">
                      <div className="p-1 bg-gray-50 border-b border-gray-200">
                        <h5 className="font-medium text-gray-800 text-xs">{lambda.name}</h5>
                        {lambda.description && (
                          <p className="text-xs text-gray-600 mt-1">{lambda.description}</p>
                        )}
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          <span>Runtime: {lambda.runtime}</span>
                          <span>Memory: {lambda.memorySize}MB</span>
                          <span>Timeout: {lambda.timeout}s</span>
                        </div>
                      </div>
                      <div className="p-1">
                        <textarea
                          value={lambda.code}
                          readOnly
                          rows={4}
                          className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs bg-gray-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {completeNamespaceResult.summary && (
              <div className="p-2 rounded-md bg-green-50 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-1 text-sm">System Summary</h4>
                <p className="text-xs text-green-700">{completeNamespaceResult.summary}</p>
              </div>
            )}

            {/* Raw JSON Data (Collapsible) */}
            <details className="border border-gray-200 rounded-md">
              <summary className="p-1 bg-gray-50 cursor-pointer hover:bg-gray-100 font-medium text-gray-700 text-xs">
                Raw JSON Data
              </summary>
              <div className="p-1">
                <textarea
                  value={JSON.stringify(completeNamespaceResult, null, 2)}
                  readOnly
                  rows={3}
                  className="w-full px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-xs bg-gray-50"
                />
              </div>
            </details>
          </div>
        )}

        {/* Schema Mode - Show JSON Schema */}
        {automationMode === 'schema' && automationResult && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generated Schema
            </label>
            <textarea
              value={JSON.stringify(automationResult, null, 2)}
              readOnly
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-gray-50"
            />
          </div>
        )}

        {/* Status and Results */}
        {automationMode === 'lambda' && deploymentStatus && (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">{deploymentStatus}</p>
          </div>
        )}
        {automationMode === 'lambda' && error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {automationMode === 'lambda' && lambdaUrl && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-800">Function URL:</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(lambdaUrl)}
                  className="p-1 rounded hover:bg-green-100"
                  title="Copy URL"
                >
                  <Copy className="w-3 h-3 text-green-600" />
                </button>
                <button
                  onClick={() => openFunctionUrl(lambdaUrl)}
                  className="p-1 rounded hover:bg-green-100"
                  title="Open URL"
                >
                  <ExternalLink className="w-3 h-3 text-green-600" />
                </button>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-1 break-all">{lambdaUrl}</p>
          </div>
        )}

        {/* Status and Results for Single Schema Mode */}
        {automationMode === 'schema' && loading && (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">Generating schema...</p>
          </div>
        )}
        {automationMode === 'schema' && error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {automationMode === 'schema' && automationResult && !loading && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">Schema generated successfully!</p>
          </div>
        )}

        {/* Status and Results for External Namespace Mode */}
        {automationMode === 'external-namespace' && loading && (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">Fetching external namespace...</p>
          </div>
        )}
        {automationMode === 'external-namespace' && error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {automationMode === 'external-namespace' && automationResult && !loading && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">External namespace fetched successfully!</p>
          </div>
        )}

        {/* Status and Results for Complete Namespace Mode */}
        {automationMode === 'complete-namespace' && loading && (
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">Generating complete namespace...</p>
          </div>
        )}
        {automationMode === 'complete-namespace' && error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {automationMode === 'complete-namespace' && completeNamespaceResult && !loading && (
          <div className="p-3 rounded-md bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">Complete namespace generated successfully!</p>
          </div>
        )}
      </div>
      {/* Resize Handle */}
      {placement === 'right' && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400"
          onMouseDown={startResize}
        />
      )}
    </div>
  );
};

export default EnhancedLLMTerminal; 