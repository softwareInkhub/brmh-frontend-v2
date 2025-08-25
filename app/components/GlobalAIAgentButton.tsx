'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import { useDrop } from 'react-dnd';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useNamespaceContext } from './NamespaceContext';

// Dynamically import AIAgentWorkspace to prevent SSR issues
const AIAgentWorkspace = dynamic(() => import('../namespace/components/AIAgentWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8">
        <div className="flex items-center gap-3">
          <Bot className="text-blue-500 animate-pulse" size={24} />
          <span>Loading AI Agent Workspace...</span>
        </div>
      </div>
    </div>
  )
});

interface GlobalAIAgentButtonProps {
  isVisible?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const GlobalAIAgentButton: React.FC<GlobalAIAgentButtonProps> = ({ isVisible = true, onOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [droppedNamespace, setDroppedNamespace] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const { currentNamespace, getCurrentNamespaceContext } = useNamespaceContext();

  // Drop zone for namespace
  const [{ isOver }, drop] = useDrop({
    accept: 'namespace',
    drop: (item: any) => {
      console.log('Drop function called with item:', item);
      console.log('Namespace dropped:', item.namespace);
      setDroppedNamespace(item.namespace);
      setIsOpen(true);
      setIsDragOver(false);
      
      // Show success toast
      if (item.namespace && item.namespace['namespace-name']) {
        toast.success(`AI Agent context set to: ${item.namespace['namespace-name']}`, {
          description: 'You can now ask questions about this namespace',
          duration: 3000,
        });
      }
    },
    hover: () => {
      console.log('Hovering over drop zone');
      setIsDragOver(true);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Connect the drop ref
  drop(dropRef);
  
  // Debug logging
  useEffect(() => {
    console.log('Drop zone isOver:', isOver);
    console.log('Drop zone isDragOver:', isDragOver);
  }, [isOver, isDragOver]);

  const handleOpenAIAgent = () => {
    // Get current namespace context if available
    const contextNamespace = getCurrentNamespaceContext();
    console.log('Opening AI Agent, current namespace context:', contextNamespace);
    if (contextNamespace && !droppedNamespace) {
      console.log('Using current namespace context:', contextNamespace);
      setDroppedNamespace(contextNamespace);
      toast.success(`AI Agent opened with current namespace: ${contextNamespace['namespace-name']}`, {
        description: 'Using current namespace context',
        duration: 3000,
      });
    } else {
      console.log('No current namespace context or already has dropped namespace');
    }
    setIsOpen(true);
    onOpen?.();
  };

  const handleCloseAIAgent = () => {
    setIsOpen(false);
    setDroppedNamespace(null);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Global Floating AI Agent Button */}
      <div
        ref={dropRef}
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
          isDragOver ? 'scale-110' : 'scale-100'
        }`}
        style={{ 
          border: isDragOver ? '3px dashed #8b5cf6' : 'none',
          borderRadius: '50%',
          padding: isDragOver ? '3px' : '0px'
        }}
      >
        <button
          onClick={handleOpenAIAgent}
          className={`group relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-300 ${
            isDragOver
              ? 'bg-purple-600 shadow-purple-500/50 scale-110 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/50 hover:shadow-blue-500/70'
          }`}
          title={currentNamespace 
            ? `AI Agent Workspace - Click to open with: ${currentNamespace['namespace-name']}`
            : "AI Agent Workspace (Drag a namespace here for context)"
          }
        >
          {/* Drag indicator */}
          {isDragOver && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          )}
          
          <Bot className="w-7 h-7 text-white" />
          
          {/* Test button for debugging */}
          <div
            onClick={() => {
              const testNamespace = {
                'namespace-id': 'test-123',
                'namespace-name': 'Test Namespace'
              };
              console.log('Test drop with namespace:', testNamespace);
              setDroppedNamespace(testNamespace);
              setIsOpen(true);
              toast.success(`AI Agent context set to: ${testNamespace['namespace-name']}`, {
                description: 'Test drop successful',
                duration: 3000,
              });
            }}
            className="absolute -top-8 left-0 text-xs bg-red-500 text-white px-2 py-1 rounded opacity-50 hover:opacity-100 cursor-pointer"
            title="Test drop"
          >
            Test
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            AI Agent Workspace
            <div className="text-xs text-gray-300 mt-1">
              {currentNamespace 
                ? `Click to open with: ${currentNamespace['namespace-name']}`
                : 'Drag a namespace here for context'
              }
            </div>
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      </div>

      {/* AI Agent Workspace - Right Side Panel */}
      {isOpen && (
        <AIAgentWorkspace
          key={droppedNamespace ? `namespace-${droppedNamespace['namespace-id'] || droppedNamespace['namespace-name']}` : 'no-namespace'}
          namespace={droppedNamespace}
          onClose={handleCloseAIAgent}
        />
      )}
    </>
  );
};

export default GlobalAIAgentButton;
