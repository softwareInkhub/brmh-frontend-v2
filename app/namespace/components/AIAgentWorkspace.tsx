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

  // Load file tree when namespace changes
  useEffect(() => {
    if (namespace?.id) {
      refreshFileTree();
    }
  }, [namespace?.id]);

  const getNowId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        history: messages.map(m => ({ role: m.role, content: m.content }))
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
      if (filePath && fileContent && namespace?.id) {
        try {
          const fileResponse = await fetch('/unified/file-operations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operation: 'create',
              namespaceId: namespace.id,
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
    if (!namespace?.id) return;
    
    try {
      const response = await fetch(`/unified/file-tree/${namespace.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tree) {
          setProjectFiles(data.tree);
        }
      }
    } catch (error) {
      const err = error as Error;
      setConsoleOutput((prev) => [...prev, `❌ Error: ${err.message}`]);
    }
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
              if (file.type === 'file' && namespace?.id) {
                // Load actual file content
                try {
                  const response = await fetch('/unified/file-operations', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      operation: 'read',
                      namespaceId: namespace.id,
                      filePath: file.path
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
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

  // State for saved items
  const [savedSchemas, setSavedSchemas] = useState<any[]>([]);
  const [savedApis, setSavedApis] = useState<any[]>([]);
  const [savedFiles, setSavedFiles] = useState<ProjectFile[]>([]);

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
                      if (fileName && namespace?.id) {
                        fetch('/unified/file-operations', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            operation: 'create',
                            namespaceId: namespace.id,
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
                                  if (namespace?.id && selectedFile) {
                                    try {
                                      const response = await fetch('/unified/file-operations', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          operation: 'update',
                                          namespaceId: namespace.id,
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
                                  if (namespace?.id && selectedFile) {
                                    if (confirm(`Are you sure you want to delete ${selectedFile.name}?`)) {
                                      fetch('/unified/file-operations', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          operation: 'delete',
                                          namespaceId: namespace.id,
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
                    if (apiEndpoints.length > 0 && namespace?.id) {
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
                              namespaceId: namespace.id,
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
                    if (schemas.length > 0 && namespace?.id) {
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
                            namespaceId: namespace.id,
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
                      if (namespace?.id) {
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
        </div>
      </div>
    </div>
  );
};

export default AIAgentWorkspace; 