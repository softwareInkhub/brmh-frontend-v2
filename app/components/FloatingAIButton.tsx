import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import EnhancedLLMTerminal from './EnhancedLLMTerminal';

const FloatingAIButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-8 right-8 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg w-16 h-16 flex items-center justify-center transition-all focus:outline-none focus:ring-4 focus:ring-purple-300 floating-ai-btn"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-8 h-8" />
        </button>
      )}
      <EnhancedLLMTerminal open={open} setOpen={setOpen} />
      <style jsx global>{`
        @media (max-width: 600px) {
          .floating-ai-btn {
            bottom: 80px !important;
            right: 16px !important;
            width: 56px !important;
            height: 56px !important;
          }
        }
      `}</style>
    </>
  );
};

export default FloatingAIButton; 