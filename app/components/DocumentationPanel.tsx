"use client"
import { FC, useState } from "react";
import { ApiEndpoint } from "../types/index2";
import { FileText, ArrowRight, Globe, ChevronDown, Lock } from "lucide-react";

interface DocumentationPanelProps {
  endpoints: ApiEndpoint[];
  swaggerUrl: string;
}

const DocumentationPanel: FC<DocumentationPanelProps> = ({ endpoints, swaggerUrl }) => {
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});

  const toggleTag = (tag: string) => {
    setExpandedTags(prev => ({
      ...prev,
      [tag]: !prev[tag]
    }));
  };

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Get the method color class and background
  const getMethodStyles = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get':
        return { bg: 'bg-blue-500', text: 'text-white' };
      case 'post':
        return { bg: 'bg-green-500', text: 'text-white' };
      case 'put':
        return { bg: 'bg-amber-500', text: 'text-white' };
      case 'delete':
        return { bg: 'bg-red-500', text: 'text-white' };
      case 'patch':
        return { bg: 'bg-indigo-500', text: 'text-white' };
      default:
        return { bg: 'bg-gray-500', text: 'text-white' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <FileText size={22} className="text-blue-600" />
        <h2 className="text-2xl font-semibold text-gray-800">API Documentation</h2>
      </div>
      
      {swaggerUrl && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-blue-600" />
              <span className="font-medium text-blue-800">Swagger UI Available:</span>
            </div>
            <a 
              href={swaggerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Open Swagger UI</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}
      
      {endpoints.length > 0 ? (
        <div className="space-y-4">
          {/* Group endpoints by tag */}
          {(() => {
            const groupedEndpoints: Record<string, ApiEndpoint[]> = {};
            
            endpoints.forEach(endpoint => {
              const tag = endpoint.tag || 'Default';
              if (!groupedEndpoints[tag]) {
                groupedEndpoints[tag] = [];
              }
              groupedEndpoints[tag].push(endpoint);
            });
            
            return Object.entries(groupedEndpoints).map(([tag, endpoints]) => {
              const isTagExpanded = expandedTags[tag] !== false; // Default to expanded
              
              return (
                <div key={tag} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between px-4 py-2 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleTag(tag)}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-800">{tag}</h3>
                      <span className="text-sm text-gray-500">{endpoints.length > 0 && `(${endpoints.length})`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600 hover:underline">
                        {isTagExpanded ? "Find out more about our store" : ""}
                      </span>
                      <ChevronDown
                        size={20}
                        className={`text-gray-400 transition-transform duration-200 ${isTagExpanded ? 'transform rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                  
                  {isTagExpanded && (
                    <div className="space-y-1 p-1">
                      {endpoints.map((endpoint, index) => {
                        const endpointId = `${endpoint.method}-${endpoint.path}-${index}`;
                        const isExpanded = expandedEndpoints[endpointId] || false;
                        const { bg, text } = getMethodStyles(endpoint.method);
                        
                        return (
                          <div key={endpointId} className="rounded-lg overflow-hidden">
                            <div 
                              className={`flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg cursor-pointer ${isExpanded ? 'rounded-b-none border-b-0' : ''}`}
                              onClick={() => toggleEndpoint(endpointId)}
                            >
                              <div className="flex items-center gap-3 flex-grow">
                                <div className={`${bg} ${text} px-3 py-1 rounded text-xs font-bold uppercase`}>
                                  {endpoint.method}
                                </div>
                                <span className="font-mono text-sm">{endpoint.path}</span>
                                {endpoint.summary && (
                                  <span className="text-gray-500 text-sm">{endpoint.summary}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Lock size={16} className="text-gray-400" />
                                <ChevronDown 
                                  size={16} 
                                  className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                                />
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border border-gray-200 border-t-0 rounded-b-lg p-4 bg-blue-50">
                                {endpoint.description && (
                                  <div className="text-gray-700 text-sm mb-4">
                                    {endpoint.description}
                                  </div>
                                )}
                                
                                {/* Parameters */}
                                {endpoint.parameters && endpoint.parameters.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                                    <div className="bg-white rounded-md border border-gray-200">
                                      <div className="p-3">
                                        {endpoint.parameters.map((param, paramIndex) => (
                                          <div key={paramIndex} className="mb-2 last:mb-0">
                                            <div className="flex items-start">
                                              <div className="font-mono text-xs mr-2">{param.name}</div>
                                              {param.required && <span className="text-red-500 text-xs">*</span>}
                                            </div>
                                            <div className="text-xs text-gray-500">{param.description}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Responses */}
                                <div className="mb-4">
                                  <div className="flex justify-between">
                                    <h4 className="text-sm font-semibold mb-2">Responses</h4>
                                    <div className="flex items-center">
                                      <span className="text-xs text-gray-500 mr-2">Response content type</span>
                                      <div className="border border-gray-300 rounded px-2 py-1 text-xs flex items-center">
                                        application/json
                                        <ChevronDown size={14} className="ml-1" />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-white rounded-md border border-gray-200">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                        <tr>
                                          <th className="px-4 py-2 text-left w-20">Code</th>
                                          <th className="px-4 py-2 text-left">Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(endpoint.responses).map(([status, response], responseIndex) => (
                                          <tr key={responseIndex} className="border-b border-gray-200 last:border-b-0">
                                            <td className="px-4 py-2 align-top">
                                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                                status.startsWith('2') ? 'bg-green-100 text-green-800' :
                                                status.startsWith('4') ? 'bg-yellow-100 text-yellow-800' :
                                                status.startsWith('5') ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                              }`}>
                                                {status}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2">
                                              <div className="mb-2">{response.description}</div>
                                              {response.content && (
                                                <div className="bg-gray-900 text-gray-300 p-3 rounded-md mt-2">
                                                  <div className="flex justify-between mb-1">
                                                    <span className="text-xs text-gray-400">Example Value</span>
                                                    <button className="text-xs text-gray-400 hover:text-white">Model</button>
                                                  </div>
                                                  <pre className="text-xs font-mono overflow-x-auto">
                                                    {JSON.stringify(response.content, null, 2)}
                                                  </pre>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                {/* Try it button */}
                                <div className="flex justify-end">
                                  <button className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded text-sm font-medium">
                                    Try it out
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No API endpoints available. Generate an API specification first.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentationPanel;
