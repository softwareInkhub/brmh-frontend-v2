import React, { useState } from 'react';
import { NestedFieldsEditor, schemaToFields } from '../components/SchemaService';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface SchemaCreatePageProps {
  onSchemaNameChange?: (name: string) => void;
}

export default function SchemaCreatePage({ onSchemaNameChange }: SchemaCreatePageProps) {
  const [schemaName, setSchemaName] = useState('');
  const [fields, setFields] = useState<any[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [jsonSchema, setJsonSchema] = useState(`{
  "type": "object",
  "properties": {},
  "required": []
}`);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Bidirectional sync: update JSON from fields
  React.useEffect(() => {
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
        methodId: null,
        schemaName: schemaName.trim(),
        methodName: null,
        namespaceId: null,
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
      setSchemaName('');
      setJsonSchema(`{
  "type": "object",
  "properties": {},
  "required": []
}`);
      setFields([]);
      setRawFields('');
      setCollapsedNodes(new Set());
    } catch (error: any) {
      setSaveMessage(error.message || 'Failed to save schema.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-8 mb-6 mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="schema-name">
          Schema Name <span className="text-red-500">*</span>
        </label>
        <input
          id="schema-name"
          className="border border-gray-300 p-2 rounded-lg text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400 max-w-xs w-full"
          placeholder="Schema Name (required)"
          value={schemaName}
          onChange={e => {
            setSchemaName(e.target.value);
            if (onSchemaNameChange) onSchemaNameChange(e.target.value);
          }}
          required
        />
      </div>
      <div className="flex-1 flex flex-row min-h-0 min-w-0 w-full px-8 pb-8">
        {/* Form Editor */}
        <div className="flex-1 min-h-0 min-w-0 pr-6">
          <div className="font-semibold mb-2 text-base text-gray-800">Form Editor</div>
          <div className="border-b border-gray-200 mb-2" />
          <NestedFieldsEditor fields={fields} onChange={setFields} collapsedNodes={collapsedNodes} setCollapsedNodes={setCollapsedNodes} nodePath="root" />
        </div>
        {/* JSON Tree (raw fields + JSON schema) */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
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
            <span>OpenAPI 3.0+ spec: Use type: <code>[\"string\", \"null\"]</code> for nullable fields, and <code>required: [\"field1\", ...]</code> for required fields.</span>
          </div>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-2 font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition flex-1 min-h-0"
            value={jsonSchema}
            onChange={handleJsonChange}
            rows={16}
            style={{ minHeight: 180, maxHeight: '100%', overflow: 'auto' }}
          />
          {jsonError && <div className="text-xs text-red-600 mt-1">{jsonError}</div>}
        </div>
      </div>
      {/* Sticky action buttons */}
      <div className="flex flex-col md:flex-row justify-end md:gap-2 gap-2 mt-4 bg-white pt-2 pb-1 border-t border-gray-100 px-8">
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
          {isSaving ? 'Saving...' : 'Create'}
        </button>
      </div>
      {validationResult && (
        <div className="mt-2 px-8">
          <div className="font-semibold text-sm">Validation Result:</div>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(validationResult, null, 2)}
          </pre>
        </div>
      )}
      {saveMessage && (
        <div className="mt-2 text-blue-700 font-semibold text-sm px-8">{saveMessage}</div>
      )}
    </div>
  );
} 