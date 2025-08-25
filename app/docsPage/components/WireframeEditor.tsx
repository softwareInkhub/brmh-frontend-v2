'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Square, 
  Circle, 
  Type, 
  Image,
  Move,
  Copy,
  RotateCw,
  Download,
  Share2,
  Palette,
  Layers,
  Grid
} from 'lucide-react'

interface WireframeElement {
  id: string
  type: 'rectangle' | 'circle' | 'text' | 'image' | 'button' | 'input'
  x: number
  y: number
  width: number
  height: number
  content?: string
  style: {
    backgroundColor: string
    borderColor: string
    borderWidth: number
    borderRadius: number
    fontSize: number
    color: string
  }
}

interface WireframeEditorProps {
  isOpen: boolean
  onClose: () => void
  wireframe?: {
    id: string
    name: string
    elements: WireframeElement[]
    canvas: {
      width: number
      height: number
      backgroundColor: string
    }
  }
  onSave: (wireframe: any) => void
}

export default function WireframeEditor({ isOpen, onClose, wireframe, onSave }: WireframeEditorProps) {
  const [wireframeName, setWireframeName] = useState(wireframe?.name || '')
  const [elements, setElements] = useState<WireframeElement[]>(wireframe?.elements || [])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<'select' | 'rectangle' | 'circle' | 'text' | 'button' | 'input'>('select')
  const [canvas, setCanvas] = useState({
    width: wireframe?.canvas?.width || 800,
    height: wireframe?.canvas?.height || 600,
    backgroundColor: wireframe?.canvas?.backgroundColor || '#ffffff'
  })

  const addElement = (type: WireframeElement['type'], x: number, y: number) => {
    const newElement: WireframeElement = {
      id: `element-${Date.now()}`,
      type,
      x,
      y,
      width: type === 'text' ? 100 : type === 'input' ? 200 : 80,
      height: type === 'text' ? 30 : type === 'input' ? 40 : 80,
      content: type === 'text' ? 'Text' : type === 'button' ? 'Button' : type === 'input' ? 'Input' : '',
      style: {
        backgroundColor: type === 'button' ? '#3B82F6' : type === 'input' ? '#F9FAFB' : '#E5E7EB',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: type === 'circle' ? 50 : type === 'button' ? 6 : 0,
        fontSize: 14,
        color: type === 'button' ? '#FFFFFF' : '#374151'
      }
    }
    setElements([...elements, newElement])
  }

  const removeElement = (elementId: string) => {
    setElements(elements.filter(el => el.id !== elementId))
    setSelectedElement(null)
  }

  const updateElement = (elementId: string, updates: Partial<WireframeElement>) => {
    setElements(elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ))
  }

  const getElementIcon = (type: WireframeElement['type']) => {
    switch (type) {
      case 'rectangle': return <Square className="w-4 h-4" />
      case 'circle': return <Circle className="w-4 h-4" />
      case 'text': return <Type className="w-4 h-4" />
      case 'image': return <Image className="w-4 h-4" />
      case 'button': return <Square className="w-4 h-4" />
      case 'input': return <Square className="w-4 h-4" />
      default: return <Square className="w-4 h-4" />
    }
  }

  const handleSave = () => {
    onSave({
      id: wireframe?.id || `wireframe-${Date.now()}`,
      name: wireframeName,
      elements,
      canvas
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
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm">
                <Layout className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Wireframe Editor</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Wireframe name..."
                value={wireframeName}
                onChange={(e) => setWireframeName(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 bg-white/80 backdrop-blur-sm text-sm transition-all duration-200 w-48"
              />
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 text-xs font-medium"
              title="Share Wireframe"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 text-xs font-medium"
              title="Export Wireframe"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
              title="Save Wireframe"
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
                { id: 'select', label: 'Select', icon: Move },
                { id: 'rectangle', label: 'Rectangle', icon: Square },
                { id: 'circle', label: 'Circle', icon: Circle },
                { id: 'text', label: 'Text', icon: Type },
                { id: 'button', label: 'Button', icon: Square },
                { id: 'input', label: 'Input', icon: Square }
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
                  <tool.icon className="w-4 h-4" />
                  <span className="text-sm">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Canvas Settings */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700">Canvas</h4>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Width</label>
                <input
                  type="number"
                  value={canvas.width}
                  onChange={(e) => setCanvas({ ...canvas, width: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Height</label>
                <input
                  type="number"
                  value={canvas.height}
                  onChange={(e) => setCanvas({ ...canvas, height: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Background</label>
                <input
                  type="color"
                  value={canvas.backgroundColor}
                  onChange={(e) => setCanvas({ ...canvas, backgroundColor: e.target.value })}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>
              <button className="w-full flex items-center space-x-2 p-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                <Grid className="w-4 h-4" />
                <span>Show Grid</span>
              </button>
              <button className="w-full flex items-center space-x-2 p-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                <Layers className="w-4 h-4" />
                <span>Layer Panel</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-gray-100 overflow-auto flex items-center justify-center">
            <div 
              className="relative shadow-lg"
              style={{ 
                width: canvas.width, 
                height: canvas.height, 
                backgroundColor: canvas.backgroundColor 
              }}
            >
              {/* Grid Overlay */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Elements */}
              {elements.map((element) => (
                <motion.div
                  key={element.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute cursor-pointer ${
                    selectedElement === element.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    backgroundColor: element.style.backgroundColor,
                    border: `${element.style.borderWidth}px solid ${element.style.borderColor}`,
                    borderRadius: element.style.borderRadius,
                    fontSize: element.style.fontSize,
                    color: element.style.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => setSelectedElement(element.id)}
                >
                  {element.content}
                  {selectedElement === element.id && (
                    <button
                      onClick={() => removeElement(element.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Add Element Button */}
              {selectedTool !== 'select' && (
                <div className="absolute bottom-4 right-4">
                  <div className="bg-white rounded-lg shadow-lg p-2">
                    <p className="text-xs text-gray-600 mb-2">Click canvas to add {selectedTool}</p>
                    <button
                      onClick={() => addElement(selectedTool, 100, 100)}
                      className="w-full p-2 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                      Add {selectedTool}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {selectedElement && (
            <div className="w-64 bg-gray-50 border-l border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">Properties</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <input
                    type="text"
                    value={elements.find(e => e.id === selectedElement)?.content || ''}
                    onChange={(e) => updateElement(selectedElement, { content: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">X</label>
                    <input
                      type="number"
                      value={elements.find(e => e.id === selectedElement)?.x || 0}
                      onChange={(e) => updateElement(selectedElement, { x: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Y</label>
                    <input
                      type="number"
                      value={elements.find(e => e.id === selectedElement)?.y || 0}
                      onChange={(e) => updateElement(selectedElement, { y: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      value={elements.find(e => e.id === selectedElement)?.width || 0}
                      onChange={(e) => updateElement(selectedElement, { width: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      value={elements.find(e => e.id === selectedElement)?.height || 0}
                      onChange={(e) => updateElement(selectedElement, { height: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={elements.find(e => e.id === selectedElement)?.style.backgroundColor || '#ffffff'}
                    onChange={(e) => updateElement(selectedElement, { 
                      style: { 
                        ...elements.find(el => el.id === selectedElement)?.style!,
                        backgroundColor: e.target.value 
                      }
                    })}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={elements.find(e => e.id === selectedElement)?.style.borderRadius || 0}
                    onChange={(e) => updateElement(selectedElement, { 
                      style: { 
                        ...elements.find(el => el.id === selectedElement)?.style!,
                        borderRadius: parseInt(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

