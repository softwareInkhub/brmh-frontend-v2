'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Workflow, 
  Layout, 
  Database, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  Download,
  Share2,
  Eye,
  Settings,
  FolderOpen,
  BookOpen,
  Code,
  Palette,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import WorkflowEditor from './components/WorkflowEditor'
import WireframeEditor from './components/WireframeEditor'
import DocumentationEditor from './components/DocumentationEditor'
import DocsSidebar from './components/DocsSidebar'

interface Namespace {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  documents: {
    workflows: number
    wireframes: number
    schemas: number
    documentation: number
  }
}

interface Document {
  id: string
  name: string
  type: 'workflow' | 'wireframe' | 'schema' | 'documentation'
  namespaceId: string
  content: any
  createdAt: string
  updatedAt: string
}

export default function DocsPage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeTab, setActiveTab] = useState<'workflow' | 'wireframe' | 'schema' | 'documentation'>('workflow')
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false)
  const [showWireframeEditor, setShowWireframeEditor] = useState(false)
  const [showDocumentationEditor, setShowDocumentationEditor] = useState(false)

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Mock namespaces
    setNamespaces([
      { 
        id: '1', 
        name: 'E-commerce API', 
        description: 'Complete e-commerce system', 
        createdAt: '2024-01-01', 
        updatedAt: '2024-01-15',
        documents: { workflows: 3, wireframes: 2, schemas: 5, documentation: 4 }
      },
      { 
        id: '2', 
        name: 'User Management', 
        description: 'User authentication and profiles', 
        createdAt: '2024-01-02', 
        updatedAt: '2024-01-10',
        documents: { workflows: 1, wireframes: 3, schemas: 2, documentation: 2 }
      },
      { 
        id: '3', 
        name: 'Payment Gateway', 
        description: 'Payment processing system', 
        createdAt: '2024-01-03', 
        updatedAt: '2024-01-12',
        documents: { workflows: 2, wireframes: 1, schemas: 3, documentation: 1 }
      }
    ])

    // Mock documents
    setDocuments([
      { id: '1', name: 'Order Processing Flow', type: 'workflow', namespaceId: '1', content: {}, createdAt: '2024-01-05', updatedAt: '2024-01-15' },
      { id: '2', name: 'User Dashboard Wireframe', type: 'wireframe', namespaceId: '2', content: {}, createdAt: '2024-01-06', updatedAt: '2024-01-10' },
      { id: '3', name: 'Product Schema', type: 'schema', namespaceId: '1', content: {}, createdAt: '2024-01-07', updatedAt: '2024-01-12' }
    ])
  }, [])

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const filteredDocuments = documents.filter(doc => 
    doc.namespaceId === selectedNamespace && 
    doc.type === activeTab &&
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'workflow': return <Workflow className="w-4 h-4" />
      case 'wireframe': return <Layout className="w-4 h-4" />
      case 'schema': return <Database className="w-4 h-4" />
      case 'documentation': return <FileText className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getDocumentColor = (type: string) => {
    switch (type) {
      case 'workflow': return 'text-blue-600 bg-blue-50'
      case 'wireframe': return 'text-purple-600 bg-purple-50'
      case 'schema': return 'text-green-600 bg-green-50'
      case 'documentation': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const handleCreateDocument = (type?: 'workflow' | 'wireframe' | 'schema' | 'documentation') => {
    const documentType = type || activeTab as 'workflow' | 'wireframe' | 'schema' | 'documentation'
    
    // Create a new document
    const newDocument: Document = {
      id: `doc-${Date.now()}`,
      name: `New ${documentType.slice(0, -1)}`,
      type: documentType,
      namespaceId: selectedNamespace || '1', // Default to first namespace if none selected
      content: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setEditingDocument(newDocument)
    
    switch (documentType) {
      case 'workflow':
        setShowWorkflowEditor(true)
        break
      case 'wireframe':
        setShowWireframeEditor(true)
        break
      case 'documentation':
        setShowDocumentationEditor(true)
        break
      case 'schema':
        // For schemas, we can reuse the existing schema creation from namespace
        window.location.href = '/namespace'
        break
    }
  }

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document)
    switch (document.type) {
      case 'workflow':
        setShowWorkflowEditor(true)
        break
      case 'wireframe':
        setShowWireframeEditor(true)
        break
      case 'documentation':
        setShowDocumentationEditor(true)
        break
      case 'schema':
        window.location.href = `/namespace?schema=${document.id}`
        break
    }
  }

  const handleSaveDocument = (documentData: any) => {
    const newDocument: Document = {
      id: documentData.id,
      name: documentData.name,
      type: activeTab,
      namespaceId: selectedNamespace,
      content: documentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (editingDocument) {
      setDocuments(documents.map(doc => 
        doc.id === editingDocument.id ? { ...newDocument, createdAt: doc.createdAt } : doc
      ))
    } else {
      setDocuments([...documents, newDocument])
    }

    setEditingDocument(null)
    setShowWorkflowEditor(false)
    setShowWireframeEditor(false)
    setShowDocumentationEditor(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      {/* <div className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-10 shadow-lg">
        <div className="max-w-8xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-105 transition-all duration-300">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  Documentation Center
                </h1>
                <p className="text-xs text-gray-600 mt-1 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Create, manage, and organize your project documentation
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                Export
              </button>
              <button className="px-6 py-3 bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                <Share2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div> */}

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <DocsSidebar
          namespaces={namespaces}
          selectedNamespace={selectedNamespace}
          onNamespaceSelect={setSelectedNamespace}
          onCreateDocument={handleCreateDocument}
          onSearch={setSearchTerm}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Show Editor if active */}
          {showWorkflowEditor && (
            <WorkflowEditor
              isOpen={true}
              onClose={() => {
                setShowWorkflowEditor(false)
                setEditingDocument(null)
              }}
              workflow={editingDocument?.type === 'workflow' ? editingDocument.content : undefined}
              onSave={handleSaveDocument}
            />
          )}

          {showWireframeEditor && (
            <WireframeEditor
              isOpen={true}
              onClose={() => {
                setShowWireframeEditor(false)
                setEditingDocument(null)
              }}
              wireframe={editingDocument?.type === 'wireframe' ? editingDocument.content : undefined}
              onSave={handleSaveDocument}
            />
          )}

          {showDocumentationEditor && (
            <DocumentationEditor
              isOpen={true}
              onClose={() => {
                setShowDocumentationEditor(false)
                setEditingDocument(null)
              }}
              documentation={editingDocument?.type === 'documentation' ? editingDocument.content : undefined}
              onSave={handleSaveDocument}
            />
          )}

            {/* Show Document List if no editor is active */}
            {!showWorkflowEditor && !showWireframeEditor && !showDocumentationEditor && (
              <div className="p-8">
                {selectedNamespace ? (
                  <div className="space-y-8">
                    {/* Search and Actions */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                            {namespaces.find(n => n.id === selectedNamespace)?.name}
                          </h2>
                          <p className="text-gray-600 mt-1 capitalize">{activeTab} Collection</p>
                        </div>
                        <button 
                          onClick={() => handleCreateDocument()}
                          className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                          Create {activeTab.slice(0, -1)}
                        </button>
                      </div>
                      
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder={`Search ${activeTab}...`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-white/50 backdrop-blur-sm transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Documents Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredDocuments.map((document, index) => (
                        <motion.div
                          key={document.id}
                          initial={{ opacity: 0, y: 30, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 transform"
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className={`p-3 rounded-xl ${getDocumentColor(document.type)} shadow-lg`}>
                              {getDocumentIcon(document.type)}
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200">
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button 
                                onClick={() => handleEditDocument(document)}
                                className="p-2 hover:bg-green-50 rounded-lg transition-colors duration-200"
                              >
                                <Edit className="w-4 h-4 text-green-600" />
                              </button>
                              <button className="p-2 hover:bg-red-50 rounded-lg transition-colors duration-200">
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">{document.name}</h3>
                          <p className="text-sm text-gray-600 mb-6 flex items-center">
                            <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                            Last updated {new Date(document.updatedAt).toLocaleDateString()}
                          </p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <button 
                              onClick={() => handleEditDocument(document)}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                            >
                              Open Document →
                            </button>
                            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                              <Download className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {filteredDocuments.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-16 text-center"
                      >
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            {getDocumentIcon(activeTab)}
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                          No {activeTab} found
                        </h3>
                        <p className="text-gray-600 mb-8 text-lg">
                          {searchTerm ? 'Try adjusting your search terms' : `Create your first ${activeTab.slice(0, -1)} to get started`}
                        </p>
                        <button 
                          onClick={() => handleCreateDocument()}
                          className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                        >
                          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                          Create {activeTab.slice(0, -1)}
                        </button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-16 text-center"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center">
                        <FolderOpen className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                      Select a Namespace
                    </h3>
                    <p className="text-gray-600 text-lg">
                      Choose a namespace from the sidebar to view and manage its documents
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </div>
      </div>

    </div>
  )
}
