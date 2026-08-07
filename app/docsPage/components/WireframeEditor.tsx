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
  Grid,
  Layout,
  Lock,
  Hand,
  Diamond,
  ArrowRight,
  Minus,
  Pencil,
  Eraser,
  Shapes,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface WireframeElement {
  id: string
  type: 'rectangle' | 'circle' | 'text' | 'image' | 'button' | 'input' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'eraser'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  content?: string
  sx?: number
  sy?: number
  ex?: number
  ey?: number
  points?: { x: number; y: number }[] // For pencil drawings
  style: {
    backgroundColor: string
    borderColor: string
    borderWidth: number
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    borderRadius: number
    fontSize: number
    color: string
    opacity?: number
    fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder'
    fontStyle?: 'normal' | 'italic'
    textDecoration?: 'none' | 'underline' | 'line-through'
    fontFamily?: string
    textAlign?: 'left' | 'center' | 'right'
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
  const [selectedTool, setSelectedTool] = useState<'select' | 'rectangle' | 'circle' | 'text' | 'button' | 'input' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'eraser' | 'image' | 'hand'>('select')
  const [canvas, setCanvas] = useState({
    width: wireframe?.canvas?.width || 800,
    height: wireframe?.canvas?.height || 600,
    backgroundColor: wireframe?.canvas?.backgroundColor || '#ffffff'
  })
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 })
  const [tempElement, setTempElement] = useState<WireframeElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragElement, setDragElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeElement, setResizeElement] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isRotating, setIsRotating] = useState(false)
  const [rotateElementId, setRotateElementId] = useState<string | null>(null)
  const [rotateData, setRotateData] = useState({ cx: 0, cy: 0, startAngle: 0, initialRotation: 0 })
  const [pencilPoints, setPencilPoints] = useState<{ x: number; y: number }[]>([])
  const [isPenciling, setIsPenciling] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [eraserRadius] = useState<number>(12)
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })

  const addElement = (type: WireframeElement['type'], x: number, y: number, width?: number, height?: number) => {
    const newElement: WireframeElement = {
      id: `element-${Date.now()}`,
      type,
      x,
      y,
      width: width || (type === 'text' ? 100 : type === 'input' ? 200 : type === 'line' ? 100 : type === 'arrow' ? 80 : 80),
      height: height || (type === 'text' ? 30 : type === 'input' ? 40 : type === 'line' ? 2 : type === 'arrow' ? 2 : 80),
      content: type === 'text' ? 'Text' : type === 'button' ? 'Button' : type === 'input' ? 'Input' : type === 'arrow' ? '→' : '',
      style: {
        backgroundColor: type === 'button' ? '#3B82F6' : type === 'input' ? '#F9FAFB' : type === 'line' || type === 'arrow' ? 'transparent' : '#E5E7EB',
        borderColor: type === 'line' || type === 'arrow' ? '#374151' : '#D1D5DB',
        borderWidth: type === 'line' || type === 'arrow' ? 2 : 1,
        borderStyle: 'solid',
        borderRadius: type === 'circle' ? 50 : type === 'diamond' ? 0 : type === 'button' ? 6 : 0,
        fontSize: 14,
        color: type === 'button' ? '#FFFFFF' : '#374151',
        opacity: 1,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        fontFamily: 'Inter, system-ui, Arial',
        textAlign: 'center'
      }
    }
    setElements([...elements, newElement])
  }

  const renderArrow = (element: WireframeElement) => {
    const { width, height } = element
    const sx = element.sx ?? 0
    const sy = element.sy ?? height / 2
    const ex = element.ex ?? width
    const ey = element.ey ?? height / 2
    const stroke = element.style.borderColor || '#374151'
    const strokeWidth = Math.max(1, element.style.borderWidth || 2)

    // Calculate stroke pattern based on border style
    let strokeDasharray = undefined
    if (element.style.borderStyle === 'dashed') {
      strokeDasharray = `${strokeWidth * 8},${strokeWidth * 4}` // Larger dashes
    } else if (element.style.borderStyle === 'dotted') {
      strokeDasharray = `${strokeWidth * 2},${strokeWidth * 4}` // Larger dots
    }

    return (
      <svg
        style={{
          width: width,
          height: height,
          pointerEvents: 'none'
        }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <marker 
            id={`arrowhead-${element.id}`} 
            markerWidth={strokeWidth * 4} 
            markerHeight={strokeWidth * 3.5} 
            refX={strokeWidth * 4} 
            refY={(strokeWidth * 3.5) / 2} 
            orient="auto" 
            markerUnits="strokeWidth"
          >
            <polygon 
              points={`0 0, ${strokeWidth * 4} ${(strokeWidth * 3.5) / 2}, 0 ${strokeWidth * 3.5}`} 
              fill={stroke} 
            />
          </marker>
        </defs>
        <line 
          x1={sx} 
          y1={sy} 
          x2={ex} 
          y2={ey} 
          stroke={stroke} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          markerEnd={`url(#arrowhead-${element.id})`}
          strokeDasharray={strokeDasharray}
        />
      </svg>
    )
  }

  const renderLine = (element: WireframeElement) => {
    const { width, height } = element
    const sx = element.sx ?? 0
    const sy = element.sy ?? height / 2
    const ex = element.ex ?? width
    const ey = element.ey ?? height / 2
    const stroke = element.style.borderColor || '#374151'
    const strokeWidth = Math.max(1, element.style.borderWidth || 2)

    // Calculate stroke pattern based on border style
    let strokeDasharray = undefined
    if (element.style.borderStyle === 'dashed') {
      strokeDasharray = `${strokeWidth * 8},${strokeWidth * 4}` // Larger dashes
    } else if (element.style.borderStyle === 'dotted') {
      strokeDasharray = `${strokeWidth * 2},${strokeWidth * 4}` // Larger dots
    }

    return (
      <svg
        style={{
          width: width,
          height: height,
          pointerEvents: 'none'
        }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <line 
          x1={sx} 
          y1={sy} 
          x2={ex} 
          y2={ey} 
          stroke={stroke} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
        />
      </svg>
    )
  }

  const renderPencil = (element: WireframeElement) => {
    if (!element.points || element.points.length < 2) return null
    
    const stroke = element.style.borderColor || '#374151'
    const strokeWidth = Math.max(1, element.style.borderWidth || 2)
    
    // Calculate stroke pattern based on border style
    let strokeDasharray = undefined
    if (element.style.borderStyle === 'dashed') {
      strokeDasharray = `${strokeWidth * 8},${strokeWidth * 4}` // Larger dashes
    } else if (element.style.borderStyle === 'dotted') {
      strokeDasharray = `${strokeWidth * 2},${strokeWidth * 4}` // Larger dots
    }
    
    // Use stored bounding box for eraser hit-test compatibility
    const left = element.x
    const top = element.y
    const width = Math.max(element.width, 1)
    const height = Math.max(element.height, 1)
    
    // Convert points to relative coordinates based on stored bbox
    const relativePoints = element.points.map(p => ({
      x: p.x - left,
      y: p.y - top
    }))
    
    const pathData = relativePoints.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')

    return (
      <svg
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          pointerEvents: 'none'
        }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <path
          d={pathData}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={strokeDasharray}
        />
      </svg>
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    // Handle panning with hand tool
    if (selectedTool === 'hand') {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Check if clicking on resize or rotate handle (allow regardless of tool)
    if (selectedElement) {
      const element = elements.find(el => el.id === selectedElement)
      if (element) {
        const handleSize = 8
        const handles = {
          'nw': { x: element.x - handleSize/2, y: element.y - handleSize/2 },
          'n': { x: element.x + element.width/2 - handleSize/2, y: element.y - handleSize/2 },
          'ne': { x: element.x + element.width - handleSize/2, y: element.y - handleSize/2 },
          'w': { x: element.x - handleSize/2, y: element.y + element.height/2 - handleSize/2 },
          'e': { x: element.x + element.width - handleSize/2, y: element.y + element.height/2 - handleSize/2 },
          'sw': { x: element.x - handleSize/2, y: element.y + element.height - handleSize/2 },
          's': { x: element.x + element.width/2 - handleSize/2, y: element.y + element.height - handleSize/2 },
          'se': { x: element.x + element.width - handleSize/2, y: element.y + element.height - handleSize/2 }
        }
        
        for (const [handle, pos] of Object.entries(handles)) {
          if (x >= pos.x && x <= pos.x + handleSize && y >= pos.y && y <= pos.y + handleSize) {
            setIsResizing(true)
            setResizeElement(selectedElement)
            setResizeHandle(handle)
            setResizeStart({ x: element.x, y: element.y, width: element.width, height: element.height })
            return
          }
        }

        // Rotate handle hit test (top-left, offset 16px outside)
        const rotateSize = 16
        const rx = element.x - rotateSize
        const ry = element.y - rotateSize
        if (x >= rx && x <= rx + rotateSize && y >= ry && y <= ry + rotateSize) {
          const cx = element.x + element.width / 2
          const cy = element.y + element.height / 2
          const startAngle = Math.atan2(y - cy, x - cx)
          setIsRotating(true)
          setRotateElementId(selectedElement)
          setRotateData({ cx, cy, startAngle, initialRotation: element.rotation || 0 })
          return
        }
      }
    }
    
    // Check if clicking on an existing element
    const clickedElement = elements.find(element => {
      return x >= element.x && x <= element.x + element.width &&
             y >= element.y && y <= element.y + element.height
    })
    
    if (clickedElement && selectedTool === 'select') {
      // Start dragging existing element from anywhere inside it
      setIsDragging(true)
      setDragElement(clickedElement.id)
      setSelectedElement(clickedElement.id)
      setDragOffset({
        x: x - clickedElement.x,
        y: y - clickedElement.y
      })
      return
    }
    
    // Deselect if clicking outside any element
    if (selectedTool === 'select' && !clickedElement) {
      setSelectedElement(null)
      return
    }
    
    if (selectedTool === 'select') return
    
    // Handle pencil tool
    if (selectedTool === 'pencil') {
      setIsPenciling(true)
      setIsDrawing(true)
      setPencilPoints([{ x, y }])
      return
    }
    
    // Handle eraser tool
    if (selectedTool === 'eraser') {
      setIsErasing(true)
      setEraserPos({ x, y })
      // Immediately erase on mousedown too
      const hit = elements.find(element => (
        x >= element.x && x <= element.x + element.width &&
        y >= element.y && y <= element.y + element.height
      ))
      if (hit) removeElement(hit.id)
      return
    }
    
    setIsDrawing(true)
    setDrawStart({ x, y })
    setDrawEnd({ x, y })
    
    // Create temporary element for preview
    const tempEl = {
      id: 'temp',
      type: selectedTool,
      x,
      y,
      width: 0,
      height: 0,
      sx: 0,
      sy: 0,
      ex: 0,
      ey: 0,
      content: selectedTool === 'text' ? 'Text' : selectedTool === 'button' ? 'Button' : selectedTool === 'input' ? 'Input' : selectedTool === 'arrow' ? '→' : '',
      style: {
        backgroundColor: selectedTool === 'button' ? '#3B82F6' : selectedTool === 'input' ? '#F9FAFB' : selectedTool === 'line' || selectedTool === 'arrow' ? 'transparent' : '#E5E7EB',
        borderColor: selectedTool === 'line' || selectedTool === 'arrow' ? '#374151' : '#D1D5DB',
        borderWidth: selectedTool === 'line' || selectedTool === 'arrow' ? 2 : 1,
        borderRadius: selectedTool === 'circle' ? 50 : selectedTool === 'diamond' ? 0 : selectedTool === 'button' ? 6 : 0,
        fontSize: 14,
        color: selectedTool === 'button' ? '#FFFFFF' : '#374151'
      }
    }
    setTempElement(tempEl)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    
    // Handle panning with hand tool
    if (isPanning && selectedTool === 'hand') {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Handle hover detection for cursor changes - only show grab cursor on selected elements
    if (selectedTool === 'select' && !isDragging && !isResizing && !isRotating) {
      const hoveredElement = elements.find(element => {
        return x >= element.x && x <= element.x + element.width &&
               y >= element.y && y <= element.y + element.height
      })
      // Only show grab cursor if hovering over the currently selected element
      setHoveredElement(hoveredElement?.id === selectedElement ? hoveredElement.id : null)
    }
    
    // Handle rotating
    if (isRotating && rotateElementId) {
      const el = elements.find(el => el.id === rotateElementId)
      if (el) {
        const angle = Math.atan2(y - rotateData.cy, x - rotateData.cx)
        const degrees = (angle - rotateData.startAngle) * (180 / Math.PI) + rotateData.initialRotation
        updateElement(rotateElementId, { rotation: degrees })
      }
      return
    }

    // Handle resizing
    if (isResizing && resizeElement && resizeHandle) {
      const element = elements.find(el => el.id === resizeElement)
      if (element) {
        const deltaX = x - resizeStart.x
        const deltaY = y - resizeStart.y
        
        let newX = resizeStart.x
        let newY = resizeStart.y
        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        
        switch (resizeHandle) {
          case 'nw':
            newX = resizeStart.x + deltaX
            newY = resizeStart.y + deltaY
            newWidth = resizeStart.width - deltaX
            newHeight = resizeStart.height - deltaY
            break
          case 'n':
            newY = resizeStart.y + deltaY
            newHeight = resizeStart.height - deltaY
            break
          case 'ne':
            newY = resizeStart.y + deltaY
            newWidth = resizeStart.width + deltaX
            newHeight = resizeStart.height - deltaY
            break
          case 'w':
            newX = resizeStart.x + deltaX
            newWidth = resizeStart.width - deltaX
            break
          case 'e':
            newWidth = resizeStart.width + deltaX
            break
          case 'sw':
            newX = resizeStart.x + deltaX
            newWidth = resizeStart.width - deltaX
            newHeight = resizeStart.height + deltaY
            break
          case 's':
            newHeight = resizeStart.height + deltaY
            break
          case 'se':
            newWidth = resizeStart.width + deltaX
            newHeight = resizeStart.height + deltaY
            break
        }
        
        // Ensure minimum size
        newWidth = Math.max(newWidth, 10)
        newHeight = Math.max(newHeight, 10)
        newX = Math.max(newX, 0)
        newY = Math.max(newY, 0)
        
        updateElement(resizeElement, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        })
      }
      return
    }
    
    // Handle dragging existing elements
    if (isDragging && dragElement) {
      const element = elements.find(el => el.id === dragElement)
      if (element) {
        const newX = x - dragOffset.x
        const newY = y - dragOffset.y
        
        updateElement(dragElement, {
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        })
      }
      return
    }
    
    if (selectedTool === 'select') return

    // Update eraser preview and perform erase while dragging
    if (selectedTool === 'eraser') {
      setEraserPos({ x, y })
      if (isErasing) {
        const hit = elements.find(element => (
          x >= element.x && x <= element.x + element.width &&
          y >= element.y && y <= element.y + element.height
        ))
        if (hit) removeElement(hit.id)
      }
      return
    }

    // Handle pencil drawing (allow even if isDrawing was not set elsewhere)
    if (isPenciling && selectedTool === 'pencil') {
      setPencilPoints(prev => [...prev, { x, y }])
      return
    }
    
    if (!isDrawing) return

    setDrawEnd({ x, y })
    
    if (tempElement) {
      const startX = drawStart.x
      const startY = drawStart.y
      const endX = x
      const endY = y
      
      let left = Math.min(startX, endX)
      let top = Math.min(startY, endY)
      let width = Math.max(Math.abs(endX - startX), 2)
      let height = Math.max(Math.abs(endY - startY), 2)
      
      // compute relative positions inside the element box
      let sx = startX - left
      let sy = startY - top
      let ex = endX - left
      let ey = endY - top

      // Ensure circles maintain perfect circle shape
      if (tempElement.type === 'circle') {
        const size = Math.max(width, height, 40) // Minimum 40px diameter
        width = size
        height = size
        
        // Recalculate position to center the circle
        const centerX = (startX + endX) / 2
        const centerY = (startY + endY) / 2
        left = centerX - size / 2
        top = centerY - size / 2
        
        // Update relative positions
        sx = startX - left
        sy = startY - top
        ex = endX - left
        ey = endY - top
      }

      // Ensure arrows have some visual height and center the line
      if (tempElement.type === 'arrow') {
        const minH = Math.max(24, (tempElement.style.borderWidth || 2) * 4)
        if (height < minH) {
          const pad = (minH - height) / 2
          top = top - pad
          height = minH
          sy += pad
          ey += pad
        }
      }

      // Ensure lines have some visual height and center the line
      if (tempElement.type === 'line') {
        const minH = Math.max(24, (tempElement.style.borderWidth || 2) * 4)
        if (height < minH) {
          const pad = (minH - height) / 2
          top = top - pad
          height = minH
          sy += pad
          ey += pad
        }
      }

      setTempElement({
        ...tempElement,
        x: left,
        y: top,
        width,
        height,
        sx,
        sy,
        ex,
        ey
      })
    }
  }

  const handleMouseUp = () => {
    // Handle panning end
    if (isPanning) {
      setIsPanning(false)
      return
    }

    // Handle rotating end
    if (isRotating) {
      setIsRotating(false)
      setRotateElementId(null)
      return
    }

    // Handle resizing end
    if (isResizing) {
      setIsResizing(false)
      setResizeElement(null)
      setResizeHandle(null)
      return
    }
    
    // Handle dragging end
    if (isDragging) {
      setIsDragging(false)
      setDragElement(null)
      return
    }
    
    if (selectedTool === 'select') return

    // Handle eraser end (keep tool selected; just stop erasing)
    if (selectedTool === 'eraser') {
      setIsErasing(false)
      return
    }

    // Handle pencil end (finish regardless of isDrawing flag)
    if (isPenciling) {
      setIsPenciling(false)
      if (pencilPoints.length > 1) {
        // Compute bounding box for pencil stroke so eraser can hit-test by bbox
        const minX = Math.min(...pencilPoints.map(p => p.x))
        const minY = Math.min(...pencilPoints.map(p => p.y))
        const maxX = Math.max(...pencilPoints.map(p => p.x))
        const maxY = Math.max(...pencilPoints.map(p => p.y))
        const newElement: WireframeElement = {
          id: `element-${Date.now()}`,
          type: 'pencil',
          x: minX,
          y: minY,
          width: Math.max(maxX - minX, 1),
          height: Math.max(maxY - minY, 1),
          points: [...pencilPoints],
          content: '',
          style: {
            backgroundColor: 'transparent',
            borderColor: '#374151',
            borderWidth: 2,
            borderStyle: 'solid',
            borderRadius: 0,
            fontSize: 14,
            color: '#374151',
            opacity: 1
          }
        }
        setElements([...elements, newElement])
      }
      setPencilPoints([])
      return
    }
    
    setIsDrawing(false)
    
    if (tempElement) {
      // Add the final element with preserved start/end points
      const { type, x, y, width, height, sx, sy, ex, ey } = tempElement
      const newElement: WireframeElement = {
        id: `element-${Date.now()}`,
        type,
        x,
        y,
        width,
        height,
        sx,
        sy,
        ex,
        ey,
        content: tempElement.content,
        style: tempElement.style
      }
      setElements([...elements, newElement])
      setTempElement(null)
      
      // Auto-switch to select tool after drawing (except for pencil/eraser)
      if (!['pencil', 'eraser'].includes(selectedTool)) {
        setSelectedTool('select')
      }
    }
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
              onClick={() => {
                if (window.confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
                  setElements([])
                  setSelectedElement(null)
                }
              }}
              className="p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-xs font-medium"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Horizontal Toolbar */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 space-x-2">
            {/* Lock Tool */}
            <button className="p-2 rounded hover:bg-gray-100 transition-colors" title="Lock">
              <Lock className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Hand Tool */}
            <button 
              onClick={() => setSelectedTool('hand')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'hand' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Hand Tool (Pan)"
            >
              <Hand className="w-5 h-5" />
            </button>
            
            {/* Select Tool */}
            <button 
              onClick={() => setSelectedTool('select')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'select' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Select (1)"
            >
              <Move className="w-5 h-5" />
            </button>
            
            {/* Rectangle Tool */}
            <button 
              onClick={() => setSelectedTool('rectangle')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'rectangle' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Rectangle (2)"
            >
              <Square className="w-5 h-5" />
            </button>
            
            {/* Diamond Tool */}
            <button 
              onClick={() => setSelectedTool('diamond')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'diamond' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Diamond (3)"
            >
              <Diamond className="w-5 h-5" />
            </button>
            
            {/* Circle Tool */}
            <button 
              onClick={() => setSelectedTool('circle')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'circle' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Circle (4)"
            >
              <Circle className="w-5 h-5" />
            </button>
            
            {/* Arrow Tool */}
            <button 
              onClick={() => setSelectedTool('arrow')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'arrow' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Arrow (5)"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            
            {/* Line Tool */}
            <button 
              onClick={() => setSelectedTool('line')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'line' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Line (6)"
            >
              <Minus className="w-5 h-5" />
            </button>
            
            {/* Pencil Tool */}
            <button 
              onClick={() => setSelectedTool('pencil')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'pencil' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Pencil"
            >
              <Pencil className="w-5 h-5" />
            </button>
            
            {/* Text Tool */}
            <button 
              onClick={() => setSelectedTool('text')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'text' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Text"
            >
              <Type className="w-5 h-5" />
            </button>
            
            {/* Image Tool */}
            <button 
              onClick={() => setSelectedTool('image')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'image' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Image"
            >
              <label className="cursor-pointer">
                <Image className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const src = reader.result as string
                      // Create a default image element in the center
                      const x = 40
                      const y = 40
                      const width = 200
                      const height = 150
                      const newElement: WireframeElement = {
                        id: `element-${Date.now()}`,
                        type: 'image',
                        x,
                        y,
                        width,
                        height,
                        content: src,
                        style: {
                          backgroundColor: 'transparent',
                          borderColor: '#374151',
                          borderWidth: 0,
                          borderStyle: 'solid',
                          borderRadius: 8,
                          fontSize: 14,
                          color: '#374151',
                          opacity: 1
                        }
                      }
                      setElements(prev => [...prev, newElement])
                      setSelectedTool('select')
                    }
                    reader.readAsDataURL(file)
                    // reset input so the same file can be selected again
                    e.currentTarget.value = ''
                  }}
                />
              </label>
            </button>
            
            {/* Eraser Tool */}
            <button 
              onClick={() => setSelectedTool('eraser')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'eraser' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>
            
            {/* More Shapes */}
            <button className="p-2 rounded hover:bg-gray-100 transition-colors" title="More Shapes">
              <Shapes className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Separator */}
            <div className="w-px h-8 bg-gray-300 mx-2"></div>
            
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Canvas Settings */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">W:</label>
                <input
                  type="number"
                  value={canvas.width}
                  onChange={(e) => setCanvas({ ...canvas, width: parseInt(e.target.value) })}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">H:</label>
                <input
                  type="number"
                  value={canvas.height}
                  onChange={(e) => setCanvas({ ...canvas, height: parseInt(e.target.value) })}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">BG:</label>
                <input
                  type="color"
                  value={canvas.backgroundColor}
                  onChange={(e) => setCanvas({ ...canvas, backgroundColor: e.target.value })}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Canvas and Properties Container */}
          <div className="flex flex-1 overflow-hidden">
            {/* Canvas */}
            <div className="flex-1 relative bg-gray-100 overflow-auto">
              <div 
                id="wireframe-canvas-layer"
                className="relative w-full h-full"
                style={{ 
                  backgroundColor: canvas.backgroundColor,
                  transform: `scale(${zoom}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                  transformOrigin: 'top left'
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
                  <div key={element.id}>
                    {element.type === 'arrow' ? (
                      <div
                        className={`absolute cursor-pointer ${
                          selectedElement === element.id ? 'ring-2 ring-primary-500' : ''
                        } ${isDragging && dragElement === element.id ? 'z-10' : ''}`}
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width,
                          height: element.height,
                          transform: `rotate(${element.rotation || 0}deg)`,
                          transformOrigin: 'center',
                          pointerEvents: 'auto'
                        }}
                        onClick={() => setSelectedElement(element.id)}
                      >
                        {renderArrow(element)}
                        {selectedElement === element.id && (
                          <>
                            <button
                              onClick={() => removeElement(element.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            {/* Rotate Handle (top-left) */}
                            <div
                              className="absolute -top-4 -left-4 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-grab z-20"
                              onMouseDown={(ev) => {
                                ev.stopPropagation()
                                const cx = element.x + element.width / 2
                                const cy = element.y + element.height / 2
                                const doc = (ev.currentTarget as HTMLDivElement).ownerDocument
                                const canvasEl = doc.getElementById('wireframe-canvas-layer') as HTMLDivElement | null
                                const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect
                                const mx = ev.clientX - rect.left
                                const my = ev.clientY - rect.top
                                const startAngle = Math.atan2(my - cy, mx - cx)
                                setIsRotating(true)
                                setRotateElementId(element.id)
                                setRotateData({ cx, cy, startAngle, initialRotation: element.rotation || 0 })
                              }}
                            />
                            {/* Resize Handles */}
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize" />
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize" />
                            <div className="absolute top-1/2 transform -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-w-resize" />
                            <div className="absolute top-1/2 transform -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-e-resize" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize" />
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize" />
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize" />
                          </>
                        )}
                      </div>
                    ) : element.type === 'line' ? (
                      <div
                        className={`absolute cursor-pointer ${
                          selectedElement === element.id ? 'ring-2 ring-primary-500' : ''
                        } ${isDragging && dragElement === element.id ? 'z-10' : ''}`}
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width,
                          height: element.height,
                          transform: `rotate(${element.rotation || 0}deg)`,
                          transformOrigin: 'center',
                          pointerEvents: 'auto'
                        }}
                        onClick={() => setSelectedElement(element.id)}
                      >
                        {renderLine(element)}
                        {selectedElement === element.id && (
                          <>
                            <button
                              onClick={() => removeElement(element.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            {/* Rotate Handle (top-left) */}
                            <div
                              className="absolute -top-4 -left-4 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-grab z-20"
                              onMouseDown={(ev) => {
                                ev.stopPropagation()
                                const cx = element.x + element.width / 2
                                const cy = element.y + element.height / 2
                                const doc = (ev.currentTarget as HTMLDivElement).ownerDocument
                                const canvasEl = doc.getElementById('wireframe-canvas-layer') as HTMLDivElement | null
                                const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect
                                const mx = ev.clientX - rect.left
                                const my = ev.clientY - rect.top
                                const startAngle = Math.atan2(my - cy, mx - cx)
                                setIsRotating(true)
                                setRotateElementId(element.id)
                                setRotateData({ cx, cy, startAngle, initialRotation: element.rotation || 0 })
                              }}
                            />
                            {/* Resize Handles */}
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize" />
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize" />
                            <div className="absolute top-1/2 transform -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-w-resize" />
                            <div className="absolute top-1/2 transform -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-e-resize" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize" />
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize" />
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize" />
                          </>
                        )}
                      </div>
                    ) : element.type === 'pencil' ? (
                      <div
                        className={`absolute cursor-pointer ${
                          selectedElement === element.id ? 'ring-2 ring-primary-500' : ''
                        } ${isDragging && dragElement === element.id ? 'z-10' : ''}`}
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width,
                          height: element.height,
                          transform: `rotate(${element.rotation || 0}deg)`,
                          transformOrigin: 'center',
                          pointerEvents: 'auto'
                        }}
                        onClick={() => setSelectedElement(element.id)}
                      >
                        {renderPencil(element)}
                        {selectedElement === element.id && (
                          <>
                            <button
                              onClick={() => removeElement(element.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            {/* Rotate Handle (top-left) */}
                            <div
                              className="absolute -top-4 -left-4 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-grab z-20"
                              onMouseDown={(ev) => {
                                ev.stopPropagation()
                                const cx = element.x + element.width / 2
                                const cy = element.y + element.height / 2
                                const doc = (ev.currentTarget as HTMLDivElement).ownerDocument
                                const canvasEl = doc.getElementById('wireframe-canvas-layer') as HTMLDivElement | null
                                const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect
                                const mx = ev.clientX - rect.left
                                const my = ev.clientY - rect.top
                                const startAngle = Math.atan2(my - cy, mx - cx)
                                setIsRotating(true)
                                setRotateElementId(element.id)
                                setRotateData({ cx, cy, startAngle, initialRotation: element.rotation || 0 })
                              }}
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute cursor-pointer ${
                          selectedElement === element.id ? 'ring-2 ring-primary-500' : ''
                        } ${isDragging && dragElement === element.id ? 'z-10' : ''}`}
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width,
                          height: element.height,
                          transform: `rotate(${element.rotation || 0}deg)`,
                          transformOrigin: 'center',
                          backgroundColor: element.type === 'diamond' ? 'transparent' : element.style.backgroundColor,
                          border: element.type === 'diamond' ? 'none' : `${element.style.borderWidth}px ${element.style.borderStyle || 'solid'} ${element.style.borderColor}`,
                          borderRadius: element.type === 'circle' ? '50%' : element.style.borderRadius,
                          fontSize: element.style.fontSize,
                          color: element.style.color,
                          fontWeight: element.style.fontWeight,
                          fontStyle: element.style.fontStyle,
                          textDecoration: element.style.textDecoration,
                          fontFamily: element.style.fontFamily,
                          textAlign: element.style.textAlign,
                          opacity: element.style.opacity ?? 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={() => setSelectedElement(element.id)}
                      >
                        {element.type === 'diamond' ? (
                          <>
                            {/* Border layer */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: element.style.borderColor,
                                WebkitClipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                                clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                                opacity: element.style.opacity ?? 1
                              }}
                            />
                            {/* Fill layer (simulates border by insetting) */}
                            <div
                              style={{
                                position: 'absolute',
                                left: element.style.borderWidth,
                                top: element.style.borderWidth,
                                right: element.style.borderWidth,
                                bottom: element.style.borderWidth,
                                backgroundColor: element.style.backgroundColor,
                                WebkitClipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                                clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                                opacity: element.style.opacity ?? 1
                              }}
                            />
                          </>
                        ) : element.type === 'image' ? (
                          element.content ? (
                            <img
                              src={element.content}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: element.style.borderRadius
                              }}
                              draggable={false}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500 text-xs select-none">
                              <Image className="w-5 h-5 mb-1" />
                              <span>Image</span>
                            </div>
                          )
                        ) : (
                          element.content
                        )}
                        {selectedElement === element.id && (
                          <>
                            <button
                              onClick={() => removeElement(element.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            {/* Rotate Handle (top-left) */}
                            <div
                              className="absolute -top-4 -left-4 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-grab z-20"
                              onMouseDown={(ev) => {
                                ev.stopPropagation()
                                const cx = element.x + element.width / 2
                                const cy = element.y + element.height / 2
                                const doc = (ev.currentTarget as HTMLDivElement).ownerDocument
                                const canvasEl = doc.getElementById('wireframe-canvas-layer') as HTMLDivElement | null
                                const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect
                                const mx = ev.clientX - rect.left
                                const my = ev.clientY - rect.top
                                const startAngle = Math.atan2(my - cy, mx - cx)
                                setIsRotating(true)
                                setRotateElementId(element.id)
                                setRotateData({ cx, cy, startAngle, initialRotation: element.rotation || 0 })
                              }}
                            />
                            {/* Resize Handles */}
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize" />
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize" />
                            <div className="absolute top-1/2 transform -translate-y-1/2 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-w-resize" />
                            <div className="absolute top-1/2 transform -translate-y-1/2 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-e-resize" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize" />
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize" />
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize" />
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>
                ))}

                {/* Temporary Element (Drawing Preview) */}
                {tempElement && (
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-30"
                    style={{
                      left: tempElement.x,
                      top: tempElement.y,
                      width: tempElement.width,
                      height: tempElement.height,
                      backgroundColor: tempElement.style.backgroundColor,
                      border: `${tempElement.style.borderWidth}px solid ${tempElement.style.borderColor}`,
                      borderRadius: tempElement.type === 'circle' ? '50%' : tempElement.style.borderRadius,
                      fontSize: tempElement.style.fontSize,
                      color: tempElement.style.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}
                  >
                    {tempElement.type === 'arrow' ? (
                      <svg
                        style={{
                          width: tempElement.width,
                          height: tempElement.height,
                          pointerEvents: 'none'
                        }}
                        viewBox={`0 0 ${tempElement.width} ${tempElement.height}`}
                      >
                        {/* Arrow line */}
                        <line
                          x1={tempElement.sx}
                          y1={tempElement.sy}
                          x2={tempElement.ex}
                          y2={tempElement.ey}
                          stroke={tempElement.style.borderColor || '#3B82F6'}
                          strokeWidth={Math.max(1, tempElement.style.borderWidth || 2)}
                          strokeLinecap="round"
                          strokeDasharray={
                            tempElement.style.borderStyle === 'dashed' 
                              ? `${Math.max(1, tempElement.style.borderWidth || 2) * 8},${Math.max(1, tempElement.style.borderWidth || 2) * 4}`
                              : tempElement.style.borderStyle === 'dotted'
                              ? `${Math.max(1, tempElement.style.borderWidth || 2) * 2},${Math.max(1, tempElement.style.borderWidth || 2) * 4}`
                              : undefined
                          }
                        />
                        {/* Arrowhead */}
                        <polygon
                          points={`${(tempElement.ex || 0) - 10},${(tempElement.ey || 0) - 5} ${tempElement.ex || 0},${tempElement.ey || 0} ${(tempElement.ex || 0) - 10},${(tempElement.ey || 0) + 5}`}
                          fill={tempElement.style.borderColor || '#3B82F6'}
                          opacity="0.7"
                        />
                      </svg>
                    ) : tempElement.type === 'line' ? (
                      <svg
                        style={{
                          width: tempElement.width,
                          height: tempElement.height,
                          pointerEvents: 'none'
                        }}
                        viewBox={`0 0 ${tempElement.width} ${tempElement.height}`}
                      >
                        {/* Line */}
                        <line
                          x1={tempElement.sx}
                          y1={tempElement.sy}
                          x2={tempElement.ex}
                          y2={tempElement.ey}
                          stroke={tempElement.style.borderColor || '#3B82F6'}
                          strokeWidth={Math.max(1, tempElement.style.borderWidth || 2)}
                          strokeLinecap="round"
                          strokeDasharray={
                            tempElement.style.borderStyle === 'dashed' 
                              ? `${Math.max(1, tempElement.style.borderWidth || 2) * 8},${Math.max(1, tempElement.style.borderWidth || 2) * 4}`
                              : tempElement.style.borderStyle === 'dotted'
                              ? `${Math.max(1, tempElement.style.borderWidth || 2) * 2},${Math.max(1, tempElement.style.borderWidth || 2) * 4}`
                              : undefined
                          }
                        />
                      </svg>
                    ) : tempElement.type === 'image' ? (
                      tempElement.content ? (
                        <img
                          src={tempElement.content}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: tempElement.style.borderRadius
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-500 text-xs select-none w-full h-full">
                          <Image className="w-5 h-5 mb-1" />
                          <span>Image</span>
                        </div>
                      )
                    ) : (
                      tempElement.content
                    )}
                  </div>
                )}

                {/* Canvas Mouse Event Handlers */}
                <div 
                  className={`absolute inset-0 ${
                    selectedTool === 'pencil' ? 'cursor-crosshair' : 
                    selectedTool === 'eraser' ? 'cursor-pointer' : 
                    selectedTool === 'hand' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') :
                    selectedTool === 'select' ? (
                      isDragging ? 'cursor-grabbing' : 
                      hoveredElement ? 'cursor-grab' : 
                      'cursor-default'
                    ) : 
                    'cursor-default'
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    handleMouseUp()
                    setHoveredElement(null)
                  }}
                />

                {/* Pencil Drawing Preview */}
                {isPenciling && pencilPoints.length > 1 && (
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  >
                    <path
                      d={pencilPoints.map((point, index) => 
                        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
                      ).join(' ')}
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      strokeDasharray="16,8"
                    />
                  </svg>
                )}

                {/* Eraser Circle Preview */}
                {selectedTool === 'eraser' && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: eraserPos.x - eraserRadius,
                      top: eraserPos.y - eraserRadius,
                      width: eraserRadius * 2,
                      height: eraserRadius * 2,
                      borderRadius: '50%',
                      border: '2px solid rgba(59, 130, 246, 0.6)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }}
                  />
                )}
              </div>
            </div>

            {/* Properties Panel */}
            {selectedElement && (
              <div className="w-80 h-full overflow-y-auto bg-gray-50/80 backdrop-blur-sm border-l border-gray-200 p-5">
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
                  
                  {/* Text Styles */}
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                      <input
                        type="number"
                        min="8"
                        max="72"
                        value={elements.find(e => e.id === selectedElement)?.style.fontSize || 14}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            fontSize: parseInt(e.target.value) || 12
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Colors Row: Text, Background, Stroke */}
                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-3 gap-2">
                    {/* Text Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                      <input
                        type="color"
                        value={elements.find(e => e.id === selectedElement)?.style.color || '#374151'}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            color: e.target.value
                          }
                        })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    {/* Background Color (hidden for images) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bg</label>
                      {elements.find(e => e.id === selectedElement)?.type !== 'image' ? (
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
                      ) : (
                        <div className="h-8 w-full border border-dashed border-gray-300 rounded text-[11px] flex items-center justify-center text-gray-400 select-none">N/A</div>
                      )}
                    </div>
                    {/* Stroke Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stroke</label>
                      <input
                        type="color"
                        value={elements.find(e => e.id === selectedElement)?.style.borderColor || '#374151'}
                        onChange={(e) => updateElement(selectedElement, {
                          style: {
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            borderColor: e.target.value
                          }
                        })}
                        className="w-full h-8 border border-gray-300 rounded"
                      />
                    </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.fontWeight || 'normal'}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            fontWeight: e.target.value as 'normal' | 'bold' | 'lighter' | 'bolder'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="lighter">Light</option>
                        <option value="bolder">Bolder</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.fontStyle || 'normal'}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            fontStyle: e.target.value as 'normal' | 'italic'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Decoration</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.textDecoration || 'none'}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            textDecoration: e.target.value as 'none' | 'underline' | 'line-through'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="none">None</option>
                        <option value="underline">Underline</option>
                        <option value="line-through">Strike</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.fontFamily || 'Inter, system-ui, Arial'}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            fontFamily: e.target.value
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="Inter, system-ui, Arial">Inter / System</option>
                        <option value="Arial, Helvetica, sans-serif">Arial</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Courier New, monospace">Courier New</option>
                        <option value="Times New Roman, serif">Times</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alignment</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.textAlign || 'center'}
                        onChange={(e) => updateElement(selectedElement, { 
                          style: { 
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            textAlign: e.target.value as 'left' | 'center' | 'right'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
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

                  

                  {/* Border Width - For shapes and images (not lines/arrows) */}
                  {elements.find(e => e.id === selectedElement)?.type !== 'line' && 
                   elements.find(e => e.id === selectedElement)?.type !== 'arrow' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Border Width</label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={elements.find(e => e.id === selectedElement)?.style.borderWidth || 1}
                          onChange={(e) => updateElement(selectedElement, {
                            style: {
                              ...elements.find(el => el.id === selectedElement)?.style!,
                              borderWidth: parseInt(e.target.value)
                            }
                          })}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={elements.find(e => e.id === selectedElement)?.style.borderWidth || 1}
                          onChange={(e) => updateElement(selectedElement, {
                            style: {
                              ...elements.find(el => el.id === selectedElement)?.style!,
                              borderWidth: parseInt(e.target.value) || 0
                            }
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="0-20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Stroke Width - Only for lines and arrows */}
                  {(elements.find(e => e.id === selectedElement)?.type === 'line' || 
                    elements.find(e => e.id === selectedElement)?.type === 'arrow') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stroke Width</label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="16"
                          value={elements.find(e => e.id === selectedElement)?.style.borderWidth || 2}
                          onChange={(e) => updateElement(selectedElement, {
                            style: {
                              ...elements.find(el => el.id === selectedElement)?.style!,
                              borderWidth: parseInt(e.target.value)
                            }
                          })}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min="1"
                          max="16"
                          value={elements.find(e => e.id === selectedElement)?.style.borderWidth || 2}
                          onChange={(e) => updateElement(selectedElement, {
                            style: {
                              ...elements.find(el => el.id === selectedElement)?.style!,
                              borderWidth: parseInt(e.target.value) || 1
                            }
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="1-16"
                        />
                      </div>
                    </div>
                  )}

                  {/* Border Style - For shapes and images */}
                  {elements.find(e => e.id === selectedElement)?.type !== 'line' && 
                   elements.find(e => e.id === selectedElement)?.type !== 'arrow' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Border Style</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.borderStyle || 'solid'}
                        onChange={(e) => updateElement(selectedElement, {
                          style: {
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </div>
                  )}

                  {/* Stroke Style - Only for lines and arrows */}
                  {(elements.find(e => e.id === selectedElement)?.type === 'line' || 
                    elements.find(e => e.id === selectedElement)?.type === 'arrow') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stroke Style</label>
                      <select
                        value={elements.find(e => e.id === selectedElement)?.style.borderStyle || 'solid'}
                        onChange={(e) => updateElement(selectedElement, {
                          style: {
                            ...elements.find(el => el.id === selectedElement)?.style!,
                            borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted'
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </div>
                  )}

                  {/* Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(((elements.find(e => e.id === selectedElement)?.style.opacity ?? 1) * 100))}
                      onChange={(e) => updateElement(selectedElement, {
                        style: {
                          ...elements.find(el => el.id === selectedElement)?.style!,
                          opacity: parseInt(e.target.value) / 100
                        }
                      })}
                      className="w-full"
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
    </div>
  )
}



