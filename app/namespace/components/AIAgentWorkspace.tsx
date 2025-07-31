import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, File, Folder, Play, Database, Code, X, Maximize2, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: string;
}

interface ProjectFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: ProjectFile[];
  content?: string;
}

interface AIAgentWorkspaceProps {
  namespace?: any;
  onClose: () => void;
}

interface WorkspaceState {
  files: any[];
  schemas: any[];
  apis: any[];
  projectType: string;
  lastGenerated?: string;
}

const AIAgentWorkspace: React.FC<AIAgentWorkspaceProps> = ({ namespace, onClose }) => {
  console.log('AIAgentWorkspace rendered with props:', { namespace, onClose });
  // 1. Change activeTab state to use 'lambda' instead of 'api'
  const [activeTab, setActiveTab] = useState<'chat' | 'console' | 'lambda' | 'schema' | 'api' | 'files'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI development assistant. I can help you:
\n• Design and generate API schemas\n• Write and test code\n• Create database models\n• Set up authentication\n• Run tests and debug issues\n• Manage your project structure\n\nWhat would you like to work on today?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(() => [
    {
      id: '1',
      name: 'api',
      type: 'folder',
      path: '/api',
      children: [
        { id: '2', name: 'users.js', type: 'file', path: '/api/users.js' },
        { id: '3', name: 'auth.js', type: 'file', path: '/api/auth.js' }
      ]
    },
    {
      id: '4',
      name: 'models',
      type: 'folder',
      path: '/models',
      children: [
        { id: '5', name: 'User.js', type: 'file', path: '/models/User.js' }
      ]
    },
    { id: '6', name: 'package.json', type: 'file', path: '/package.json' },
    { id: '7', name: 'README.md', type: 'file', path: '/README.md' }
  ]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [rawSchemas, setRawSchemas] = useState<{ id: string; content: string }[]>([]);
  const [showRawSchema, setShowRawSchema] = useState<{ [key: number]: boolean }>({});
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isTerminalLoading, setIsTerminalLoading] = useState(true);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<{ [key: string]: any }>({});
  const [apiTestLoading, setApiTestLoading] = useState<{ [key: string]: boolean }>({});
  const [apiTestInput, setApiTestInput] = useState<{ [key: string]: string }>({});
  const [savingApi, setSavingApi] = useState<{ [key: string]: boolean }>({});
  const [savingSchema, setSavingSchema] = useState<{ [key: string]: boolean }>({});
  // Memory service state
  const [sessionId, setSessionId] = useState<string>('');
  const [userId] = useState<string>('default-user');
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);
  // 2. Add state for Lambda functions and Lambda creation form
  const [lambdaFunctions, setLambdaFunctions] = useState<any[]>([]);
  const [lambdaForm, setLambdaForm] = useState({
    schemaId: '',
    functionName: '',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    memory: 128,
    timeout: 3,
    environment: '',
    description: '',
  });
  const [isCreatingLambda, setIsCreatingLambda] = useState(false);
  const [lambdaError, setLambdaError] = useState('');
  // Add state for live schema preview and streaming
  const [liveSchema, setLiveSchema] = useState('');
  const [isStreamingSchema, setIsStreamingSchema] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [schemaEditPrompt, setSchemaEditPrompt] = useState('');
  const [isEditingSchema, setIsEditingSchema] = useState(false);
  // Add state for schema names
  const [schemaNames, setSchemaNames] = useState<{ [id: string]: string }>({});
  // 1. Add selectedSchema state at the top
  const [selectedSchema, setSelectedSchema] = useState<any>(null);
  // Add state for API endpoints
  const [apiEndpoints, setApiEndpoints] = useState<any[]>([]);
  // Lambda tab UI additions
  // 1. Add state for lambdaPrompt and generatedLambdaCode
  // Run Project functionality
  const [isRunningProject, setIsRunningProject] = useState(false);
  const [lambdaPrompt, setLambdaPrompt] = useState('');
  const [generatedLambdaCode, setGeneratedLambdaCode] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL || 'http://localhost:5001';

  // Initialize terminal only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTerminalLoading(false);
      setIsTerminalReady(true);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load file tree and workspace state when namespace changes
  useEffect(() => {
    if (namespace?.['namespace-id']) {
      refreshFileTree();
      loadWorkspaceState();
      
      // Add a welcome message with context if workspace state exists
      setTimeout(() => {
        if (workspaceState && (workspaceState.schemas.length > 0 || workspaceState.apis.length > 0)) {
          addMessage({
            role: 'assistant',
            content: `Welcome back! I can see you have ${workspaceState.schemas.length} schemas and ${workspaceState.apis.length} APIs in your workspace. I'll help you continue building on your previous work.`
          });
        }
      }, 1000);
    }
  }, [namespace?.['namespace-id'], workspaceState]);

  // Initialize session and load history when component mounts
  useEffect(() => {
    if (namespace?.['namespace-id']) {
      const newSessionId = `${userId}-ai-agent-workspace-${Date.now()}`;
      setSessionId(newSessionId);
      
      // Load chat history and workspace state after a short delay
      setTimeout(() => {
        loadChatHistory();
      }, 100);
    }
  }, [namespace?.['namespace-id'], userId]);

  useEffect(() => {
    if (namespace?.['namespace-id'] && sessionId) {
      // Clear generated schemas for this session/namespace on mount/refresh
      fetch(`${process.env.NEXT_PUBLIC_API_BACKEND_URL}/ai-agent/clear-generated-schemas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, namespaceId: namespace['namespace-id'] })
      });
    }
  }, [namespace?.['namespace-id'], sessionId]);

  // Fetch saved schemas for Lambda dropdown only
  useEffect(() => {
    if (namespace?.['namespace-id']) {
      fetch(`/unified/schema?namespaceId=${namespace['namespace-id']}`)
        .then(res => res.json())
        .then(data => setSavedSchemas(data));
    }
  }, [namespace?.['namespace-id']]);

  // Function to refresh saved schemas
  const refreshSavedSchemas = async () => {
    if (namespace?.['namespace-id']) {
      try {
        const response = await fetch(`/unified/schema?namespaceId=${namespace['namespace-id']}`);
        if (response.ok) {
          const schemas = await response.json();
          setSavedSchemas(schemas);
          console.log('Refreshed saved schemas:', schemas);
        }
      } catch (error) {
        console.error('Error refreshing saved schemas:', error);
      }
    }
  };

  const getNowId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Memory service functions
  const loadWorkspaceState = async () => {
    if (!sessionId || !namespace?.['namespace-id']) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/ai-agent/get-workspace-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, namespaceId: namespace['namespace-id'] })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.workspaceState) {
          setWorkspaceState(data.workspaceState);
          // Do NOT restore schemas from workspace state
          setApiEndpoints(data.workspaceState.apis || []);
        }
      }
    } catch (error) {
      console.error('Error loading workspace state:', error);
    }
  };

  const saveWorkspaceState = async () => {
    if (!sessionId || !namespace?.['namespace-id']) return;
    
    const currentState: WorkspaceState = {
      files: [], // No longer tracking generated files
      schemas,
      apis: apiEndpoints,
      projectType: 'nodejs', // No longer tracking project type
      lastGenerated: new Date().toISOString()
    };
    
    try {
      await fetch(`${API_BASE_URL}/ai-agent/save-workspace-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          namespaceId: namespace['namespace-id'],
          workspaceState: currentState
        })
      });
      
      setWorkspaceState(currentState);
    } catch (error) {
      console.error('Error saving workspace state:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/ai-agent/chat-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, limit: 50 })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.history && data.history.length > 0) {
          const historyMessages = data.history.map((msg: any) => ({
            id: getNowId(),
            role: msg.Role === 'user' ? 'user' : 'assistant',
            content: msg.Content,
            timestamp: new Date(msg.Timestamp)
          }));
          setMessages(prev => [...prev, ...historyMessages]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      await fetch(`${API_BASE_URL}/ai-agent/clear-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your AI development assistant. I can help you:

• Design and generate API schemas
• Write and test code
• Create database models
• Set up authentication
• Run tests and debug issues
• Manage your project structure

What would you like to work on today?`,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: getNowId(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    addMessage({
      role: 'user',
      content: userMessage
    });

    // Add console output for message processing
    setConsoleOutput(prev => [...prev, `👤 User message: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`]);
    
    // Check if this might be a schema-related request
    const lowerMessage = userMessage.toLowerCase();
    const schemaKeywords = ['schema', 'json', 'model', 'structure', 'format', 'api', 'endpoint'];
    const isSchemaRequest = schemaKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isSchemaRequest) {
      setConsoleOutput(prev => [...prev, `🔍 Detected potential schema request`]);
    }

    try {
      await handleStreamingResponse(userMessage);
    } catch (error) {
      console.error('Error handling streaming response:', error);
      setConsoleOutput(prev => [...prev, `❌ Error processing message: ${error.message}`]);
      
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`
      });
    }
  };

  const handleStreamingResponse = async (userMessage: string, currentSchema: any = null) => {
    setIsStreamingSchema(false);
    setLiveSchema('');
    let assistantMessage = '';
    let actions: any[] = [];
    let lastAssistantMessageId: string | null = null;

    // Always pass the existing schema if we have one, regardless of the request type
    let schemaToEdit = currentSchema;
    if (!schemaToEdit && schemas.length > 0) {
      // Always use the existing schema for any schema-related request
      schemaToEdit = schemas[0].schema;
      console.log('[Frontend] Using existing schema for request:', schemaToEdit);
      // Check if this is an edit command for visual feedback
      const lowerMessage = userMessage.toLowerCase();
      const editKeywords = ['edit', 'modify', 'update', 'change', 'add', 'remove', 'delete', 'rename'];
      const isEditCommand = editKeywords.some(keyword => lowerMessage.includes(keyword));
      if (isEditCommand) {
        setIsEditingSchema(true);
        setConsoleOutput(prev => [...prev, `🔄 Editing schema: ${userMessage}`]);
      }
    }
    
    // Add console output for schema generation start
    const lowerMessage = userMessage.toLowerCase();
    const schemaKeywords = ['schema', 'json', 'model', 'structure', 'format'];
    const isSchemaRequest = schemaKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isSchemaRequest) {
      if (schemaToEdit) {
        setConsoleOutput(prev => [...prev, `📝 Schema editing request: ${userMessage}`]);
        setConsoleOutput(prev => [...prev, `📋 Using existing schema as base`]);
      } else {
        setConsoleOutput(prev => [...prev, `🆕 Schema generation request: ${userMessage}`]);
        setConsoleOutput(prev => [...prev, `✨ Creating new schema from scratch`]);
      }
    }
    
    console.log('[Frontend] Sending request to backend:', {
      message: userMessage,
      hasExistingSchema: !!schemaToEdit,
      schemaToEdit: schemaToEdit ? 'Schema exists' : 'No schema'
    });
    
    setConsoleOutput(prev => [...prev, `🌐 Connecting to AI agent backend...`]);
    
    const response = await fetch(`${API_BASE_URL}/ai-agent/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        namespace: namespace ? { id: namespace['namespace-id'] } : null,
        action: null,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        userId,
        schema: schemaToEdit,
      })
    });
    
    if (!response.ok) {
      setConsoleOutput(prev => [...prev, `❌ Failed to connect to backend: ${response.status}`]);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    setConsoleOutput(prev => [...prev, `✅ Connected to backend, starting AI processing...`]);
    
    const reader = response.body?.getReader();
    if (!reader) {
      setConsoleOutput(prev => [...prev, `❌ No response body received`]);
      throw new Error('No response body');
    }
    
    let chunkCount = 0;
    let schemaChunkCount = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunkCount++;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[Frontend] Received streaming data:', data);
              
              // Handle actions regardless of route
              if (data.type === 'actions' && data.actions) {
                console.log('[Frontend] Received actions:', data.actions);
                actions = data.actions;
                setConsoleOutput(prev => [...prev, `📋 Received ${data.actions.length} action(s) from AI agent`]);
              }
              
              if (data.route === 'schema') {
                // Live update the schema preview in the Schema tab
                if (data.type === 'chat') {
                  setLiveSchema(prev => prev + data.content);
                  setIsStreamingSchema(true);
                  schemaChunkCount++;
                  
                  // Add console output to show schema generation progress
                  if (schemaChunkCount === 1) {
                    setConsoleOutput(prev => [...prev, `🔄 AI agent started generating schema...`]);
                  }
                  
                  // Update progress every 5 chunks
                  if (schemaChunkCount % 5 === 0) {
                    setConsoleOutput(prev => [...prev, `📝 Schema generation in progress... (chunk ${schemaChunkCount})`]);
                  }
                }
              } else if (data.route === 'chat') {
                // Live update the assistant's message in the chat UI
                if (data.type === 'chat') {
                  assistantMessage += data.content;
                  // If this is the first chunk, add a new assistant message
                  if (!lastAssistantMessageId) {
                    lastAssistantMessageId = getNowId();
                    setMessages(prev => [
                      ...prev,
                      {
                        id: lastAssistantMessageId || getNowId(),
                        role: 'assistant',
                        content: assistantMessage,
                        timestamp: new Date()
                      }
                    ]);
                  } else {
                    // Update the last assistant message
                    setMessages(prev => prev.map(m =>
                      m.id === lastAssistantMessageId
                        ? { ...m, content: assistantMessage }
                        : m
                    ));
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
    } finally {
      reader.releaseLock();
      // Reset editing state if no actions were processed
      if (actions.length === 0) {
        setIsEditingSchema(false);
      }
    }
    // Process actions after streaming is complete
    console.log('[Frontend] Processing actions:', actions);
    setConsoleOutput(prev => [...prev, `🔍 Processing AI agent actions...`]);
    
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        console.log('[Frontend] Processing action:', action);
        setConsoleOutput(prev => [...prev, `⚙️ Processing action: ${action.type}`]);
        
        if (action.status === 'complete' && action.data) {
          switch (action.type) {
            case 'generate_schema': {
              console.log('[Frontend] Processing generate_schema action:', action.data);
              console.log('[Frontend] WARNING: Received generate_schema action when schema should be edited!');
              
              setConsoleOutput(prev => [...prev, `🎯 Processing schema generation action`]);
              
              // Replace existing schema or create new one (maintain only one schema)
              const newSchema = {
                id: Date.now().toString(),
                name: action.data.name || 'Generated Schema',
                schema: action.data,
                namespaceId: namespace?.['namespace-id'] || '',
                timestamp: action.data.timestamp || new Date()
              };
              
              console.log('[Frontend] Setting schema (replacing existing):', newSchema);
              setSchemas([newSchema]); // Replace all schemas with just this one
              setRawSchemas([{ id: newSchema.id, content: JSON.stringify(action.data, null, 2) }]); // Replace all raw schemas
              setActiveTab('schema');
              
              setConsoleOutput(prev => [...prev, `✅ Schema generated successfully!`]);
              setConsoleOutput(prev => [...prev, `📋 Schema name: ${newSchema.name}`]);
              setConsoleOutput(prev => [...prev, `🆔 Schema ID: ${newSchema.id}`]);
              setConsoleOutput(prev => [...prev, `📏 Schema size: ${JSON.stringify(action.data).length} characters`]);
              
              setLiveSchema('');
              setIsStreamingSchema(false);
              break;
            }
            case 'edit_schema': {
              console.log('[Frontend] Processing edit_schema action:', action.data);
              setConsoleOutput(prev => [...prev, `🎯 Processing schema editing action`]);
              
              // Update the existing schema with the edited version
              if (schemas.length > 0) {
                const updatedSchema = {
                  ...schemas[0], // Use the first (and only) schema
                  schema: action.data,
                  edited: true,
                  lastEdited: new Date()
                };
                setSchemas([updatedSchema]); // Keep only one schema
                // Update the raw schema content
                const updatedRawSchema = {
                  ...rawSchemas[0], // Use the first (and only) raw schema
                  content: JSON.stringify(action.data, null, 2)
                };
                setRawSchemas([updatedRawSchema]); // Keep only one raw schema
                setActiveTab('schema');
                
                setConsoleOutput(prev => [...prev, `✅ Schema edited successfully!`]);
                setConsoleOutput(prev => [...prev, `📋 Updated schema: ${updatedSchema.name}`]);
                setConsoleOutput(prev => [...prev, `📏 New schema size: ${JSON.stringify(action.data).length} characters`]);
                
                setLiveSchema('');
                setIsStreamingSchema(false);
                setIsEditingSchema(false);
              }
              break;
            }
            case 'generate_api': {
              // Parse OpenAPI spec and extract endpoints
              const openApi = action.data;
              console.log('🔍 Received generate_api action with data:', openApi);
              const endpoints = [];
              if (openApi && openApi.paths) {
                for (const path in openApi.paths) {
                  for (const method in openApi.paths[path]) {
                    const endpoint = {
                      path,
                      method: method.toUpperCase(),
                      summary: openApi.paths[path][method].summary || '',
                      description: openApi.paths[path][method].description || '',
                      operation: openApi.paths[path][method]
                    };
                    endpoints.push(endpoint);
                    console.log('📡 Extracted endpoint from generate_api:', endpoint);
                  }
                }
              }
              const newApi = {
                id: Date.now().toString(),
                name: openApi.info?.title || 'Generated API',
                openApi, // store the full spec for Swagger UI etc.
                endpoints,
                timestamp: new Date()
              };
              setApiEndpoints((prev: any[]) => [...prev, newApi]);
              setActiveTab('api');
              setConsoleOutput((prev: string[]) => [...prev, '✅ API generated successfully']);
              break;
            }
            case 'generate_code': {
              // Trigger backend code generation and update Files tab
              setConsoleOutput((prev: string[]) => [...prev, '🚀 Generating backend code...']);
              // Call backend codegen endpoint
              fetch(`${API_BASE_URL}/code-generation/generate-backend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  namespaceId: namespace['namespace-id'],
                  schemas: schemas.map(s => s.schema),
                  apis: apiEndpoints,
                  projectType: 'nodejs',
                  namespaceName: namespace['namespace-name'] || 'Project'
                })
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    setConsoleOutput(prev => [...prev, `✅ Generated ${data.files.length} files successfully!`]);
                    refreshFileTree();
                    setActiveTab('files');
                  } else {
                    setConsoleOutput(prev => [...prev, `❌ Code generation failed: ${data.error}`]);
                  }
                })
                .catch(err => {
                  setConsoleOutput(prev => [...prev, `❌ Error generating code: ${err.message}`]);
                });
              break;
            }
            case 'test':
              setConsoleOutput((prev: string[]) => [...prev, '✅ API testing completed']);
              if (action.data) {
                setConsoleOutput((prev: string[]) => [...prev, ...action.data.map((r: any) => `- ${r.endpoint}: ${r.status}`)]);
              }
              setActiveTab('console');
              break;
            case 'save':
              setConsoleOutput((prev: string[]) => [...prev, '✅ Items saved to namespace']);
              if (action.data) {
                setConsoleOutput((prev: string[]) => [...prev, ...action.data.map((item: any) => `- ${item.type}: ${item.name} (${item.status})`)]);
              }
              setActiveTab('console');
              break;
            default:
              setConsoleOutput((prev: string[]) => [...prev, `ℹ️ Action: ${action.type}`]);
              break;
          }
        } else if (action.status === 'error') {
          setConsoleOutput((prev: string[]) => [...prev, `❌ Error in ${action.type}: ${action.error}`]);
          setActiveTab('console');
        }
      }
    }
    // Fallback: Try to extract schema from the assistant's message if no actions were processed
    if ((!actions || actions.length === 0) && assistantMessage) {
      console.log('[Frontend] No actions received, trying to extract schema from message');
      try {
        // Look for JSON code blocks in the assistant's message
        const jsonMatch = assistantMessage.match(/```json\s*([\s\S]*?)\s*```/i) || 
                         assistantMessage.match(/```\s*([\s\S]*?)\s*```/i) ||
                         assistantMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const schemaData = JSON.parse(jsonStr);
          // Check if this looks like a schema (has properties or type)
          if (schemaData && (schemaData.properties || schemaData.type)) {
            console.log('[Frontend] Extracted schema from message:', schemaData);
            const newSchema = {
              id: Date.now().toString(),
              name: 'Generated Schema',
              schema: schemaData,
              namespaceId: namespace?.['namespace-id'] || '',
              timestamp: new Date()
            };
            setSchemas((prev) => [...prev, newSchema]);
            setRawSchemas((prev) => [...prev, { id: newSchema.id, content: JSON.stringify(schemaData, null, 2) }]);
            setActiveTab('schema');
            setConsoleOutput((prev) => [...prev, '✅ Schema extracted from message successfully']);
            setLiveSchema('');
          }
        }
      } catch (e) {
        console.log('[Frontend] Failed to extract schema from message:', e);
      }
    }
  };

  const processStreamedContent = async (content: string, originalMessage: string) => {
    // Check if this is a schema generation request
    if (originalMessage.toLowerCase().includes('schema') || content.includes('"$schema"') || content.includes('"type": "object"')) {
      try {
        // Try to parse as JSON schema
        const schemaData = JSON.parse(content);
        const newSchema = {
          id: Date.now().toString(),
          name: 'Generated Schema',
          schema: schemaData,
          timestamp: new Date()
        };
        setSchemas(prev => [...prev, newSchema]);
        setRawSchemas(prev => [...prev, { id: newSchema.id, content: JSON.stringify(schemaData, null, 2) }]);
        setActiveTab('schema');
        setConsoleOutput(prev => [...prev, '✅ Schema generated successfully']);
        return;
      } catch (e) {
        // Not valid JSON, continue with other processing
      }
    }

    // Check if this is an API generation request
    if (originalMessage.toLowerCase().includes('api') || content.includes('endpoints') || content.includes('method') || content.includes('openapi')) {
      try {
        const apiData = JSON.parse(content);
        
        // Check if this is an OpenAPI spec (has paths object)
        if (apiData.paths && typeof apiData.paths === 'object') {
          console.log('🔍 Parsing OpenAPI spec:', apiData);
          // Parse OpenAPI spec and extract endpoints
          const endpoints = [];
          for (const path in apiData.paths) {
            for (const method in apiData.paths[path]) {
              const endpoint = {
                path,
                method: method.toUpperCase(),
                summary: apiData.paths[path][method].summary || '',
                description: apiData.paths[path][method].description || '',
                operation: apiData.paths[path][method]
              };
              endpoints.push(endpoint);
              console.log('📡 Extracted endpoint:', endpoint);
            }
          }
          const newApi = {
            id: Date.now().toString(),
            name: apiData.info?.title || 'Generated API',
            openApi: apiData, // store the full spec for Swagger UI etc.
            endpoints,
            timestamp: new Date()
          };
          setApiEndpoints(prev => [...prev, newApi]);
          setActiveTab('api');
          setConsoleOutput(prev => [...prev, '✅ API generated successfully']);
          return;
        } else if (apiData.endpoints || Array.isArray(apiData)) {
          // Handle direct endpoints array format
          const endpoints = Array.isArray(apiData) ? apiData : apiData.endpoints;
          const newApi = {
            id: Date.now().toString(),
            name: 'Generated API',
            endpoints,
            timestamp: new Date()
          };
          setApiEndpoints(prev => [...prev, newApi]);
          setActiveTab('api');
          setConsoleOutput(prev => [...prev, '✅ API generated successfully']);
          return;
        }
      } catch (e) {
        // Not valid JSON, continue with other processing
      }
    }

    // Extract file operations from streamed content
    const fileMatch = content.match(/file:\s*(.+)/i);
    const codeMatch = content.match(/```[\s\S]*?```/g);
    
    if (fileMatch || codeMatch) {
      // Extract file path and content
      let filePath = '';
      let fileContent = '';
      
      if (fileMatch) {
        filePath = fileMatch[1].trim();
      }
      
      if (codeMatch) {
        fileContent = codeMatch[0].replace(/```[\w]*\n?/g, '').trim();
      }
      
      // Create file in workspace
      if (filePath && fileContent && namespace?.['namespace-id']) {
        try {
          const fileResponse = await fetch('/unified/file-operations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operation: 'create',
              namespaceId: namespace['namespace-id'],
              filePath,
              content: fileContent
            })
          });
          
          if (fileResponse.ok) {
            // Update file tree
            await refreshFileTree();
            // Switch to files tab to show the new file
            setActiveTab('files');
            setConsoleOutput(prev => [...prev, `✅ File ${filePath} created successfully`]);
          }
        } catch (error) {
          const err = error as Error;
          setConsoleOutput((prev) => [...prev, `❌ Error: ${err.message}`]);
        }
      }
    }

    // If no specific processing was done, add to console
    if (content.trim()) {
      setConsoleOutput(prev => [...prev, `📝 Generated: ${content.substring(0, 100)}...`]);
    }
  };

  const refreshFileTree = async () => {
    if (!namespace?.['namespace-id']) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/code-generation/files/${namespace['namespace-id']}`);
      if (response.ok) {
        const data = await response.json();
        if (data.files) {
          // Convert flat file list to tree structure
          const fileTree: ProjectFile[] = [];
          const fileMap = new Map<string, ProjectFile>();
          
          data.files.forEach((file: any) => {
            const pathParts = file.path.split('/');
            const fileName = pathParts[pathParts.length - 1];
            
            const projectFile: ProjectFile = {
              id: file.path,
              name: fileName,
              type: file.type,
              path: file.path,
              children: file.type === 'directory' ? [] : undefined
            };
            
            if (file.type === 'file') {
              fileMap.set(file.path, projectFile);
            } else {
              fileMap.set(file.path, projectFile);
            }
          });
          
          // Build tree structure
          data.files.forEach((file: any) => {
            const pathParts = file.path.split('/');
            if (pathParts.length === 1) {
              // Root level file/folder
              fileTree.push(fileMap.get(file.path)!);
            } else {
              // Nested file/folder
              const parentPath = pathParts.slice(0, -1).join('/');
              const parent = fileMap.get(parentPath);
              if (parent && parent.children) {
                parent.children.push(fileMap.get(file.path)!);
              }
            }
          });
          
          setProjectFiles(fileTree);
        }
      }
    } catch (error) {
      const err = error as Error;
      setConsoleOutput((prev) => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  const readFileContent = async (filePath: string) => {
    if (!namespace?.['namespace-id']) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/code-generation/files/${namespace['namespace-id']}/${encodeURIComponent(filePath)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          setFileContent(data.content);
          return data.content;
        }
      }
    } catch (error) {
      console.error('Error reading file:', error);
    }
    return null;
  };

  const routeOutputToTab = (output: any, type: string) => {
    switch (type) {
      case 'schema':
        const newSchema = {
          id: Date.now().toString(),
          name: 'Generated Schema',
          schema: output,
          timestamp: new Date()
        };
        setSchemas(prev => [...prev, newSchema]);
        setRawSchemas(prev => [...prev, { id: newSchema.id, content: output }]);
        setActiveTab('schema');
        // Removed auto-save to backend for session-only schemas
        break;
        
      case 'api':
        try {
          const apiData = JSON.parse(output);
          
          // Check if this is an OpenAPI spec (has paths object)
          if (apiData.paths && typeof apiData.paths === 'object') {
            console.log('🔍 Parsing OpenAPI spec in routeOutputToTab:', apiData);
            // Parse OpenAPI spec and extract endpoints
            const endpoints = [];
            for (const path in apiData.paths) {
              for (const method in apiData.paths[path]) {
                const endpoint = {
                  path,
                  method: method.toUpperCase(),
                  summary: apiData.paths[path][method].summary || '',
                  description: apiData.paths[path][method].description || '',
                  operation: apiData.paths[path][method]
                };
                endpoints.push(endpoint);
                console.log('📡 Extracted endpoint in routeOutputToTab:', endpoint);
              }
            }
            const newApi = {
              id: Date.now().toString(),
              name: apiData.info?.title || 'Generated API',
              openApi: apiData, // store the full spec for Swagger UI etc.
              endpoints,
              timestamp: new Date()
            };
            setApiEndpoints(prev => [...prev, newApi]);
            setActiveTab('api');
            // Auto-save workspace state when API is added
            setTimeout(() => saveWorkspaceState(), 500);
          } else if (apiData.endpoints || Array.isArray(apiData)) {
            // Handle direct endpoints array format
            const endpoints = Array.isArray(apiData) ? apiData : apiData.endpoints;
            const newApi = {
              id: Date.now().toString(),
              name: 'Generated API',
              endpoints,
              timestamp: new Date()
            };
            setApiEndpoints(prev => [...prev, newApi]);
            setActiveTab('api');
            // Auto-save workspace state when API is added
            setTimeout(() => saveWorkspaceState(), 500);
          }
        } catch (error) {
          console.error('Error parsing API output:', error);
        }
        break;
        
      case 'test':
        setConsoleOutput(prev => [...prev, output]);
        setActiveTab('console');
        break;
        
              case 'file':
          refreshFileTree();
          setActiveTab('files');
          break;
        
        case 'project':
          refreshFileTree();
          setActiveTab('files');
          break;
        
        case 'codegen':
          generateBackendCode();
          break;
        
      default:
        // Just show in chat
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderFileTree = (files: ProjectFile[], level = 0) => (
    <div className="space-y-1">
      {files.map(file => (
        <div key={file.id}>
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
              selectedFile?.id === file.id ? 'bg-blue-100' : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={async () => {
              setSelectedFile(file);
              if (file.type === 'file' && namespace?.['namespace-id']) {
                // Load actual file content
                try {
                  const response = await fetch(`${API_BASE_URL}/code-generation/files/${namespace['namespace-id']}/${encodeURIComponent(file.path)}`);
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data.content) {
                      setFileContent(data.content);
                    } else {
                      setFileContent('// Error loading file content');
                    }
                  }
                } catch (error) {
                  console.error('Error reading file:', error);
                  setFileContent('// Error loading file content');
                }
              }
            }}
          >
            {file.type === 'folder' ? <Folder size={14} /> : <File size={14} />}
            <span className="text-sm">{file.name}</span>
          </div>
          {file.children && renderFileTree(file.children, level + 1)}
        </div>
      ))}
    </div>
  );

  // API Testing logic
  const handleApiTest = async (endpoint: any, index: string) => {
    setApiTestLoading((prev) => ({ ...prev, [index]: true }));
    setApiTestResults((prev) => ({ ...prev, [index]: null }));
    try {
      // Ensure we have valid endpoint data
      if (!endpoint.path || !endpoint.method) {
        throw new Error('Invalid endpoint: missing path or method');
      }
      
      // Find the API that contains this endpoint
      const api = apiEndpoints.find(api => 
        api.endpoints.some((ep: any) => ep.path === endpoint.path && ep.method === endpoint.method)
      );
      
      let url = endpoint.path;
      const method = endpoint.method.split(',')[0].trim().toUpperCase();
      
      // If this is a dynamic API, use the dynamic API endpoint
      if (api?.openApi?.apiId) {
        // Remove leading slash if present
        const cleanPath = endpoint.path.startsWith('/') ? endpoint.path.slice(1) : endpoint.path;
        // Construct the URL
        let url;
        if (api.openApi && api.openApi.apiId) {
          url = `${API_BASE_URL}/dynamic-api/${api.openApi.apiId}/${cleanPath}`;
        } else {
          url = endpoint.path.startsWith('http') ? endpoint.path : `${API_BASE_URL}${endpoint.path}`;
        }
        console.log(`[API Test] Using dynamic API endpoint: ${url}`);
      } else {
        // Fallback to direct URL
        url = endpoint.path.startsWith('http') ? endpoint.path : `http://localhost:5001${endpoint.path}`;
        console.log(`[API Test] Using fallback endpoint: ${url}`);
      }
      
      let res;
      if (method === 'GET') {
        res = await fetch(url);
      } else {
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: apiTestInput[index] || '{}',
        });
      }
      
      const data = await res.json();
      setApiTestResults((prev) => ({ ...prev, [index]: data }));
    } catch (e) {
      const err = e as Error;
      setApiTestResults((prev) => ({ ...prev, [index]: { error: err.message } }));
    } finally {
      setApiTestLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleSaveApiToNamespace = async (apiData: any) => {
    if (!namespace?.['namespace-id'] || !apiData.canSaveToNamespace) {
      console.warn('Cannot save API: missing namespace or save not allowed');
      return;
    }

    setSavingApi((prev) => ({ ...prev, [apiData.apiId]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/save-api-to-namespace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceId: namespace['namespace-id'],
          apiData: apiData
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API saved successfully:', result);
        
        // Update the API data to show it's saved
        setApiEndpoints(prev => prev.map(api => 
          api.openApi?.apiId === apiData.apiId 
            ? { ...api, saved: true, savedAt: new Date().toISOString() }
            : api
        ));
        
        // Add success message
        addMessage({
          role: 'assistant',
          content: `✅ API "${apiData.info?.title || 'Generated API'}" has been saved to namespace "${apiData.namespaceName}". You can now access it from the namespace's API tab.`
        });
      } else {
        throw new Error('Failed to save API');
      }
    } catch (error) {
      console.error('Error saving API:', error);
      addMessage({
        role: 'assistant',
        content: `❌ Failed to save API: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setSavingApi((prev) => ({ ...prev, [apiData.apiId]: false }));
    }
  };

  const handleSaveSchemaToNamespace = async (schemaData: any) => {
    setSavingSchema((prev) => ({ ...prev, [schemaData.id || 'schema']: true }));
    try {
      setConsoleOutput(prev => [...prev, `💾 Saving schema to namespace...`]);
      setConsoleOutput(prev => [...prev, `📋 Schema name: ${schemaData.name || 'Unnamed Schema'}`]);
      
      const response = await fetch(`${API_BASE_URL}/save-schema-to-namespace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceId: namespace?.['namespace-id'],
          schemaData: {
            name: schemaData.name || 'Generated Schema',
            schema: schemaData.schema,
            namespaceId: namespace?.['namespace-id'] || '',
            url: schemaData.url || '',
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setConsoleOutput(prev => [...prev, `✅ Schema saved successfully!`]);
        setConsoleOutput(prev => [...prev, `📁 Saved to namespace: ${namespace?.['namespace-name'] || 'Unknown'}`]);
        setConsoleOutput(prev => [...prev, `🆔 Namespace ID: ${namespace?.['namespace-id'] || 'Unknown'}`]);
        
        // Show success message
        addMessage({
          role: 'assistant',
          content: `✅ Schema "${schemaData.name || 'Generated Schema'}" has been saved to namespace "${schemaData.namespaceName}". You can now access it from the namespace's Schema tab.`
        });
      } else {
        setConsoleOutput(prev => [...prev, `❌ Failed to save schema: ${response.status}`]);
        throw new Error(`Failed to save schema: ${response.status}`);
      }
    } catch (error) {
      setConsoleOutput(prev => [...prev, `❌ Error saving schema: ${error.message}`]);
      console.error('Error saving schema to namespace:', error);
    } finally {
      setSavingSchema((prev) => ({ ...prev, [schemaData.id || 'schema']: false }));
    }
  };

  const generateBackendCode = async () => {
    console.log('🔍 Generate button clicked!');
    console.log('Namespace:', namespace);
    console.log('Project name:', projectName);
    console.log('Project type:', projectType);
    console.log('Schemas:', schemas);
    console.log('APIs:', apiEndpoints);
    
    if (!namespace?.['namespace-id']) {
      console.log('❌ No namespace ID');
      setConsoleOutput(prev => [...prev, '❌ No namespace ID found']);
      return;
    }
    
    if (!projectName.trim()) {
      console.log('❌ No project name');
      setConsoleOutput(prev => [...prev, '❌ Please enter a project name']);
      return;
    }
    
    // Get current workspace schemas and APIs
    const currentSchemas = schemas.map(s => s.schema);
    const currentApis = apiEndpoints;
    
    console.log('Current schemas:', currentSchemas);
    console.log('Current APIs:', currentApis);
    
    if (currentSchemas.length === 0 && currentApis.length === 0) {
      console.log('❌ No schemas or APIs');
      setConsoleOutput(prev => [...prev, '❌ Please generate at least one schema or API first using the AI agent']);
      return;
    }
    
    try {
      setIsGenerating(true);
      setConsoleOutput(prev => [...prev, `🔄 Generating ${projectType.toUpperCase()} backend code for "${projectName}"...`]);
      setConsoleOutput(prev => [...prev, `📊 Using ${currentSchemas.length} schemas and ${currentApis.length} APIs from workspace`]);
      
      const requestBody = {
        namespaceId: namespace['namespace-id'],
        schemas: currentSchemas,
        apis: currentApis,
        projectType,
        namespaceName: projectName
      };
      
      console.log('🌐 Making request to:', 'http://localhost:5001/code-generation/generate-backend');
      console.log('📤 Request body:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/code-generation/generate-backend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log(' Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Response data:', data);
        
        if (data.success) {
          setConsoleOutput(prev => [...prev, `✅ Generated ${data.files.length} files successfully!`]);
          data.files.forEach((file: any) => {
            setConsoleOutput(prev => [...prev, `📄 Created: ${file.path}`]);
          });
          
          // Add to generation history
          const generationRecord = {
            id: Date.now(),
            projectName,
            projectType,
            filesCount: data.files.length,
            timestamp: new Date(),
            files: data.files
          };
          setGenerationHistory(prev => [generationRecord, ...prev]);
          
          // Refresh file tree to show new files
          await refreshFileTree();
          setActiveTab('files');
          
          setConsoleOutput(prev => [...prev, `🚀 ${projectType.toUpperCase()} project "${projectName}" is ready! Check the Files tab.`]);
        } else {
          setConsoleOutput(prev => [...prev, `❌ Code generation failed: ${data.error}`]);
        }
      } else {
        setConsoleOutput(prev => [...prev, `❌ Code generation failed with status: ${response.status}`]);
      }
    } catch (error) {
      const err = error as Error;
      console.error('❌ Fetch error:', err);
      setConsoleOutput(prev => [...prev, `❌ Error generating code: ${err.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  // State for saved items
  const [savedSchemas, setSavedSchemas] = useState<any[]>([]); // For Lambda dropdown only
  const [savedApis, setSavedApis] = useState<any[]>([]);
  const [savedFiles, setSavedFiles] = useState<ProjectFile[]>([]);

  // Code generation state
  const [projectType, setProjectType] = useState<'nodejs' | 'python'>('nodejs');
  const [projectName, setProjectName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);

  // 1. Filter schemas for the current namespace in the Lambda tab dropdown
  const filteredSavedSchemas = savedSchemas.filter(s => !namespace || !namespace['namespace-id'] || s.namespaceId === namespace['namespace-id']);

  // Place function declarations before their first usage
  function generateLambdaFileStructure(lambdaCode: string, functionName: string, runtime: string) {
    console.log('generateLambdaFileStructure called with:', { lambdaCode, functionName, runtime });
    setConsoleOutput(prev => [...prev, `📁 Creating Lambda function structure for: ${functionName}`]);
    
    // Determine file extension based on runtime
    let fileExtension = 'js';
    if (runtime.includes('python')) {
      fileExtension = 'py';
    } else if (runtime.includes('java')) {
      fileExtension = 'java';
    } else if (runtime.includes('go')) {
      fileExtension = 'go';
    }
    
    setConsoleOutput(prev => [...prev, `📄 File extension: ${fileExtension}`]);
    
    // Create the main lambda function file
    const lambdaFileName = `index.${fileExtension}`;
    const lambdaFilePath = `/lambdas/${functionName}/${lambdaFileName}`;
    
    setConsoleOutput(prev => [...prev, `📝 Creating main file: ${lambdaFileName}`]);
    
    // Detect imports in the Lambda code for Node.js lambdas
    let packageJsonContent = '';
    if (runtime.includes('nodejs')) {
      const dependencies: { [key: string]: string } = {};
      
      // Dynamic import detection - parse the code for any require() or import statements
      const importRegex = /(?:require|import)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
      const es6ImportRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
      
      let match;
      const detectedImports = new Set<string>();
      
      // Find require() statements
      while ((match = importRegex.exec(lambdaCode)) !== null) {
        const packageName = match[1];
        if (packageName && !packageName.startsWith('.') && !packageName.startsWith('/')) {
          detectedImports.add(packageName);
        }
      }
      
      // Find ES6 import statements
      while ((match = es6ImportRegex.exec(lambdaCode)) !== null) {
        const packageName = match[1];
        if (packageName && !packageName.startsWith('.') && !packageName.startsWith('/')) {
          detectedImports.add(packageName);
        }
      }
      
      // Add detected packages to dependencies with appropriate versions
      detectedImports.forEach(packageName => {
        // Map common packages to their latest stable versions
        const versionMap: { [key: string]: string } = {
          'aws-sdk': '^2.1531.0',
          '@aws-sdk/client-dynamodb': '^3.540.0',
          '@aws-sdk/lib-dynamodb': '^3.540.0',
          '@aws-sdk/client-s3': '^3.540.0',
          '@aws-sdk/client-lambda': '^3.540.0',
          '@aws-sdk/client-sqs': '^3.540.0',
          '@aws-sdk/client-sns': '^3.540.0',
          '@aws-sdk/client-cloudwatch': '^3.540.0',
          'axios': '^1.6.0',
          'lodash': '^4.17.21',
          'moment': '^2.29.4',
          'uuid': '^9.0.1',
          'crypto': '^1.0.1',
          'fs': '^0.0.1-security',
          'path': '^0.12.7',
          'querystring': '^0.2.1',
          'url': '^0.11.3',
          'util': '^0.12.5',
          'zlib': '^1.0.5',
          'stream': '^0.0.2',
          'buffer': '^6.0.3',
          'events': '^3.3.0',
          'http': '^0.0.1-security',
          'https': '^1.0.0',
          'net': '^1.0.2',
          'tls': '^0.0.1',
          'child_process': '^1.0.2',
          'cluster': '^0.7.7',
          'dgram': '^1.0.1',
          'dns': '^0.2.2',
          'domain': '^0.0.1',
          'os': '^0.1.2',
          'punycode': '^2.3.1',
          'readline': '^1.3.0',
          'repl': '^0.1.4',
          'string_decoder': '^1.3.0',
          'sys': '^0.0.1',
          'timers': '^0.1.1',
          'tty': '^1.0.1',
          'v8': '^0.1.0',
          'vm': '^0.1.0',
          'zlib': '^1.0.5'
        };
        
        // Skip built-in Node.js modules
        const builtInModules = [
          'fs', 'path', 'crypto', 'querystring', 'url', 'util', 'zlib', 
          'stream', 'buffer', 'events', 'http', 'https', 'net', 'tls',
          'child_process', 'cluster', 'dgram', 'dns', 'domain', 'os',
          'punycode', 'readline', 'repl', 'string_decoder', 'sys',
          'timers', 'tty', 'v8', 'vm', 'zlib'
        ];
        
        if (!builtInModules.includes(packageName)) {
          const version = versionMap[packageName] || '^1.0.0'; // Default to latest version
          dependencies[packageName] = version;
          setConsoleOutput(prev => [...prev, `📦 Detected import: ${packageName} (${version})`]);
        }
      });
      
      // Create package.json with detected dependencies
      packageJsonContent = JSON.stringify({
        name: functionName,
        version: "1.0.0",
        description: `AWS Lambda function: ${functionName}`,
        main: "index.js",
        scripts: {
          test: "echo \"Error: no test specified\" && exit 1"
        },
        dependencies: dependencies,
        devDependencies: {},
        keywords: ["aws", "lambda"],
        author: "",
        license: "ISC"
      }, null, 2);
      
      if (Object.keys(dependencies).length > 0) {
        setConsoleOutput(prev => [...prev, `📦 Created package.json with dependencies: ${Object.keys(dependencies).join(', ')}`]);
      } else {
        setConsoleOutput(prev => [...prev, `📦 Created package.json with no external dependencies`]);
      }
    }
    
    // Create the file structure
    const newFiles: ProjectFile[] = [
      {
        id: `lambda-${functionName}-${Date.now()}`,
        name: functionName,
        type: 'folder',
        path: `/lambdas/${functionName}`,
        children: [
          {
            id: `lambda-${functionName}-main-${Date.now()}`,
            name: lambdaFileName,
            type: 'file',
            path: lambdaFilePath,
            content: lambdaCode
          }
        ]
      }
    ];
    
    // Add package.json for Node.js lambdas
    if (packageJsonContent) {
      newFiles[0].children!.push({
        id: `lambda-${functionName}-package-${Date.now()}`,
        name: 'package.json',
        type: 'file',
        path: `/lambdas/${functionName}/package.json`,
        content: packageJsonContent
      });
    }
    
    // Add README.md
    const readmeContent = `# ${functionName}

This is an AWS Lambda function generated by the AI Agent Workspace.

## Runtime
${runtime}

## Handler
${lambdaForm.handler}

## Memory
${lambdaForm.memory} MB

## Timeout
${lambdaForm.timeout} seconds

## Environment Variables
${lambdaForm.environment || 'None'}

## Deployment
This function can be deployed to AWS Lambda using the AWS CLI or AWS Console.

## Local Testing
To test locally, you can use AWS SAM or the AWS Lambda runtime interface emulator.
`;
    
    newFiles[0].children!.push({
      id: `lambda-${functionName}-readme-${Date.now()}`,
      name: 'README.md',
      type: 'file',
      path: `/lambdas/${functionName}/README.md`,
      content: readmeContent
    });
    
    setConsoleOutput(prev => [...prev, `📖 Creating README.md with function documentation`]);
    
    // Update the project files state
    setProjectFiles(prev => {
      // Check if the lambda folder already exists
      const existingLambdaFolder = prev.find(file => 
        file.type === 'folder' && file.name === functionName && file.path === `/lambdas/${functionName}`
      );
      
      if (existingLambdaFolder) {
        // Update existing folder
        setConsoleOutput(prev => [...prev, `🔄 Updating existing Lambda folder: ${functionName}`]);
        return prev.map(file => {
          if (file.id === existingLambdaFolder.id) {
            return {
              ...file,
              children: newFiles[0].children
            };
          }
          return file;
        });
      } else {
        // Add new folder
        setConsoleOutput(prev => [...prev, `✨ Creating new Lambda folder: ${functionName}`]);
        return [...prev, ...newFiles];
      }
    });
    
    setConsoleOutput(prev => [...prev, `✅ Lambda function structure created successfully!`]);
    setConsoleOutput(prev => [...prev, `📂 Files created:`]);
    newFiles[0].children!.forEach(file => {
      setConsoleOutput(prev => [...prev, `   - ${file.name}`]);
    });
    
    console.log(`Created Lambda function structure for ${functionName}`);
  }

  function runProject() {
    console.log('Run Project button clicked!');
    setConsoleOutput(prev => [...prev, '🚀 Starting project deployment...']);
    setIsRunningProject(true);
    setIsDeploying(true);
    
    // Debug: Log current project files structure
    console.log('Current project files:', projectFiles);
    setConsoleOutput(prev => [...prev, `📁 Scanning project files (${projectFiles.length} root items)...`]);
    
    // Find Lambda functions in the project files
    const lambdaFunctions = findLambdaFunctions();
    
    console.log('Found Lambda functions:', lambdaFunctions);
    
    if (lambdaFunctions.length === 0) {
      setConsoleOutput(prev => [...prev, '❌ No Lambda functions found in the project files.']);
      setConsoleOutput(prev => [...prev, '💡 Generate a Lambda function first using the Lambda tab.']);
      setConsoleOutput(prev => [...prev, '🔍 Debug: Available files:']);
      projectFiles.forEach(file => {
        setConsoleOutput(prev => [...prev, `   - ${file.name} (${file.type})`]);
      });
      setIsRunningProject(false);
      setIsDeploying(false);
      return;
    }
    
    setConsoleOutput(prev => [...prev, `📦 Found ${lambdaFunctions.length} Lambda function(s) to deploy:`]);
    lambdaFunctions.forEach(func => {
      setConsoleOutput(prev => [...prev, `   - ${func.name} (${func.runtime})`]);
    });
    
    // Deploy each Lambda function
    deployLambdaFunctions(lambdaFunctions).finally(() => {
      setIsRunningProject(false);
      setIsDeploying(false);
    });
  }

  function findLambdaFunctions(): Array<{name: string, path: string, code: string, runtime: string, handler: string, memory: number, timeout: number, dependencies?: any}> {
    const lambdaFunctions: Array<{name: string, path: string, code: string, runtime: string, handler: string, memory: number, timeout: number, dependencies?: any}> = [];
    
    // Helper function to recursively search for Lambda functions
    function searchForLambdaFunctions(files: ProjectFile[]): void {
      files.forEach(file => {
        if (file.type === 'folder') {
          // Check if this folder contains Lambda function files
          const hasLambdaFiles = file.children?.some(child => 
            child.type === 'file' && (
              child.name === 'index.js' || 
              child.name === 'index.py' || 
              child.name === 'index.java' || 
              child.name === 'main.go'
            )
          );
          
          if (hasLambdaFiles) {
            // This folder contains Lambda function files
            const mainFile = file.children?.find(child => 
              child.type === 'file' && (
                child.name === 'index.js' || 
                child.name === 'index.py' || 
                child.name === 'index.java' || 
                child.name === 'main.go'
              )
            );
            
            if (mainFile && mainFile.content) {
              // Determine runtime based on file extension
              let runtime = 'nodejs18.x';
              let handler = 'index.handler';
              
              if (mainFile.name.endsWith('.py')) {
                runtime = 'python3.9';
                handler = 'index.lambda_handler';
              } else if (mainFile.name.endsWith('.java')) {
                runtime = 'java11';
                handler = 'com.example.Handler::handleRequest';
              } else if (mainFile.name.endsWith('.go')) {
                runtime = 'provided.al2';
                handler = 'bootstrap';
              }
              
              // Extract dependencies from package.json if it exists
              let dependencies = {};
              const packageJsonFile = file.children?.find(child => 
                child.type === 'file' && child.name === 'package.json'
              );
              
              if (packageJsonFile && packageJsonFile.content) {
                try {
                  const packageJson = JSON.parse(packageJsonFile.content);
                  dependencies = packageJson.dependencies || {};
                  console.log(`Found dependencies for ${file.name}:`, dependencies);
                } catch (error) {
                  console.error(`Error parsing package.json for ${file.name}:`, error);
                }
              }
              
              lambdaFunctions.push({
                name: file.name,
                path: file.path,
                code: mainFile.content,
                runtime: runtime,
                handler: handler,
                memory: 128,
                timeout: 30,
                dependencies: dependencies
              });
            }
          }
          
          // Recursively search in children
          if (file.children) {
            searchForLambdaFunctions(file.children);
          }
        }
      });
    }
    
    searchForLambdaFunctions(projectFiles);
    return lambdaFunctions;
  }

  async function deployLambdaFunctions(functions: Array<{name: string, path: string, code: string, runtime: string, handler: string, memory: number, timeout: number, dependencies?: any}>) {
    setConsoleOutput(prev => [...prev, '🌐 Connecting to AWS Lambda deployment service...']);
    
    for (let i = 0; i < functions.length; i++) {
      const func = functions[i];
      
      setConsoleOutput(prev => [...prev, `📦 Deploying Lambda function: ${func.name}`]);
      setConsoleOutput(prev => [...prev, `   Runtime: ${func.runtime}`]);
      setConsoleOutput(prev => [...prev, `   Handler: ${func.handler}`]);
      setConsoleOutput(prev => [...prev, `   Memory: ${func.memory} MB`]);
      setConsoleOutput(prev => [...prev, `   Timeout: ${func.timeout} seconds`]);
      
      try {
        // Use mock deployment for now to avoid AWS role issues
        const deployPayload = {
          functionName: func.name,
          code: func.code,
          runtime: func.runtime,
          handler: func.handler,
          memorySize: func.memory,
          timeout: func.timeout,
          dependencies: func.dependencies || {}
        };
        
        console.log('Deploying with payload:', deployPayload);
        setConsoleOutput(prev => [...prev, `🔧 Debug: Sending deployment request for real deployment`]);
        if (Object.keys(func.dependencies || {}).length > 0) {
          setConsoleOutput(prev => [...prev, `📦 Dependencies detected: ${Object.keys(func.dependencies || {}).join(', ')}`]);
        }
        
        const deployResponse = await fetch(`${API_BASE_URL}/lambda/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deployPayload)
        });
        
        console.log('Deploy response status:', deployResponse.status);
        
        if (!deployResponse.ok) {
          const errorText = await deployResponse.text();
          console.error('Deploy error response:', errorText);
          throw new Error(`Deployment failed: ${deployResponse.status} - ${errorText}`);
        }
        
        const deployResult = await deployResponse.json();
        console.log('Deploy result:', deployResult);
        
        if (deployResult.success) {
          setConsoleOutput(prev => [...prev, `✅ Successfully deployed: ${func.name}`]);
          setConsoleOutput(prev => [...prev, `   Function ARN: ${deployResult.functionArn}`]);
          setConsoleOutput(prev => [...prev, `   Code Size: ${deployResult.codeSize} bytes`]);
          
          // Test the deployed function
          setConsoleOutput(prev => [...prev, `🧪 Testing deployed function: ${func.name}`]);
          
          const testPayload = {
            functionName: func.name,
            payload: {
              test: true,
              message: 'Hello from AI Agent Workspace!',
              timestamp: new Date().toISOString()
            }
          };
          
          console.log('Testing function with payload:', testPayload);
          setConsoleOutput(prev => [...prev, `🔧 Debug: Testing function: ${func.name}`]);
          
          const testResponse = await fetch(`${API_BASE_URL}/lambda/invoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
          });
          
          console.log('Test response status:', testResponse.status);
          
          if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log('Test result:', testResult);
            setConsoleOutput(prev => [...prev, `✅ Function test successful:`]);
            setConsoleOutput(prev => [...prev, `   Status Code: ${testResult.statusCode}`]);
            setConsoleOutput(prev => [...prev, `   Response: ${JSON.stringify(testResult.payload, null, 2)}`]);
            
            if (testResult.logResult) {
              setConsoleOutput(prev => [...prev, `📋 CloudWatch Logs:`]);
              setConsoleOutput(prev => [...prev, testResult.logResult]);
            }
          } else {
            const errorText = await testResponse.text();
            console.error('Test error response:', errorText);
            setConsoleOutput(prev => [...prev, `❌ Function test failed: ${testResponse.status}`]);
            setConsoleOutput(prev => [...prev, `   Error: ${errorText}`]);
          }
          
          setConsoleOutput(prev => [...prev, `🧹 Cleaned up temp files for: ${func.name}`]);
        } else {
          setConsoleOutput(prev => [...prev, `❌ Deployment failed for: ${func.name}`]);
        }
      } catch (error) {
        setConsoleOutput(prev => [...prev, `❌ Error deploying ${func.name}: ${error.message}`]);
      }
    }
    
    setConsoleOutput(prev => [...prev, '🎉 Project deployment completed!']);
    setConsoleOutput(prev => [...prev, '💡 You can now invoke your Lambda functions from the AWS Console or via API Gateway.']);
  }

  async function downloadProjectFiles() {
    if (projectFiles.length === 0) {
      alert('No files to download');
      return;
    }

    try {
      setIsDownloading(true);
      setConsoleOutput(prev => [...prev, '📦 Preparing project files for download...']);
      
      // Create a zip file using JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Helper function to add files to zip recursively
      let fileCount = 0;
      function addFilesToZip(files: ProjectFile[], zipFolder: any) {
        files.forEach(file => {
          if (file.type === 'file' && file.content) {
            // Remove leading slash from path
            const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
            zipFolder.file(filePath, file.content);
            fileCount++;
          } else if (file.type === 'folder' && file.children) {
            // Create folder in zip
            const folderPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
            const folder = zipFolder.folder(folderPath);
            if (folder) {
              addFilesToZip(file.children, folder);
            }
          }
        });
      }
      
      // Add all files to zip
      setConsoleOutput(prev => [...prev, '📁 Adding files to ZIP archive...']);
      addFilesToZip(projectFiles, zip);
      setConsoleOutput(prev => [...prev, `✅ Added ${fileCount} file(s) to archive`]);
      
      setConsoleOutput(prev => [...prev, '📝 Generating ZIP file...']);
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-agent-project-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setConsoleOutput(prev => [...prev, '✅ Project files downloaded successfully!']);
      setConsoleOutput(prev => [...prev, `📁 File: ai-agent-project-${Date.now()}.zip`]);
      
    } catch (error) {
      console.error('Error downloading project files:', error);
      setConsoleOutput(prev => [...prev, `❌ Error downloading project files: ${error.message}`]);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="h-screen w-full flex bg-white">
      {/* Left: Chat Panel */}
      <div className="flex flex-col w-[650px] min-w-[500px] max-w-[900px] border-r border-gray-200 bg-white h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">
                {namespace ? `Working with: ${namespace['namespace-name']}` : 'General Development'}
                {sessionId && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    Memory Active
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Tabbed Content Panel */}
      <div className="flex-1 flex flex-col bg-[#f8f9fb]">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-white px-4 pt-2">
          <button
            onClick={() => setActiveTab('lambda')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'lambda'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code size={16} /> Lambda
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Folder size={16} /> Files
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'schema'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database size={16} /> Schema
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'console'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Play size={16} /> Console
          </button>
        </div>
        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'lambda' && (
            <div className="p-4">
              <label className="block font-semibold mb-1">Select Schema</label>
              <select
                className="w-full border rounded px-2 py-1 mb-2"
                value={lambdaForm.schemaId}
                onChange={e => {
                  const schemaId = e.target.value;
                  const schema = savedSchemas.find((s: any) => String(s.id) === String(schemaId));
                  setLambdaForm(f => ({ ...f, schemaId }));
                  setSelectedSchema(schema);
                }}
                required
              >
                <option value="">Select a schema</option>
                {filteredSavedSchemas.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.schemaName || s.name || 'Unnamed Schema'}</option>
                ))}
              </select>
              <label className="block font-semibold mt-4 mb-1">Function Name</label>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                value={lambdaForm.functionName}
                onChange={e => setLambdaForm(f => ({ ...f, functionName: e.target.value }))}
                placeholder="handler.js"
                required
              />
              <label className="block font-semibold mt-4 mb-1">Runtime</label>
              <select
                className="w-full border rounded px-2 py-1 mb-2"
                value={lambdaForm.runtime}
                onChange={e => setLambdaForm(f => ({ ...f, runtime: e.target.value }))}
              >
                <option value="nodejs18.x">Node.js 18.x</option>
                <option value="nodejs20.x">Node.js 20.x</option>
                <option value="python3.12">Python 3.12</option>
                <option value="python3.11">Python 3.11</option>
                <option value="python3.10">Python 3.10</option>
                <option value="java21">Java 21</option>
                <option value="java17">Java 17</option>
                <option value="java11">Java 11</option>
                <option value="dotnet8">.NET 8</option>
                <option value="dotnet6">.NET 6</option>
              </select>
              <label className="block font-semibold mt-4 mb-1">Handler</label>
              <input
                className="w-full border rounded px-2 py-1 mb-2"
                value={lambdaForm.handler}
                onChange={e => setLambdaForm(f => ({ ...f, handler: e.target.value }))}
                placeholder="index.handler"
                required
              />
              <label className="block font-semibold mt-4 mb-1">Memory (MB)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mb-2"
                value={lambdaForm.memory}
                min={128}
                max={10240}
                onChange={e => setLambdaForm(f => ({ ...f, memory: Number(e.target.value) }))}
                required
              />
              <label className="block font-semibold mt-4 mb-1">Timeout (seconds)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mb-2"
                value={lambdaForm.timeout}
                min={1}
                max={900}
                onChange={e => setLambdaForm(f => ({ ...f, timeout: Number(e.target.value) }))}
                required
              />
              <label className="block font-semibold mt-4 mb-1">Environment Variables (JSON)</label>
              <textarea
                className="w-full border rounded px-2 py-1 mb-2 font-mono"
                value={lambdaForm.environment}
                onChange={e => setLambdaForm(f => ({ ...f, environment: e.target.value }))}
                placeholder='{"KEY":"VALUE"}'
                rows={2}
              />
              <label className="block font-semibold mt-4 mb-1">Describe the Lambda Handler</label>
              <textarea
                value={lambdaPrompt}
                onChange={e => setLambdaPrompt(e.target.value)}
                placeholder="Describe what Lambda handler you want to generate for the selected schema..."
                className="w-full border rounded px-2 py-1 mb-2"
                rows={3}
              />
              <button
                onClick={async () => {
                  console.log('selectedSchema:', selectedSchema);
                  if (!selectedSchema) {
                    alert('Please select a schema before generating a Lambda handler.');
                    return;
                  }
                  if (!lambdaPrompt.trim()) {
                    alert('Please enter a prompt describing the Lambda handler you want to generate.');
                    return;
                  }
                  setGeneratedLambdaCode('');
                  console.log('DEBUG: Submitting Lambda prompt:', lambdaPrompt, 'for schema:', selectedSchema);
                  
                  try {
                    setConsoleOutput(prev => [...prev, `🚀 Starting Lambda generation for: ${lambdaForm.functionName}`]);
                    setConsoleOutput(prev => [...prev, `📝 Prompt: ${lambdaPrompt}`]);
                    setConsoleOutput(prev => [...prev, `⚙️ Runtime: ${lambdaForm.runtime}`]);
                    setConsoleOutput(prev => [...prev, `💾 Memory: ${lambdaForm.memory} MB`]);
                    setConsoleOutput(prev => [...prev, `⏱️ Timeout: ${lambdaForm.timeout} seconds`]);
                    
                    const response = await fetch(`${API_BASE_URL}/ai-agent/lambda-codegen`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: lambdaPrompt,
                        selectedSchema,
                        functionName: lambdaForm.functionName,
                        runtime: lambdaForm.runtime,
                        handler: lambdaForm.handler,
                        memory: lambdaForm.memory,
                        timeout: lambdaForm.timeout,
                        environment: lambdaForm.environment || ''
                      })
                    });

                    if (response.ok) {
                      setConsoleOutput(prev => [...prev, `✅ Connected to backend, starting generation...`]);
                      const reader = response.body?.getReader();
                      if (reader) {
                        let generatedCode = '';
                        let chunkCount = 0;
                        
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          
                          const chunk = new TextDecoder().decode(value);
                          const lines = chunk.split('\n');
                          
                          for (const line of lines) {
                            if (line.startsWith('data: ')) {
                              const data = line.slice(6);
                              if (data === '[DONE]') {
                                // Generation complete
                                setConsoleOutput(prev => [...prev, `🎉 Lambda generation completed!`]);
                                setConsoleOutput(prev => [...prev, `📊 Total chunks received: ${chunkCount}`]);
                                setConsoleOutput(prev => [...prev, `📏 Code length: ${generatedCode.length} characters`]);
                                
                                if (generatedCode.trim()) {
                                  setConsoleOutput(prev => [...prev, `📁 Creating file structure...`]);
                                  generateLambdaFileStructure(generatedCode, lambdaForm.functionName, lambdaForm.runtime);
                                  setConsoleOutput(prev => [...prev, `✅ Files created successfully!`]);
                                }
                                break;
                              } else if (data !== '') {
                                try {
                                  const parsed = JSON.parse(data);
                                  if (parsed.content) {
                                    generatedCode += parsed.content;
                                    setGeneratedLambdaCode(generatedCode);
                                    chunkCount++;
                                    
                                    // Update console every 10 chunks
                                    if (chunkCount % 10 === 0) {
                                      setConsoleOutput(prev => [...prev, `📦 Received chunk ${chunkCount}, code length: ${generatedCode.length} chars`]);
                                    }
                                  } else if (parsed.error) {
                                    console.error('Lambda generation error:', parsed.error);
                                    setGeneratedLambdaCode('Error: ' + parsed.error);
                                    setConsoleOutput(prev => [...prev, `❌ Error: ${parsed.error}`]);
                                  }
                                } catch (e) {
                                  // Ignore parsing errors
                                }
                              }
                            }
                          }
                        }
                      }
                    } else {
                      console.error('Failed to generate Lambda code:', response.status);
                      setConsoleOutput(prev => [...prev, `❌ Failed to connect to backend: ${response.status}`]);
                    }
                  } catch (error) {
                    console.error('Error generating Lambda code:', error);
                    setConsoleOutput(prev => [...prev, `❌ Error: ${error.message}`]);
                  }
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Generate Lambda Handler
              </button>
              <label className="block font-semibold mt-4 mb-1">Generated Lambda Code</label>
              <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto" style={{ minHeight: 120 }}>
                {generatedLambdaCode || '// Lambda code will appear here'}
              </pre>
            </div>
          )}
          {activeTab === 'schema' && (
            <div className="h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Generated Schemas</h3>
                  {isStreamingSchema && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-600">Live</span>
                    </div>
                  )}
                  {Object.values(savingSchema).some(Boolean) && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Saving</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-600">
                    {schemas.length > 0 ? 'Schema generated' : 'No schema generated yet'}
                  </span>
                </div>
              </div>
              
              {/* Live Streaming Preview */}
              {isStreamingSchema && (
                <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700">Live Schema Generation</span>
                  </div>
                  <pre className="text-sm overflow-x-auto bg-white p-3 rounded border">
                    {liveSchema || 'Starting schema generation...'}
                  </pre>
                </div>
              )}
              
              {schemas.length === 0 ? (
                <div className="text-gray-500">No schemas generated yet...</div>
              ) : (
                <div className="space-y-4">
                  {schemas.map((schema: any, index: number) => (
                    <div key={schema.id} className={`border border-gray-200 rounded-lg p-4 ${isEditingSchema && index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{schema.schemaName || schema.name || 'Unnamed Schema'}</h4>
                          {schema.edited && (
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Edited</span>
                          )}
                          {!schema.saved && (
                            <>
                              <input
                                type="text"
                                className="border rounded px-2 py-1 text-xs mr-2"
                                placeholder="Schema Name"
                                value={schemaNames[schema.id] || ''}
                                onChange={e => setSchemaNames(prev => ({ ...prev, [schema.id]: e.target.value }))}
                                style={{ minWidth: 120 }}
                              />
                              <button
                                onClick={async () => {
                                  setSavingSchema((prev) => ({ ...prev, [schema.id]: true }));
                                  try {
                                    setConsoleOutput(prev => [...prev, `💾 Saving schema "${schemaNames[schema.id] || schema.schemaName || schema.name || 'Unnamed Schema'}" to namespace...`]);
                                    
                                    const payload = {
                                      namespaceId: namespace?.['namespace-id'],
                                      schemaName: schemaNames[schema.id] || schema.schemaName || schema.name || 'Unnamed Schema',
                                      schemaType: schema.schemaType || (schema.schema && schema.schema.type) || 'object',
                                      schema: schema.schema,
                                      isArray: schema.isArray || false,
                                      originalType: schema.originalType || (schema.schema && schema.schema.type) || 'object',
                                      url: schema.url || '',
                                    };
                                    
                                    const response = await fetch(`${API_BASE_URL}/save-schema-to-namespace`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(payload)
                                    });
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      setConsoleOutput(prev => [...prev, `✅ Schema saved successfully! Schema ID: ${result.schemaId}`]);
                                      
                                      // Update the schemas list to mark as saved
                                      setSchemas(prev => prev.map(s => s.id === schema.id ? { 
                                        ...s, 
                                        saved: true, 
                                        schemaName: payload.schemaName,
                                        schemaId: result.schemaId 
                                      } : s));
                                      
                                      // Refresh the saved schemas list for the Lambda dropdown
                                      try {
                                        const schemasResponse = await fetch(`/unified/schema?namespaceId=${namespace?.['namespace-id']}`);
                                        if (schemasResponse.ok) {
                                          const updatedSchemas = await schemasResponse.json();
                                          setSavedSchemas(updatedSchemas);
                                          setConsoleOutput(prev => [...prev, `🔄 Updated saved schemas list (${updatedSchemas.length} schemas available)`]);
                                        }
                                      } catch (refreshError) {
                                        console.error('Error refreshing schemas:', refreshError);
                                        setConsoleOutput(prev => [...prev, `⚠️ Warning: Could not refresh schemas list automatically`]);
                                      }
                                      
                                      // Dispatch event to refresh other components
                                      if (typeof window !== 'undefined' && window.dispatchEvent) {
                                        window.dispatchEvent(new CustomEvent('refresh-unified-namespace'));
                                      }
                                      
                                      setConsoleOutput(prev => [...prev, `📋 Schema "${payload.schemaName}" is now available in your namespace!`]);
                                    } else {
                                      const errorData = await response.json();
                                      setConsoleOutput(prev => [...prev, `❌ Failed to save schema: ${errorData.error || 'Unknown error'}`]);
                                    }
                                  } catch (error) {
                                    console.error('Error saving schema:', error);
                                    setConsoleOutput(prev => [...prev, `❌ Error saving schema: ${error.message}`]);
                                  } finally {
                                    setSavingSchema((prev) => ({ ...prev, [schema.id]: false }));
                                  }
                                }}
                                disabled={savingSchema[schema.id] || !(schemaNames[schema.id] && schemaNames[schema.id].trim())}
                                className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                              >
                                {savingSchema[schema.id] ? 'Saving...' : 'Save to Namespace'}
                              </button>
                            </>
                          )}
                          {schema.saved && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Saved</span>
                          )}
                        </div>
                        <button
                          onClick={() => setShowRawSchema(prev => ({ ...prev, [index]: !prev[index] }))}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {showRawSchema[index] ? 'Hide Raw' : 'Show Raw'}
                        </button>
                      </div>
                      {showRawSchema[index] ? (
                        <pre className="text-sm overflow-x-auto">
                          {(rawSchemas.find(r => r.id === schema.id)?.content) || JSON.stringify(schema.schema, null, 2)}
                        </pre>
                      ) : (
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(schema.schema, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'files' && (
            <div className="h-full flex">
              {/* File Tree Panel */}
              <div className="w-1/3 border-r border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Project Files</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadProjectFiles}
                      disabled={projectFiles.length === 0 || isDownloading}
                      className={`px-2 py-1 text-xs rounded ${
                        projectFiles.length === 0 || isDownloading
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      title="Download all project files as ZIP"
                    >
                      {isDownloading ? 'Downloading...' : 'Download ZIP'}
                    </button>
                    <button
                      onClick={refreshFileTree}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                  {projectFiles.length === 0 ? (
                    <div className="text-gray-500 text-sm">No files found...</div>
                  ) : (
                    renderFileTree(projectFiles)
                  )}
                </div>
              </div>
              
              {/* File Content Panel */}
              <div className="flex-1 p-4">
                {selectedFile ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">{selectedFile.name}</h3>
                      <span className="text-sm text-gray-500">{selectedFile.path}</span>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-900 text-green-400 font-mono text-sm rounded-lg p-4">
                      {selectedFile.content || fileContent ? (
                        <pre className="whitespace-pre-wrap">{selectedFile.content || fileContent}</pre>
                      ) : (
                        <div className="text-gray-500">Select a file to view its content...</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Folder size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Select a file from the tree to view its content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'console' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Console Output</h3>
                  {isDeploying && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Deploying</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={runProject}
                    disabled={isRunningProject}
                    className={`px-3 py-1 text-sm rounded ${
                      isRunningProject 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                  >
                    {isRunningProject ? 'Deploying...' : 'Run Project'}
                  </button>
                  <button
                    onClick={() => setConsoleOutput([])}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-900 text-green-400 font-mono text-sm rounded-b-lg">
                {consoleOutput.length === 0 ? (
                  <div className="text-gray-500">No console output yet...</div>
                ) : (
                  consoleOutput.map((output: string, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-400">$ </span>
                      {output}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAgentWorkspace;