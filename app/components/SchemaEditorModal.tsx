import React, { useState, useEffect } from 'react';
import { X, Save, Check } from 'lucide-react';

interface SchemaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: any;
  onSave: (schema: any) => void;
  isSaving?: boolean;
}

export default function SchemaEditorModal({
  isOpen,
  onClose,
  schema,
  onSave,
  isSaving = false
}: SchemaEditorModalProps) {
  const [editedSchema, setEditedSchema] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && schema) {
      setEditedSchema(JSON.stringify(schema, null, 2));
      setError(null);
    }
  }, [isOpen, schema]);

  const handleSave = () => {
    try {
      const parsedSchema = JSON.parse(editedSchema);
      onSave(parsedSchema);
      setError(null);
    } catch (err) {
      setError('Invalid JSON format');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Edit Schema</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <textarea
            value={editedSchema}
            onChange={(e) => {
              setEditedSchema(e.target.value);
              setError(null);
            }}
            className="w-full h-full min-h-[400px] p-4 font-mono text-sm bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !!error}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 