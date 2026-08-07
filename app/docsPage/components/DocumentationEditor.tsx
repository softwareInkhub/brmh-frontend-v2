'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Save, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Link,
  Image as ImageIcon,
  Table,
  Quote,
  Download,
  Share2,
  Eye,
  FileText,
  Search,
  BookOpen,
  Palette
} from 'lucide-react'

interface DocumentationSection {
  id: string
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'table' | 'image' | 'quote'
  content: string
  level?: number
  items?: string[]
  metadata?: Record<string, any>
  language?: string
  tableData?: string[][]
  style?: {
    fontSize?: number
    fontFamily?: string
    fontWeight?: 'normal' | 'bold' | 'lighter'
    fontStyle?: 'normal' | 'italic' | 'oblique' | 'inherit' | 'initial' | 'unset' | 'revert'
    textDecoration?: 'none' | 'underline' | 'line-through'
    color?: string
    backgroundColor?: string
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    lineHeight?: number
    letterSpacing?: number
    marginTop?: number
    marginBottom?: number
    padding?: number
    borderWidth?: number
    borderColor?: string
    borderRadius?: number
  }
}

interface DocumentationEditorProps {
  isOpen: boolean
  onClose: () => void
  documentation?: {
    id: string
    name: string
    sections: DocumentationSection[]
    metadata: {
      author: string
      version: string
      lastModified: string
      tags: string[]
    }
  }
  onSave: (documentation: any) => void
}

export default function DocumentationEditor({ isOpen, onClose, documentation, onSave }: DocumentationEditorProps) {
  const [docName, setDocName] = useState(documentation?.name || '')
  const [sections, setSections] = useState<DocumentationSection[]>(documentation?.sections || [])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showMetadata, setShowMetadata] = useState(false)
  const [metadata, setMetadata] = useState({
    author: documentation?.metadata?.author || '',
    version: documentation?.metadata?.version || '1.0.0',
    lastModified: documentation?.metadata?.lastModified || new Date().toISOString(),
    tags: documentation?.metadata?.tags || []
  })

  const addSection = (type: DocumentationSection['type'], afterId?: string) => {
    const newSection: DocumentationSection = {
      id: `section-${Date.now()}`,
      type,
                          content: type === 'heading' ? 'New Heading' : type === 'list' ? 'New Item' : type === 'code' ? '' : type === 'table' ? 'Table' : 'New content...',
      level: type === 'heading' ? 1 : undefined,
      items: type === 'list' ? ['New Item'] : undefined,
      language: type === 'code' ? 'javascript' : undefined,
      tableData: type === 'table' ? [['Header 1', 'Header 2', 'Header 3'], ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'], ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3']] : undefined,
      style: {
        fontSize: type === 'heading' ? 24 : 16,
        fontWeight: type === 'heading' ? 'bold' : 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#374151',
        backgroundColor: 'transparent',
        textAlign: 'left',
        lineHeight: 1.5,
        letterSpacing: 0,
        marginTop: 0,
        marginBottom: 16,
        padding: 0,
        borderWidth: 0,
        borderColor: '#D1D5DB',
        borderRadius: 0
      }
    }

    if (afterId) {
      const index = sections.findIndex(s => s.id === afterId)
      const newSections = [...sections]
      newSections.splice(index + 1, 0, newSection)
      setSections(newSections)
    } else {
      setSections([...sections, newSection])
    }
    setSelectedSection(newSection.id)
  }

  const updateSection = (sectionId: string, updates: Partial<DocumentationSection>) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ))
  }

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId))
    setSelectedSection(null)
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId)
    if (index === -1) return

    const newSections = [...sections]
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]]
    } else if (direction === 'down' && index < sections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
    }
    setSections(newSections)
  }

  const getSectionIcon = (type: DocumentationSection['type']) => {
    switch (type) {
      case 'heading': return <Heading1 className="w-4 h-4" />
      case 'paragraph': return <FileText className="w-4 h-4" />
      case 'list': return <List className="w-4 h-4" />
      case 'code': return <Code className="w-4 h-4" />
      case 'table': return <Table className="w-4 h-4" />
      case 'image': return <ImageIcon className="w-4 h-4" />
      case 'quote': return <Quote className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const renderSection = (section: DocumentationSection) => {
    const style = section.style || {}
    const inlineStyle = {
      fontSize: `${style.fontSize || 16}px`,
      fontFamily: style.fontFamily || 'inherit',
      fontWeight: style.fontWeight || 'normal',
      fontStyle: style.fontStyle || 'normal',
      textDecoration: style.textDecoration || 'none',
      color: style.color || '#374151',
      backgroundColor: style.backgroundColor || 'transparent',
      textAlign: style.textAlign || 'left',
      lineHeight: style.lineHeight || 1.5,
      letterSpacing: `${style.letterSpacing || 0}px`,
      marginTop: `${style.marginTop || 0}px`,
      marginBottom: `${style.marginBottom || 16}px`,
      padding: `${style.padding || 0}px`,
      border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || '#D1D5DB'}` : 'none',
      borderRadius: `${style.borderRadius || 0}px`
    }

    switch (section.type) {
      case 'heading':
        const level = section.level || 1
        const HeadingComponent = {
          1: 'h1',
          2: 'h2', 
          3: 'h3',
          4: 'h4',
          5: 'h5',
          6: 'h6'
        }[level] as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        
        return React.createElement(HeadingComponent, { style: inlineStyle }, section.content)
      case 'paragraph':
        return <p style={inlineStyle}>{section.content}</p>
      case 'list':
        return (
          <ul style={inlineStyle} className="list-disc list-inside space-y-1">
            {section.items?.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )
      case 'code':
        return (
          <div className="relative group">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-gray-800 to-gray-700 rounded-t-lg flex items-center px-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
                                      <div className="ml-4 text-xs text-gray-400 font-mono">
                          untitled.js
                        </div>
            </div>
            <pre 
              style={{
                ...inlineStyle,
                backgroundColor: '#1e1e2e',
                color: '#cdd6f4',
                padding: '2rem 1.5rem 1.5rem 1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #313244',
                fontSize: '14px',
                lineHeight: '1.6',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                overflow: 'auto',
                position: 'relative'
              }} 
              className="overflow-x-auto shadow-lg"
            >
                                      <code style={{ color: 'inherit', fontFamily: 'inherit' }}>
                          {section.content.split('\n').map((line, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              minHeight: '1.6em',
                              position: 'relative'
                            }}>
                              <span style={{
                                color: '#6c7086',
                                marginRight: '1rem',
                                userSelect: 'none',
                                fontSize: '12px',
                                minWidth: '2rem',
                                textAlign: 'right'
                              }}>
                                {index + 1}
                              </span>
                              <span style={{ flex: 1 }}>
                                {line || '\u00A0'}
                              </span>
                            </div>
                          ))}
                        </code>
            </pre>
          </div>
        )
      case 'table':
        const tableData = section.tableData || [['No data']]
        return (
          <div className="overflow-x-auto mb-4">
            <table style={inlineStyle} className="min-w-full border-collapse border border-gray-300 shadow-sm">
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex} 
                        className={`border border-gray-300 px-4 py-3 text-sm ${
                          rowIndex === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'quote':
        return (
          <blockquote style={inlineStyle} className="border-l-4 border-blue-500 pl-4">
            {section.content}
          </blockquote>
        )
      default:
        return <p style={inlineStyle}>{section.content}</p>
    }
  }

  const handleSave = () => {
    onSave({
      id: documentation?.id || `doc-${Date.now()}`,
      name: docName,
      sections,
      metadata: {
        ...metadata,
        lastModified: new Date().toISOString()
      }
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Documentation Editor</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Documentation name..."
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-white/80 backdrop-blur-sm text-sm transition-all duration-200 w-48"
              />
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setIsPreview(!isPreview)}
              className={`p-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                isPreview 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
              title={isPreview ? 'Switch to Edit Mode' : 'Switch to Preview Mode'}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 text-xs font-medium"
              title="Share Document"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-all duration-200 text-xs font-medium"
              title="Export Document"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
              title="Save Document"
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
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-4">Sections</h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Section List */}
            <div className="space-y-2 mb-6">
              {sections
                .filter(section => 
                  section.content.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((section) => (
                  <div
                    key={section.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSection === section.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-center space-x-2">
                      {getSectionIcon(section.type)}
                      <span className="text-sm font-medium truncate">
                        {section.content.substring(0, 30)}...
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Add Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Add Section</h4>
              {[
                { type: 'heading', label: 'Heading', icon: Heading1 },
                { type: 'paragraph', label: 'Paragraph', icon: FileText },
                { type: 'list', label: 'List', icon: List },
                { type: 'code', label: 'Code Block', icon: Code },
                { type: 'table', label: 'Table', icon: Table },
                { type: 'quote', label: 'Quote', icon: Quote }
              ].map((sectionType) => (
                <button
                  key={sectionType.type}
                  onClick={() => addSection(sectionType.type as any)}
                  className="w-full flex items-center space-x-2 p-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <sectionType.icon className="w-4 h-4" />
                  <span>{sectionType.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {isPreview ? (
              /* Preview Mode */
              <div className="flex-1 p-8 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  <h1 className="text-3xl font-bold text-gray-900 mb-8">{docName}</h1>
                  <div className="prose prose-lg max-w-none">
                    {sections.map((section) => (
                      <div key={section.id}>
                        {renderSection(section)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="flex-1 p-8 overflow-auto">
                                 <div className="max-w-4xl mx-auto space-y-4">
                  {sections.map((section, index) => (
                                         <div
                       key={section.id}
                       className={`p-3 border-2 rounded-lg transition-colors ${
                         selectedSection === section.id
                           ? 'border-primary-500 bg-primary-50'
                           : 'border-gray-200 hover:border-gray-300'
                       }`}
                       onClick={() => setSelectedSection(section.id)}
                     >
                       {/* Section Header */}
                       <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getSectionIcon(section.type)}
                          <span className="text-sm font-medium text-gray-600">
                            {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSection(section.id, 'up')
                            }}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSection(section.id, 'down')
                            }}
                            disabled={index === sections.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSection(section.id)
                            }}
                            className="p-1 hover:bg-red-100 text-red-600 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                                             {/* Section Content */}
                       <div className="space-y-2">
                        {section.type === 'heading' && (
                          <div>
                            <input
                              type="text"
                              value={section.content}
                              onChange={(e) => updateSection(section.id, { content: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              placeholder="Heading text..."
                            />
                          </div>
                        )}

                        {section.type === 'paragraph' && (
                                                       <textarea
                               value={section.content}
                               onChange={(e) => updateSection(section.id, { content: e.target.value })}
                               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                               rows={3}
                               placeholder="Enter paragraph content..."
                             />
                        )}

                                                 {section.type === 'list' && (
                           <div className="space-y-1">
                            {section.items?.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => {
                                    const newItems = [...(section.items || [])]
                                    newItems[itemIndex] = e.target.value
                                    updateSection(section.id, { items: newItems })
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  placeholder="List item..."
                                />
                                <button
                                  onClick={() => {
                                    const newItems = section.items?.filter((_, i) => i !== itemIndex) || []
                                    updateSection(section.id, { items: newItems })
                                  }}
                                  className="p-1 hover:bg-red-100 text-red-600 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newItems = [...(section.items || []), 'New Item']
                                updateSection(section.id, { items: newItems })
                              }}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              + Add Item
                            </button>
                          </div>
                        )}

                                                 {section.type === 'code' && (
                           <div className="relative">
                             <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-gray-800 to-gray-700 rounded-t-lg flex items-center px-3">
                               <div className="flex space-x-1.5">
                                 <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                 <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                               </div>
                               
                             </div>
                             <textarea
                               value={section.content}
                               onChange={(e) => updateSection(section.id, { content: e.target.value })}
                               className="w-full px-4 py-3 pt-8 border border-gray-300 rounded-lg bg-gray-900 text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                               rows={6}
                                                     placeholder="Enter your code here..."
                               style={{
                                 fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                 lineHeight: '1.6'
                               }}
                             />
                           </div>
                         )}

                                                                          {section.type === 'table' && (
                           <div className="space-y-3">
                             {/* Table Controls */}
                             <div className="flex items-center space-x-3 mb-3">
                               <button
                                 onClick={() => {
                                   const currentData = section.tableData || [['Header 1']]
                                   const newData = [...currentData, new Array(currentData[0]?.length || 1).fill('New Cell')]
                                   updateSection(section.id, { tableData: newData })
                                 }}
                                 className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors"
                               >
                                 + Add Row
                               </button>
                               <button
                                 onClick={() => {
                                   const currentData = section.tableData || [['Header 1']]
                                   const newData = currentData.map(row => [...row, 'New Cell'])
                                   updateSection(section.id, { tableData: newData })
                                 }}
                                 className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                               >
                                 + Add Column
                               </button>
                               <button
                                 onClick={() => {
                                   const currentData = section.tableData || [['Header 1']]
                                   if (currentData.length > 1) {
                                     const newData = currentData.slice(0, -1)
                                     updateSection(section.id, { tableData: newData })
                                   }
                                 }}
                                 disabled={(section.tableData || [['Header 1']]).length <= 1}
                                 className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 - Remove Row
                               </button>
                               <button
                                 onClick={() => {
                                   const currentData = section.tableData || [['Header 1']]
                                   if (currentData[0]?.length > 1) {
                                     const newData = currentData.map(row => row.slice(0, -1))
                                     updateSection(section.id, { tableData: newData })
                                   }
                                 }}
                                 disabled={(section.tableData || [['Header 1']])[0]?.length <= 1}
                                 className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 - Remove Column
                               </button>
                             </div>

                             {/* Interactive Table Editor */}
                             <div className="overflow-x-auto border border-gray-300 rounded-lg">
                               <table className="min-w-full border-collapse">
                                 <tbody>
                                   {(section.tableData || [['Header 1', 'Header 2', 'Header 3']]).map((row, rowIndex) => (
                                     <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                                       {row.map((cell, cellIndex) => (
                                         <td key={cellIndex} className="border border-gray-300 p-0">
                                           <input
                                             type="text"
                                             value={cell}
                                             onChange={(e) => {
                                               const currentData = section.tableData || [['Header 1', 'Header 2', 'Header 3']]
                                               const newData = [...currentData]
                                               newData[rowIndex] = [...newData[rowIndex]]
                                               newData[rowIndex][cellIndex] = e.target.value
                                               updateSection(section.id, { tableData: newData })
                                             }}
                                             className={`w-full px-3 py-2 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                                               rowIndex === 0 ? 'font-semibold bg-gray-50' : 'bg-white'
                                             }`}
                                             placeholder={`Cell ${rowIndex + 1}-${cellIndex + 1}`}
                                           />
                                         </td>
                                       ))}
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>

                             
                           </div>
                         )}

                        {section.type === 'quote' && (
                                                       <textarea
                               value={section.content}
                               onChange={(e) => updateSection(section.id, { content: e.target.value })}
                               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                               rows={2}
                               placeholder="Enter quote..."
                             />
                        )}
                      </div>
                    </div>
                  ))}

                  {sections.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h3>
                      <p className="text-gray-500 mb-6">Start by adding your first section from the sidebar</p>
                      <button
                        onClick={() => addSection('paragraph')}
                        className="btn-primary"
                      >
                        Add First Section
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

                     {/* Right Panel - Styling or Metadata */}
           <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
             <div className="flex items-center justify-between mb-4">
               <div className="flex space-x-2">
                 <button
                   onClick={() => setShowMetadata(false)}
                   className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                     !showMetadata 
                       ? 'bg-blue-100 text-blue-700' 
                       : 'text-gray-600 hover:bg-gray-100'
                   }`}
                 >
                   Styling
                 </button>
                 <button
                   onClick={() => setShowMetadata(true)}
                   className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                     showMetadata 
                       ? 'bg-blue-100 text-blue-700' 
                       : 'text-gray-600 hover:bg-gray-100'
                   }`}
                 >
                   Metadata
                 </button>
               </div>
               {selectedSection && !showMetadata && (
                 <button
                   onClick={() => setSelectedSection(null)}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <X className="w-4 h-4" />
                 </button>
               )}
             </div>
             
             {showMetadata ? (
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                   <input
                     type="text"
                     value={metadata.author}
                     onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                     className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                   <input
                     type="text"
                     value={metadata.version}
                     onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
                     className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                   <input
                     type="text"
                     value={metadata.tags.join(', ')}
                     onChange={(e) => setMetadata({ ...metadata, tags: e.target.value.split(',').map(t => t.trim()) })}
                     className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                     placeholder="tag1, tag2, tag3"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Last Modified</label>
                   <div className="text-sm text-gray-600">
                     {new Date(metadata.lastModified).toLocaleDateString()}
                   </div>
                 </div>
               </div>
             ) : selectedSection ? (
               <div className="space-y-6">
                 {/* Text Formatting */}
                 <div>
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Text Formatting</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Font Size (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.fontSize || 16}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             fontSize: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="8"
                         max="72"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Font Family</label>
                       <select
                         value={sections.find(s => s.id === selectedSection)?.style?.fontFamily || 'inherit'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             fontFamily: e.target.value
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                       >
                         <option value="inherit">Default</option>
                         <option value="Arial, sans-serif">Arial</option>
                         <option value="Helvetica, sans-serif">Helvetica</option>
                         <option value="Times New Roman, serif">Times New Roman</option>
                         <option value="Georgia, serif">Georgia</option>
                         <option value="Verdana, sans-serif">Verdana</option>
                         <option value="Courier New, monospace">Courier New</option>
                         <option value="Comic Sans MS, cursive">Comic Sans MS</option>
                         <option value="Impact, sans-serif">Impact</option>
                         <option value="Lucida Console, monospace">Lucida Console</option>
                         <option value="Tahoma, sans-serif">Tahoma</option>
                       </select>
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Font Weight</label>
                       <select
                         value={sections.find(s => s.id === selectedSection)?.style?.fontWeight || 'normal'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             fontWeight: e.target.value as any
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                       >
                         <option value="normal">Normal</option>
                         <option value="bold">Bold</option>
                         <option value="lighter">Light</option>
                       </select>
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Font Style</label>
                       <select
                         value={sections.find(s => s.id === selectedSection)?.style?.fontStyle || 'normal'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             fontStyle: e.target.value as any
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                       >
                         <option value="normal">Normal</option>
                         <option value="italic">Italic</option>
                         <option value="oblique">Oblique</option>
                         <option value="inherit">Inherit</option>
                         <option value="initial">Initial</option>
                         <option value="unset">Unset</option>
                         <option value="revert">Revert</option>
                       </select>
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Text Decoration</label>
                       <select
                         value={sections.find(s => s.id === selectedSection)?.style?.textDecoration || 'none'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             textDecoration: e.target.value as any
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                       >
                         <option value="none">None</option>
                         <option value="underline">Underline</option>
                         <option value="line-through">Strikethrough</option>
                       </select>
                     </div>
                   </div>
                 </div>

                 {/* Colors */}
                 <div>
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Colors</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Text Color</label>
                       <input
                         type="color"
                         value={sections.find(s => s.id === selectedSection)?.style?.color || '#374151'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             color: e.target.value 
                           }
                         })}
                         className="w-full h-8 border border-gray-300 rounded"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Background Color</label>
                       <input
                         type="color"
                         value={sections.find(s => s.id === selectedSection)?.style?.backgroundColor || '#ffffff'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             backgroundColor: e.target.value 
                           }
                         })}
                         className="w-full h-8 border border-gray-300 rounded"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Layout */}
                 <div>
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Layout</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Text Align</label>
                       <select
                         value={sections.find(s => s.id === selectedSection)?.style?.textAlign || 'left'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             textAlign: e.target.value as any
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                       >
                         <option value="left">Left</option>
                         <option value="center">Center</option>
                         <option value="right">Right</option>
                         <option value="justify">Justify</option>
                       </select>
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Line Height</label>
                       <input
                         type="number"
                         step="0.1"
                         value={sections.find(s => s.id === selectedSection)?.style?.lineHeight || 1.5}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             lineHeight: parseFloat(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="0.5"
                         max="3"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Letter Spacing (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.letterSpacing || 0}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             letterSpacing: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="-5"
                         max="10"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Spacing */}
                 <div>
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Spacing</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Margin Top (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.marginTop || 0}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             marginTop: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="0"
                         max="100"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Margin Bottom (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.marginBottom || 16}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             marginBottom: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="0"
                         max="100"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Padding (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.padding || 0}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             padding: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="0"
                         max="50"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Border */}
                 <div>
                   <h4 className="text-sm font-medium text-gray-700 mb-3">Border</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Border Width (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.borderWidth || 0}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             borderWidth: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="0"
                         max="20"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Border Color</label>
                       <input
                         type="color"
                         value={sections.find(s => s.id === selectedSection)?.style?.borderColor || '#D1D5DB'}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             borderColor: e.target.value 
                           }
                         })}
                         className="w-full h-8 border border-gray-300 rounded"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs text-gray-600 mb-1">Border Radius (px)</label>
                       <input
                         type="number"
                         value={sections.find(s => s.id === selectedSection)?.style?.borderRadius || 0}
                         onChange={(e) => updateSection(selectedSection, { 
                           style: { 
                             ...sections.find(s => s.id === selectedSection)?.style,
                             borderRadius: parseInt(e.target.value) 
                           }
                         })}
                         className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                         min="0"
                         max="50"
                       />
                     </div>
                   </div>
                 </div>
               </div>
             ) : !showMetadata ? (
               <div className="text-center py-8">
                 <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                   <Palette className="w-6 h-6 text-gray-400" />
                 </div>
                 <p className="text-sm text-gray-500">Select a section to customize its styling</p>
               </div>
             ) : null}
           </div>
        </div>
    </div>
  )
}
