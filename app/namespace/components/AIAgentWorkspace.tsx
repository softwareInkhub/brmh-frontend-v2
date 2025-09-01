import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, File, Folder, Play, Database, Code, X, Maximize2, Minimize2, Upload, FileText, Image, Archive } from 'lucide-react';
import { useDrop } from 'react-dnd';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: string;
  files?: UploadedFile[];
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  url?: string;
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
  
  // Add useEffect to log namespace changes
  useEffect(() => {
    console.log('Namespace changed:', namespace);
  }, [namespace]);
  // 1. Change activeTab state to use 'lambda' instead of 'api'
  const [activeTab, setActiveTab] = useState<'chat' | 'console' | 'lambda' | 'schema' | 'api' | 'files' | 'deployment'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI development assistant. I can help you:
\n• Design and generate API schemas\n• Write and test code\n• Create database models\n• Set up authentication\n• Run tests and debug issues\n• Manage your project structure

💡 **Pro Tips:**
• Upload files using the upload button or drag & drop
• Drag schemas from the sidebar directly into this chat area for context
• Drag schemas from the Schema tab for additional context

What would you like to work on today?`,
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
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    files: [],
    schemas: [],
    apis: [],
    projectType: 'nodejs',
    lastGenerated: null
  });
  // 2. Add state for Lambda functions and Lambda creation form
  const [lambdaFunctions, setLambdaFunctions] = useState<any[]>([]);
  const [lambdaForm, setLambdaForm] = useState({
    functionName: '',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    memory: 128,
    timeout: 3,
    environment: '',
    description: '',
  });
  // Add state for deployed API Gateway URLs
  const [deployedEndpoints, setDeployedEndpoints] = useState<Array<{
    functionName: string;
    apiGatewayUrl: string;
    functionArn: string;
    deployedAt: Date;
  }>>([]);
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
  
  // Add state for Lambda saving functionality
  const [isSavingLambda, setIsSavingLambda] = useState(false);
  const [savedLambdas, setSavedLambdas] = useState<Array<{
    id: string;
    functionName: string;
    apiGatewayUrl: string;
    functionArn: string;
    description: string;
    code: string;
    runtime: string;
    handler: string;
    memory: number;
    timeout: number;
    environment: string;
    savedAt: Date;
    namespaceId: string;
  }>>([]);

  // Add state for API endpoints
  const [apiEndpoints, setApiEndpoints] = useState<any[]>([]);
  
  // File upload and drag-drop state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragDropSchemas, setDragDropSchemas] = useState<any[]>([]);
  const [isDraggingSchema, setIsDraggingSchema] = useState(false);
  const [droppedSchemas, setDroppedSchemas] = useState<any[]>([]);
  // Lambda tab UI additions
  // 1. Add state for lambdaPrompt and generatedLambdaCode
  // Run Project functionality
  const [isRunningProject, setIsRunningProject] = useState(false);
  const [isSavingToS3, setIsSavingToS3] = useState(false);
  const [lambdaPrompt, setLambdaPrompt] = useState('');
  const [generatedLambdaCode, setGeneratedLambdaCode] = useState('');
  
  // API Generation state
  const [generatedApiCode, setGeneratedApiCode] = useState('');
  const [apiDocumentation, setApiDocumentation] = useState('');
  const [isStreamingApi, setIsStreamingApi] = useState(false);
  const [apiForm, setApiForm] = useState({
    apiName: '',
    baseUrl: '',
    description: '',
    version: '1.0.0',
    authentication: 'none',
    rateLimit: 1000,
  });
  
  // Web Scraping state
  const [selectedService, setSelectedService] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [supportedServices, setSupportedServices] = useState<Array<{key: string, name: string, type: string, description?: string}>>([
    { key: 'shopify', name: 'Shopify', type: 'known-service' },
    { key: 'stripe', name: 'Stripe', type: 'known-service' },
    { key: 'github', name: 'GitHub', type: 'known-service' },
    { key: 'google', name: 'Google APIs', type: 'known-service' },
    { key: 'custom-url', name: 'Custom URL', type: 'custom-url', description: 'Enter any URL to scrape APIs, schemas, and documentation' }
  ]);
  const [scrapeOptions, setScrapeOptions] = useState({
    apis: true,
    schemas: true,
    documentation: true,
    followLinks: true
  });
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [showAllScrapedData, setShowAllScrapedData] = useState(false);
  

  const [scrapingLog, setScrapingLog] = useState([]);
  

  
  // Debug: Track generatedLambdaCode changes
  useEffect(() => {
    console.log('[Lambda Debug] generatedLambdaCode updated:', generatedLambdaCode);
    console.log('[Lambda Debug] generatedLambdaCode length:', generatedLambdaCode.length);
  }, [generatedLambdaCode]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  // File upload and drag-drop functions
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newFiles: UploadedFile[] = [];
    
    try {
      for (const file of Array.from(files)) {
        try {
          const fileId = `file-${Date.now()}-${Math.random()}`;
          let content = '';
          
          // Read file content based on type
          if (file.type.startsWith('text/') || file.type === 'application/json' || file.type === 'application/javascript') {
            content = await file.text();
          } else if (file.type.startsWith('image/')) {
            // For images, create a data URL
            const reader = new FileReader();
            content = await new Promise((resolve, reject) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
          
          const uploadedFile: UploadedFile = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            content
          };
          
          newFiles.push(uploadedFile);
        } catch (error) {
          console.error('Error processing file:', file.name, error);
        }
      }
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Add message with uploaded files
      if (newFiles.length > 0) {
        addMessage({
          role: 'user',
          content: `Uploaded ${newFiles.length} file(s): ${newFiles.map(f => f.name).join(', ')}`,
          files: newFiles
        });
      }
    } catch (error) {
      console.error('Error in file upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the actual drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsDraggingSchema(false);
    
    try {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
      
      // Also check for schema data
      const schemaData = e.dataTransfer.getData('application/json');
      if (schemaData) {
        try {
          // Handle case where data might already be an object
          let schema;
          if (typeof schemaData === 'string') {
            schema = JSON.parse(schemaData);
          } else if (typeof schemaData === 'object') {
            schema = schemaData;
          } else {
            console.warn('Invalid schema data type:', typeof schemaData);
            return;
          }
          
          const schemaWithSource = { ...schema, source: 'workspace' };
          setDroppedSchemas(prev => [...prev, schemaWithSource]);
          
          // Add message about dropped schema
          addMessage({
            role: 'user',
            content: `Added schema context from workspace: ${schema.schemaName || schema.name || 'Unknown Schema'}`
          });
        } catch (parseError) {
          console.error('Error parsing schema data:', parseError);
          console.error('Schema data received:', schemaData);
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Schema drag-drop functions
  const handleSchemaDragStart = (e: React.DragEvent, schema: any) => {
    e.stopPropagation();
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(schema));
      e.dataTransfer.effectAllowed = 'copy';
      setIsDraggingSchema(true);
    } catch (error) {
      console.error('Error starting schema drag:', error);
    }
  };

  const handleSchemaDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDraggingSchema(false);
  };

  const handleSchemaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const schemaData = e.dataTransfer.getData('application/json');
      if (schemaData) {
        try {
          // Handle case where data might already be an object
          let schema;
          if (typeof schemaData === 'string') {
            schema = JSON.parse(schemaData);
          } else if (typeof schemaData === 'object') {
            schema = schemaData;
          } else {
            console.warn('Invalid schema data type:', typeof schemaData);
            return;
          }
          
          const schemaWithSource = { ...schema, source: 'workspace' };
          setDroppedSchemas(prev => [...prev, schemaWithSource]);
          
          // Add message about dropped schema
          addMessage({
            role: 'user',
            content: `Added schema context from workspace: ${schema.schemaName || schema.name || 'Unknown Schema'}`
          });
        } catch (parseError) {
          console.error('Error parsing schema data:', parseError);
          console.error('Schema data received:', schemaData);
        }
      }
    } catch (error) {
      console.error('Error processing dropped schema:', error);
    }
  };

  const removeDroppedSchema = (schemaId: string) => {
    setDroppedSchemas(prev => prev.filter(s => s.id !== schemaId));
  };

  // React-DnD drop functionality for schemas from sidebar
  const [{ isOver: isSchemaDropOver }, schemaDropRef] = useDrop({
    accept: 'SCHEMA',
    drop: (item: { type: string; data: any }) => {
      if (item.type === 'SCHEMA') {
        const schema = { ...item.data, source: 'sidebar' };
        setDroppedSchemas(prev => [...prev, schema]);
        
        // Add message about dropped schema
        addMessage({
          role: 'user',
          content: `Added schema context from sidebar: ${schema.schemaName || schema.name || 'Unknown Schema'}`
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Load available schemas for drag-drop functionality
  const loadAvailableSchemas = async () => {
    if (!namespace?.['namespace-id']) return;
    
    try {
      const response = await fetch(`/unified/schema?namespaceId=${namespace['namespace-id']}`);
      if (response.ok) {
        const schemas = await response.json();
        setDragDropSchemas(schemas);
        console.log('[Drag-Drop] Loaded schemas for drag-drop:', schemas.length);
      }
    } catch (error) {
      console.error('Error loading schemas for drag-drop:', error);
    }
  };

  // Web Scraping functions
  const loadSupportedServices = async () => {
    try {
      console.log('Loading supported services from:', `${API_BASE_URL}/web-scraping/supported-services`);
      const response = await fetch(`${API_BASE_URL}/web-scraping/supported-services`);
      if (response.ok) {
        const data = await response.json();
        console.log('Supported services loaded:', data.services);
        setSupportedServices(data.services || []);
      } else {
        console.error('Failed to load supported services:', response.status);
      }
    } catch (error) {
      console.error('Error loading supported services:', error);
    }
  };

  const addScrapingLog = (message, type = 'info') => {
    setScrapingLog(prev => [...prev, {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handlePreviewScrape = async () => {
    if (!selectedService) return;
    
    const serviceToScrape = selectedService === 'custom-url' ? customUrl : selectedService;
    if (selectedService === 'custom-url' && !customUrl) {
      addScrapingLog('Please enter a valid URL', 'error');
      return;
    }
    
    setIsScraping(true);
    addScrapingLog(`Starting preview scrape for ${serviceToScrape}...`, 'info');
    
    try {
      const response = await fetch(`${API_BASE_URL}/web-scraping/scrape-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: serviceToScrape,
          options: scrapeOptions
        })
      });

      if (response.ok) {
        const data = await response.json();
        setScrapedData(data.data);
        addScrapingLog(`Preview completed: ${data.summary.apis} APIs, ${data.summary.schemas} schemas, ${data.summary.documentation} docs`, 'success');
      } else {
        const error = await response.json();
        console.error('Preview failed:', error);
        addScrapingLog(`Preview failed: ${error.error}`, 'error');
      }
    } catch (error) {
      addScrapingLog(`Preview error: ${error.message}`, 'error');
    } finally {
      setIsScraping(false);
    }
  };

  const handleScrapeAndSave = async () => {
    if (!selectedService || !namespace?.['namespace-id']) return;
    
    const serviceToScrape = selectedService === 'custom-url' ? customUrl : selectedService;
    if (selectedService === 'custom-url' && !customUrl) {
      addScrapingLog('Please enter a valid URL', 'error');
      return;
    }
    
    setIsScraping(true);
    addScrapingLog(`Starting scrape and save for ${serviceToScrape}...`, 'info');
    
    try {
      const response = await fetch(`${API_BASE_URL}/web-scraping/scrape-and-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: serviceToScrape,
          namespaceId: namespace['namespace-id'],
          options: scrapeOptions
        })
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  addScrapingLog('Scraping and saving completed!', 'success');
                  break;
                } else if (data !== '') {
                  try {
                    const parsed = JSON.parse(data);
                    addScrapingLog(parsed.message, parsed.type || 'info');
                    
                                         if (parsed.type === 'success' && parsed.summary) {
                       const serviceName = selectedService === 'custom-url' ? customUrl : selectedService;
                       addMessage({
                         role: 'assistant',
                         content: `✅ Successfully scraped and saved data from ${serviceName}!

📊 **Summary:**
• APIs: ${parsed.summary.apis}
• Schemas: ${parsed.summary.schemas}
• Documentation: ${parsed.summary.documentation}

🎉 All data has been saved to your namespace library and is now available for use in your projects!`
                       });
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
        const error = await response.json();
        addScrapingLog(`Scrape and save failed: ${error.error}`, 'error');
      }
    } catch (error) {
      addScrapingLog(`Scrape and save error: ${error.message}`, 'error');
    } finally {
      setIsScraping(false);
    }
  };

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

  // Load supported services when component mounts
  useEffect(() => {
    loadSupportedServices();
  }, []);

  // Load file tree and workspace state when namespace changes
  useEffect(() => {
    if (namespace?.['namespace-id']) {
      refreshFileTree();
      loadWorkspaceState();
      loadAvailableSchemas(); // Load schemas for drag-drop functionality
      
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
    
    // Debug: Log the message being processed
    console.log('[Frontend] Processing message:', userMessage);
    
    // Add user message to chat
    addMessage({
      role: 'user',
      content: userMessage
    });

    // Add console output for message processing
    setConsoleOutput(prev => [...prev, `👤 User message: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`]);
    
    // Check if this might be a schema-related request
    const lowerMessage = userMessage.toLowerCase();
    // Robust intent detection for tab switching (less strict than generation)
    const schemaKeywords = ['schema', 'json', 'model', 'structure', 'format'];
    const lambdaKeywords = ['lambda', 'function', 'handler', 'aws lambda', 'serverless'];
    const apiKeywords = ['api', 'endpoint', 'route', 'rest', 'http', 'get', 'post', 'put', 'delete'];
    
    const hasSchemaKeyword = schemaKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasLambdaKeyword = lambdaKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasApiKeyword = apiKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Only switch tabs for clear intent, not casual mentions
    const isQuestion = lowerMessage.includes('?') || lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why');
    const isCasualMention = lowerMessage.includes('about') || lowerMessage.includes('regarding') || lowerMessage.includes('concerning');
    
    if (hasApiKeyword && !isQuestion && !isCasualMention) {
      setConsoleOutput(prev => [...prev, `🔍 Detected API-related request`]);
      setActiveTab('api');
    } else if (hasSchemaKeyword && !isQuestion && !isCasualMention) {
      setConsoleOutput(prev => [...prev, `🔍 Detected schema-related request`]);
      setActiveTab('schema');
    } else if (hasLambdaKeyword && !isQuestion && !isCasualMention) {
      setConsoleOutput(prev => [...prev, `🔍 Detected lambda-related request`]);
      setActiveTab('lambda');
    }

    try {
      await handleStreamingResponse(userMessage);
    } catch (error) {
      console.error('Error handling streaming response:', error);
      setConsoleOutput(prev => [...prev, `❌ Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleStreamingResponse = async (userMessage: string, currentSchema: any = null) => {
    setIsStreamingSchema(false);
    setLiveSchema('');
    let assistantMessage = '';
    let actions: any[] = [];
    let lastAssistantMessageId: string | null = null;

      // Robust intent detection for Lambda generation
  const lowerMessage = userMessage.toLowerCase();
  
  // Explicit action keywords that indicate user wants to generate/create something
  const explicitActionKeywords = [
    'generate', 'create', 'build', 'write', 'make', 'develop', 'code', 'program',
    'implement', 'set up', 'configure', 'deploy', 'launch', 'start'
  ];
  
  // Lambda-related keywords
  const lambdaKeywords = [
    'lambda', 'function', 'handler', 'aws lambda', 'serverless', 
    'lambda function', 'aws function', 'serverless function'
  ];
  
  // Schema-related keywords
  const schemaKeywords = [
    'schema', 'json schema', 'data model', 'structure', 'format', 'validation',
    'type definition', 'interface', 'model'
  ];
  
  // API-related keywords
  const apiKeywords = [
    'api', 'endpoint', 'route', 'rest', 'http', 'get', 'post', 'put', 'delete',
    'api endpoint', 'rest api', 'http endpoint', 'webhook', 'microservice'
  ];
  
  // Check for explicit generation intent
  const hasExplicitAction = explicitActionKeywords.some(action => lowerMessage.includes(action));
  const hasLambdaKeyword = lambdaKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasSchemaKeyword = schemaKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasApiKeyword = apiKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // More sophisticated intent detection
  // Prioritize lambda requests over schema requests when both keywords are present
  // Also detect lambda generation requests that mention schema context
  const isLambdaRequest = hasExplicitAction && hasLambdaKeyword;
  
  // Check for lambda generation requests that mention schema (common pattern)
  const hasLambdaContext = hasLambdaKeyword || (hasExplicitAction && (lowerMessage.includes('handler') || lowerMessage.includes('function')));
  const mentionsSchemaContext = lowerMessage.includes('from this schema') || lowerMessage.includes('using this schema') || lowerMessage.includes('with this schema') || lowerMessage.includes('based on this schema');
  const isLambdaWithSchemaContext = hasLambdaContext && mentionsSchemaContext;
  
  // API generation requests
  const isApiRequest = hasExplicitAction && hasApiKeyword && !hasLambdaKeyword && !isLambdaWithSchemaContext;
  
  // Schema requests should not include lambda or api generation patterns
  const isSchemaRequest = hasExplicitAction && hasSchemaKeyword && !hasLambdaKeyword && !hasApiKeyword && !isLambdaWithSchemaContext;
  
  // Debug the intermediate values
  console.log('[Intent Debug] Intermediate values:');
  console.log('[Intent Debug] isLambdaRequest:', isLambdaRequest, '(hasExplicitAction:', hasExplicitAction, '&& hasLambdaKeyword:', hasLambdaKeyword, ')');
  console.log('[Intent Debug] hasLambdaContext:', hasLambdaContext, '(hasLambdaKeyword:', hasLambdaKeyword, '|| (hasExplicitAction && handler/function))');
  console.log('[Intent Debug] mentionsSchemaContext:', mentionsSchemaContext, '(from/using/with/based on this schema)');
  console.log('[Intent Debug] isLambdaWithSchemaContext:', isLambdaWithSchemaContext, '(hasLambdaContext && mentionsSchemaContext)');
  console.log('[Intent Debug] isSchemaRequest:', isSchemaRequest, '(hasExplicitAction && hasSchemaKeyword && !hasLambdaKeyword && !isLambdaWithSchemaContext)');
  
  // Additional context checks to avoid false positives
  const isQuestion = lowerMessage.includes('?') || lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why');
  const isCasualMention = lowerMessage.includes('about') || lowerMessage.includes('regarding') || lowerMessage.includes('concerning');
  const isExplanatory = lowerMessage.includes('explain') || lowerMessage.includes('describe') || lowerMessage.includes('tell me');
  
  // Final intent determination
  const shouldGenerateLambda = (isLambdaRequest || isLambdaWithSchemaContext) && !isQuestion && !isCasualMention && !isExplanatory;
  const shouldGenerateApi = isApiRequest && !isQuestion && !isCasualMention && !isExplanatory;
  const shouldGenerateSchema = isSchemaRequest && !isQuestion && !isCasualMention && !isExplanatory;
    
    console.log('[Intent Debug] Message:', userMessage);
    console.log('[Intent Debug] Has explicit action:', hasExplicitAction);
    console.log('[Intent Debug] Has lambda keyword:', hasLambdaKeyword);
    console.log('[Intent Debug] Has schema keyword:', hasSchemaKeyword);
    console.log('[Intent Debug] Is lambda request:', isLambdaRequest);
    console.log('[Intent Debug] Is schema request:', isSchemaRequest);
    console.log('[Intent Debug] Is question:', isQuestion);
    console.log('[Intent Debug] Is casual mention:', isCasualMention);
    console.log('[Intent Debug] Is explanatory:', isExplanatory);
    console.log('[Intent Debug] Should generate lambda:', shouldGenerateLambda);
    console.log('[Intent Debug] Should generate schema:', shouldGenerateSchema);
    console.log('[Intent Debug] Processing as regular chat:', !shouldGenerateLambda && !shouldGenerateSchema);
    
    // Add more detailed logging
    console.log('[Intent Debug] === DETAILED ANALYSIS ===');
    console.log('[Intent Debug] Original message:', userMessage);
    console.log('[Intent Debug] Lower message:', lowerMessage);
    console.log('[Intent Debug] Explicit action keywords found:', explicitActionKeywords.filter(action => lowerMessage.includes(action)));
    console.log('[Intent Debug] Lambda keywords found:', lambdaKeywords.filter(keyword => lowerMessage.includes(keyword)));
    console.log('[Intent Debug] Schema keywords found:', schemaKeywords.filter(keyword => lowerMessage.includes(keyword)));
    console.log('[Intent Debug] === END ANALYSIS ===');
    
    // Handle Lambda generation only when explicitly requested
    if (shouldGenerateLambda) {
      console.log('[Frontend] !!! ENTERING LAMBDA GENERATION BLOCK !!!');
      console.log('[Frontend] Detected Lambda generation request - sending to lambda generation endpoint');
      console.log('[Frontend] shouldGenerateLambda:', shouldGenerateLambda);
      console.log('[Frontend] shouldGenerateSchema:', shouldGenerateSchema);
      console.log('[Frontend] isLambdaRequest:', isLambdaRequest);
      console.log('[Frontend] isLambdaWithSchemaContext:', isLambdaWithSchemaContext);
      setConsoleOutput(prev => [...prev, `🚀 Starting Lambda generation from chat request`]);
      
      // Automatically switch to Lambda tab
      setActiveTab('lambda');
      
      try {
        setGeneratedLambdaCode('');
        setConsoleOutput(prev => [...prev, `📝 Processing Lambda request: ${userMessage}`]);
        setConsoleOutput(prev => [...prev, `📋 Using automatic schema detection from workspace`]);
        
        // Prepare context from uploaded files and dropped schemas
        const fileContext = uploadedFiles.length > 0 ? 
          `\n\nUploaded Files Context:\n${uploadedFiles.map(file => 
            `File: ${file.name} (${file.type})\nContent:\n${file.content?.substring(0, 1000)}${file.content && file.content.length > 1000 ? '...' : ''}`
          ).join('\n\n')}` : '';
        
        const schemaContext = droppedSchemas.length > 0 ? 
          `\n\nDropped Schema Context:\n${droppedSchemas.map(schema => 
            `Schema: ${schema.schemaName || schema.name || 'Unknown'}\nContent:\n${JSON.stringify(schema, null, 2)}`
          ).join('\n\n')}` : '';
        
        const enhancedMessage = userMessage + fileContext + schemaContext;
        
        const requestBody = {
          message: enhancedMessage,
          originalMessage: userMessage, // Send original message for intent detection
          functionName: lambdaForm.functionName || 'handler',
          runtime: lambdaForm.runtime || 'nodejs18.x',
          handler: lambdaForm.handler || 'index.handler',
          memory: lambdaForm.memory || 128,
          timeout: lambdaForm.timeout || 3,
          environment: lambdaForm.environment || ''
        };
        
        console.log('[Lambda Debug] Making backend request to:', `${API_BASE_URL}/ai-agent/lambda-codegen`);
        console.log('[Lambda Debug] Request body:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/ai-agent/lambda-codegen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        console.log('[Lambda Debug] Response status:', response.status);
        console.log('[Lambda Debug] Response ok:', response.ok);
        
        if (response.ok) {
          setConsoleOutput(prev => [...prev, `✅ Connected to backend, starting Lambda generation...`]);
          const reader = response.body?.getReader();
          if (reader) {
            let generatedCode = '';
            let chatMessage = '';
            let chunkCount = 0;
            let isCodeSection = false;
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                console.log('[Lambda Debug] Processing line:', line);
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  console.log('[Lambda Debug] Data:', data);
                  if (data === '[DONE]') {
                    // Generation complete
                    setConsoleOutput(prev => [...prev, `🎉 Lambda generation completed!`]);
                    setConsoleOutput(prev => [...prev, `📊 Total chunks received: ${chunkCount}`]);
                    setConsoleOutput(prev => [...prev, `📏 Code length: ${generatedCode.length} characters`]);
                    
                    if (generatedCode.trim()) {
                      setConsoleOutput(prev => [...prev, `📁 Creating file structure...`]);
                      generateLambdaFileStructure(generatedCode, lambdaForm.functionName || 'handler', lambdaForm.runtime || 'nodejs18.x');
                      setConsoleOutput(prev => [...prev, `✅ Files created successfully!`]);
                    }
                    
                    // Add success message about code generation
                    addMessage({
                      role: 'assistant',
                      content: `✅ Lambda function code generated successfully! 

📝 **Code Location:** The generated code is now available in the "Generated Lambda Code" box in the Lambda tab.

📁 **Files:** The code has also been saved to the Files tab.

🚀 **Next Steps:** You can now configure deployment settings in the Deployment tab to deploy your function.`
                    });
                    break;
                  } else if (data !== '') {
                    try {
                      const parsed = JSON.parse(data);
                      console.log('[Lambda Debug] Parsed JSON:', parsed);
                      if (parsed.content) {
                        chunkCount++;
                        
                        // For Lambda generation, ALL content from the backend is code
                        // The backend is instructed to output ONLY code, no explanations
                        const content = parsed.content;
                        
                        // Debug: Log the content to see what we're receiving
                        console.log('[Lambda Debug] Received content:', content);
                        console.log('[Lambda Debug] Content length:', content.length);
                        
                        // Since this is Lambda generation, all content is code
                        console.log('[Lambda Debug] Adding to generatedCode (Lambda generation)');
                        generatedCode += content;
                        setGeneratedLambdaCode(generatedCode);
                        
                        // Update console every 10 chunks
                        if (chunkCount % 10 === 0) {
                          setConsoleOutput(prev => [...prev, `📦 Received chunk ${chunkCount}, code length: ${generatedCode.length} chars`]);
                        }
                      } else if (parsed.error) {
                        console.error('Lambda generation error:', parsed.error);
                        setGeneratedLambdaCode('Error: ' + parsed.error);
                        setConsoleOutput(prev => [...prev, `❌ Error: ${parsed.error}`]);
                        
                        addMessage({
                          role: 'assistant',
                          content: `❌ Error generating Lambda function: ${parsed.error}`
                        });
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
          
          addMessage({
            role: 'assistant',
            content: `❌ Failed to generate Lambda function. Please try again.`
          });
        }
      } catch (error) {
        console.error('Error generating Lambda code:', error);
        setConsoleOutput(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        
        addMessage({
          role: 'assistant',
          content: `❌ Error generating Lambda function: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      return;
    } else if (shouldGenerateApi) {
      // Handle API generation when explicitly requested
      console.log('[Frontend] !!! ENTERING API GENERATION BLOCK !!!');
      console.log('[Frontend] Detected API generation request - sending to API generation endpoint');
      setConsoleOutput(prev => [...prev, `🚀 Starting API generation from chat request`]);
      
      // Automatically switch to API tab
      setActiveTab('api');
      
      try {
        setGeneratedApiCode('');
        setApiDocumentation('');
        setConsoleOutput(prev => [...prev, `📝 Processing API request: ${userMessage}`]);
        setConsoleOutput(prev => [...prev, `📋 Using automatic schema detection from workspace`]);
        
        // Prepare context from uploaded files and dropped schemas
        const fileContext = uploadedFiles.length > 0 ? 
          `\n\nUploaded Files Context:\n${uploadedFiles.map(file => 
            `File: ${file.name} (${file.type})\nContent:\n${file.content?.substring(0, 1000)}${file.content && file.content.length > 1000 ? '...' : ''}`
          ).join('\n\n')}` : '';
        
        const schemaContext = droppedSchemas.length > 0 ? 
          `\n\nDropped Schema Context:\n${droppedSchemas.map(schema => 
            `Schema: ${schema.schemaName || schema.name || 'Unknown'}\nContent:\n${JSON.stringify(schema, null, 2)}`
          ).join('\n\n')}` : '';
        
        const enhancedMessage = userMessage + fileContext + schemaContext;
        
        const requestBody = {
          message: enhancedMessage,
          originalMessage: userMessage,
          namespace: namespace ? { id: namespace['namespace-id'] } : null,
          action: 'api-generation',
          history: messages.map(m => ({ role: m.role, content: m.content })),
          userId,
          schema: null,
        };
        
        console.log('[API Debug] Making backend request to:', `${API_BASE_URL}/ai-agent/stream`);
        console.log('[API Debug] Request body:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/ai-agent/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          setConsoleOutput(prev => [...prev, `✅ Connected to backend, starting API generation...`]);
          const reader = response.body?.getReader();
          if (reader) {
            let apiCode = '';
            let documentation = '';
            let chunkCount = 0;
            let isCodeSection = false;
            
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
                    setConsoleOutput(prev => [...prev, `🎉 API generation completed!`]);
                    setConsoleOutput(prev => [...prev, `📊 Total chunks received: ${chunkCount}`]);
                    
                    addMessage({
                      role: 'assistant',
                      content: `✅ API code and documentation generated successfully! 

📝 **Code Location:** The generated API code is now available in the "Generated API Code" box in the API tab.

📚 **Documentation:** API documentation is available in the "API Documentation" box.

🚀 **Next Steps:** You can now review the generated code and documentation, and deploy your API.`
                    });
                    break;
                  } else if (data !== '') {
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.content) {
                        chunkCount++;
                        const content = parsed.content;
                        
                        // Check if this is code or documentation based on content
                        if (content.includes('```') || content.includes('function') || content.includes('const') || content.includes('export')) {
                          apiCode += content;
                          setGeneratedApiCode(apiCode);
                        } else {
                          documentation += content;
                          setApiDocumentation(documentation);
                        }
                        
                        // Update console every 10 chunks
                        if (chunkCount % 10 === 0) {
                          setConsoleOutput(prev => [...prev, `📦 Received chunk ${chunkCount}, code length: ${apiCode.length} chars, docs length: ${documentation.length} chars`]);
                        }
                      } else if (parsed.error) {
                        console.error('API generation error:', parsed.error);
                        setGeneratedApiCode('Error: ' + parsed.error);
                        setConsoleOutput(prev => [...prev, `❌ Error: ${parsed.error}`]);
                        
                        addMessage({
                          role: 'assistant',
                          content: `❌ Error generating API: ${parsed.error}`
                        });
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
          console.error('Failed to generate API code:', response.status);
          setConsoleOutput(prev => [...prev, `❌ Failed to connect to backend: ${response.status}`]);
          
          addMessage({
            role: 'assistant',
            content: `❌ Failed to generate API. Please try again.`
          });
        }
      } catch (error) {
        console.error('Error generating API code:', error);
        setConsoleOutput(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        
        addMessage({
          role: 'assistant',
          content: `❌ Error generating API: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      return;
    } else if (shouldGenerateSchema) {
      // Handle Schema generation when explicitly requested
      console.log('[Frontend] !!! ENTERING SCHEMA GENERATION BLOCK !!!');
      console.log('[Frontend] Detected Schema generation request - sending to schema generation endpoint');
      console.log('[Frontend] shouldGenerateLambda:', shouldGenerateLambda);
      console.log('[Frontend] shouldGenerateSchema:', shouldGenerateSchema);
      console.log('[Frontend] isLambdaRequest:', isLambdaRequest);
      console.log('[Frontend] isLambdaWithSchemaContext:', isLambdaWithSchemaContext);
      
      // Double-check: if lambda context is detected, don't generate schema
      if (isLambdaWithSchemaContext || isLambdaRequest) {
        console.log('[Frontend] SAFEGUARD: Lambda context detected, skipping schema generation');
        addMessage({
          role: 'assistant',
          content: `I detected that you want to generate a Lambda function! Since you have a schema dropped as context, I'll help you create a Lambda handler that uses that schema. Please use the Lambda tab or ask me to 'generate a lambda handler' to create Lambda functions.`
        });
        return;
      }
      
      setConsoleOutput(prev => [...prev, `🚀 Starting Schema generation from chat request`]);
      
      // Automatically switch to Schema tab
      setActiveTab('schema');
      
      // Use the existing schema generation logic
      try {
        setIsStreamingSchema(true);
        setLiveSchema('');
        
        const response = await fetch(`${API_BASE_URL}/ai-agent/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            namespace: namespace ? { id: namespace['namespace-id'] } : null,
            action: null,
            history: messages.map(m => ({ role: m.role, content: m.content })),
            userId,
            schema: null,
          })
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          if (reader) {
            let schemaContent = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    setIsStreamingSchema(false);
                    break;
                  } else if (data !== '') {
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.content) {
                        schemaContent += parsed.content;
                        setLiveSchema(schemaContent);
                      }
                    } catch (e) {
                      console.error('[Schema Generation] Error parsing data:', e);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[Schema Generation] Error:', error);
        setIsStreamingSchema(false);
        addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error while generating the schema: ${error.message}`
        });
      }
      return;
    }

    // Always pass the existing schema if we have one, regardless of the request type
    let schemaToEdit = currentSchema;
    if (!schemaToEdit && schemas.length > 0) {
      // Always use the existing schema for any schema-related request
      schemaToEdit = schemas[0].schema;
      console.log('[Frontend] Using existing schema for request:', schemaToEdit);
      // Check if this is an edit command for visual feedback
      const editKeywords = ['edit', 'modify', 'update', 'change', 'add', 'remove', 'delete', 'rename'];
      const isEditCommand = editKeywords.some(keyword => lowerMessage.includes(keyword));
      if (isEditCommand) {
        setIsEditingSchema(true);
        setConsoleOutput(prev => [...prev, `🔄 Editing schema: ${userMessage}`]);
      }
    }
    
    // Add console output for schema generation start
    if (schemaToEdit) {
      setConsoleOutput(prev => [...prev, `📝 Schema editing request: ${userMessage}`]);
      setConsoleOutput(prev => [...prev, `📋 Using existing schema as base`]);
    } else {
      setConsoleOutput(prev => [...prev, `🆕 Schema generation request: ${userMessage}`]);
      setConsoleOutput(prev => [...prev, `✨ Creating new schema from scratch`]);
    }
    
    console.log('[Frontend] Sending request to backend:', {
      message: userMessage,
      hasExistingSchema: !!schemaToEdit,
      schemaToEdit: schemaToEdit ? 'Schema exists' : 'No schema'
    });
    
    console.log('[Frontend] Sending regular chat request to backend (no generation intent detected)');
    console.log('[Frontend] This should NOT happen for lambda requests!');
    setConsoleOutput(prev => [...prev, `🌐 Connecting to AI agent backend...`]);
    
        // Prepare context from uploaded files and dropped schemas for regular chat
        const fileContext = uploadedFiles.length > 0 ? 
          `\n\nUploaded Files Context:\n${uploadedFiles.map(file => 
            `File: ${file.name} (${file.type})\nContent:\n${file.content?.substring(0, 1000)}${file.content && file.content.length > 1000 ? '...' : ''}`
          ).join('\n\n')}` : '';
        
        const schemaContext = droppedSchemas.length > 0 ? 
          `\n\nDropped Schema Context:\n${droppedSchemas.map(schema => 
            `Schema: ${schema.schemaName || schema.name || 'Unknown'}\nContent:\n${JSON.stringify(schema, null, 2)}`
          ).join('\n\n')}` : '';
        
        const enhancedMessage = userMessage + fileContext + schemaContext;
        
        const response = await fetch(`${API_BASE_URL}/ai-agent/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: enhancedMessage,
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
      setConsoleOutput(prev => [...prev, `❌ Error saving schema: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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
      
      console.log('🌐 Making request to:', `${API_BASE_URL}/code-generation/generate-backend`);
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
  const [savedApis, setSavedApis] = useState<any[]>([]);
  const [savedFiles, setSavedFiles] = useState<ProjectFile[]>([]);

  // Code generation state
  const [projectType, setProjectType] = useState<'nodejs' | 'python'>('nodejs');
  const [projectName, setProjectName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);







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
          dependencies: func.dependencies || {},
          environment: lambdaForm.environment || '',
          createApiGateway: true
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
          
          // API Gateway is now created automatically during deployment
          if (deployResult.apiGatewayUrl) {
            setConsoleOutput(prev => [...prev, `✅ API Gateway created automatically!`]);
            setConsoleOutput(prev => [...prev, `🌐 API Gateway URL: ${deployResult.apiGatewayUrl}`]);
            setConsoleOutput(prev => [...prev, `   Endpoint: ${deployResult.apiGatewayUrl}/${func.name}`]);
            setConsoleOutput(prev => [...prev, `   API ID: ${deployResult.apiId}`]);
            
            // Store the deployed endpoint for display
            setDeployedEndpoints(prev => [...prev, {
              functionName: func.name,
              apiGatewayUrl: `${deployResult.apiGatewayUrl}/${func.name}`,
              functionArn: deployResult.functionArn,
              deployedAt: new Date()
            }]);
            
            // Add success message to chat
            addMessage({
              role: 'assistant',
              content: `✅ Lambda function "${func.name}" deployed successfully!\n\n🌐 **API Gateway URL:** ${deployResult.apiGatewayUrl}/${func.name}\n\nYou can now invoke your function via HTTP POST requests to this endpoint.`
            });
          } else {
            setConsoleOutput(prev => [...prev, `⚠️ API Gateway creation was skipped or failed`]);
            setConsoleOutput(prev => [...prev, `   Using Function URL as fallback`]);
            
            addMessage({
              role: 'assistant',
              content: `✅ Lambda function "${func.name}" deployed successfully!\n\n⚠️ API Gateway was not created. You can invoke the function directly via AWS Lambda.`
            });
          }
          
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
          
          // Test via API Gateway (should always be available now)
          let testResponse;
          if (deployResult.apiGatewayUrl) {
            const apiUrl = `${deployResult.apiGatewayUrl}/${func.name}`;
            setConsoleOutput(prev => [...prev, `🧪 Testing via API Gateway: ${apiUrl}`]);
            testResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testPayload.payload)
            });
          } else {
            // Fallback to direct invoke if API Gateway creation failed
            setConsoleOutput(prev => [...prev, `🧪 Testing via direct invoke (API Gateway unavailable)`]);
            testResponse = await fetch(`${API_BASE_URL}/lambda/invoke`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testPayload)
            });
          }
          
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
        setConsoleOutput(prev => [...prev, `❌ Error deploying ${func.name}: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
    
    setConsoleOutput(prev => [...prev, '🎉 Project deployment completed!']);
    setConsoleOutput(prev => [...prev, '💡 You can now invoke your Lambda functions from the AWS Console or via API Gateway.']);
    
    // Display deployment summary
    setConsoleOutput(prev => [...prev, '📋 Deployment Summary:']);
    setConsoleOutput(prev => [...prev, '==================']);
    
    // Collect all API Gateway URLs for the summary
    const apiGatewayUrls = [];
    
    lambdaFunctions.forEach((func, index) => {
      setConsoleOutput(prev => [...prev, `${index + 1}. ${func.name}:`]);
      setConsoleOutput(prev => [...prev, `   - Runtime: ${func.runtime}`]);
      setConsoleOutput(prev => [...prev, `   - Handler: ${func.handler}`]);
      setConsoleOutput(prev => [...prev, `   - Memory: ${func.memory} MB`]);
      setConsoleOutput(prev => [...prev, `   - Timeout: ${func.timeout} seconds`]);
      
      // Show API Gateway URL if available
      if (deployResult && deployResult.apiGatewayUrl) {
        const apiUrl = `${deployResult.apiGatewayUrl}/${func.name}`;
        setConsoleOutput(prev => [...prev, `   - API Gateway: ${apiUrl}`]);
        apiGatewayUrls.push({ functionName: func.name, url: apiUrl });
      }
    });
    
    setConsoleOutput(prev => [...prev, '==================']);
    
    if (apiGatewayUrls.length > 0) {
      setConsoleOutput(prev => [...prev, '🌐 API Gateway Endpoints:']);
      apiGatewayUrls.forEach(({ functionName, url }) => {
        setConsoleOutput(prev => [...prev, `   ${functionName}: ${url}`]);
      });
      setConsoleOutput(prev => [...prev, '🚀 Your Lambda functions are now live and accessible via API Gateway!']);
      
      // Add comprehensive summary to chat
      addMessage({
        role: 'assistant',
        content: `🎉 **Deployment Complete!**\n\n✅ Successfully deployed ${lambdaFunctions.length} Lambda function(s)\n\n🌐 **API Gateway Endpoints:**\n${apiGatewayUrls.map(({ functionName, url }) => `• **${functionName}:** \`${url}\``).join('\n')}\n\n💡 **Usage:** Send HTTP POST requests to these endpoints to invoke your Lambda functions.\n\n📋 **Example:**\n\`\`\`bash\ncurl -X POST ${apiGatewayUrls[0].url} \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'\n\`\`\``
      });
    } else {
      setConsoleOutput(prev => [...prev, '⚠️ No API Gateway URLs available']);
      addMessage({
        role: 'assistant',
        content: `✅ Lambda functions deployed successfully, but API Gateway creation failed.\n\nYou can still invoke the functions directly via AWS Lambda console or CLI.`
      });
    }
  }

  async function saveFilesToS3() {
    if (projectFiles.length === 0) {
      alert('No files to save to S3');
      return;
    }

    try {
      setIsSavingToS3(true);
      setConsoleOutput(prev => [...prev, '☁️ Saving project files to S3 cloud bucket...']);
      
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
      
      // Convert blob to base64 for sending to backend
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
      });
      reader.readAsDataURL(zipBlob);
      const base64Data = await base64Promise;
      
      // Send to backend for S3 upload
      setConsoleOutput(prev => [...prev, '🚀 Uploading to S3...']);
      
      const response = await fetch(`${API_BASE_URL}/workspace/save-files-to-s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceId: namespace?.['namespace-id'],
          projectName: namespace?.['namespace-name'] || 'unnamed-project',
          zipData: base64Data,
          fileCount: fileCount,
          files: projectFiles.map(file => ({
            name: file.name,
            path: file.path,
            type: file.type
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Files] S3 save result:', result);
        
        setConsoleOutput(prev => [...prev, `✅ Files saved to S3 successfully!`]);
        setConsoleOutput(prev => [...prev, `📁 S3 Bucket: ${result.bucket}`]);
        setConsoleOutput(prev => [...prev, `🔗 S3 Key: ${result.s3Key}`]);
        setConsoleOutput(prev => [...prev, `📊 Files saved: ${result.filesSaved}`]);
        
        if (result.metadataId) {
          setConsoleOutput(prev => [...prev, `💾 Metadata saved to DynamoDB: ${result.metadataId}`]);
        }
        
        addMessage({
          role: 'assistant',
          content: `✅ Project files saved to S3 cloud bucket successfully!

📁 **S3 Location:** ${result.s3Url}
📊 **Files Saved:** ${result.filesSaved}
💾 **Metadata ID:** ${result.metadataId || 'N/A'}

Your files are now safely stored in the cloud and can be accessed anytime.`
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[Files] Error saving to S3:', error);
      setConsoleOutput(prev => [...prev, `❌ Failed to save files to S3: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      
      addMessage({
        role: 'assistant',
        content: `❌ Failed to save project files to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSavingToS3(false);
    }
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
      setConsoleOutput(prev => [...prev, `❌ Error downloading project files: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsDownloading(false);
    }
  }

  async function saveLambdaToNamespace() {
    if (!generatedLambdaCode || !lambdaForm.functionName) {
      alert('Please generate Lambda code and provide a function name first');
      return;
    }

    try {
      setIsSavingLambda(true);
      setConsoleOutput(prev => [...prev, '💾 Saving Lambda function to namespace library...']);
      
      // Generate a unique ID for this Lambda
      const lambdaId = `lambda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create Lambda metadata
      const lambdaData = {
        id: lambdaId,
        functionName: lambdaForm.functionName,
        apiGatewayUrl: '', // Will be populated after deployment
        functionArn: '', // Will be populated after deployment
        description: lambdaForm.description || `Lambda function: ${lambdaForm.functionName}`,
        code: generatedLambdaCode,
        runtime: lambdaForm.runtime,
        handler: lambdaForm.handler,
        memory: lambdaForm.memory,
        timeout: lambdaForm.timeout,
        environment: lambdaForm.environment,
        savedAt: new Date(),
        namespaceId: namespace?.['namespace-id'] || 'unknown'
      };
      
      // Save to backend
      const response = await fetch(`${API_BASE_URL}/workspace/save-lambda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namespaceId: namespace?.['namespace-id'],
          lambdaData: lambdaData
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Lambda] Save result:', result);
        
        // Add to local state
        setSavedLambdas(prev => [...prev, lambdaData]);
        
        setConsoleOutput(prev => [...prev, `✅ Lambda function saved to namespace library!`]);
        setConsoleOutput(prev => [...prev, `📝 Function Name: ${lambdaForm.functionName}`]);
        setConsoleOutput(prev => [...prev, `🆔 Lambda ID: ${lambdaId}`]);
        setConsoleOutput(prev => [...prev, `💾 Saved to namespace: ${namespace?.['namespace-name'] || 'Unknown'}`]);
        
        addMessage({
          role: 'assistant',
          content: `✅ Lambda function saved to namespace library!

📝 **Function Name:** ${lambdaForm.functionName}
🆔 **Lambda ID:** ${lambdaId}
💾 **Namespace:** ${namespace?.['namespace-name'] || 'Unknown'}

🚀 **Next Steps:** 
• Deploy the function to get the API Gateway URL
• The function is now available in your namespace library for future use`
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[Lambda] Error saving to namespace:', error);
      setConsoleOutput(prev => [...prev, `❌ Error saving Lambda to namespace: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      
      addMessage({
        role: 'assistant',
        content: `❌ Error saving Lambda function to namespace: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSavingLambda(false);
    }
  }

  return (
    <div className="fixed top-0 right-0 h-full w-[800px] flex flex-col bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">
              {namespace ? (
                <span className="flex items-center gap-2">
                  <span className="text-blue-600 font-medium">Working with: {namespace['namespace-name']}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Context Active
                  </span>
                </span>
              ) : (
                'General Development'
              )}
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
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'api'
              ? 'border-blue-500 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database size={16} /> API
        </button>
        <button
          onClick={() => setActiveTab('web-scraping')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'web-scraping'
              ? 'border-blue-500 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} /> Web Scraping
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
          onClick={() => setActiveTab('deployment')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'deployment'
              ? 'border-blue-500 text-blue-600 bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Play size={16} /> Deployment
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
      <div className="flex-1 overflow-auto p-4 bg-[#f8f9fb]">
        {activeTab === 'lambda' && (
          <div className="h-full overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">Lambda Function Generation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use the chat below to describe the Lambda function you want to generate. 
                Make sure to select a schema first, then describe your Lambda handler requirements.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Instructions:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• First, ask the AI to generate or select a schema</li>
                  <li>• Then describe your Lambda function requirements in the chat</li>
                  <li>• The AI will generate the Lambda code based on your description</li>
                  <li>• Generated code will appear in the Files tab</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Generated Lambda Code</h4>
                {generatedLambdaCode && (
                  <button
                    onClick={saveLambdaToNamespace}
                    disabled={isSavingLambda}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingLambda ? 'Saving...' : 'Save Lambda'}
                  </button>
                )}
              </div>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto" style={{ minHeight: 120 }}>
                {generatedLambdaCode || '// Lambda code will appear here after generation'}
              </pre>
            </div>
          </div>
        )}
        {activeTab === 'api' && (
          <div className="h-full overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">API Generation & Management</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use the chat below to generate and manage APIs. The AI will create API endpoints, routes, and documentation based on your descriptions.
                <br />
                <span className="text-blue-600 font-medium">💡 Tip:</span> Drag schemas from the Schema tab to provide context for API generation!
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Instructions:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Describe the API endpoints you want to create</li>
                  <li>• Specify HTTP methods (GET, POST, PUT, DELETE)</li>
                  <li>• Include authentication and validation requirements</li>
                  <li>• The AI will generate complete API code and documentation</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Generated API Code</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto" style={{ minHeight: 120 }}>
                {generatedApiCode || '// API code will appear here after generation'}
              </pre>
            </div>
            
            <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">API Documentation</h4>
              <div className="bg-gray-100 p-3 rounded text-xs overflow-x-auto" style={{ minHeight: 80 }}>
                {apiDocumentation || '// API documentation will appear here after generation'}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'web-scraping' && (
          <div className="h-full overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">Web Scraping Agent</h3>
              <p className="text-sm text-gray-600 mb-4">
                Automatically scrape APIs, schemas, and documentation from popular services like Shopify, Pinterest, Google, Stripe, and GitHub.
                <br />
                <span className="text-blue-600 font-medium">💡 Tip:</span> Select a service and click "Scrape & Save" to import everything into your namespace!
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">Instructions:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Select a service from the dropdown below</li>
                  <li>• Choose what to scrape (APIs, Schemas, Documentation)</li>
                  <li>• Click "Preview" to see what will be scraped</li>
                  <li>• Click "Scrape & Save" to import everything to your namespace</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium mb-4">Service Selection</h4>
              
              {/* Debug info */}
              <div className="text-xs text-gray-500 mb-2">
                Debug: selectedService = "{selectedService}", customUrl = "{customUrl}", supportedServices count = {supportedServices.length}
                <br />
                Should show custom URL input: {selectedService === 'custom-url' ? 'YES' : 'NO'}
                <br />
                <button 
                  onClick={() => {
                    console.log('Test button clicked');
                    setSelectedService('custom-url');
                    setCustomUrl('https://example.com');
                  }}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                >
                  Test: Set Custom URL
                </button>
              </div>>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service or URL</label>
                  <select 
                    value={selectedService} 
                    onChange={(e) => {
                      console.log('Service selection changed:', e.target.value);
                      setSelectedService(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    <option value="">Select a service or enter custom URL...</option>
                    {supportedServices.map(service => (
                      <option key={service.key} value={service.key}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  
                  {selectedService === 'custom-url' && (
                    <input
                      type="url"
                      placeholder="Enter any URL (e.g., https://api.example.com/docs)"
                      value={customUrl}
                      onChange={(e) => {
                        console.log('Custom URL input changed:', e.target.value);
                        setCustomUrl(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={scrapeOptions.apis} 
                        onChange={(e) => setScrapeOptions(prev => ({ ...prev, apis: e.target.checked }))}
                        className="mr-2"
                      />
                      Scrape APIs
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={scrapeOptions.schemas} 
                        onChange={(e) => setScrapeOptions(prev => ({ ...prev, schemas: e.target.checked }))}
                        className="mr-2"
                      />
                      Scrape Schemas
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={scrapeOptions.documentation} 
                        onChange={(e) => setScrapeOptions(prev => ({ ...prev, documentation: e.target.checked }))}
                        className="mr-2"
                      />
                      Scrape Documentation
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={scrapeOptions.followLinks} 
                        onChange={(e) => setScrapeOptions(prev => ({ ...prev, followLinks: e.target.checked }))}
                        className="mr-2"
                      />
                      Follow Links (find more content)
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handlePreviewScrape}
                  disabled={!selectedService || isScraping}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScraping ? 'Scraping...' : 'Preview'}
                </button>
                <button
                  onClick={handleScrapeAndSave}
                  disabled={!selectedService || isScraping}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScraping ? 'Scraping...' : 'Scrape & Save'}
                </button>
              </div>
            </div>
            

            
            {scrapedData && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Scraped Data Preview</h4>
                  <button
                    onClick={() => setShowAllScrapedData(true)}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    View All Data
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <h5 className="font-medium text-blue-800">APIs</h5>
                    <p className="text-2xl font-bold text-blue-600">{scrapedData.apis?.length || 0}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h5 className="font-medium text-green-800">Schemas</h5>
                    <p className="text-2xl font-bold text-green-600">{scrapedData.schemas?.length || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <h5 className="font-medium text-purple-800">Documentation</h5>
                    <p className="text-2xl font-bold text-purple-600">{scrapedData.documentation?.length || 0}</p>
                  </div>
                </div>
                
                {/* Detailed Data Display */}
                <div className="space-y-4">
                  {/* APIs Section */}
                  {scrapedData.apis && scrapedData.apis.length > 0 && (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <h5 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                        <span>🔗</span>
                        APIs ({scrapedData.apis.length})
                      </h5>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {scrapedData.apis.slice(0, 10).map((api: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-blue-700">{api.name || api.endpoint}</h6>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {api.format || 'API'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{api.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded">{api.method || 'GET'}</span>
                              <span className="truncate">{api.url}</span>
                            </div>
                            {api.openapiSpec && (
                              <details className="mt-2">
                                <summary className="text-xs text-blue-600 cursor-pointer">View OpenAPI Spec</summary>
                                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(api.openapiSpec, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                        {scrapedData.apis.length > 10 && (
                          <div className="text-center text-sm text-gray-500">
                            ... and {scrapedData.apis.length - 10} more APIs
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Schemas Section */}
                  {scrapedData.schemas && scrapedData.schemas.length > 0 && (
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <h5 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                        <span>📋</span>
                        Schemas ({scrapedData.schemas.length})
                      </h5>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {scrapedData.schemas.slice(0, 5).map((schema: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-green-100">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-green-700">{schema.name}</h6>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                {schema.format || 'JSON'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{schema.description}</p>
                            {schema.schema && (
                              <details className="mt-2">
                                <summary className="text-xs text-green-600 cursor-pointer">View JSON Schema</summary>
                                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(schema.schema, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                        {scrapedData.schemas.length > 5 && (
                          <div className="text-center text-sm text-gray-500">
                            ... and {scrapedData.schemas.length - 5} more schemas
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Documentation Section */}
                  {scrapedData.documentation && scrapedData.documentation.length > 0 && (
                    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                      <h5 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                        <span>📚</span>
                        Documentation ({scrapedData.documentation.length})
                      </h5>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {scrapedData.documentation.slice(0, 5).map((doc: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-purple-100">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-purple-700">{doc.title}</h6>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {doc.format || 'PDF'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{doc.content}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Section {doc.section}</span>
                              {doc.url && (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                                   className="text-purple-600 hover:underline">
                                  View Source
                                </a>
                              )}
                            </div>
                            {doc.data && doc.contentType && (
                              <details className="mt-2">
                                <summary className="text-xs text-purple-600 cursor-pointer">View Document Data</summary>
                                <div className="text-xs bg-gray-100 p-2 rounded mt-1">
                                  <p><strong>Content Type:</strong> {doc.contentType}</p>
                                  <p><strong>Data Size:</strong> {Math.round(doc.data.length / 1024)} KB</p>
                                  <p><strong>Format:</strong> {doc.format}</p>
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                        {scrapedData.documentation.length > 5 && (
                          <div className="text-center text-sm text-gray-500">
                            ... and {scrapedData.documentation.length - 5} more documents
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Errors Section */}
                  {scrapedData.errors && scrapedData.errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h5 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                        <span>⚠️</span>
                        Errors ({scrapedData.errors.length})
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {scrapedData.errors.map((error: string, index: number) => (
                          <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Scraping Log</h4>
              <div className="bg-gray-100 p-3 rounded text-xs overflow-y-auto max-h-40">
                {scrapingLog.length > 0 ? (
                  scrapingLog.map((log, index) => (
                    <div key={index} className={`mb-1 ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>
                      {log.timestamp}: {log.message}
                    </div>
                  ))
                ) : (
                  'No scraping activity yet...'
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'schema' && (
          <div className="h-full overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">Schema Management</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use the chat below to generate and manage schemas. The AI will create schemas based on your descriptions.
                <br />
                <span className="text-blue-600 font-medium">💡 Tip:</span> Drag any schema below to the chat area to provide context for your AI conversations!
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Generated Schemas</h4>
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
                  <div 
                    key={schema.id} 
                    className={`border border-gray-200 rounded-lg p-4 ${isEditingSchema && index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'} cursor-move hover:shadow-md transition-shadow`}
                    draggable
                    onDragStart={(e) => handleSchemaDragStart(e, schema)}
                    onDragEnd={handleSchemaDragEnd}
                    title="Drag this schema to the chat area for context"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-gray-400">
                          <span className="text-xs">📋</span>
                        </div>
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
                                  setConsoleOutput(prev => [...prev, `❌ Error saving schema: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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
                    onClick={saveFilesToS3}
                    disabled={projectFiles.length === 0 || isSavingToS3}
                    className={`px-2 py-1 text-xs rounded ${
                      projectFiles.length === 0 || isSavingToS3
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                    title="Save all project files to S3 cloud bucket"
                  >
                    {isSavingToS3 ? 'Saving to S3...' : 'Save to S3 Cloud Bucket'}
                  </button>
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
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
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
        {activeTab === 'deployment' && (
          <div className="h-full overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-medium text-lg mb-2">Deployment Configuration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure Lambda function deployment settings and deploy your project.
              </p>
            </div>
            
            {/* Deployed Endpoints Section */}
            {deployedEndpoints.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-3">🌐 Deployed API Gateway Endpoints</h4>
                <div className="space-y-3">
                  {deployedEndpoints.map((endpoint, index) => (
                    <div key={index} className="bg-white border border-green-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-700">{endpoint.functionName}</span>
                        <span className="text-xs text-green-600">
                          {endpoint.deployedAt.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">API Gateway URL:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs break-all">
                            {endpoint.apiGatewayUrl}
                          </code>
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Function ARN:</span>
                          <span className="ml-2 break-all">{endpoint.functionArn}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(endpoint.apiGatewayUrl);
                            setConsoleOutput(prev => [...prev, `📋 Copied API Gateway URL to clipboard: ${endpoint.apiGatewayUrl}`]);
                          }}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Copy URL
                        </button>
                        <button
                          onClick={() => {
                            const testUrl = endpoint.apiGatewayUrl;
                            setConsoleOutput(prev => [...prev, `🧪 Testing endpoint: ${testUrl}`]);
                            fetch(testUrl, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ test: true, message: 'Hello from deployment tab!' })
                            })
                              .then(res => res.json())
                              .then(data => {
                                setConsoleOutput(prev => [...prev, `✅ Test successful: ${JSON.stringify(data)}`]);
                              })
                              .catch(err => {
                                setConsoleOutput(prev => [...prev, `❌ Test failed: ${err.message}`]);
                              });
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Test Endpoint
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Lambda Configuration</h4>
                

                
                <div>
                  <label className="block font-semibold mb-1">Function Name</label>
                  <input
                    className="w-full border rounded px-2 py-1 mb-2"
                    value={lambdaForm.functionName}
                    onChange={e => setLambdaForm(f => ({ ...f, functionName: e.target.value }))}
                    placeholder="handler.js"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-semibold mb-1">Runtime</label>
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
                </div>
                
                <div>
                  <label className="block font-semibold mb-1">Handler</label>
                  <input
                    className="w-full border rounded px-2 py-1 mb-2"
                    value={lambdaForm.handler}
                    onChange={e => setLambdaForm(f => ({ ...f, handler: e.target.value }))}
                    placeholder="index.handler"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Resource Configuration</h4>
                
                <div>
                  <label className="block font-semibold mb-1">Memory (MB)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 mb-2"
                    value={lambdaForm.memory}
                    min={128}
                    max={10240}
                    onChange={e => setLambdaForm(f => ({ ...f, memory: Number(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-semibold mb-1">Timeout (seconds)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 mb-2"
                    value={lambdaForm.timeout}
                    min={1}
                    max={900}
                    onChange={e => setLambdaForm(f => ({ ...f, timeout: Number(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-semibold mb-1">Environment Variables (JSON)</label>
                  <textarea
                    className="w-full border rounded px-2 py-1 mb-2 font-mono"
                    value={lambdaForm.environment}
                    onChange={e => setLambdaForm(f => ({ ...f, environment: e.target.value }))}
                    placeholder='{"KEY":"VALUE"}'
                    rows={3}
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={runProject}
                    disabled={isRunningProject}
                    className={`w-full px-4 py-2 text-sm rounded ${
                      isRunningProject 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                  >
                    {isRunningProject ? 'Deploying...' : 'Deploy Project'}
                  </button>
                </div>
              </div>
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

      {/* Chat Area */}
      <div 
        ref={schemaDropRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 bg-white transition-colors ${
          isSchemaDropOver ? 'bg-purple-50 border-2 border-dashed border-purple-300' : ''
        }`}
      >
        {isSchemaDropOver && (
          <div className="text-center py-8 text-purple-600 font-medium">
            Drop schema here to add context
          </div>
        )}
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

      {/* File Upload and Context Area */}
      {(uploadedFiles.length > 0 || droppedSchemas.length > 0) && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">📎 Uploaded Files</h4>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {file.type.startsWith('image/') ? (
                        <Image className="w-4 h-4 text-blue-500" />
                      ) : file.type.includes('json') ? (
                        <FileText className="w-4 h-4 text-green-500" />
                      ) : file.type.includes('zip') || file.type.includes('tar') ? (
                        <Archive className="w-4 h-4 text-orange-500" />
                      ) : (
                        <File className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="truncate max-w-32">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        onClick={() => removeUploadedFile(file.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dropped Schemas */}
            {droppedSchemas.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  📋 Schema Context ({droppedSchemas.length} schema{droppedSchemas.length !== 1 ? 's' : ''})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {droppedSchemas.map((schema) => (
                    <div
                      key={schema.id}
                      className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <Database className="w-4 h-4 text-purple-500" />
                      <span className="truncate max-w-32">
                        {schema.schemaName || schema.name || 'Unknown Schema'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {schema.source === 'sidebar' ? '(from sidebar)' : '(from workspace)'}
                      </span>
                      <button
                        onClick={() => removeDroppedSchema(schema.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Upload Drop Zone */}
      <div
        className={`border-t border-gray-200 p-4 bg-white ${
          isDragOver ? 'bg-blue-50 border-blue-300' : ''
        } ${isDraggingSchema ? 'bg-purple-50 border-purple-300' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3">
          {/* File Upload Button */}
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isUploading ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}>
            <Upload className={`w-4 h-4 ${isUploading ? 'animate-pulse' : ''}`} />
            <span className="text-sm">{isUploading ? 'Uploading...' : 'Upload Files'}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              accept=".txt,.json,.js,.ts,.py,.java,.cpp,.c,.html,.css,.md,.xml,.yaml,.yml,.csv,.pdf,.jpg,.jpeg,.png,.gif"
            />
          </label>

          {/* Drag & Drop Indicator */}
          <div className="flex-1 text-center">
            <div className={`text-sm ${isDragOver ? 'text-blue-600' : isDraggingSchema ? 'text-purple-600' : isSchemaDropOver ? 'text-purple-600' : 'text-gray-500'}`}>
              {isDragOver ? 'Drop files here' : isDraggingSchema ? 'Drop schema here for context' : isSchemaDropOver ? 'Drop schema from sidebar here' : 'Drag & drop files here'}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Upload files or drag schemas for context)"
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

      {/* All Scraped Data Modal */}
      {showAllScrapedData && scrapedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 h-5/6 max-w-6xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">All Scraped Data - {scrapedData.service}</h3>
              <button
                onClick={() => setShowAllScrapedData(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto h-full">
              <div className="space-y-6">
                {/* APIs Section */}
                {scrapedData.apis && scrapedData.apis.length > 0 && (
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-medium text-blue-800 mb-4 flex items-center gap-2">
                      <span>🔗</span>
                      All APIs ({scrapedData.apis.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {scrapedData.apis.map((api: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded border border-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-blue-700">{api.name || api.endpoint}</h5>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {api.format || 'API'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{api.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span className="bg-gray-100 px-2 py-1 rounded">{api.method || 'GET'}</span>
                            <span className="truncate">{api.url}</span>
                          </div>
                          {api.openapiSpec && (
                            <details className="mt-2">
                              <summary className="text-sm text-blue-600 cursor-pointer font-medium">View OpenAPI Specification</summary>
                              <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-x-auto max-h-40">
                                {JSON.stringify(api.openapiSpec, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Schemas Section */}
                {scrapedData.schemas && scrapedData.schemas.length > 0 && (
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h4 className="font-medium text-green-800 mb-4 flex items-center gap-2">
                      <span>📋</span>
                      All Schemas ({scrapedData.schemas.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {scrapedData.schemas.map((schema: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded border border-green-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-green-700">{schema.name}</h5>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {schema.format || 'JSON'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{schema.description}</p>
                          {schema.schema && (
                            <details className="mt-2">
                              <summary className="text-sm text-green-600 cursor-pointer font-medium">View JSON Schema</summary>
                              <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-x-auto max-h-40">
                                {JSON.stringify(schema.schema, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Documentation Section */}
                {scrapedData.documentation && scrapedData.documentation.length > 0 && (
                  <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h4 className="font-medium text-purple-800 mb-4 flex items-center gap-2">
                      <span>📚</span>
                      All Documentation ({scrapedData.documentation.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {scrapedData.documentation.map((doc: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded border border-purple-100">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-purple-700">{doc.title}</h5>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {doc.format || 'PDF'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{doc.content}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span>Section {doc.section}</span>
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                                 className="text-purple-600 hover:underline">
                                View Source
                              </a>
                            )}
                          </div>
                          {doc.data && doc.contentType && (
                            <details className="mt-2">
                              <summary className="text-sm text-purple-600 cursor-pointer font-medium">View Document Data</summary>
                              <div className="text-xs bg-gray-100 p-3 rounded mt-2">
                                <p><strong>Content Type:</strong> {doc.contentType}</p>
                                <p><strong>Data Size:</strong> {Math.round(doc.data.length / 1024)} KB</p>
                                <p><strong>Format:</strong> {doc.format}</p>
                                <p><strong>Base64 Data:</strong></p>
                                <pre className="text-xs overflow-x-auto max-h-20 mt-1">
                                  {doc.data.substring(0, 200)}...
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Errors Section */}
                {scrapedData.errors && scrapedData.errors.length > 0 && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="font-medium text-red-800 mb-4 flex items-center gap-2">
                      <span>⚠️</span>
                      All Errors ({scrapedData.errors.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {scrapedData.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-700 bg-red-100 p-3 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIAgentWorkspace;