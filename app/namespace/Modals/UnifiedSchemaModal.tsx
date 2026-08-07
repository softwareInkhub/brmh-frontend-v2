import React, { useState, useEffect } from 'react';
import { NestedFieldsEditor, schemaToFields } from '../components/SchemaService';

interface UnifiedSchemaModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onSuccess: () => void;
  editingSchema?: any;
  namespace?: any;
  method?: any;
}

function fieldsToSchema(fields: any[]): Record<string, any> {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const field of fields) {
    let type: any = field.type;
    if (field.allowNull) {
      type = [field.type, 'null'];
    }
    let property: any = { type };
    if (field.type === 'enum') {
      property = {
        type: field.allowNull ? ['string', 'null'] : 'string',
        enum: field.enumValues || []
      };
    } else if (field.type === 'object') {
      const nested = fieldsToSchema(field.fields || []);
      property = { ...property, ...nested };
    } else if (field.type === 'array') {
      if (field.itemType === 'object') {
        property.items = fieldsToSchema(field.itemFields || []);
      } else {
        property.items = { type: field.allowNull ? [field.itemType, 'null'] : field.itemType };
      }
    }
    properties[field.name] = property;
    if (field.required) {
      required.push(field.name);
    }
  }
  const schema: any = {
    type: 'object',
    properties
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

const UnifiedSchemaModal: React.FC<UnifiedSchemaModalProps> = ({ showModal, setShowModal, onSuccess, editingSchema, namespace, method }) => {
  const [schemaName, setSchemaName] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [jsonSchema, setJsonSchema] = useState('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Add editing detection
  const isEditing = !!editingSchema && !!editingSchema.id;

  // Prefill state when editing
  useEffect(() => {
    if (showModal && editingSchema) {
      setSchemaName(editingSchema.schemaName || '');
      setFields(schemaToFields(editingSchema.schema || {}));
      setJsonSchema(JSON.stringify(editingSchema.schema || {}, null, 2));
    }
    // eslint-disable-next-line
  }, [showModal, editingSchema]);

  // Bidirectional sync: update JSON from fields
  useEffect(() => {
    setJsonSchema(JSON.stringify(fieldsToSchema(fields), null, 2));
    // eslint-disable-next-line
  }, [fields]);

  // When JSON changes, update fields (if valid)
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonSchema(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setJsonError(null);
      setFields(schemaToFields(parsed));
    } catch {
      setJsonError('Invalid JSON');
    }
  };

  // When raw fields are converted, update both fields and JSON
  const handleConvertRawFields = () => {
    // Dummy: just clear error for now and set fields to []
    setRawFieldsError(null);
    setFields([]); // You can implement a real parser if needed
  };

  const handleValidate = async () => {
    setValidationResult(null);
    try {
      const parsed = JSON.parse(jsonSchema);
      setJsonError(null);
      const response = await fetch(`${API_BASE_URL}/unified/schema/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: parsed })
      });
      if (!response.ok) throw new Error('Validation failed');
      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      setJsonError('Invalid JSON or validation failed');
      setValidationResult({ valid: false, message: 'Validation failed. Please check your schema.' });
    }
  };

  const handleSave = async () => {
    if (!schemaName.trim()) {
      setSaveMessage('Schema name is required.');
      return;
    }
    let parsedSchema;
    try {
      parsedSchema = JSON.parse(jsonSchema);
      setJsonError(null);
      if (!parsedSchema || typeof parsedSchema !== 'object' || !parsedSchema.type) {
        parsedSchema = { type: 'object', properties: {}, required: [] };
      }
    } catch {
      setJsonError('Invalid JSON');
      return;
    }
    setIsSaving(true);
    setSaveMessage('');
    try {
      const payload = {
        methodId: method?.['namespace-method-id'] || null,
        schemaName: schemaName.trim(),
        methodName: method?.['namespace-method-name'] || null,
        namespaceId: namespace?.['namespace-id'] || null,
        schemaType: null,
        schema: parsedSchema
      };
      const response = await fetch(`${API_BASE_URL}/unified/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save schema');
      }
      setSaveMessage('Schema created successfully!');
      setShowModal(false);
      setSchemaName('');
      setJsonSchema('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
      setFields([]);
      setRawFields('');
      setCollapsedNodes(new Set());
      onSuccess();
    } catch (error: any) {
      setSaveMessage(error.message || 'Failed to save schema.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!showModal) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-opacity-30 backdrop-blur-sm"></div>
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-5xl relative z-10 max-h-[98vh] flex flex-col overflow-hidden border border-gray-200">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={() => setShowModal(false)}
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-2 tracking-tight text-gray-900">{isEditing ? 'Edit Schema' : 'Create Schema'}</h2>
        <input
          className="border border-gray-300 p-2 rounded-lg mb-3 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400 max-w-xs w-full"
          placeholder="Schema Name (required)"
          value={schemaName}
          onChange={e => setSchemaName(e.target.value)}
          required
        />
        <div className="flex flex-col md:flex-row gap-0 md:gap-6 flex-1 min-h-0 w-full overflow-hidden">
          {/* Form Editor */}
          <div className="flex-1 min-w-0 max-w-full overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto', minWidth: 0 }}>
            <div className="font-semibold mb-2 text-base text-gray-800">Form Editor</div>
            <div className="border-b border-gray-200 mb-2" />
            <NestedFieldsEditor fields={fields} onChange={setFields} collapsedNodes={collapsedNodes} setCollapsedNodes={setCollapsedNodes} nodePath="root" />
          </div>
          {/* Divider for desktop */}
          <div className="hidden md:block w-px bg-gray-200 mx-4" />
          {/* JSON Tree (raw fields + JSON schema) */}
          <div className="flex-1 min-w-0 max-w-full flex flex-col mt-4 md:mt-0">
            <div className="mb-2">
              <div className="font-semibold text-xs text-gray-700 mb-1">Paste TypeScript/Raw Fields</div>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
                placeholder={`Paste fields like:\nid: string;\nemail: string;\nrole: \"ADMIN\" | \"USER\";\ndepartmentId: string | null;`}
                value={rawFields}
                onChange={e => setRawFields(e.target.value)}
                rows={4}
                style={{ minHeight: 60 }}
              />
              <button
                className="mt-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold border border-blue-600 transition"
                onClick={handleConvertRawFields}
                type="button"
              >
                Convert to JSON Schema
              </button>
              {rawFieldsError && (
                <div className="text-xs text-red-600 mt-1">{rawFieldsError}</div>
              )}
            </div>
            <div className="flex items-center mb-2 gap-2">
              <div className="font-semibold flex-1 text-base text-gray-800">JSON Schema Editor</div>
              <button
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs border border-gray-300 font-semibold transition"
                onClick={() => {
                  try {
                    setJsonSchema(JSON.stringify(JSON.parse(jsonSchema), null, 2));
                  } catch {}
                }}
                title="Format JSON"
              >
                Format
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-1">
              <span>OpenAPI 3.0+ spec: Use type: <code>["string", "null"]</code> for nullable fields, and <code>required: ["field1", ...]</code> for required fields.</span>
            </div>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2 font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition flex-1"
              value={jsonSchema}
              onChange={handleJsonChange}
              rows={16}
              style={{ minHeight: 180, maxHeight: '40vh', overflow: 'auto' }}
            />
            {jsonError && <div className="text-xs text-red-600 mt-1">{jsonError}</div>}
          </div>
        </div>
        {/* Sticky action buttons */}
        <div className="flex flex-col md:flex-row justify-end md:gap-2 gap-2 mt-4 sticky bottom-0 right-0 bg-white pt-2 pb-1 z-20 border-t border-gray-100">
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-base font-semibold w-full md:w-auto transition"
            onClick={handleValidate}
          >
            Validate
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-base font-semibold w-full md:w-auto transition"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isEditing ? 'Update' : isSaving ? 'Saving...' : 'Create'}
          </button>
        </div>
        {validationResult && (
          <div className="mt-2">
            <div className="font-semibold text-sm">Validation Result:</div>
            <pre className="bg-gray-100 p-2 rounded text-xs">
              {JSON.stringify(validationResult, null, 2)}
            </pre>
          </div>
        )}
        {saveMessage && (
          <div className="mt-2 text-blue-700 font-semibold text-sm">{saveMessage}</div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSchemaModal; 