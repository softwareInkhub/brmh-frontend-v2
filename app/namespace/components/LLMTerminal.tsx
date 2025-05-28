import React, { useState, useRef, useEffect } from 'react';
import {Sparkles } from 'lucide-react';

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

  const tabList = [
    { key: 'methods', label: 'Methods' },
    { key: 'handlers', label: 'Handlers' },
    { key: 'schema', label: 'Schema' },
    { key: 'test', label: 'Test' },
  ];
  const [activeTab, setActiveTab] = useState<'methods' | 'handlers' | 'schema' | 'test'>('schema');

  const [prompts, setPrompts] = useState({
    namespace: `Generate a namespace for a Todo app. Return a JSON object with 'name' and 'description' fields. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "name": "TodoApp",\n  "description": "A namespace for managing todo lists and items."\n}`,
    schema: `Generate JSON schemas for the entities in a Todo app (e.g., Todo, User). Return a JSON object where each key is the entity name and each value is the JSON schema for that entity. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "Todo": { "type": "object", "properties": { "id": {"type": "string"}, "title": {"type": "string"} }, "required": ["id", "title"] },\n  "User": { "type": "object", "properties": { "id": {"type": "string"}, "username": {"type": "string"} }, "required": ["id", "username"] }\n}`,
    methods: `Generate API method definitions for CRUD operations on todos in a Todo app. Return a JSON object where each key is the method name and each value is an object with 'method' (HTTP verb), 'path' (endpoint), and 'handler' (handler name). Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "createTodo": { "method": "POST", "path": "/todos", "handler": "createTodoHandler" },\n  "getTodos": { "method": "GET", "path": "/todos", "handler": "getTodosHandler" }\n}`,
    handlers: `Generate AWS Lambda handler functions in Node.js for a Todo app using DynamoDB. Return a single JSON object. Each key should be the handler name (e.g., "createTodoHandler", "getTodosHandler", "updateTodoHandler", "deleteTodoHandler"), and each value should be the complete handler code as a string. Do NOT include any explanation, markdown, or code fences—just the JSON object.\n\nExample:\n{\n  "createTodoHandler": "// code here as a string",\n  "getTodosHandler": "// code here as a string",\n  "updateTodoHandler": "// code here as a string",\n  "deleteTodoHandler": "// code here as a string"\n}`
  });

  const minWidth = 400;
  const maxWidth = 1100;

  const handleTabPrompt = async (tab: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    if (tab === 'handlers') setRawHandlersOutput(null);
    try {
      const res = await fetch('http://localhost:5000/llm/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompts[tab as keyof typeof prompts] }),
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
        setError(data.error || 'Failed to generate schema');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate schema');
    } finally {
      setLoading(false);
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
  };

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('llmTerminalCache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.handlers) setHandlers(parsed.handlers);
        if (parsed.methods) setMethods(parsed.methods);
        if (parsed.generatedSchemas) setGeneratedSchemas(parsed.generatedSchemas);
        if (parsed.prompts) setPrompts(parsed.prompts);
      } catch {}
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    const cache = {
      handlers,
      methods,
      generatedSchemas,
      prompts,
    };
    localStorage.setItem('llmTerminalCache', JSON.stringify(cache));
  }, [handlers, methods, generatedSchemas, prompts]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`fixed z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl w-12 h-12 flex items-center justify-center text-3xl transition-all duration-300 border-2 border-white bottom-8 right-8`}
        style={{ boxShadow: '0 8px 32px 0 rgba(0,80,180,0.18)' }}
        onClick={() => setOpen(true)}
        aria-label="Open LLM Terminal"
      >
        <Sparkles size={28} className="drop-shadow-lg" />
      </button>
      {/* Right-side Drawer Only */}
      <div
        className={`fixed top-0 right-0 h-full z-50 transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'} rounded-l-2xl border-l border-blue-100 shadow-2xl bg-white`}
        style={{
          width: `${width}px`,
          background: '#fafaff',
          boxShadow: '-8px 0 32px 0 rgba(0,80,180,0.15), 0 2px 8px 0 rgba(0,0,0,0.04)'
        }}
      >
        {/* Draggable Resizer */}
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-50 bg-transparent hover:bg-blue-100 transition"
          onMouseDown={startResize}
          style={{ borderLeft: '2px solid #3b82f6', borderTopLeftRadius: '1rem', borderBottomLeftRadius: '1rem' }}
        />
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-white border-b-2 border-blue-500 rounded-t-lg">
            <span className="text-lg font-bold text-blue-700 tracking-wide">BRMH LLM Terminal</span>
            <button
              className="text-gray-400 hover:text-blue-500 text-2xl transition ml-2"
              onClick={() => setOpen(false)}
              aria-label="Close Terminal"
            >
              &times;
            </button>
          </div>
          {/* Tab bar */}
          <div className="border-b border-blue-200 bg-white px-4">
            <div className="flex gap-2 pt-2">
              {tabList.map(tab => (
                <button
                  key={tab.key}
                  className={`px-4 py-1 rounded-t-md text-sm font-medium transition-colors duration-150 ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab(tab.key as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {/* Terminal Body */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            {activeTab === 'methods' && (
              <div className="p-4">
                <div className="mb-4">
                  <label className="text-gray-700 mb-2 text-sm font-semibold">Methods Prompt</label>
                  <div className="relative">
              <textarea
                      className="bg-gray-100 text-gray-800 rounded-lg p-2 w-full mb-2 text-sm resize-none border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-mono shadow-sm pr-12"
                rows={3}
                      value={prompts.methods}
                      onChange={e => setPrompts(prev => ({ ...prev, methods: e.target.value }))}
                      placeholder="Describe the API methods you want to create..."
              />
              <button
                className="absolute bottom-4 right-2 bg-blue-500 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => handleTabPrompt('methods')}
                      disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
                </div>
                {Object.keys(methods).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(methods).map(([name, method]: [string, any]) => (
                      <div key={name} className="bg-white rounded-lg shadow p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-blue-700">{name}</h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {method.method}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{method.path}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Handler: <span className="font-mono">{method.handler}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-lg">No methods available</div>
                )}
              </div>
            )}
            {activeTab === 'handlers' && (
              <div className="p-4">
                <div className="mb-4">
                  <label className="text-gray-700 mb-2 text-sm font-semibold">Handlers Prompt</label>
                  <div className="relative">
                    <textarea
                      className="bg-gray-100 text-gray-800 rounded-lg p-2 w-full mb-2 text-sm resize-none border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-mono shadow-sm pr-12"
                      rows={3}
                      value={prompts.handlers}
                      onChange={e => setPrompts(prev => ({ ...prev, handlers: e.target.value }))}
                      placeholder="Describe the handlers you want to create..."
                    />
                  <button
                      className="absolute bottom-4 right-2 bg-blue-500 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => handleTabPrompt('handlers')}
                      disabled={loading}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    className={`px-2 py-1 rounded text-xs border ${showRawHandlers ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setShowRawHandlers(v => !v)}
                  >
                    {showRawHandlers ? 'Hide Raw Output' : 'Show Raw Output'}
                  </button>
                </div>
                {showRawHandlers && rawHandlersOutput && (
                  <pre className="bg-gray-100 rounded p-3 mb-4 text-xs overflow-x-auto max-h-60 border border-blue-100 shadow-inner">
                    {rawHandlersOutput}
                  </pre>
                )}
                {Object.keys(handlers).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(handlers).map(([name, code]: [string, any]) => (
                      <div key={name} className="bg-white rounded-lg shadow">
                        <div className="border-b border-gray-200 p-4">
                          <h3 className="font-bold text-blue-700">{name}</h3>
                        </div>
                        <pre className="p-4 bg-gray-50 text-sm overflow-x-auto">
                          <code>{code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-lg">No handlers available</div>
                )}
              </div>
            )}
            {activeTab === 'schema' && (
              <div className="p-4">
                <div className="mb-4">
                  <label className="text-gray-700 mb-2 text-sm font-semibold">Schema Prompt</label>
                  <div className="relative">
                    <textarea
                      className="bg-gray-100 text-gray-800 rounded-lg p-2 w-full mb-2 text-sm resize-none border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-mono shadow-sm pr-12"
                      rows={3}
                      value={prompts.schema}
                      onChange={e => setPrompts(prev => ({ ...prev, schema: e.target.value }))}
                      placeholder="Describe the schemas you want to create..."
                    />
                    <button
                      className="absolute bottom-4 right-2 bg-blue-500 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => handleTabPrompt('schema')}
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Existing schema content */}
                {generatedSchemas.length > 0 && (
                  <div className="mt-8">
                    <div className="font-semibold text-gray-700 mb-2">Generated Schemas</div>
                    {generatedSchemas.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white shadow rounded p-3 my-2 cursor-pointer hover:bg-blue-50 border border-blue-100"
                        onClick={() => setSelectedSchema(item)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-blue-700">{item.name}</div>
                          <button
                            className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded shadow"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              openSchemaModal(item.name, item.schema);
                            }}
                          >
                            Create
                          </button>
                        </div>
                        <pre className="text-xs text-gray-500 truncate">{JSON.stringify(item.schema, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab !== 'schema' && (
              <div className="p-8 text-center text-gray-400 text-lg">Coming soon...</div>
            )}
          </div>
        </div>
      </div>
      {/* Overlay when open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default LLMTerminal; 