import React, { useState, useRef, useEffect } from 'react';
import SchemaModal from './SchemaModal';
import { NestedFieldsEditor, schemaToFields } from './SchemaService';
import { Wand2, Sparkles } from 'lucide-react';

interface LLMTerminalProps {
  openSchemaModal: (name: string, schema: any) => void;
}

const LLMTerminal: React.FC<LLMTerminalProps> = ({ openSchemaModal }) => {
  const [open, setOpen] = useState(false);
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
  const [width, setWidth] = useState(420);
  const minWidth = 320;
  const maxWidth = 900;
  const isResizing = useRef(false);

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
          const schemaObj = JSON.parse(json);
          const name = schemaObj.title || prompt || `Schema ${generatedSchemas.length + 1}`;
          setGeneratedSchemas(prev => [...prev, { name, schema: schemaObj }]);
          // Extract sub-schemas from properties
          if (schemaObj.properties && typeof schemaObj.properties === 'object') {
            const extracted = Object.entries(schemaObj.properties).map(([name, schema]) => ({ name, schema }));
            setSubSchemas(extracted);
          } else {
            setSubSchemas([]);
          }
        } catch (e) {
          setSubSchemas([]);
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

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl w-12 h-12 flex items-center justify-center text-3xl transition-all duration-300 border-2 border-white"
        style={{ boxShadow: '0 8px 32px 0 rgba(0,80,180,0.18)' }}
        onClick={() => setOpen(true)}
        aria-label="Open LLM Terminal"
      >
        <Sparkles size={28} className="drop-shadow-lg" />
      </button>

      {/* Sliding Drawer */}
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
              className="text-gray-400 hover:text-blue-500 text-2xl transition"
              onClick={() => setOpen(false)}
              aria-label="Close Terminal"
            >
              &times;
            </button>
          </div>
          {/* Terminal Body */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <label className="text-gray-700 mb-2 text-sm font-semibold">Prompt</label>
            <div className="relative mb-4">
              <textarea
                className="bg-gray-100 text-gray-800 rounded-lg p-2 w-full mb-0 text-sm resize-none border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-mono shadow-sm pr-12"
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your project or schema requirements..."
                disabled={loading}
              />
              <button
                className="absolute bottom-4 right-2 bg-blue-500 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSend}
                disabled={loading || !prompt.trim()}
                title="Send"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            {error && <div className="text-red-500 text-sm mb-2 font-semibold">{error}</div>}
            {response && (
              <>
                <div className="flex justify-end items-center gap-2 mt-2 mb-1">
                  <button
                    className="p-2 rounded hover:bg-blue-100 transition shadow-sm"
                    title="Copy"
                    onClick={() => {
                      let json = response;
                      const match = response.match(/```json\n([\s\S]*?)```/);
                      if (match) json = match[1];
                      navigator.clipboard.writeText(json.trim());
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-blue-600 hover:text-blue-800 transition">
                      <rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor"/>
                      <rect x="3" y="3" width="13" height="13" rx="2" fill="none" stroke="currentColor"/>
                    </svg>
                  </button>
                  <button
                    className="p-2 rounded hover:bg-blue-100 transition shadow-sm"
                    title="Download"
                    onClick={() => {
                      let json = response;
                      const match = response.match(/```json\n([\s\S]*?)```/);
                      if (match) json = match[1];
                      const blob = new Blob([json.trim()], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'schema.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-blue-600 hover:text-blue-800 transition">
                      <path d="M12 5v14m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="5" y="19" width="14" height="2" rx="1" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
                <div className="bg-gray-50 text-gray-800 rounded-xl p-4 overflow-x-auto whitespace-pre text-xs max-h-48 border-l-4 border-blue-400 shadow-lg font-mono">
                  {response}
                </div>
                {/* Render sub-schema cards below the generated schema */}
                {subSchemas.length > 0 && (
                  <div className="mt-8">
                    <div className="font-semibold text-gray-700 mb-2">Individual Schemas</div>
                    {subSchemas.map((item, idx) => (
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
                              openSchemaModal(
                                item.name,
                                {
                                  type: 'object',
                                  properties: {
                                    [item.name]: item.schema
                                  }
                                }
                              );
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
              </>
            )}
            {/* Render generated schema cards below the terminal */}
            {/* {generatedSchemas.length > 0 && (
              <div className="mt-8">
                <div className="font-semibold text-gray-700 mb-2">Created Schemas</div>
                {generatedSchemas.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white shadow rounded p-3 my-2 cursor-pointer hover:bg-blue-50 border border-blue-100"
                    onClick={() => setSelectedSchema(item)}
                  >
                    <div className="font-bold text-blue-700">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">{JSON.stringify(item.schema).slice(0, 80)}...</div>
                  </div>
                ))}
              </div>
            )} */}
            {/* Modal for full schema view
            {selectedSchema && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setSelectedSchema(null)} />
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full z-10">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-lg text-blue-700">{selectedSchema.name}</div>
                    <button onClick={() => setSelectedSchema(null)} className="text-gray-500 hover:text-blue-600 text-2xl">×</button>
                  </div>
                  <pre className="bg-gray-100 rounded p-4 text-xs overflow-x-auto max-h-[60vh]">{JSON.stringify(selectedSchema.schema, null, 2)}</pre>
                </div>
              </div>
            )} */}
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