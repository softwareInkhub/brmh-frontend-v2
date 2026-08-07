'use client'

import { useState, useRef } from 'react'
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
  type: 'start' | 'process' | 'decision' | 'end' | 'input' | 'output' | 'document' | 'database'
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
  const [selectedTool, setSelectedTool] = useState<'select' | 'connect'>('select')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [connectMouse, setConnectMouse] = useState<{ x: number; y: number } | null>(null)
  const [connectFromSide, setConnectFromSide] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)

  const addNode = (type: WorkflowNode['type'], x: number, y: number) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      label:
        type === 'start' ? 'Start' :
        type === 'end' ? 'End' :
        type === 'decision' ? 'Decision' :
        type === 'input' ? 'Input' :
        type === 'output' ? 'Output' :
        type === 'document' ? 'Document' :
        type === 'database' ? 'Database' :
        'Process',
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

  const removeConnection = (connectionId: string) => {
    setConnections(connections.filter(c => c.id !== connectionId))
    if (selectedConnection === connectionId) setSelectedConnection(null)
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
      case 'input': return 'bg-indigo-500'
      case 'output': return 'bg-purple-500'
      case 'document': return 'bg-sky-500'
      case 'database': return 'bg-fuchsia-500'
      default: return 'bg-gray-500'
    }
  }

  const getNodeIcon = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'start': return <Play className="w-4 h-4" />
      case 'end': return <X className="w-4 h-4" />
      case 'decision': return <Settings className="w-4 h-4" />
      case 'process': return <ArrowRight className="w-4 h-4" />
      case 'input': return <Plus className="w-4 h-4" />
      case 'output': return <ArrowRight className="w-4 h-4" />
      case 'document': return <Download className="w-4 h-4" />
      case 'database': return <Share2 className="w-4 h-4" />
      default: return <ArrowRight className="w-4 h-4" />
    }
  }

  const getNodeShapeClass = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'start':
      case 'end':
        return 'rounded-full'
      case 'process':
        return 'rounded-lg'
      case 'decision':
        return ''
      case 'document':
        return 'rounded-lg'
      case 'database':
        return 'rounded-lg'
      case 'input':
      case 'output':
        return ''
      default:
        return 'rounded-lg'
    }
  }

  const getNodeBaseSize = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'decision': return { w: 96, h: 56 }
      case 'input':
      case 'output':
        return { w: 128, h: 56 }
      case 'document':
        return { w: 144, h: 56 }
      case 'database':
        return { w: 112, h: 64 }
      default:
        return { w: 96, h: 56 }
    }
  }

  const getNodeSizeFor = (node: WorkflowNode) => {
    const base = getNodeBaseSize(node.type)
    const text = String((node.properties as any)?.text || '')
    const extra = Math.max(0, text.length - 12) * 6 // grow ~6px per char beyond 12
    const maxExtra = 400
    const w = base.w + Math.min(maxExtra, extra)
    return { w, h: base.h }
  }

  const getAnchorPos = (node: WorkflowNode, side: 'top' | 'right' | 'bottom' | 'left') => {
    const { w, h } = getNodeSizeFor(node)
    const cx = node.x + w / 2
    const cy = node.y + h / 2
    switch (side) {
      case 'top': return { x: cx, y: node.y }
      case 'right': return { x: node.x + w, y: cy }
      case 'bottom': return { x: cx, y: node.y + h }
      case 'left': return { x: node.x, y: cy }
    }
  }

  const getNodeBoxStyle = (node: WorkflowNode) => {
    const { w, h } = getNodeSizeFor(node)
    return { width: w, height: h }
  }

  const getAutoSides = (from: WorkflowNode, to: WorkflowNode): { fromSide: 'top' | 'right' | 'bottom' | 'left', toSide: 'top' | 'right' | 'bottom' | 'left' } => {
    const fromSize = getNodeSizeFor(from)
    const toSize = getNodeSizeFor(to)
    const fromCx = from.x + fromSize.w / 2
    const fromCy = from.y + fromSize.h / 2
    const toCx = to.x + toSize.w / 2
    const toCy = to.y + toSize.h / 2
    const dx = toCx - fromCx
    const dy = toCy - fromCy
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      return {
        fromSide: dx > 0 ? 'right' : 'left',
        toSide: dx > 0 ? 'left' : 'right'
      }
    } else {
      // Vertical connection
      return {
        fromSide: dy > 0 ? 'bottom' : 'top',
        toSide: dy > 0 ? 'top' : 'bottom'
      }
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
                { id: 'connect', label: 'Connect', icon: '🔗' }
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
                { type: 'input', label: 'Input', color: 'bg-indigo-500' },
                { type: 'output', label: 'Output', color: 'bg-purple-500' },
                { type: 'document', label: 'Document', color: 'bg-sky-500' },
                { type: 'database', label: 'Database', color: 'bg-fuchsia-500' },
                { type: 'end', label: 'End', color: 'bg-red-500' }
              ].map((nodeType) => (
                <button
                  key={nodeType.type}
                  onClick={() => addNode(nodeType.type as any, 100, 100)}
                  className="w-full flex items-center justify-start space-x-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <div className={`w-3 h-3 rounded-full ${nodeType.color}`}></div>
                  <span className="text-sm">{nodeType.label}</span>
                </button>
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
            <div
              className="w-full h-full min-w-[800px] min-h-[600px] relative"
              ref={canvasRef}
              onMouseMove={(e) => {
                if (!canvasRef.current) return
                const rect = canvasRef.current.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top
                // Update preview line while connecting
                if (connectFrom) {
                  setConnectMouse({ x: mouseX, y: mouseY })
                }
                // Handle dragging node if active
                if (isDraggingNode && dragNodeId) {
                  const newX = mouseX - dragOffset.x
                  const newY = mouseY - dragOffset.y
                  setNodes(prev => prev.map(n => n.id === dragNodeId ? { ...n, x: newX, y: newY } : n))
                }
              }}
              onMouseUp={() => {
                if (isDraggingNode) {
                  setIsDraggingNode(false)
                  setDragNodeId(null)
                }
                if (connectFrom) {
                  setConnectFrom(null)
                  setConnectFromSide(null)
                  setConnectMouse(null)
                }
              }}
              onMouseDown={() => {
                // Deselect when clicking on blank canvas
                if (selectedTool === 'select') {
                  setSelectedNode(null)
                  setSelectedConnection(null)
                }
              }}
            >
              {/* Grid Background */}
              <div className="absolute inset-0 opacity-20 z-0">
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
              <svg className="absolute inset-0 pointer-events-none z-50 overflow-visible">
                {connections.map((connection) => {
                  const fromNode = nodes.find(n => n.id === connection.from)
                  const toNode = nodes.find(n => n.id === connection.to)
                  if (!fromNode || !toNode) return null

                  return (
                    <g key={connection.id} className="cursor-pointer" onClick={() => setSelectedConnection(connection.id)} style={{ pointerEvents: 'stroke' }}>
                      {(() => {
                        const { fromSide, toSide } = getAutoSides(fromNode, toNode)
                        const a = getAnchorPos(fromNode, fromSide)
                        const b = getAnchorPos(toNode, toSide)
                        return (
                          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={selectedConnection === connection.id ? '#0ea5e9' : '#06B6D4'} strokeWidth={selectedConnection === connection.id ? 4 : 3} strokeLinecap="round" markerEnd="url(#arrowhead)" />
                        )
                      })()}
                      {/* endpoint dots for visibility */}
                      <circle cx={getAnchorPos(fromNode, getAutoSides(fromNode, toNode).fromSide).x} cy={getAnchorPos(fromNode, getAutoSides(fromNode, toNode).fromSide).y} r="2" fill="#06B6D4" />
                      <circle cx={getAnchorPos(toNode, getAutoSides(fromNode, toNode).toSide).x} cy={getAnchorPos(toNode, getAutoSides(fromNode, toNode).toSide).y} r="2" fill="#06B6D4" />
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
                {connectFrom && connectMouse && connectFromSide && (() => {
                  const start = nodes.find(n => n.id === connectFrom)
                  if (!start) return null
                  const anchor = getAnchorPos(start, connectFromSide)
                  return (
                    <line
                      x1={anchor.x}
                      y1={anchor.y}
                      x2={connectMouse.x}
                      y2={connectMouse.y}
                      stroke="#06B6D4"
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                    />
                  )
                })()}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="5"
                    refX="7"
                    refY="2.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 2.5, 0 5" fill="#06B6D4" />
                  </marker>
                </defs>
              </svg>

              {/* Nodes */}
              {nodes.map((node) => (
                <motion.div
                  key={node.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute cursor-pointer flex flex-col items-center leading-none z-10`}
                  style={{ left: node.x, top: node.y, ...getNodeBoxStyle(node) }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (!canvasRef.current) return
                    const rect = canvasRef.current.getBoundingClientRect()
                    const mouseX = e.clientX - rect.left
                    const mouseY = e.clientY - rect.top
                    if (selectedTool === 'connect') {
                      if (!connectFrom) {
                        setConnectFrom(node.id)
                        setConnectFromSide('bottom')
                        setConnectMouse({ x: mouseX, y: mouseY })
                      } else if (connectFrom !== node.id) {
                        addConnection(connectFrom, node.id)
                        setConnectFrom(null)
                        setConnectMouse(null)
                        setConnectFromSide(null)
                      }
                      return
                    }
                    setSelectedNode(node.id)
                    setIsDraggingNode(true)
                    setDragNodeId(node.id)
                    setDragOffset({ x: mouseX - node.x, y: mouseY - node.y })
                  }}
                  onMouseUp={(e) => {
                    // Finish connection if we started from another node/handle
                    if (connectFrom && connectFrom !== node.id) {
                      e.stopPropagation()
                      addConnection(connectFrom, node.id)
                      setConnectFrom(null)
                      setConnectFromSide(null)
                      setConnectMouse(null)
                    }
                  }}
                >
                  <div className="relative" style={{ width: getNodeSizeFor(node).w, height: getNodeSizeFor(node).h }}>
                  {selectedNode === node.id && (
                    <button
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                      onClick={(e) => { e.stopPropagation(); removeNode(node.id) }}
                      title="Delete node"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {node.type === 'decision' ? (
                    <div
                      className={`w-full h-full ${getNodeColor(node.type)} flex items-center justify-center text-white shadow-lg ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}`}
                      style={{
                        WebkitClipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                        clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
                      }}
                    >
                      {((node.properties as any)?.text && String((node.properties as any).text).trim().length > 0) ? (
                        <span className="px-2 text-xs text-white text-center" style={{ lineHeight: 1.2 }}>
                          {(node.properties as any).text}
                        </span>
                      ) : (
                        getNodeIcon(node.type)
                      )}
                    </div>
                  ) : node.type === 'input' ? (
                    <div
                      className={`w-full h-full ${getNodeColor(node.type)} flex items-center justify-center text-white shadow-lg ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}`}
                      style={{
                        WebkitClipPath: 'polygon(15% 0, 100% 0, 85% 100%, 0 100%)',
                        clipPath: 'polygon(15% 0, 100% 0, 85% 100%, 0 100%)'
                      }}
                    >
                      {((node.properties as any)?.text && String((node.properties as any).text).trim().length > 0) ? (
                        <span className="px-2 text-xs text-white text-center" style={{ lineHeight: 1.2 }}>
                          {(node.properties as any).text}
                        </span>
                      ) : (
                        getNodeIcon(node.type)
                      )}
                    </div>
                  ) : node.type === 'output' ? (
                    <div
                      className={`w-full h-full ${getNodeColor(node.type)} flex items-center justify-center text-white shadow-lg ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}`}
                      style={{
                        WebkitClipPath: 'polygon(0 0, 85% 0, 100% 100%, 15% 100%)',
                        clipPath: 'polygon(0 0, 85% 0, 100% 100%, 15% 100%)'
                      }}
                    >
                      {((node.properties as any)?.text && String((node.properties as any).text).trim().length > 0) ? (
                        <span className="px-2 text-xs text-white text-center" style={{ lineHeight: 1.2 }}>
                          {(node.properties as any).text}
                        </span>
                      ) : (
                        getNodeIcon(node.type)
                      )}
                    </div>
                  ) : node.type === 'document' ? (
                    <div className={`w-full h-full ${getNodeColor(node.type)} text-white shadow-lg flex items-center justify-center rounded-lg ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}`}>
                      {((node.properties as any)?.text && String((node.properties as any).text).trim().length > 0) ? (
                        <span className="px-2 text-xs text-white text-center" style={{ lineHeight: 1.2 }}>
                          {(node.properties as any).text}
                        </span>
                      ) : (
                        getNodeIcon(node.type)
                      )}
                    </div>
                  ) : node.type === 'database' ? (
                    <div className={`w-full h-full ${getNodeColor(node.type)} text-white shadow-lg flex items-center justify-center rounded-lg ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}`}>
                      {((node.properties as any)?.text && String((node.properties as any).text).trim().length > 0) ? (
                        <span className="px-2 text-xs text-white text-center" style={{ lineHeight: 1.2 }}>
                          {(node.properties as any).text}
                        </span>
                      ) : (
                        getNodeIcon(node.type)
                      )}
                    </div>
                  ) : (
                    <div className={`w-full h-full ${getNodeShapeClass(node.type)} ${getNodeColor(node.type)} flex items-center justify-center text-white shadow-lg ${selectedNode === node.id ? 'ring-2 ring-primary-500' : ''}`}>
                      {((node.properties as any)?.text && String((node.properties as any).text).trim().length > 0) ? (
                        <span className="px-2 text-xs text-white text-center" style={{ lineHeight: 1.2 }}>
                          {(node.properties as any).text}
                        </span>
                      ) : (
                        getNodeIcon(node.type)
                      )}
                    </div>
                  )}
                  {selectedTool === 'connect' && (
                    <>
                      {(['top','right','bottom','left'] as const).map((side) => {
                        const size = getNodeSizeFor(node)
                        const halfW = size.w / 2
                        const halfH = size.h / 2
                        const base = 'absolute w-2 h-2 bg-white border border-primary-500 rounded-full shadow cursor-crosshair'
                        return (
                          <div
                            key={side}
                            className={base}
                            style={{
                              top: side === 'top' ? -6 : side === 'bottom' ? size.h - 2 : halfH - 4,
                              left: side === 'left' ? -6 : side === 'right' ? size.w - 2 : halfW - 4
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              if (!canvasRef.current) return
                              const rect = canvasRef.current.getBoundingClientRect()
                              setConnectFrom(node.id)
                              setConnectFromSide(side)
                              setConnectMouse({ x: node.x + (side === 'left' ? 0 : side === 'right' ? size.w : halfW), y: node.y + (side === 'top' ? 0 : side === 'bottom' ? size.h : halfH) })
                            }}
                          />
                        )
                      })}
                    </>
                  )}
                  </div>
                  <div className="text-center mt-0.5">
                    <input
                      type="text"
                      value={node.label}
                      onChange={(e) => {
                        setNodes(nodes.map(n => 
                          n.id === node.id ? { ...n, label: e.target.value } : n
                        ))
                      }}
                      className="text-xs bg-transparent border-none text-center text-gray-700 focus:outline-none leading-none"
                    />
                  </div>
                </motion.div>
              ))}

              {/* Connection delete control */}
              {selectedConnection && (() => {
                const conn = connections.find(c => c.id === selectedConnection)
                if (!conn) return null
                const fromNode = nodes.find(n => n.id === conn.from)
                const toNode = nodes.find(n => n.id === conn.to)
                if (!fromNode || !toNode) return null
                const { fromSide, toSide } = getAutoSides(fromNode, toNode)
                const a = getAnchorPos(fromNode, fromSide)
                const b = getAnchorPos(toNode, toSide)
                const midX = (a.x + b.x) / 2
                const midY = (a.y + b.y) / 2
                return (
                  <button
                    className="absolute" style={{ left: midX - 24, top: midY - 10 }}
                    onClick={() => removeConnection(selectedConnection)}
                  >
                    <span className="px-2 py-1 text-[10px] rounded bg-red-500 text-white hover:bg-red-600">Delete Link</span>
                  </button>
                )
              })()}
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
                    Node Content
                  </label>
                  <textarea
                    value={String((nodes.find(n => n.id === selectedNode)?.properties as any)?.text || '')}
                    onChange={(e) => {
                      const text = e.target.value
                      setNodes(prev => prev.map(n =>
                        n.id === selectedNode ? { ...n, properties: { ...n.properties, text } } : n
                      ))
                    }}
                    placeholder="Type content to display inside the node"
                    className="w-full h-20 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
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

