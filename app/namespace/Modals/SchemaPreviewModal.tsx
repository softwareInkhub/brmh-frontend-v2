import React from 'react';

interface SchemaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  schema: any;
  onEdit: (schema: any) => void;
  onDelete: (schema: any) => void;
}

const SchemaPreviewModal: React.FC<SchemaPreviewModalProps> = ({ open, onClose, schema, onEdit, onDelete }) => {
  if (!open || !schema) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0  bg-opacity-30 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-xl relative z-10 border border-gray-200 animate-fade-in">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-2xl font-bold text-gray-900 truncate font-sans" title={schema.schemaName}>{schema.schemaName}</h2>
          <div className="flex items-center gap-2 ml-4">
           
            <button
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
              onClick={() => onEdit(schema)}
              title="Edit"
              aria-label="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 20h9" strokeLinecap="round"/>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition"
              onClick={() => onDelete(schema)}
              title="Delete"
              aria-label="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              onClick={onClose}
              aria-label="Close"
            >✕</button>
          </div>
        </div>
        <div className="border-b border-gray-200 mb-0"></div>
        <pre className="bg-gray-100 rounded-b-2xl p-6 text-xs overflow-x-auto max-h-[55vh] border-0 font-mono">
          {JSON.stringify(schema.schema, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default SchemaPreviewModal; 