'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Eye, Code, Zap, Clock, Settings } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface AllLambdasPageProps {
  namespace: any;
  onViewLambda: (lambda: any, namespace: any) => void;
}

const AllLambdasPage: React.FC<AllLambdasPageProps> = ({ namespace, onViewLambda }) => {
  const [lambdas, setLambdas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidePanel, setSidePanel] = useState<'create' | { lambda: any } | null>(null);

  // Create form state
  const [createData, setCreateData] = useState({
    'function-name': '',
    'description': '',
    'runtime': 'nodejs18.x',
    'handler': 'index.handler',
    'memory': 128,
    'timeout': 3
  });
  const [createMsg, setCreateMsg] = useState('');

  const fetchLambdas = async () => {
    if (!namespace) return;
    
    try {
      setLoading(true);
      const nsId = namespace['namespace-id'];
      const res = await fetch(`${API_BASE_URL}/workspace/lambdas/${nsId}`);
      if (res.ok) {
        const data = await res.json();
        setLambdas(Array.isArray(data.lambdas) ? data.lambdas : []);
      } else {
        setLambdas([]);
      }
    } catch (error) {
      console.error('Error fetching lambdas:', error);
      setLambdas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (namespace) fetchLambdas();
  }, [namespace]);

  const handleCreateInput = (field: string, value: string | number) => {
    setCreateData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateLambda = async () => {
    if (!createData['function-name']) {
      setCreateMsg('Function Name is required.');
      return;
    }

    try {
      setCreateMsg('Creating lambda...');
      const nsId = namespace['namespace-id'];
      
      // For now, we'll just show a message since creating a lambda requires code generation
      setCreateMsg('Lambda creation requires code generation. Please use the AI Agent Workspace to create Lambda functions.');
      
      // Reset form
      setCreateData({
        'function-name': '',
        'description': '',
        'runtime': 'nodejs18.x',
        'handler': 'index.handler',
        'memory': 128,
        'timeout': 3
      });
      
      // Refresh lambdas
      setTimeout(() => {
        fetchLambdas();
        setCreateMsg('Lambda creation initiated. Check the AI Agent Workspace for code generation.');
      }, 1000);
      
    } catch (error) {
      console.error('Error creating lambda:', error);
      setCreateMsg('Failed to create lambda.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Lambdas</h2>
          <p className="text-gray-600 mt-1">
            {namespace ? `Namespace: ${namespace['namespace-name']}` : 'All Lambda Functions'}
          </p>
        </div>
        <button
          onClick={() => setSidePanel('create')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus size={18} /> Create Lambda
        </button>
      </div>

      {/* Create Lambda Side Panel */}
      {sidePanel === 'create' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Lambda</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Function Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={createData['function-name']}
                  onChange={e => handleCreateInput('function-name', e.target.value)}
                  placeholder="my-lambda-function"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={createData['description']}
                  onChange={e => handleCreateInput('description', e.target.value)}
                  placeholder="Description of the lambda function"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Runtime</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={createData['runtime']}
                    onChange={e => handleCreateInput('runtime', e.target.value)}
                  >
                    <option value="nodejs18.x">Node.js 18.x</option>
                    <option value="nodejs16.x">Node.js 16.x</option>
                    <option value="python3.9">Python 3.9</option>
                    <option value="python3.8">Python 3.8</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Handler</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={createData['handler']}
                    onChange={e => handleCreateInput('handler', e.target.value)}
                    placeholder="index.handler"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Memory (MB)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={createData['memory']}
                    onChange={e => handleCreateInput('memory', parseInt(e.target.value))}
                    min="128"
                    max="10240"
                    step="64"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (s)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={createData['timeout']}
                    onChange={e => handleCreateInput('timeout', parseInt(e.target.value))}
                    min="1"
                    max="900"
                  />
                </div>
              </div>
              
              {createMsg && (
                <div className={`text-sm p-3 rounded ${createMsg.includes('success') ? 'bg-green-100 text-green-700' : createMsg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {createMsg}
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateLambda}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Lambda
                </button>
                <button
                  onClick={() => setSidePanel(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lambda Details Side Panel */}
      {sidePanel && typeof sidePanel === 'object' && sidePanel.lambda && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Lambda Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">
                  <span style={{ wordBreak: 'break-all' }}>{sidePanel.lambda.functionName}</span>
                </h4>
                <button
                  onClick={() => { if (typeof onViewLambda === 'function') onViewLambda(sidePanel.lambda, namespace); setSidePanel(null); }}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="View Full Details"
                >
                  <Eye size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-semibold text-gray-500">ID:</span> <span className="font-mono text-gray-700 break-all">{sidePanel.lambda.id}</span></div>
                <div><span className="font-semibold text-gray-500">Runtime:</span> <span className="text-gray-700">{sidePanel.lambda.runtime}</span></div>
                <div><span className="font-semibold text-gray-500">Handler:</span> <span className="text-gray-700">{sidePanel.lambda.handler}</span></div>
                <div><span className="font-semibold text-gray-500">Memory:</span> <span className="text-gray-700">{sidePanel.lambda.memory} MB</span></div>
                <div><span className="font-semibold text-gray-500">Timeout:</span> <span className="text-gray-700">{sidePanel.lambda.timeout}s</span></div>
                <div><span className="font-semibold text-gray-500">Status:</span> <span className="text-gray-700">{sidePanel.lambda.status || 'saved'}</span></div>
                <div><span className="font-semibold text-gray-500">Saved:</span> <span className="text-gray-700">{new Date(sidePanel.lambda.savedAt).toLocaleDateString()}</span></div>
              </div>
              
              {sidePanel.lambda.description && (
                <div>
                  <span className="font-semibold text-gray-500">Description:</span>
                  <p className="text-gray-700 mt-1">{sidePanel.lambda.description}</p>
                </div>
              )}
              
              {sidePanel.lambda.apiGatewayUrl && (
                <div>
                  <span className="font-semibold text-gray-500">API Gateway URL:</span>
                  <p className="text-blue-600 font-mono text-sm mt-1 break-all">{sidePanel.lambda.apiGatewayUrl}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSidePanel(null)}
                  className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lambda List */}
      <div className="space-y-3">
        {lambdas.length === 0 && <div className="text-gray-400">No lambdas found.</div>}
        {lambdas.map((lambda, idx) => (
          <div key={lambda.id || idx} className="flex items-center justify-between bg-white border rounded px-4 py-2 shadow-sm">
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-blue-500" />
              <div>
                <span className="font-semibold text-gray-900">{lambda.functionName}</span>
                {lambda.description && (
                  <p className="text-sm text-gray-500 mt-1">{lambda.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Zap size={12} />
                    {lambda.runtime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings size={12} />
                    {lambda.memory}MB
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {lambda.timeout}s
                  </span>
                </div>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-800 p-1" title="View" onClick={() => setSidePanel({ lambda: lambda })}><Eye size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllLambdasPage;
