"use client";
import { FC } from "react";
import { StatusLogEntry } from "../types/index2";
import { Terminal, Sparkles, Sliders } from "lucide-react";

interface InputPanelProps {
  apiDescription: string;
  setApiDescription: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  logs: StatusLogEntry[];
}

const InputPanel: FC<InputPanelProps> = ({
  apiDescription,
  setApiDescription,
  model,
  setModel,
  temperature,
  setTemperature,
  isGenerating,
  handleGenerate,
  logs
}) => {
  return (
    <div className="space-y-6">
      {/* API Description */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3">
          <h2 className="text-lg font-semibold text-white">API Description</h2>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your API in natural language
          </label>
          <textarea
            value={apiDescription}
            onChange={(e) => setApiDescription(e.target.value)}
            placeholder="Create a REST API for a book store that allows users to browse books, add them to cart, and make purchases. Include endpoints for user authentication and managing book inventory."
            className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={isGenerating}
          />
        </div>
        
        {/* Model Selection and Parameters */}
        <div className="px-5 pb-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-gray-200">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Sparkles size={14} className="text-blue-600" />
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isGenerating}
              >
                <option value="llama-3.1-small">Llama 3.1 Small</option>
                <option value="llama-3.1-8b">Llama 3.1 8B</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Sliders size={14} className="text-blue-600" />
                Temperature: {temperature.toFixed(1)}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">0.0</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  disabled={isGenerating}
                />
                <span className="text-xs text-gray-500">1.0</span>
              </div>
            </div>
          </div>
          
          <div className="mt-5">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !apiDescription.trim()}
              className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
                isGenerating || !apiDescription.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Status Log */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal size={18} />
            Status Log
          </h2>
          <div className={`h-2 w-2 rounded-full ${isGenerating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
        </div>
        <div className="h-48 overflow-y-auto p-3 bg-gray-900 text-gray-300 font-mono text-sm">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div 
                key={index}
                className={`mb-1 ${
                  log.type === 'success' ? 'text-green-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'generating' ? 'text-yellow-400' :
                  log.type === 'connection' ? 'text-blue-400' :
                  'text-gray-300'
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No logs yet. Generate an API to see activity.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputPanel;
