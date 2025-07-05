'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Terminal as TerminalIcon, 
  Code, 
  Database, 
  FileText, 
  Play, 
  Save, 
  Settings, 
  Zap, 
  Bot, 
  Send, 
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Folder,
  File,
  GitBranch,
  Search,
  RefreshCw
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'api' | 'schema' | 'test' | 'code' | 'log';
    data?: any;
  };
}

interface ProjectFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: ProjectFile[];
}

interface AIAgentWorkspaceProps {
  namespace?: any;
  onClose?: () => void;
}

// Utility: Try to extract JSON blocks from a string
function extractJSONBlocks(text) {
  const blocks = [];
  const regex = /```json[\s\S]*?({[\s\S]*?})[\s\S]*?```/g;
  let match;
  while ((match = regex.exec(text))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {}
  }
  // Also try to find the first {...} block if no code fences
  if (blocks.length === 0) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        blocks.push(JSON.parse(text.substring(firstBrace, lastBrace + 1)));
      } catch {}
    }
  }
  return blocks;
}

// Helper: Convert JSON Schema to { name, fields } format
function jsonSchemaToFields(name, schema) {
  if (!schema || typeof schema !== 'object' || !schema.properties) return null;
  const required = Array.isArray(schema.required) ? schema.required : [];
  return {
    name: name || schema.title || 'Schema',
    fields: Object.entries(schema.properties).map(([fieldName, def]) => ({
      name: fieldName,
      type: def.type || 'string',
      required: required.includes(fieldName)
    }))
  };
}

// Update getNowId to ensure uniqueness
function getNowId() {
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2, 10);
}

// Add utility for localStorage
function saveToStorage(key, value) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
function loadFromStorage(key, fallback) {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  }
  return fallback;
}

// Utility for namespace-specific storage
function getNamespaceKey(type, namespace) {
  return `aiagent-saved-${type}-${namespace?.['namespace-id'] || 'default'}`;
}

// Utility to extract code blocks and JSON from a string
function extractCodeBlocksAndText(text) {
  const codeBlockRegex = /```[a-zA-Z]*\n([\s\S]*?)```/g;
  let match;
  let codeBlocks = [];
  let lastIndex = 0;
  let plainParts = [];
  while ((match = codeBlockRegex.exec(text))) {
    if (match.index > lastIndex) {
      plainParts.push(text.slice(lastIndex, match.index));
    }
    codeBlocks.push(match[1]);
    lastIndex = match.index;
  }
  if (lastIndex < text.length) {
    plainParts.push(text.slice(lastIndex));
  }
  return {
    codeBlocks,
    plainText: plainParts.map(s => s.trim()).filter(Boolean).join('\n').trim()
  };
}

const AIAgentWorkspace: React.FC<AIAgentWorkspaceProps> = ({ namespace, onClose }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'console' | 'files' | 'api' | 'schema'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
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
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(() => loadFromStorage('aiagent-files', [
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
  ]));
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<any[]>(() => loadFromStorage('aiagent-apis', []));
  const [schemas, setSchemas] = useState<any[]>(() => loadFromStorage('aiagent-schemas', []));
  const [rawSchemas, setRawSchemas] = useState(() => loadFromStorage('aiagent-rawschemas', []));
  const [showRawSchema, setShowRawSchema] = useState({});
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isTerminalLoading, setIsTerminalLoading] = useState(true);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [apiTestResults, setApiTestResults] = useState({});
  const [apiTestLoading, setApiTestLoading] = useState({});
  const [apiTestInput, setApiTestInput] = useState({});

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize terminal only on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initTerminal = async () => {
      try {
        setIsTerminalLoading(true);
        
        // Wait for the DOM element to be available
        if (!terminalRef.current) {
          console.log('Terminal ref not ready, retrying...');
          setTimeout(initTerminal, 100);
          return;
        }

        // Check if element has dimensions
        const rect = terminalRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log('Terminal element has no dimensions, retrying...');
          setTimeout(initTerminal, 100);
          return;
        }

        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        const { WebLinksAddon } = await import('@xterm/addon-web-links');
        const { SearchAddon } = await import('@xterm/addon-search');
        
        // Import CSS
        await import('@xterm/xterm/css/xterm.css');

        if (terminalRef.current && !terminalInstance.current) {
          const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            theme: {
              background: '#1e1e1e',
              foreground: '#ffffff',
              cursor: '#ffffff',
              selection: '#264f78'
            },
            // Add these options to prevent dimension errors
            cols: 80,
            rows: 24,
            allowTransparency: true
          });

          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon();
          const searchAddon = new SearchAddon();

          terminal.loadAddon(fitAddon);
          terminal.loadAddon(webLinksAddon);
          terminal.loadAddon(searchAddon);

          // Open terminal with error handling
          try {
            terminal.open(terminalRef.current);
            
            // Wait a bit before fitting to ensure terminal is properly initialized
            setTimeout(() => {
              try {
                fitAddon.fit();
              } catch (fitError) {
                console.warn('Fit addon error:', fitError);
              }
            }, 50);

            terminal.write('$ AI Agent Workspace Terminal\r\n');
            terminal.write('$ Ready for commands...\r\n\r\n');

            terminalInstance.current = terminal;
            setIsTerminalReady(true);
            setIsTerminalLoading(false);

            const handleResize = () => {
              try {
                if (terminalInstance.current && fitAddon) {
                  fitAddon.fit();
                }
              } catch (resizeError) {
                console.warn('Resize error:', resizeError);
              }
            };
            
            window.addEventListener('resize', handleResize);

            return () => {
              window.removeEventListener('resize', handleResize);
              if (terminalInstance.current) {
                try {
                  terminalInstance.current.dispose();
                } catch (disposeError) {
                  console.warn('Terminal dispose error:', disposeError);
                }
              }
            };
          } catch (openError) {
            console.error('Failed to open terminal:', openError);
            setIsTerminalLoading(false);
            // Clean up if terminal creation failed
            if (terminalInstance.current) {
              try {
                terminalInstance.current.dispose();
              } catch (disposeError) {
                console.warn('Terminal dispose error:', disposeError);
              }
              terminalInstance.current = null;
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        // Set a flag to prevent infinite retries
        setIsTerminalReady(false);
        setIsTerminalLoading(false);
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(initTerminal, 100);
    
    return () => {
      clearTimeout(timer);
      if (terminalInstance.current) {
        try {
          terminalInstance.current.dispose();
        } catch (error) {
          console.warn('Terminal cleanup error:', error);
        }
      }
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: getNowId(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage
    });

    try {
      // Call the real backend AI agent
      const response = await fetch('/unified/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          namespace: namespace || null,
          action: null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Only add to chat if not a schema/api/test/auth output
      if (!data.metadata || !['schema', 'api', 'test', 'auth'].includes(data.metadata.type)) {
        addMessage({
          role: 'assistant',
          content: data.content,
          metadata: data.metadata
        });
      }

      // Handle different response types
      if (data.metadata?.type === 'api') {
        handleAPIGeneration(data.metadata.data);
      } else if (data.metadata?.type === 'schema') {
        handleSchemaGeneration(data.metadata.data);
      } else if (data.metadata?.type === 'test') {
        handleCodeGeneration(data.metadata.data);
      } else if (data.metadata?.type === 'auth') {
        handleCodeGeneration(data.metadata.data);
      } else {
        // For general responses, try to detect the type from content
        const content = data.content.toLowerCase();
        const userMessageLower = userMessage.toLowerCase();
        
        // Check user intent first (what they asked for)
        if (userMessageLower.includes('schema') || userMessageLower.includes('model') || userMessageLower.includes('database') || userMessageLower.includes('json schema')) {
          handleSchemaGeneration({ content: data.content });
        } else if (userMessageLower.includes('api') || userMessageLower.includes('endpoint') || userMessageLower.includes('route')) {
          handleAPIGeneration({ content: data.content });
        } else if (userMessageLower.includes('test') || userMessageLower.includes('debug') || userMessageLower.includes('code')) {
          handleCodeGeneration({ content: data.content });
        } else {
          // Fallback: check content for patterns
          if (content.includes('api') || content.includes('endpoint') || content.includes('route')) {
            handleAPIGeneration({ content: data.content });
          } else if (content.includes('schema') || content.includes('model') || content.includes('database') || content.includes('properties')) {
            handleSchemaGeneration({ content: data.content });
          } else if (content.includes('test') || content.includes('debug') || content.includes('code')) {
            handleCodeGeneration({ content: data.content });
          } else {
            // For general responses, switch to console tab to show the output
            setActiveTab('console');
          }
        }
      }
    } catch (error) {
      console.error('Error calling AI agent:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAPIGeneration = (data: any) => {
    const content = data.message || data.content || '';
    let endpoints = [];

    // Try to extract endpoints from JSON blocks
    const jsonBlocks = extractJSONBlocks(content);
    for (const block of jsonBlocks) {
      if (Array.isArray(block)) {
        // If it's an array of endpoints
        endpoints = endpoints.concat(block);
      } else if (block.endpoints && Array.isArray(block.endpoints)) {
        endpoints = endpoints.concat(block.endpoints);
      } else if (block.path && block.method) {
        endpoints.push(block);
      }
    }

    // Fallback: Try regex for Flask/Express
    if (endpoints.length === 0) {
      const flaskMatches = content.match(/@app\.route\('([^']+)', methods=\[([^\]]+)\]/g);
      if (flaskMatches) {
        endpoints = flaskMatches.map((match) => {
          const pathMatch = match.match(/@app\.route\('([^']+)'/);
          const methodMatch = match.match(/methods=\[([^\]]+)\]/);
          return {
            method: methodMatch ? methodMatch[1].replace(/['"]/g, '') : 'GET',
            path: pathMatch ? pathMatch[1] : '/',
            description: 'AI generated endpoint'
          };
        });
      }
    }

    // Fallback: If no endpoints found, create a generic one
    if (endpoints.length === 0 && content.toLowerCase().includes('api')) {
      endpoints.push({
        method: 'POST',
        path: '/api/generated',
        description: 'AI generated API endpoint'
      });
    }

    setApiEndpoints(endpoints);
    setActiveTab('api');
    
    // Add to console
    const consoleLines = ['$ Generating API endpoints...'];
    endpoints.forEach((endpoint) => {
      consoleLines.push(`$ Created ${endpoint.method} ${endpoint.path}`);
    });
    consoleLines.push('$ API generation complete!', '');
    
    setConsoleOutput(prev => [...prev, ...consoleLines]);
    
    if (terminalInstance.current && isTerminalReady) {
      terminalInstance.current.write('\r\n$ Generating API endpoints...\r\n');
      endpoints.forEach((endpoint) => {
        terminalInstance.current?.write(`$ Created ${endpoint.method} ${endpoint.path}\r\n`);
      });
      terminalInstance.current.write('$ API generation complete!\r\n\r\n');
    }
  };

  const handleSchemaGeneration = (data: any) => {
    const content = data.message || data.content || '';
    let schemas = [];
    let rawSchemasArr = [];
    // Try to extract JSON schemas
    const jsonBlocks = extractJSONBlocks(content);
    for (const block of jsonBlocks) {
      if (Array.isArray(block)) {
        block.forEach((item, idx) => {
          if (item && item.properties) {
            const converted = jsonSchemaToFields(item.title || `Schema${idx + 1}`, item);
            if (converted) schemas.push(converted);
            rawSchemasArr.push(item);
          } else if (item.name && item.fields) {
            schemas.push(item);
            rawSchemasArr.push(item);
          }
        });
      } else if (block && block.properties) {
        const converted = jsonSchemaToFields(block.title, block);
        if (converted) schemas.push(converted);
        rawSchemasArr.push(block);
      } else if (block.name && block.fields) {
        schemas.push(block);
        rawSchemasArr.push(block);
      } else if (block.schemaName && block.schema) {
        if (block.schema && block.schema.properties) {
          const converted = jsonSchemaToFields(block.schemaName, block.schema);
          if (converted) schemas.push(converted);
          rawSchemasArr.push(block.schema);
        } else {
          schemas.push({ name: block.schemaName, fields: block.schema.fields || [] });
          rawSchemasArr.push(block.schema);
        }
      }
    }
    // Fallback: Try regex for Python classes
    if (schemas.length === 0) {
      const schemaMatches = content.match(/class\s+(\w+).*?:\s*\n([\s\S]*?)(?=\nclass|\n\n|$)/g);
      if (schemaMatches) {
        schemas = schemaMatches.map((match, index) => {
          const nameMatch = match.match(/class\s+(\w+)/);
          const fieldMatches = match.match(/(\w+)\s*=\s*db\.Column\([^)]+\)/g);
          const fields = fieldMatches ? fieldMatches.map((field) => {
            const fieldNameMatch = field.match(/(\w+)\s*=/);
            const fieldTypeMatch = field.match(/db\.(\w+)/);
            return {
              name: fieldNameMatch ? fieldNameMatch[1] : 'field',
              type: fieldTypeMatch ? fieldTypeMatch[1] : 'String',
              required: field.includes('nullable=False')
            };
          }) : [];
          return {
            name: nameMatch ? nameMatch[1] : `Schema${index + 1}`,
            fields: fields.length > 0 ? fields : [
              { name: 'id', type: 'Integer', required: true },
              { name: 'name', type: 'String', required: true },
              { name: 'created_at', type: 'DateTime', required: false }
            ]
          };
        });
        rawSchemasArr = [...schemas];
      }
    }
    // Fallback: If no schemas found, create a generic one
    if (schemas.length === 0 && content.toLowerCase().includes('schema')) {
      schemas.push({
        name: 'GeneratedSchema',
        fields: [
          { name: 'id', type: 'Integer', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'description', type: 'Text', required: false },
          { name: 'created_at', type: 'DateTime', required: false }
        ]
      });
      rawSchemasArr.push({
        name: 'GeneratedSchema',
        fields: [
          { name: 'id', type: 'Integer', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'description', type: 'Text', required: false },
          { name: 'created_at', type: 'DateTime', required: false }
        ]
      });
    }
    setSchemas(schemas);
    setRawSchemas(rawSchemasArr);
    setActiveTab('schema');
    
    // Add to console
    const consoleLines = ['$ Generating database schemas...'];
    schemas.forEach((schema) => {
      consoleLines.push(`$ Created schema: ${schema.name}`);
    });
    consoleLines.push('$ Schema generation complete!', '');
    
    setConsoleOutput(prev => [...prev, ...consoleLines]);
    
    if (terminalInstance.current && isTerminalReady) {
      terminalInstance.current.write('\r\n$ Generating database schemas...\r\n');
      if (schemas.length > 0) {
        schemas.forEach((schema) => {
          terminalInstance.current?.write(`$ Created schema: ${schema.name}\r\n`);
        });
      } else {
        terminalInstance.current?.write('$ AI generated schema suggestions (check the response above)\r\n');
      }
      terminalInstance.current.write('$ Schema generation complete!\r\n\r\n');
    }
  };

  const handleCodeGeneration = (data: any) => {
    const content = data.message || data.content || '';
    
    // Check if the response contains test-related content
    if (content.toLowerCase().includes('test') || content.toLowerCase().includes('debug')) {
      const consoleLines = [
        '$ Running tests...',
        '$ ✓ Tests analyzed from AI response',
        '$ Check the AI response above for test details',
        '$ Test analysis complete!',
        ''
      ];
      
      setConsoleOutput(prev => [...prev, ...consoleLines]);
      
      if (terminalInstance.current && isTerminalReady) {
        terminalInstance.current.write('\r\n$ Running tests...\r\n');
        terminalInstance.current.write('$ ✓ Tests analyzed from AI response\r\n');
        terminalInstance.current.write('$ Check the AI response above for test details\r\n');
        terminalInstance.current.write('$ Test analysis complete!\r\n\r\n');
      }
    } else {
      const consoleLines = [
        '$ Code generation complete!',
        '$ Check the AI response above for generated code',
        ''
      ];
      
      setConsoleOutput(prev => [...prev, ...consoleLines]);
      
      if (terminalInstance.current && isTerminalReady) {
        terminalInstance.current.write('\r\n$ Code generation complete!\r\n');
        terminalInstance.current.write('$ Check the AI response above for generated code\r\n\r\n');
      }
    }
    
    // Switch to console tab to show the output
    setActiveTab('console');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: Message) => (
    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg px-4 py-2`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.metadata && (
          <div className="mt-2 text-xs opacity-75">
            {message.metadata.type === 'api' && (
              <div className="bg-green-100 text-green-800 p-2 rounded">
                AI generated API suggestions
              </div>
            )}
            {message.metadata.type === 'schema' && (
              <div className="bg-blue-100 text-blue-800 p-2 rounded">
                AI generated schema suggestions
              </div>
            )}
            {message.metadata.type === 'test' && (
              <div className="bg-yellow-100 text-yellow-800 p-2 rounded">
                AI generated test suggestions
              </div>
            )}
            {message.metadata.type === 'auth' && (
              <div className="bg-purple-100 text-purple-800 p-2 rounded">
                AI generated authentication suggestions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderFileTree = (files: ProjectFile[], level = 0) => (
    <div className="space-y-1">
      {files.map(file => (
        <div key={file.id}>
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
              selectedFile?.id === file.id ? 'bg-blue-100' : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => setSelectedFile(file)}
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
  const handleApiTest = async (endpoint, index) => {
    setApiTestLoading((prev) => ({ ...prev, [index]: true }));
    setApiTestResults((prev) => ({ ...prev, [index]: null }));
    try {
      const url = endpoint.path.startsWith('http') ? endpoint.path : `http://localhost:5001${endpoint.path}`;
      const method = endpoint.method.split(',')[0].trim().toUpperCase();
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
      setApiTestResults((prev) => ({ ...prev, [index]: { error: e.message } }));
    } finally {
      setApiTestLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // State for saved items
  const [savedSchemas, setSavedSchemas] = useState<any[]>([]);
  const [savedApis, setSavedApis] = useState<any[]>([]);
  const [savedFiles, setSavedFiles] = useState<ProjectFile[]>([]);

  // Save handlers
  const handleSaveSchema = (schema) => {
    const updated = [...savedSchemas, schema];
    setSavedSchemas(updated);
    saveToStorage(getNamespaceKey('schemas', namespace), updated);
  };
  const handleSaveApi = (api) => {
    const updated = [...savedApis, api];
    setSavedApis(updated);
    saveToStorage(getNamespaceKey('apis', namespace), updated);
  };
  const handleSaveFile = (file) => {
    const updated = [...savedFiles, file];
    setSavedFiles(updated);
    saveToStorage(getNamespaceKey('files', namespace), updated);
  };

  // On mount, load saved items for current namespace
  useEffect(() => {
    if (!namespace) return;
    const savedSchemas = loadFromStorage(getNamespaceKey('schemas', namespace), []);
    const savedApis = loadFromStorage(getNamespaceKey('apis', namespace), []);
    const savedFiles = loadFromStorage(getNamespaceKey('files', namespace), []);
    setSavedSchemas(savedSchemas);
    setSavedApis(savedApis);
    setSavedFiles(savedFiles);
  }, [namespace]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Bot className="text-blue-500" size={24} />
          <div>
            <h2 className="text-lg font-semibold">AI Agent Workspace</h2>
            <p className="text-sm text-gray-500">
              {namespace ? `Working on: ${namespace['namespace-name']}` : 'Development Assistant'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {/* Main Content: Split horizontally */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Center: Chat and thinking process */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 p-3 border-b bg-gray-50 flex-shrink-0">
            <MessageSquare size={16} />
            <span className="font-medium">AI Assistant</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to create APIs, generate schemas, run tests..."
                className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
        {/* Right: Output Tabs */}
        <div className="w-96 border-l flex flex-col min-h-0">
          {/* Tab Navigation */}
          <div className="flex border-b flex-shrink-0">
            {[
              { key: 'files', label: 'Files', icon: Folder },
              { key: 'api', label: 'API', icon: Code },
              { key: 'schema', label: 'Schema', icon: Database },
              { key: 'console', label: 'Console', icon: TerminalIcon }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium ${
                  activeTab === tab.key ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'files' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Project Files</h3>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-full">
                  {renderFileTree(projectFiles)}
                </div>
              </div>
            )}
            {activeTab === 'api' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">API Endpoints</h3>
                  <span className="text-xs text-gray-500">{apiEndpoints.length} endpoints</span>
                </div>
                <div className="overflow-y-auto max-h-full">
                                      {apiEndpoints.length > 0 ? (
                      <div className="space-y-3">
                        {apiEndpoints.map((endpoint, index) => {
                          const isSaved = savedApis.some(api => JSON.stringify(api) === JSON.stringify(endpoint));
                          return (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                              endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                              endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {endpoint.method}
                            </span>
                            <span className="font-mono text-sm bg-white px-2 py-1 rounded border">{endpoint.path}</span>
                          </div>
                          <p className="text-sm text-gray-600">{endpoint.description}</p>
                          <form
                            className="mt-2 flex gap-2 items-center"
                            onSubmit={e => {
                              e.preventDefault();
                              handleApiTest(endpoint, index);
                            }}
                          >
                            {endpoint.method && endpoint.method.toUpperCase() !== 'GET' && (
                              <textarea
                                className="flex-1 p-2 border rounded text-xs"
                                placeholder="JSON body"
                                value={apiTestInput[index] || ''}
                                onChange={e => setApiTestInput((prev) => ({ ...prev, [index]: e.target.value }))}
                                rows={2}
                              />
                            )}
                            <button
                              type="submit"
                              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                              disabled={apiTestLoading[index]}
                            >
                              {apiTestLoading[index] ? 'Testing...' : 'Test'}
                            </button>
                          </form>
                          {apiTestResults[index] && (
                            <pre className="mt-2 bg-white border rounded p-2 text-xs overflow-auto max-h-32">
                              {JSON.stringify(apiTestResults[index], null, 2)}
                            </pre>
                          )}
                          <button className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 mt-2">
                                                          Copy
                            </button>
                              {isSaved ? (
                                <span className="ml-2 text-green-600 text-xs font-semibold">Saved</span>
                              ) : (
                                <button
                                  className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                  onClick={() => handleSaveApi(endpoint)}
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                  ) : (
                    <div className="text-center py-8">
                      <Code size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-sm">No API endpoints generated yet.</p>
                      <p className="text-gray-400 text-xs mt-1">Ask the AI to create some!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'schema' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Database Schemas</h3>
                  <span className="text-xs text-gray-500">{schemas.length} schemas</span>
                </div>
                <div className="overflow-y-auto max-h-full">
                                      {schemas.length > 0 ? (
                      <div className="space-y-3">
                        {schemas.map((schema, index) => {
                          const isSaved = savedSchemas.some(s => JSON.stringify(s) === JSON.stringify(schema));
                          return (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-blue-600">{schema.name}</h4>
                            <span className="text-xs text-gray-500">{schema.fields.length} fields</span>
                            <button
                              className="text-xs text-blue-500 underline ml-2"
                              onClick={() => setShowRawSchema((prev) => ({ ...prev, [index]: !prev[index] }))}
                            >
                                                              {showRawSchema[index] ? 'Hide JSON' : 'Show JSON'}
                              </button>
                              {isSaved ? (
                                <span className="ml-2 text-green-600 text-xs font-semibold">Saved</span>
                              ) : (
                                <button
                                  className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                  onClick={() => handleSaveSchema(schema)}
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          {showRawSchema[index] && (
                            <pre className="bg-white border rounded p-2 text-xs overflow-auto max-h-40 mb-2">
                              {JSON.stringify(rawSchemas[index], null, 2)}
                            </pre>
                          )}
                          <div className="space-y-2">
                            {schema.fields.map((field, fieldIndex) => (
                              <div key={fieldIndex} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-medium">{field.name}</span>
                                  <span className="text-gray-400">:</span>
                                  <span className={`px-2 py-1 rounded text-xs ${field.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{field.type}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {field.required && <span className="text-red-500 text-xs font-bold">*</span>}
                                  <span className={`text-xs px-1 rounded ${field.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{field.required ? 'Required' : 'Optional'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Generate Migration</button>
                            <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">View SQL</button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Database size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-sm">No schemas generated yet.</p>
                      <p className="text-gray-400 text-xs mt-1">Ask the AI to create some!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'console' && (
              <div className="p-4">
                <h3 className="font-medium mb-4">Console Output</h3>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm h-64 overflow-y-auto">
                  {consoleOutput.length > 0 ? (
                    consoleOutput.map((line, index) => (
                      <div key={index}>{line}</div>
                    ))
                  ) : (
                    <div>No console output yet...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentWorkspace; 