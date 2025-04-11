"use client"
import { FC, useRef, useState, useEffect } from "react";
import { Edit, Save, Download, Copy, FileCode } from "lucide-react";

interface SpecPanelProps {
  apiSpec: string;
}

const SpecPanel: FC<SpecPanelProps> = ({ apiSpec }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableSpec, setEditableSpec] = useState('');
  const specRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update local state when apiSpec changes
  useEffect(() => {
    setEditableSpec(apiSpec);
  }, [apiSpec]);
  
  const handleCopy = () => {
    const textToCopy = isEditing ? editableSpec : apiSpec;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        alert('OpenAPI specification copied to clipboard.');
      })
      .catch((err) => {
        alert('Failed to copy: ' + err);
      });
  };
  
  const handleDownload = () => {
    if (!apiSpec) return;
    
    const contentToDownload = isEditing ? editableSpec : apiSpec;
    const blob = new Blob([contentToDownload], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSave = () => {
    // Here you could add API call to save the spec to backend
    // For now, just exiting edit mode
    setIsEditing(false);
    
    // Optionally, generate API client or update docs based on edited spec
    console.log("Saving edited spec:", editableSpec);
    
    // You could dispatch an event to notify other components
    const event = new CustomEvent('spec-updated', { detail: { spec: editableSpec } });
    document.dispatchEvent(event);
  };
  
  // Auto-size textarea to fit content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editableSpec]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">OpenAPI Specification</h2>
          <p className="text-sm text-gray-500">Your API definition in YAML format</p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <button 
              className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              onClick={handleSave}
              title="Save changes"
            >
              <Save size={18} />
            </button>
          ) : (
            <button 
              className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onClick={handleEdit}
              disabled={!apiSpec}
              title="Edit specification"
            >
              <Edit size={18} />
            </button>
          )}
          <button 
            className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            onClick={handleDownload}
            disabled={!apiSpec}
            title="Download as YAML"
          >
            <Download size={18} />
          </button>
          <button 
            className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            onClick={handleCopy}
            disabled={!apiSpec}
            title="Copy to clipboard"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {apiSpec ? (
          isEditing ? (
            <textarea
              ref={textareaRef}
              value={editableSpec}
              onChange={(e) => setEditableSpec(e.target.value)}
              className="w-full h-full min-h-[400px] font-mono text-sm p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              spellCheck={false}
            />
          ) : (
            <pre 
              ref={specRef}
              className="font-mono text-sm whitespace-pre text-gray-800 p-4 border border-gray-200 rounded-lg bg-white h-full overflow-auto"
            >{apiSpec}</pre>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
            <FileCode size={48} className="mb-4 text-gray-400" />
            <p className="mb-2 font-medium">No API specification generated yet</p>
            <p>Enter an API description and click &quot;Generate&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecPanel;
