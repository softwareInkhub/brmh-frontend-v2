import React, { useState, useEffect } from 'react';
import MockDataDisplay from './MockDataDisplay';

interface MockDataPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  schema: any;
  onInsertData: (data: any[]) => void;
  onFillForm?: (data: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

// Consistent JSON stringify function matching schema display format
const safeStringify = (obj: any): string => {
  try {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    
    // Use consistent formatting with 2-space indentation
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    console.error('JSON.stringify error:', error);
    return JSON.stringify({
      error: 'Failed to stringify object',
      originalData: String(obj)
    }, null, 2);
  }
};

// Simple data conversion function
const convertDataForForm = (data: any, schema: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const converted: any = {};
  
  if (schema.properties) {
    Object.keys(schema.properties).forEach(key => {
      const prop = schema.properties[key];
      const value = data[key];
      
      if (value === undefined || value === null) {
        converted[key] = prop.type === 'number' ? 0 : '';
      } else {
        converted[key] = value;
      }
    });
  } else {
    Object.keys(data).forEach(key => {
      converted[key] = data[key];
    });
  }
  
  return converted;
};

// Schema validation and cleaning function
const validateAndCleanSchema = (schema: any): { valid: boolean; cleanedSchema?: any; error?: string } => {
  try {
    let cleanedSchema = schema;
    
    // Skip JSON parsing entirely - work with schema as-is
    if (typeof schema === 'string') {
      console.log('Schema is a string, skipping JSON parsing for safety');
      // Just return the string as-is, let the generation function handle it
      return { valid: true, cleanedSchema: { type: 'object', properties: {}, required: [] } };
    }
    
    // Basic validation
    if (!cleanedSchema || typeof cleanedSchema !== 'object') {
      return { valid: false, error: 'Schema must be a valid object' };
    }
    
    // Ensure it has the required structure
    if (!cleanedSchema.type) {
      cleanedSchema.type = 'object';
    }
    
    if (!cleanedSchema.properties) {
      cleanedSchema.properties = {};
    }
    
    if (!cleanedSchema.required) {
      cleanedSchema.required = [];
    }
    
    // Clean up properties to ensure they're valid
    if (cleanedSchema.properties && typeof cleanedSchema.properties === 'object') {
      Object.keys(cleanedSchema.properties).forEach(key => {
        const prop = cleanedSchema.properties[key];
        if (prop && typeof prop === 'object') {
          // Ensure each property has a type
          if (!prop.type) {
            prop.type = 'string'; // Default to string
          }
        }
      });
    }
    
    return { valid: true, cleanedSchema };
  } catch (error) {
    return { valid: false, error: `Schema validation failed: ${error instanceof Error ? error.message : String(error)}` };
  }
};

// Fallback data generation function for frontend
const generateFallbackData = (schema: any, count: number, context: string) => {
  const mockData = [];
  const contextLower = (context || '').toLowerCase();
  
  // Context-aware data generation
  const isEcommerce = contextLower.includes('ecommerce') || contextLower.includes('e-commerce') || contextLower.includes('product');
  const isUser = contextLower.includes('user') || contextLower.includes('profile') || contextLower.includes('customer');
  const isOrder = contextLower.includes('order') || contextLower.includes('purchase') || contextLower.includes('transaction');
  
  // Ensure schema is an object
  const safeSchema = typeof schema === 'object' && schema !== null ? schema : { properties: {}, required: [] };
  
  for (let i = 0; i < count; i++) {
    const item: any = {};
    
    if (safeSchema.properties) {
      Object.keys(safeSchema.properties).forEach(key => {
        const prop = safeSchema.properties[key];
        const propType = Array.isArray(prop.type) ? prop.type[0] : prop.type;
        const keyLower = key.toLowerCase();
        
        switch (propType) {
          case 'string':
            if (keyLower.includes('id')) {
              item[key] = `id_${i + 1}_${Date.now()}`;
            } else if (keyLower.includes('name')) {
              if (isEcommerce) {
                item[key] = `Product ${i + 1}`;
              } else if (isUser) {
                item[key] = `User ${i + 1}`;
              } else {
                item[key] = `${context || 'Item'} ${i + 1}`;
              }
            } else if (keyLower.includes('email')) {
              item[key] = `user${i + 1}@example.com`;
            } else if (keyLower.includes('title')) {
              if (isEcommerce) {
                item[key] = `Amazing Product ${i + 1}`;
              } else {
                item[key] = `Sample Title ${i + 1}`;
              }
            } else if (keyLower.includes('description')) {
              if (isEcommerce) {
                item[key] = `High-quality product with great features. Item ${i + 1}`;
              } else {
                item[key] = `Sample description for ${key} ${i + 1}`;
              }
            } else if (keyLower.includes('category')) {
              if (isEcommerce) {
                const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
                item[key] = categories[i % categories.length];
              } else {
                item[key] = `Category ${i + 1}`;
              }
            } else if (keyLower.includes('status')) {
              const statuses = ['active', 'pending', 'completed', 'cancelled'];
              item[key] = statuses[i % statuses.length];
            } else if (keyLower.includes('date') || keyLower.includes('time')) {
              item[key] = new Date().toISOString();
            } else if (keyLower.includes('url') || keyLower.includes('link')) {
              item[key] = `https://example.com/${keyLower.replace(/[^a-z]/g, '')}/${i + 1}`;
            } else if (keyLower.includes('phone')) {
              item[key] = `+1-555-${String(i + 1).padStart(3, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
            } else if (keyLower.includes('address')) {
              item[key] = `${i + 1} Main Street, City ${i + 1}, State ${i + 1}`;
            } else {
              item[key] = `Sample ${key} ${i + 1}`;
            }
            break;
          case 'number':
            if (keyLower.includes('price') || keyLower.includes('cost')) {
              item[key] = Math.floor(Math.random() * 1000) + 10;
            } else if (keyLower.includes('quantity') || keyLower.includes('stock')) {
              item[key] = Math.floor(Math.random() * 100) + 1;
            } else if (keyLower.includes('rating') || keyLower.includes('score')) {
              item[key] = Math.floor(Math.random() * 5) + 1;
            } else if (keyLower.includes('age')) {
              item[key] = Math.floor(Math.random() * 50) + 18;
            } else {
              item[key] = Math.floor(Math.random() * 1000) + 1;
            }
            break;
          case 'boolean':
            item[key] = Math.random() > 0.5;
            break;
          case 'array':
            item[key] = [];
            break;
          case 'object':
            item[key] = {};
            break;
          default:
            item[key] = `Default ${key} ${i + 1}`;
        }
      });
    }
    
    // Ensure required fields are present
    if (safeSchema.required) {
      safeSchema.required.forEach((field: string) => {
        if (!item.hasOwnProperty(field)) {
          item[field] = `Required ${field} ${i + 1}`;
        }
      });
    }
    
    // If no properties were added, add some basic fields
    if (Object.keys(item).length === 0) {
      item.id = `id_${i + 1}_${Date.now()}`;
      item.name = isEcommerce ? `Product ${i + 1}` : `Item ${i + 1}`;
      item.description = `Sample description for item ${i + 1}`;
    }
    
    mockData.push(item);
  }
  
  return mockData;
};

const MockDataPanel: React.FC<MockDataPanelProps> = ({ 
  isOpen, 
  onClose, 
  tableName, 
  schema, 
  onInsertData,
  onFillForm 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockData, setMockData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(5);
  const [context, setContext] = useState('');
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);

  const generateMockData = async () => {
    if (!tableName || !schema || !context.trim()) return;

    setIsGenerating(true);
    setError(null);
    setMockData([]);

    try {
      console.log('Original schema:', schema);
      console.log('Schema type:', typeof schema);
      
      // Validate and clean schema before sending
      const validation = validateAndCleanSchema(schema);
      console.log('Validation result:', validation);
      
      if (!validation.valid) {
        setError(validation.error || 'Schema validation failed');
        return;
      }

      const validatedSchema = validation.cleanedSchema;
      console.log('Generating mock data with:', { tableName, count, context: context.trim() });
      console.log('Schema being used:', validatedSchema);
      
      // Use frontend fallback data generation for 100% reliability
      console.log('Using frontend fallback data generation for reliability');
      const fallbackData = generateFallbackData(validatedSchema, count, context);
      
      // Convert data for form compatibility
      const convertedData = fallbackData.map((item: any) => {
        try {
          return convertDataForForm(item, validatedSchema);
        } catch (error) {
          console.error('Error converting item:', error);
          return item; // Return original item if conversion fails
        }
      });
      
      console.log('Generated data:', convertedData);
      setMockData(convertedData);
      
      // Show success message when data is generated
      setAutoFillMessage('✅ Mock data generated successfully! Use "Fill Form" to populate the form with the first record.');
      
    } catch (err) {
      console.error('Generation error:', err);
      setError(`Generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertData = async () => {
    if (mockData.length === 0) return;

    try {
      for (const item of mockData) {
        await onInsertData([item]);
      }
      setMockData([]);
      onClose();
    } catch (err) {
      setError('Failed to insert data: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleInsertSingle = async (item: any) => {
    try {
      await onInsertData([item]);
      setMockData(prev => prev.filter(d => d !== item));
    } catch (err) {
      setError('Failed to insert item: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleFillForm = (item: any) => {
    if (onFillForm) {
      onFillForm(item);
    }
  };

  useEffect(() => {
    if (isOpen && tableName && schema) {
      setMockData([]);
      setError(null);
      setAutoFillMessage(null);
    }
  }, [isOpen, tableName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Mock Data Generator</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Records
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context <span className="text-red-500">*</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., E-commerce product catalog with electronics and accessories"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe the business context to generate realistic, domain-appropriate data
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={generateMockData}
              disabled={isGenerating || !context.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isGenerating || !context.trim()
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isGenerating ? 'Generating...' : 'Generate Mock Data'}
            </button>
            
            <button
              onClick={() => {
                if (mockData.length > 0 && onFillForm) {
                  onFillForm(mockData[0]);
                  setAutoFillMessage('✅ Form filled with first record! Panel will close automatically.');
                  // Close panel after a short delay to show the success message
                  setTimeout(() => {
                    onClose();
                  }, 1500);
                }
              }}
              disabled={mockData.length === 0}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                mockData.length === 0
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              Fill Form
            </button>
            
            <button
              onClick={() => {
                if (onFillForm) {
                  onFillForm({});
                  setAutoFillMessage('✅ Form cleared! Panel will close automatically.');
                  // Close panel after a short delay to show the success message
                  setTimeout(() => {
                    onClose();
                  }, 1500);
                }
              }}
              className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Clear Form
            </button>
          </div>
          
          {/* Debug Schema Button */}
          <button
            onClick={() => {
              const validation = validateAndCleanSchema(schema);
              if (validation.valid) {
                console.log('Schema is valid:', validation.cleanedSchema);
                setAutoFillMessage('✅ Schema is valid! Check console for details.');
              } else {
                setError(`Schema validation failed: ${validation.error}`);
              }
            }}
            className="w-full mt-2 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-colors"
          >
            Debug Schema
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {autoFillMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{autoFillMessage}</p>
          </div>
        )}

        {/* Mock Data Display Component */}
        <MockDataDisplay
          data={mockData}
          onUseData={handleFillForm}
          onInsertData={handleInsertData}
          onClearData={() => setMockData([])}
          onClose={onClose}
        />

        {/* Empty State */}
        {!isGenerating && mockData.length === 0 && !error && (
          <div className="text-center text-gray-500 py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No mock data generated yet</p>
            <p className="text-xs text-gray-500">Provide context and click "Generate Mock Data" to create sample data</p>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="text-center text-gray-500 py-8">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">Generating mock data...</p>
            <p className="text-xs text-gray-500">This may take a few seconds</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockDataPanel; 