import React, { ReactNode } from 'react';

export default function ReusableModal({ open, onClose, title, children, maxWidth = 'max-w-5xl' }: { open: boolean, onClose: () => void, title?: string, children: ReactNode, maxWidth?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-full ${maxWidth} relative z-10 border border-gray-200 max-h-[95vh] overflow-y-auto`}>
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >✕</button>
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
} 