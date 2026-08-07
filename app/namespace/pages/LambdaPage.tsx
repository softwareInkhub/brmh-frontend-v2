'use client';
import React, { useState } from 'react';
import { Code, Zap, Clock, Settings, Globe, Copy, Play, Download } from 'lucide-react';

interface LambdaPageProps {
  lambda: any;
  namespace: any;
}

const LambdaPage: React.FC<LambdaPageProps> = ({ lambda, namespace }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Code className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">{lambda.functionName}</h1>
        </div>
        {lambda.description && (
          <p className="text-gray-600">{lambda.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
          <span>Namespace: {namespace?.['namespace-name'] || 'Unknown'}</span>
          <span>•</span>
          <span>Saved: {formatDate(lambda.savedAt)}</span>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Basic Info */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Runtime:</span>
              <span className="font-mono">{lambda.runtime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Handler:</span>
              <span className="font-mono">{lambda.handler}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory:</span>
              <span className="font-mono">{lambda.memory} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Timeout:</span>
              <span className="font-mono">{lambda.timeout}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                lambda.status === 'deployed' ? 'bg-green-100 text-green-800' : 
                lambda.status === 'saved' ? 'bg-blue-100 text-blue-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {lambda.status || 'saved'}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Environment
          </h3>
          {lambda.environment ? (
            <div className="space-y-2">
              {Object.entries(JSON.parse(lambda.environment || '{}')).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <div className="text-gray-600 font-medium">{key}</div>
                  <div className="font-mono text-gray-800 break-all">{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No environment variables configured</p>
          )}
        </div>

        {/* API Gateway Info */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            API Gateway
          </h3>
          {lambda.apiGatewayUrl ? (
            <div className="space-y-2">
              <div className="text-sm">
                <div className="text-gray-600 mb-1">Endpoint URL:</div>
                <div className="font-mono text-blue-600 break-all text-xs">
                  {lambda.apiGatewayUrl}
                </div>
                <button
                  onClick={() => copyToClipboard(lambda.apiGatewayUrl, 'url')}
                  className="mt-1 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copied === 'url' ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
              {lambda.functionArn && (
                <div className="text-sm">
                  <div className="text-gray-600 mb-1">Function ARN:</div>
                  <div className="font-mono text-gray-800 break-all text-xs">
                    {lambda.functionArn}
                  </div>
                  <button
                    onClick={() => copyToClipboard(lambda.functionArn, 'arn')}
                    className="mt-1 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copied === 'arn' ? 'Copied!' : 'Copy ARN'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-500 text-sm">Not deployed to API Gateway</p>
              <button className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                <Play className="w-3 h-3" />
                Deploy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            <Play className="w-4 h-4" />
            Deploy to AWS
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
            <Globe className="w-4 h-4" />
            Create API Gateway
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
            <Download className="w-4 h-4" />
            Download Code
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
            <Code className="w-4 h-4" />
            Edit in AI Agent
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Metadata</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Lambda ID:</span>
            <div className="font-mono text-gray-800 break-all">{lambda.id}</div>
          </div>
          <div>
            <span className="text-gray-600">Namespace ID:</span>
            <div className="font-mono text-gray-800 break-all">{lambda.namespaceId}</div>
          </div>
          <div>
            <span className="text-gray-600">Created:</span>
            <div className="text-gray-800">{formatDate(lambda.savedAt)}</div>
          </div>
          <div>
            <span className="text-gray-600">Last Modified:</span>
            <div className="text-gray-800">{formatDate(lambda.savedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LambdaPage;
