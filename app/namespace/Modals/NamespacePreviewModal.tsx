import React from 'react';
import { X, Folder } from 'react-feather';

interface NamespacePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  namespace: any;
  onEdit?: (namespace: any) => void;
  onDelete?: (namespace: any) => void;
}

const NamespacePreviewModal: React.FC<NamespacePreviewModalProps> = ({
  isOpen,
  onClose,
  namespace,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !namespace) return null;
  return (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            {namespace['icon-url'] ? (
              <img 
                src={namespace['icon-url']} 
                alt={`${namespace['namespace-name']} icon`}
                className="w-8 h-8 rounded object-cover"
                onError={(e) => {
                  // Fallback to folder icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <Folder className={`text-blue-600 ${namespace['icon-url'] ? 'hidden' : ''}`} size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{namespace['namespace-name']}</h2>
            <div className="text-xs text-gray-500 truncate">{namespace['namespace-url']}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        {/* Details */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1 font-medium">ID</div>
          <div className="text-xs font-mono break-all text-gray-800">{namespace['namespace-id']}</div>
        </div>
        {Array.isArray(namespace.tags) && namespace.tags.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1 font-medium">Tags</div>
            <div className="flex flex-wrap gap-2">
              {namespace.tags.map((tag: string, idx: number) => (
                <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-6 justify-end">
          {onEdit && (
            <button
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
              onClick={() => onEdit(namespace)}
              title="Edit"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition"
              onClick={() => onDelete(namespace)}
              title="Delete"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NamespacePreviewModal; 