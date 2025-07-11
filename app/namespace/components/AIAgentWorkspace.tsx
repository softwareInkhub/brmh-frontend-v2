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
  const [activeTab, setActiveTab] = useState<'chat' | 'console' | 'files' | 'api' | 'schema' | 'codegen'>('chat');
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
  const [apiEndpoints, setApiEndpoints] = useState<any[]>([]);
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
  
  // Memory service state
  const [sessionId, setSessionId] = useState<string>('');
  const [userId] = useState<string>('default-user');
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const getNowId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Memory service functions
  const loadWorkspaceState = async () => {
    if (!sessionId || !namespace?.['namespace-id']) return;
    
    try {
      const response = await fetch('http://localhost:5001/ai-agent/get-workspace-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, namespaceId: namespace['namespace-id'] })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.workspaceState) {
          setWorkspaceState(data.workspaceState);
          setSchemas(data.workspaceState.schemas || []);
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
      await fetch('http://localhost:5001/ai-agent/save-workspace-state', {
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
      const response = await fetch('http://localhost:5001/ai-agent/chat-history', {
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
      await fetch('http://localhost:5001/ai-agent/clear-history', {
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
      await handleStreamingResponse(userMessage);
    } catch (error: any) {
      console.error('Error sending message:', error);
      addMessage({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingResponse = async (userMessage: string) => {
    const response = await fetch('http://localhost:5001/ai-agent/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        namespace: namespace || null,
        action: null,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        userId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    let assistantMessage = '';
    let actions: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'stream' && data.content) {
                assistantMessage += data.content;
                // Update the message in real-time
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = assistantMessage;
                  } else {
                    newMessages.push({
                      id: getNowId(),
                      role: 'assistant',
                      content: assistantMessage,
                      timestamp: new Date()
                    });
                  }
                  return newMessages;
                });
              } else if (data.type === 'actions' && data.actions) {
                actions = data.actions;
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Process actions after streaming is complete
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        if (action.status === 'complete' && action.data) {
          switch (action.type) {
            case 'generate_schema':
              const newSchema = {
                id: Date.now().toString(),
                name: action.data.name || 'Generated Schema',
                schema: action.data,
                timestamp: action.data.timestamp || new Date()
              };
              setSchemas((prev: any[]) => [...prev, newSchema]);
              setRawSchemas((prev: any[]) => [...prev, { id: newSchema.id, content: JSON.stringify(action.data, null, 2) }]);
              setActiveTab('schema');
              setConsoleOutput((prev: string[]) => [...prev, '✅ Schema generated successfully']);
              break;
              
            case 'generate_api':
              const newApi = {
                id: Date.now().toString(),
                name: action.data.name || 'Generated API',
                endpoints: action.data.endpoints || [action.data],
                timestamp: action.data.timestamp || new Date()
              };
              setApiEndpoints((prev: any[]) => [...prev, newApi]);
              setActiveTab('api');
              setConsoleOutput((prev: string[]) => [...prev, '✅ API generated successfully']);
              break;
              
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
          }
        } else if (action.status === 'error') {
          setConsoleOutput((prev: string[]) => [...prev, `❌ Error in ${action.type}: ${action.error}`]);
          setActiveTab('console');
        }
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
    if (originalMessage.toLowerCase().includes('api') || content.includes('endpoints') || content.includes('method')) {
      try {
        const apiData = JSON.parse(content);
        const newApi = {
          id: Date.now().toString(),
          name: 'Generated API',
          endpoints: apiData.endpoints || [apiData],
          timestamp: new Date()
        };
        setApiEndpoints(prev => [...prev, newApi]);
        setActiveTab('api');
        setConsoleOutput(prev => [...prev, '✅ API generated successfully']);
        return;
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
      const response = await fetch(`http://localhost:5001/code-generation/files/${namespace['namespace-id']}`);
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
      const response = await fetch(`http://localhost:5001/code-generation/files/${namespace['namespace-id']}/${encodeURIComponent(filePath)}`);
      
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
        // Auto-save workspace state when schema is added
        setTimeout(() => saveWorkspaceState(), 500);
        break;
        
      case 'api':
        try {
          const apiData = JSON.parse(output);
          const newApi = {
            id: Date.now().toString(),
            name: 'Generated API',
            endpoints: apiData.endpoints || [],
            timestamp: new Date()
          };
          setApiEndpoints(prev => [...prev, newApi]);
          setActiveTab('api');
          // Auto-save workspace state when API is added
          setTimeout(() => saveWorkspaceState(), 500);
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
                  const response = await fetch(`http://localhost:5001/code-generation/files/${namespace['namespace-id']}/${encodeURIComponent(file.path)}`);
                  
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
      const url = endpoint.path.startsWith('http') ? endpoint.path : `${endpoint.path}`;
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
      const err = e as Error;
      setApiTestResults((prev) => ({ ...prev, [index]: { error: err.message } }));
    } finally {
      setApiTestLoading((prev) => ({ ...prev, [index]: false }));
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
      
      const response = await fetch('http://localhost:5001/code-generation/generate-backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📥 Response status:', response.status);
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
  const [savedSchemas, setSavedSchemas] = useState<any[]>([]);
  const [savedApis, setSavedApis] = useState<any[]>([]);
  const [savedFiles, setSavedFiles] = useState<ProjectFile[]>([]);

  // Code generation state
  const [projectType, setProjectType] = useState<'nodejs' | 'python'>('nodejs');
  const [projectName, setProjectName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);

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
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <File size={16} /> Files
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code size={16} /> API
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
          <button
            onClick={() => setActiveTab('codegen')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'codegen'
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code size={16} /> Code Gen
          </button>
        </div>
        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'files' && (
            <div className="h-full flex">
              <div className="w-64 border-r border-gray-200 p-4 bg-white rounded-l-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Project Files</h3>
                  <button
                    onClick={() => {
                      const fileName = prompt('Enter file name:');
                      if (fileName && namespace?.['namespace-id']) {
                        fetch('http://localhost:5001/code-generation/write-file', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            namespaceId: namespace['namespace-id'],
                            filePath: fileName,
                            content: '// New file created by AI Agent'
                          })
                        }).then(() => {
                          refreshFileTree();
                        });
                      }
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    + New
                  </button>
                </div>
                {renderFileTree(projectFiles)}
              </div>
                                  <div className="flex-1 flex flex-col">
                      {selectedFile ? (
                        <>
                          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                            <h3 className="font-medium">{selectedFile.name}</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (namespace?.['namespace-id'] && selectedFile) {
                                    try {
                                      const response = await fetch('http://localhost:5001/code-generation/write-file', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          namespaceId: namespace['namespace-id'],
                                          filePath: selectedFile.path,
                                          content: fileContent
                                        })
                                      });
                                      
                                      if (response.ok) {
                                        const data = await response.json();
                                        if (data.success) {
                                          // Show success message
                                          setConsoleOutput(prev => [...prev, `✅ Saved ${selectedFile.name}`]);
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Error saving file:', error);
                                      setConsoleOutput(prev => [...prev, `❌ Error saving ${selectedFile.name}: ${error.message}`]);
                                    }
                                  }
                                }}
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  if (namespace?.['namespace-id'] && selectedFile) {
                                    if (confirm(`Are you sure you want to delete ${selectedFile.name}?`)) {
                                      fetch('http://localhost:5001/code-generation/delete-file', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          namespaceId: namespace['namespace-id'],
                                          filePath: selectedFile.path
                                        })
                                      }).then(() => {
                                        setSelectedFile(null);
                                        setFileContent('');
                                        refreshFileTree();
                                      });
                                    }
                                  }
                                }}
                                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 p-4 bg-white">
                            <textarea
                              value={fileContent}
                              onChange={(e) => setFileContent(e.target.value)}
                              className="w-full h-full resize-none border border-gray-300 rounded-lg p-3 font-mono text-sm"
                              placeholder="File content..."
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 bg-white">
                          Select a file to edit
                        </div>
                      )}
                    </div>
            </div>
          )}
          {activeTab === 'api' && (
            <div className="h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">API Endpoints</h3>
                <button
                  onClick={() => {
                    if (apiEndpoints.length > 0 && namespace?.['namespace-id']) {
                      const apiName = prompt('Enter API name:');
                      if (apiName) {
                        const latestApi = apiEndpoints[apiEndpoints.length - 1];
                        // Save API endpoints as methods in the namespace
                        latestApi.endpoints.forEach((endpoint: any, index: number) => {
                          fetch('/unified/namespace-methods', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              namespaceId: namespace['namespace-id'],
                              methodName: `${apiName}_${index + 1}`,
                              methodDescription: endpoint.description,
                              methodPath: endpoint.path,
                              methodType: endpoint.method,
                              methodBody: JSON.stringify(endpoint)
                            })
                          });
                        });
                        setConsoleOutput(prev => [...prev, `✅ API "${apiName}" saved with ${latestApi.endpoints.length} endpoints`]);
                      }
                    }
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Save Latest API
                </button>
              </div>
              {apiEndpoints.length === 0 ? (
                <div className="text-gray-500">No API endpoints generated yet...</div>
              ) : (
                <div className="space-y-4">
                  {apiEndpoints.map((api: any, apiIndex: number) => (
                    <div key={api.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <h4 className="font-medium mb-2">{api.name}</h4>
                      <div className="space-y-2">
                        {api.endpoints.map((endpoint: any, index: number) => (
                          <div key={index} className="border border-gray-100 rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                endpoint.method?.includes('GET') ? 'bg-green-100 text-green-800' :
                                endpoint.method?.includes('POST') ? 'bg-blue-100 text-blue-800' :
                                endpoint.method?.includes('PUT') ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {endpoint.method}
                              </span>
                              <span className="font-mono text-sm">{endpoint.path}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Test input (JSON)"
                                value={apiTestInput[String(`${apiIndex}-${index}`)] || ''}
                                onChange={(e) => setApiTestInput(prev => ({
                                  ...prev,
                                  [String(`${apiIndex}-${index}`)]: e.target.value
                                }))}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={() => handleApiTest(endpoint, String(`${apiIndex}-${index}`))}
                                disabled={apiTestLoading[String(`${apiIndex}-${index}`)]}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                              >
                                {apiTestLoading[String(`${apiIndex}-${index}`)] ? 'Testing...' : 'Test'}
                              </button>
                            </div>
                            {apiTestResults[String(`${apiIndex}-${index}`)] && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(apiTestResults[String(`${apiIndex}-${index}`)] as any, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'schema' && (
            <div className="h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Generated Schemas</h3>
                <button
                  onClick={() => {
                    if (schemas.length > 0 && namespace?.['namespace-id']) {
                      const schemaName = prompt('Enter schema name:');
                      if (schemaName) {
                        const latestSchema = schemas[schemas.length - 1];
                        fetch('/unified/schema', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            schemaName,
                            namespaceId: namespace['namespace-id'],
                            schema: latestSchema.schema
                          })
                        }).then(() => {
                          setConsoleOutput(prev => [...prev, `✅ Schema "${schemaName}" saved successfully`]);
                        });
                      }
                    }
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  Save Latest Schema
                </button>
              </div>
              {schemas.length === 0 ? (
                <div className="text-gray-500">No schemas generated yet...</div>
              ) : (
                <div className="space-y-4">
                  {schemas.map((schema: any, index: number) => (
                    <div key={schema.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{schema.name}</h4>
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
          {activeTab === 'console' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h3 className="font-medium">Console Output</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (namespace?.['namespace-id']) {
                        setConsoleOutput(prev => [...prev, '🔄 Running project...']);
                        // Simulate running the project
                        setTimeout(() => {
                          setConsoleOutput(prev => [...prev, '✅ Project started successfully']);
                          setConsoleOutput(prev => [...prev, '🌐 Server running on http://localhost:3000']);
                        }, 1000);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Run Project
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
          {activeTab === 'codegen' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h3 className="font-medium">Code Generation</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenerationHistory([])}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Clear History
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Project Configuration */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="font-medium mb-4">Project Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="Enter project name (e.g., User Management API)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Project Type
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="nodejs"
                              checked={projectType === 'nodejs'}
                              onChange={(e) => setProjectType(e.target.value as 'nodejs' | 'python')}
                              className="mr-2"
                            />
                            <span className="text-sm">Node.js (Express)</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="python"
                              checked={projectType === 'python'}
                              onChange={(e) => setProjectType(e.target.value as 'nodejs' | 'python')}
                              className="mr-2"
                            />
                            <span className="text-sm">Python (Flask)</span>
                          </label>
                        </div>
                      </div>
                                             <button
                         onClick={() => {
                           console.log('🔘 Button clicked!');
                           generateBackendCode();
                         }}
                         disabled={isGenerating || !projectName.trim() || (schemas.length === 0 && apiEndpoints.length === 0)}
                         className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                       >
                         {isGenerating ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                             Generating...
                           </>
                         ) : (
                           <>
                             🚀 Generate {projectType.toUpperCase()} Backend from Workspace
                           </>
                         )}
                       </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Requirements</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Generate schemas and APIs using the AI agent first</li>
                      <li>• Enter a project name</li>
                      <li>• Choose your preferred technology stack</li>
                    </ul>
                    <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-sm text-blue-800">
                        <strong>Current Workspace:</strong>
                        <div className="mt-1">
                          📊 Schemas: {schemas.length} | APIs: {apiEndpoints.length}
                        </div>
                        {schemas.length > 0 && (
                          <div className="mt-1 text-xs">
                            Schemas: {schemas.map(s => s.name || 'Unnamed').join(', ')}
                          </div>
                        )}
                        {apiEndpoints.length > 0 && (
                          <div className="mt-1 text-xs">
                            APIs: {apiEndpoints.map(a => a.name || 'Unnamed').join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generation Preview */}
                  {(schemas.length > 0 || apiEndpoints.length > 0) && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="font-medium mb-4">Generation Preview</h4>
                      <div className="space-y-3">
                        {schemas.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">📊 Models to Generate ({schemas.length})</h5>
                            <div className="space-y-1">
                              {schemas.map((schema, index) => (
                                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  • {schema.name || `Schema ${index + 1}`} - {Object.keys(schema.schema?.properties || {}).length} properties
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {apiEndpoints.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">🔗 Routes to Generate ({apiEndpoints.length})</h5>
                            <div className="space-y-1">
                              {apiEndpoints.map((api, index) => (
                                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  • {api.name || `API ${index + 1}`} - {api.endpoints?.length || 0} endpoints
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          📁 Will also generate: package.json/requirements.txt, app.js/app.py, README.md
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generation History */}
                  {generationHistory.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="font-medium mb-4">Generation History</h4>
                      <div className="space-y-3">
                        {generationHistory.map((record) => (
                          <div key={record.id} className="border border-gray-100 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{record.projectName}</h5>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                record.projectType === 'nodejs' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {record.projectType.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              Generated {record.filesCount} files on {record.timestamp.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              Files: {record.files.map((f: any) => f.name).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAgentWorkspace; 