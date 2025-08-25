'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  ArrowRight, 
  Settings, 
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Workflow
} from 'lucide-react'

interface WorkflowNode {
  id: string
  type: 'start' | 'process' | 'decision' | 'end'
  label: string
  x: number
  y: number
  connections: string[]
  properties: Record<string, any>
}

interface WorkflowConnection {
  id: string
  from: string
  to: string
  label?: string
  condition?: string
}

interface WorkflowEditorProps {
  isOpen: boolean
  onClose: () => void
  workflow?: {
    id: string
    name: string
    nodes: WorkflowNode[]
    connections: WorkflowConnection[]
  }
  onSave: (workflow: any) => void
}

export default function WorkflowEditor({ isOpen, onClose, workflow, onSave }: WorkflowEditorProps) {
  const [workflowName, setWorkflowName] = useState(workflow?.name || '')
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || [])
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow?.connections || [])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<'select' | 'connect' | 'add'>('select')
  const [isPlaying, setIsPlaying] = useState(false)

  const addNode = (type: WorkflowNode['type'], x: number, y: number) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      label: type === 'start' ? 'Start' : type === 'end' ? 'End' : 'Process',
      x,
      y,
      connections: [],
      properties: {}
    }
    setNodes([...nodes, newNode])
  }

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(node => node.id !== nodeId))
    setConnections(connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId))
  }

  const addConnection = (from: string, to: string) => {
    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}`,
      from,
      to
    }
    setConnections([...connections, newConnection])
  }

  const getNodeColor = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'start': return 'bg-green-500'
      case 'end': return 'bg-red-500'
      case 'decision': return 'bg-yellow-500'
      case 'process': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getNodeIcon = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'start': return <Play className="w-4 h-4" />
      case 'end': return <X className="w-4 h-4" />
      case 'decision': return <Settings className="w-4 h-4" />
      case 'process': return <ArrowRight className="w-4 h-4" />
      default: return <ArrowRight className="w-4 h-4" />
    }
  }

  const handleSave = () => {
    onSave({
      id: workflow?.id || `workflow-${Date.now()}`,
      name: workflowName,
      nodes,
      connections
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="w-full h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <Workflow className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Workflow Editor</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Workflow name..."
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 bg-white/80 backdrop-blur-sm text-sm transition-all duration-200 w-48"
              />
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 text-xs font-medium"
              title="Share Workflow"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 text-xs font-medium"
              title="Export Workflow"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
              title="Save Workflow"
            >
              <Save className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-xs font-medium"
              title="Close Editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-4">Tools</h3>
            
            {/* Tool Selection */}
            <div className="space-y-2 mb-6">
              {[
                { id: 'select', label: 'Select', icon: '👆' },
                { id: 'connect', label: 'Connect', icon: '🔗' },
                { id: 'add', label: 'Add Node', icon: '➕' }
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id as any)}
                  className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span>{tool.icon}</span>
                  <span className="text-sm">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Node Types */}
            <div className="space-y-2 mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Node Types</h4>
              {[
                { type: 'start', label: 'Start', color: 'bg-green-500' },
                { type: 'process', label: 'Process', color: 'bg-blue-500' },
                { type: 'decision', label: 'Decision', color: 'bg-yellow-500' },
                { type: 'end', label: 'End', color: 'bg-red-500' }
              ].map((nodeType) => (
                <div
                  key={nodeType.type}
                  className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 bg-white"
                >
                  <div className={`w-3 h-3 rounded-full ${nodeType.color}`}></div>
                  <span className="text-sm">{nodeType.label}</span>
                </div>
              ))}
            </div>

            {/* Playback Controls */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Playback</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1 flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button className="flex-1 flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-gray-100 overflow-auto">
            <div className="w-full h-full min-w-[800px] min-h-[600px] relative">
              {/* Grid Background */}
              <div className="absolute inset-0 opacity-20">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Connections */}
              <svg className="absolute inset-0 pointer-events-none">
                {connections.map((connection) => {
                  const fromNode = nodes.find(n => n.id === connection.from)
                  const toNode = nodes.find(n => n.id === connection.to)
                  if (!fromNode || !toNode) return null

                  return (
                    <g key={connection.id}>
                      <line
                        x1={fromNode.x + 50}
                        y1={fromNode.y + 25}
                        x2={toNode.x}
                        y2={toNode.y + 25}
                        stroke="#6B7280"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                      {connection.label && (
                        <text
                          x={(fromNode.x + toNode.x) / 2}
                          y={fromNode.y + 15}
                          textAnchor="middle"
                          className="text-xs fill-gray-600"
                        >
                          {connection.label}
                        </text>
                      )}
                    </g>
                  )
                })}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" />
                  </marker>
                </defs>
              </svg>

              {/* Nodes */}
              {nodes.map((node) => (
                <motion.div
                  key={node.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute cursor-pointer ${
                    selectedNode === node.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className={`w-24 h-12 rounded-lg ${getNodeColor(node.type)} flex items-center justify-center text-white shadow-lg`}>
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="text-center mt-1">
                    <input
                      type="text"
                      value={node.label}
                      onChange={(e) => {
                        setNodes(nodes.map(n => 
                          n.id === node.id ? { ...n, label: e.target.value } : n
                        ))
                      }}
                      className="text-xs bg-transparent border-none text-center text-gray-700 focus:outline-none"
                    />
                  </div>
                  {selectedNode === node.id && (
                    <button
                      onClick={() => removeNode(node.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Add Node Button */}
              {selectedTool === 'add' && (
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white rounded-lg shadow-lg p-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { type: 'start', label: 'Start' },
                        { type: 'process', label: 'Process' },
                        { type: 'decision', label: 'Decision' },
                        { type: 'end', label: 'End' }
                      ].map((nodeType) => (
                        <button
                          key={nodeType.type}
                          onClick={() => addNode(nodeType.type as any, 100, 100)}
                          className="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          {nodeType.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedNode && (
            <div className="w-64 bg-gray-50 border-l border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Properties</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Node Type
                  </label>
                  <div className="text-sm text-gray-600">
                    {nodes.find(n => n.id === selectedNode)?.type}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <div className="text-sm text-gray-600">
                    X: {nodes.find(n => n.id === selectedNode)?.x}, 
                    Y: {nodes.find(n => n.id === selectedNode)?.y}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connections
                  </label>
                  <div className="text-sm text-gray-600">
                    {connections.filter(c => c.from === selectedNode || c.to === selectedNode).length} connections
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

