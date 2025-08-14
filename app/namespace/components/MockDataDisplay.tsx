import React from 'react';

interface MockDataDisplayProps {
  data: any[];
  onUseData: (data: any) => void;
  onInsertData: (data: any[]) => void;
  onClearData: () => void;
  onClose?: () => void;
}

const MockDataDisplay: React.FC<MockDataDisplayProps> = ({ 
  data, 
  onUseData, 
  onInsertData, 
  onClearData,
  onClose 
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white rounded-t-lg">
        <h4 className="text-sm font-medium text-gray-700">
          Generated Mock Data ({data.length} records)
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => onInsertData(data)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            Insert All
          </button>
          <button
            onClick={onClearData}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Data Display */}
      <div className="max-h-96 overflow-y-auto p-3">
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  Record {index + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      onUseData(item);
                      if (onClose) {
                        // Close panel after using data
                        setTimeout(() => {
                          onClose();
                        }, 500);
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                    title="Use this data in the form"
                  >
                    Use This
                  </button>
                  <button
                    onClick={() => onInsertData([item])}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                    title="Insert this record"
                  >
                    Insert
                  </button>
                </div>
              </div>
              
              {/* JSON Display - Updated to match schema display format */}
              <div className="bg-gray-100 rounded-lg p-4 overflow-x-auto text-xs max-h-96 text-gray-700 font-mono">
                <pre className="whitespace-pre-wrap">
                  {(() => {
                    try {
                      return JSON.stringify(item, null, 2);
                    } catch (error) {
                      console.error('JSON.stringify error in display:', error);
                      return `Error displaying data: ${error instanceof Error ? error.message : String(error)}`;
                    }
                  })()}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MockDataDisplay;
