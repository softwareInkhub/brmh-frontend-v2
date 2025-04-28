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
  const [tryItOutEndpoints, setTryItOutEndpoints] = useState<Record<string, boolean>>({});
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
  const [requestBody, setRequestBody] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});

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

  const toggleTryItOut = (id: string) => {
    setTryItOutEndpoints(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    // Reset parameter values and response when toggling
    if (!tryItOutEndpoints[id]) {
      setParamValues(prev => ({ ...prev, [id]: {} }));
      setRequestBody(prev => ({ ...prev, [id]: "" }));
      setResponses(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleParamChange = (endpointId: string, paramName: string, value: string) => {
    setParamValues(prev => ({
      ...prev,
      [endpointId]: {
        ...(prev[endpointId] || {}),
        [paramName]: value
      }
    }));
  };

  const handleRequestBodyChange = (endpointId: string, value: string) => {
    setRequestBody(prev => ({
      ...prev,
      [endpointId]: value
    }));
  };

  const executeRequest = async (endpoint: ApiEndpoint, endpointId: string) => {
    try {
      // Build URL with path parameters
      let url = endpoint.path;
      // If the URL doesn't start with http or https, prepend the base URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://localhost:3000${url}`;
      }
      
      const endpointParams = paramValues[endpointId] || {};
      
      // Replace path parameters
      endpoint.parameters?.forEach(param => {
        if (param.in === 'path') {
          url = url.replace(`{${param.name}}`, endpointParams[param.name] || '');
        }
      });

      // Add query parameters
      const queryParams = new URLSearchParams();
      endpoint.parameters?.forEach(param => {
        if (param.in === 'query' && endpointParams[param.name]) {
          queryParams.append(param.name, endpointParams[param.name]);
        }
      });
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      // Build headers
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      // Only add Content-Type for non-GET methods
      if (endpoint.method.toUpperCase() !== 'GET') {
        headers['Content-Type'] = 'application/json';
      }
      
      endpoint.parameters?.forEach(param => {
        if (param.in === 'header' && endpointParams[param.name]) {
          headers[param.name] = endpointParams[param.name];
        }
      });

      // Build request options
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers
      };

      // Add request body only for non-GET methods
      if (endpoint.method.toUpperCase() !== 'GET' && requestBody[endpointId]) {
        try {
          requestOptions.body = JSON.stringify(JSON.parse(requestBody[endpointId]));
        } catch (e) {
          requestOptions.body = requestBody[endpointId];
        }
      }

      console.log('Making request to:', url);
      console.log('Request options:', requestOptions);

      // Make the request
      const response = await fetch(url, requestOptions);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Try to parse as JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, get the text content
        const text = await response.text();
        throw new Error(`Expected JSON response but got ${contentType}. Response: ${text.substring(0, 100)}...`);
      }

      // Store the response
      setResponses(prev => ({
        ...prev,
        [endpointId]: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data
        }
      }));
    } catch (error) {
      console.error('Request error:', error);
      setResponses(prev => ({
        ...prev,
        [endpointId]: {
          error: error instanceof Error ? error.message : 'An error occurred',
          details: error instanceof Error ? error.stack : undefined
        }
      }));
    }
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
              href={`http://localhost:3000/api-docs`} 
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
                        const isTryItOut = tryItOutEndpoints[endpointId] || false;
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
                                
                                {isTryItOut && (
                                  <>
                                    {/* Parameters Section */}
                                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                                      <div className="mb-4">
                                        <h4 className="text-sm font-semibold mb-2">Parameters</h4>
                                        <div className="bg-white rounded-md border border-gray-200">
                                          <table className="w-full">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {endpoint.parameters.map((param, paramIndex) => (
                                                <tr key={paramIndex} className="border-t border-gray-200">
                                                  <td className="px-4 py-2">
                                                    <div className="flex items-center">
                                                      <span className="font-mono text-xs">{param.name}</span>
                                                      {param.required && <span className="text-red-500 text-xs ml-1">*</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{param.in}</div>
                                                  </td>
                                                  <td className="px-4 py-2">
                                                    <div className="text-xs text-gray-600">{param.description}</div>
                                                  </td>
                                                  <td className="px-4 py-2">
                                                    <input
                                                      type="text"
                                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                      placeholder={param.required ? '(required)' : ''}
                                                      value={paramValues[endpointId]?.[param.name] || ''}
                                                      onChange={(e) => handleParamChange(endpointId, param.name, e.target.value)}
                                                    />
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {/* Request Body Section - Only show for non-GET methods */}
                                    {endpoint.method.toUpperCase() !== 'GET' && endpoint.requestBody && (
                                      <div className="mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                          <h4 className="text-sm font-semibold">Request Body</h4>
                                          <div className="flex items-center">
                                            <span className="text-xs text-gray-500 mr-2">Media type</span>
                                            <select className="text-xs border border-gray-300 rounded px-2 py-1">
                                              <option value="application/json">application/json</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-md border border-gray-200">
                                          <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
                                            <span className="text-xs text-gray-600">Example Value</span>
                                            <button 
                                              className="text-xs text-blue-600 hover:text-blue-800"
                                              onClick={() => {
                                                if (endpoint.path === '/notes' && endpoint.method.toUpperCase() === 'POST') {
                                                  handleRequestBodyChange(endpointId, JSON.stringify({
                                                    title: "My Note Title",
                                                    content: "My note content goes here"
                                                  }, null, 2));
                                                }
                                              }}
                                            >
                                              Load Example
                                            </button>
                                          </div>
                                          <textarea
                                            className="w-full p-4 font-mono text-sm bg-gray-900 text-gray-100"
                                            rows={5}
                                            placeholder={endpoint.path === '/notes' && endpoint.method.toUpperCase() === 'POST' ? 
                                              `Example:
{
  "title": "My Note Title",
  "content": "My note content goes here"
}`
                                              : "Enter request body (JSON)"}
                                            value={requestBody[endpointId] || ''}
                                            onChange={(e) => handleRequestBodyChange(endpointId, e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Response Section */}
                                    {responses[endpointId] && (
                                      <div className="mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                          <h4 className="text-sm font-semibold">Response</h4>
                                          <div className="flex items-center">
                                            <span className="text-xs text-gray-500 mr-2">Response content type</span>
                                            <select className="text-xs border border-gray-300 rounded px-2 py-1">
                                              <option value="application/json">application/json</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-md border border-gray-200">
                                          <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
                                            <div className="flex items-center">
                                              <span className="text-xs font-medium text-gray-600">
                                                Status: {responses[endpointId].status}
                                              </span>
                                              {responses[endpointId].status >= 200 && responses[endpointId].status < 300 && (
                                                <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                                  Success
                                                </span>
                                              )}
                                            </div>
                                            <button className="text-xs text-blue-600 hover:text-blue-800">Schema</button>
                                          </div>
                                          <div className="p-4 bg-gray-900">
                                            {responses[endpointId].error ? (
                                              <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">
                                                {responses[endpointId].error}
                                                {responses[endpointId].details && `\n\n${responses[endpointId].details}`}
                                              </pre>
                                            ) : (
                                              <pre className="text-xs font-mono text-gray-100 whitespace-pre-wrap">
                                                {JSON.stringify(responses[endpointId].data, null, 2)}
                                              </pre>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Response Schema Section */}
                                {!isTryItOut && (
                                  <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-sm font-semibold">Responses</h4>
                                      <div className="flex items-center">
                                        <span className="text-xs text-gray-500 mr-2">Response content type</span>
                                        <select className="text-xs border border-gray-300 rounded px-2 py-1">
                                          <option value="application/json">application/json</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-md border border-gray-200">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-20">Code</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(endpoint.responses).map(([status, response], responseIndex) => (
                                            <tr key={responseIndex} className="border-t border-gray-200">
                                              <td className="px-4 py-2">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                  status.startsWith('2') ? 'bg-green-100 text-green-800' :
                                                  status.startsWith('4') ? 'bg-yellow-100 text-yellow-800' :
                                                  status.startsWith('5') ? 'bg-red-100 text-red-800' :
                                                  'bg-blue-100 text-blue-800'
                                                }`}>
                                                  {status}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2">
                                                <div className="text-sm text-gray-600">{response.description}</div>
                                                {response.content && (
                                                  <div className="mt-2">
                                                    <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-t">
                                                      <span className="text-xs text-gray-600">Example Value</span>
                                                      <button className="text-xs text-blue-600 hover:text-blue-800">Schema</button>
                                                    </div>
                                                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono border border-t-0 border-gray-200 rounded-b">
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
                                )}

                                {/* Try it out button */}
                                <div className="flex justify-end gap-2">
                                  <button
                                    className={`border border-gray-300 ${
                                      isTryItOut ? 'bg-gray-100' : 'bg-white'
                                    } hover:bg-gray-50 text-gray-700 px-4 py-2 rounded text-sm font-medium`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTryItOut(endpointId);
                                    }}
                                  >
                                    {isTryItOut ? 'Cancel' : 'Try it out'}
                                  </button>
                                  {isTryItOut && (
                                    <button
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        executeRequest(endpoint, endpointId);
                                      }}
                                    >
                                      Execute
                                    </button>
                                  )}
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
