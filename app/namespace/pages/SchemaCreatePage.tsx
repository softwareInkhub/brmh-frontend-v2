import React, { useState, useEffect } from 'react';
import { NestedFieldsEditor, schemaToFields } from '../components/SchemaService';
import RecursiveDataForm from '../../components/common/RecursiveDataForm';
import Ajv from 'ajv';

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

const API_BASE_URL = "http://localhost:5001";

interface SchemaCreatePageProps {
  onSchemaNameChange?: (name: string) => void;
  namespace?: any;
  initialSchema?: any;
  initialSchemaName?: string;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  methodId?: string;
}

export default function SchemaCreatePage({ onSchemaNameChange, namespace, initialSchema, initialSchemaName, onSuccess, mode, methodId }: SchemaCreatePageProps) {
  const [schemaName, setSchemaName] = useState(initialSchemaName || '');
  const [fields, setFields] = useState<any[]>(initialSchema ? schemaToFields(initialSchema) : []);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [jsonSchema, setJsonSchema] = useState(initialSchema ? JSON.stringify(initialSchema, null, 2) : `{
  "type": "object",
  "properties": {},
  "required": []
}`);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'createData'>('edit');
  const [createDataResult, setCreateDataResult] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [tableName, setTableName] = useState<string | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState(schemaName || '');
  const [tableCreateError, setTableCreateError] = useState<string | null>(null);
  const [creatingTable, setCreatingTable] = useState(false);
  const [schemaObj, setSchemaObj] = useState<any>(null);
  const [showRawFields, setShowRawFields] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const isEditing = mode === 'edit' || (!mode && (!!initialSchema || !!initialSchemaName));

  // Update fields and JSON schema when initialSchema changes
  useEffect(() => {
    if (initialSchema) {
      setFields(schemaToFields(initialSchema));
      setJsonSchema(JSON.stringify(initialSchema, null, 2));
    }
  }, [initialSchema]);

  React.useEffect(() => {
    if (!schemaName) return;
    const fetchSchemaObj = async () => {
      try {
        const resSchemas = await fetch(`${API_BASE_URL}/unified/schema`);
        if (resSchemas.ok) {
          const schemas = await resSchemas.json();
          const found = schemas.find((s: any) => s.schemaName === schemaName);
          if (found) {
            setSchemaObj(found);
            setTableName(found.tableName || null);
          } else {
            setSchemaObj(null);
            setTableName(null);
          }
        }
      } catch {
        setSchemaObj(null);
        setTableName(null);
      }
    };
    fetchSchemaObj();
  }, [schemaName]);

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
    try {
      const lines = rawFields.split('\n').map(l => l.trim()).filter(Boolean);
      const parsedFields = lines.map(line => {
        // Remove comments
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) line = line.slice(0, commentIndex).trim();
        // Match: name: type;
        const match = line.match(/^([a-zA-Z0-9_]+):\s*(.+?);?$/);
        if (!match) throw new Error(`Invalid field: ${line}`);
        const name = match[1];
        let typeStr = match[2].replace(/;$/, '').trim(); // Remove trailing semicolon
        let type: string = typeStr;
        let allowNull = false;
        let enumValues: string[] | undefined = undefined;
        // Handle nullable types
        if (typeStr.includes('null')) {
          allowNull = true;
          typeStr = typeStr.replace(/\|?\s*null\s*\|?/g, '').trim();
        }
        // Handle enums (values in quotes separated by |)
        const enumMatch = typeStr.split('|').map(v => v.trim()).filter(Boolean);
        if (enumMatch.length > 1 && enumMatch.every(v => /^".*"$/.test(v))) {
          enumValues = enumMatch.map(v => v.replace(/"/g, ''));
          type = 'enum';
        } else {
          // Map JS/TS types to JSON Schema types
          if (typeStr === 'Date') type = 'string';
          else if (typeStr === 'number' || typeStr === 'int' || typeStr === 'float') type = 'number';
          else if (typeStr === 'boolean') type = 'boolean';
          else if (typeStr === 'string') type = 'string';
          else type = typeStr;
        }
        return { name, type, allowNull, enumValues };
      });
      setFields(parsedFields);
      console.log('Parsed fields:', parsedFields);
    setRawFieldsError(null);
    } catch (err: any) {
      setRawFieldsError(err.message || 'Failed to parse fields.');
    }
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
        methodId: methodId || null,
        schemaName: schemaName.trim(),
        methodName: null,
        namespaceId: namespace?.['namespace-id'] || null,
        schemaType: null,
        schema: parsedSchema
      };

      let schemaId;
      // If we're editing and have a schema object with an ID, update it
      if (isEditing && schemaObj && (schemaObj.id || schemaObj.schemaId)) {
        const existingSchemaId = schemaObj.id || schemaObj.schemaId;
        console.log('Updating schema with ID:', existingSchemaId);
        const response = await fetch(`${API_BASE_URL}/unified/schema/${existingSchemaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to update schema');
        }
        const updatedSchema = await response.json();
        schemaId = updatedSchema.id || updatedSchema.schemaId;
        setSaveMessage('Schema updated successfully!');
      } else {
        // Create new schema
        console.log('Creating new schema');
        const response = await fetch(`${API_BASE_URL}/unified/schema`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to save schema');
        }
        const newSchema = await response.json();
        schemaId = newSchema.id || newSchema.schemaId;
        setSaveMessage('Schema created successfully!');
      }

      // Update method with schema ID if methodId exists
      if (methodId && schemaId) {
        try {
          const methodRes = await fetch(`${API_BASE_URL}/unified/methods/${methodId}`);
          const methodData = await methodRes.json();
          const methodDataToUpdate = methodData.data ? methodData.data : methodData;
          
          const requestBody = {
            "namespace-method-name": methodDataToUpdate["namespace-method-name"],
            "namespace-method-type": methodDataToUpdate["namespace-method-type"],
            "namespace-method-url-override": methodDataToUpdate["namespace-method-url-override"] || '',
            "namespace-method-queryParams": methodDataToUpdate["namespace-method-queryParams"] || [],
            "namespace-method-header": methodDataToUpdate["namespace-method-header"] || [],
            "save-data": !!methodDataToUpdate["save-data"],
            "isInitialized": !!methodDataToUpdate["isInitialized"],
            "tags": methodDataToUpdate["tags"] || [],
            "namespace-method-tableName": methodDataToUpdate["namespace-method-tableName"] || '',
            "tableName": methodDataToUpdate["tableName"] || '',
            "schemaId": schemaId,
            "namespace-id": methodDataToUpdate["namespace-id"]
          };

          const updateResponse = await fetch(`${API_BASE_URL}/unified/methods/${methodId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          if (!updateResponse.ok) {
            console.error('Failed to update method with schema ID');
          }
        } catch (err) {
          console.error('Error updating method with schema ID:', err);
        }
      }

      if (!isEditing) {
        setSchemaName('');
        setJsonSchema(`{
  "type": "object",
  "properties": {},
  "required": []
}`);
        setFields([]);
        setRawFields('');
        setCollapsedNodes(new Set());
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setSaveMessage(error.message || 'Failed to save schema.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTable = async () => {
    console.log('=== STARTING TABLE CREATION ===');
    setCreatingTable(true);
    setTableCreateError(null);
    try {
      console.log('1. Fetching schemas...');
      // 1. Fetch schemaId by schemaName
      const resSchemas = await fetch(`${API_BASE_URL}/unified/schema`);
      if (!resSchemas.ok) throw new Error('Failed to fetch schemas');
      const schemas = await resSchemas.json();
      console.log('Schemas fetched:', schemas);
      
      const found = schemas.find((s: any) => s.schemaName === schemaName);
      if (!found) throw new Error('Schema not found');
      const schemaId = found.id || found.schemaId;
      if (!schemaId) throw new Error('Schema ID not found');
      console.log('Found schema:', found);

      // Get methodId from schema data if not provided in props
      const methodIdToUse = methodId || found.methodId;
      console.log('Using methodId:', methodIdToUse);

      console.log('2. Creating table...');
      // 2. Create table
      const res = await fetch(`${API_BASE_URL}/unified/schema/table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaId,
          tableName: newTableName.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create table');
      }
      console.log('Table created successfully');

      // 3. Update method with table name if methodId exists
      if (methodIdToUse) {
        console.log('3. Updating method with table name. MethodId:', methodIdToUse);
        try {
          const methodRes = await fetch(`${API_BASE_URL}/unified/methods/${methodIdToUse}`);
          console.log('Method fetch response status:', methodRes.status);
          const methodData = await methodRes.json();
          console.log('Current method data:', methodData);
          
          const methodDataToUpdate = methodData.data ? methodData.data : methodData;
          console.log('Method data to update:', methodDataToUpdate);
          
          // Save updated method
          console.log('Sending PUT request to update method...');
          const requestBody = {
            "namespace-method-name": methodDataToUpdate["namespace-method-name"],
            "namespace-method-type": methodDataToUpdate["namespace-method-type"],
            "namespace-method-url-override": methodDataToUpdate["namespace-method-url-override"] || '',
            "namespace-method-queryParams": methodDataToUpdate["namespace-method-queryParams"] || [],
            "namespace-method-header": methodDataToUpdate["namespace-method-header"] || [],
            "save-data": !!methodDataToUpdate["save-data"],
            "isInitialized": !!methodDataToUpdate["isInitialized"],
            "tags": methodDataToUpdate["tags"] || [],
            "namespace-method-tableName": newTableName.trim(),
            "tableName": newTableName.trim(),
            "schemaId": methodDataToUpdate["schemaId"],
            "namespace-id": methodDataToUpdate["namespace-id"]
          };
          console.log('Request body:', JSON.stringify(requestBody, null, 2));
          
          const updateResponse = await fetch(`${API_BASE_URL}/unified/methods/${methodIdToUse}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          console.log('Method update response status:', updateResponse.status);
          
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update method:', errorText);
            throw new Error(errorText || 'Failed to update method');
          }
          
          const updatedMethodData = await updateResponse.json();
          console.log('Successfully updated method data:', updatedMethodData);
        } catch (err) {
          console.error('Failed to update method with table name:', err);
          // Don't throw error here, as table was created successfully
        }
      } else {
        console.log('No methodId available, skipping method update');
      }

      setShowTableModal(false);
      console.log('4. Refetching schema to get updated tableName...');
      // Refetch the schema to get the updated tableName
      try {
        const resSchemas = await fetch(`${API_BASE_URL}/unified/schema`);
        if (resSchemas.ok) {
          const schemas = await resSchemas.json();
          const found = schemas.find((s: any) => s.schemaName === schemaName);
          if (found && found.tableName) {
            console.log('Found updated schema with table name:', found);
            setSchemaObj(found);
            setTableName(found.tableName);
          }
        }
      } catch (err) {
        console.error('Failed to refetch schema:', err);
      }
      console.log('=== TABLE CREATION COMPLETED ===');
    } catch (err: any) {
      console.error('=== TABLE CREATION FAILED ===', err);
      setTableCreateError(err.message);
    } finally {
      setCreatingTable(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 px-8">
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 rounded-t-lg ${activeTab === 'edit' ? 'bg-white border-t border-x border-gray-200 font-bold' : 'bg-gray-100'}`}
        >
          Edit Schema
        </button>
        {isEditing && (
          <button
            onClick={() => setActiveTab('createData')}
            className={`px-4 py-2 rounded-t-lg ${activeTab === 'createData' ? 'bg-white border-t border-x border-gray-200 font-bold' : 'bg-gray-100'}`}
            title={!tableName ? "Create and activate a table for this schema first" : ""}
          >
            Create Data
          </button>
        )}
      </div>

      {/* Edit Schema Tab */}
      {activeTab === 'edit' && (
        <>
      <div className="px-8 mb-6 mt-4">
            {namespace && (
              <div className="mb-2 text-sm text-gray-600">
                <span className="font-semibold">Namespace:</span> {namespace['namespace-name']}
              </div>
            )}
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
                <div
                  className="font-semibold text-xs text-gray-700 mb-1 flex items-center cursor-pointer select-none"
                  onClick={() => setShowRawFields(v => !v)}
                  style={{ userSelect: 'none' }}
                >
                  <span>Paste TypeScript/Raw Fields</span>
                  <span className="ml-2 text-blue-500">{showRawFields ? '▲' : '▼'}</span>
                </div>
                {showRawFields && (
                  <>
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
                  </>
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
              {isEditing ? (isSaving ? 'Saving...' : 'Edit') : (isSaving ? 'Saving...' : 'Create')}
        </button>
        {isEditing && schemaObj && (schemaObj.id || schemaObj.schemaId) && (
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-base font-semibold w-full md:w-auto transition"
            onClick={async () => {
              if (!window.confirm('Are you sure you want to delete this schema?')) return;
              const schemaId = schemaObj.id || schemaObj.schemaId;
              try {
                const res = await fetch(`${API_BASE_URL}/unified/schema/${schemaId}`, {
                  method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to delete schema');
                setSaveMessage('Schema deleted successfully!');
                if (onSuccess) onSuccess();
              } catch (err: any) {
                setSaveMessage('Failed to delete schema.');
              }
            }}
            type="button"
          >
            Delete
          </button>
        )}
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
        </>
      )}

      {/* Create Data Tab */}
      {isEditing && activeTab === 'createData' && (
        <div className="px-8 pb-8">
          <h2 className="text-lg font-semibold mb-4">Create Data for Table: <span className="text-blue-600">{schemaObj?.tableName || '(no table)'}</span></h2>
          {!schemaObj?.tableName ? (
            <div>
              <div className="text-red-600 mb-2">No table exists for this schema. Please create a table first.</div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                onClick={() => {
                  setShowTableModal(true);
                  setNewTableName(schemaName || '');
                  setTableCreateError(null);
                }}
              >
                Create Table
              </button>
              {/* Modal */}
              {showTableModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                  <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
                  <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative z-10 border border-gray-200">
                    <button
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowTableModal(false)}
                    >✕</button>
                    <h2 className="text-lg font-semibold mb-4">Create Table for Schema</h2>
                    <label className="block text-sm font-medium mb-2">Table Name</label>
                    <input
                      className="border border-gray-300 p-2 rounded-lg w-full mb-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400"
                      value={newTableName}
                      onChange={e => setNewTableName(e.target.value)}
                      placeholder="Enter table name"
                      autoFocus
                    />
                    {tableCreateError && <div className="text-xs text-red-600 mb-2">{tableCreateError}</div>}
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full"
                      disabled={creatingTable}
                      onClick={handleCreateTable}
                    >
                      {creatingTable ? 'Creating...' : 'Create Table'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={async e => {
                e.preventDefault();
                setCreateDataResult(null);
                setFormErrors(null);

                // Type validation using ajv
                const ajv = new Ajv();
                let schema;
                try {
                  schema = JSON.parse(jsonSchema);
                } catch {
                  setFormErrors('Invalid JSON schema.');
                  return;
                }
                const validate = ajv.compile(schema);
                const valid = validate(formData);

                if (!valid) {
                  setFormErrors(
                    validate.errors?.map(err => `${err.instancePath || err.schemaPath} ${err.message}`).join(', ') ||
                    'Validation failed'
                  );
                  return;
                }

                // If valid, proceed to submit
                try {
                  const res = await fetch(`${API_BASE_URL}/unified/schema/table/${schemaObj.tableName}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item: formData }),
                  });
                  if (!res.ok) throw new Error('Failed to create data');
                  setCreateDataResult('Data created successfully!');
                  setFormData({});
                } catch (err: any) {
                  setCreateDataResult('Error: ' + err.message);
                }
              }}
              className="max-w-xl"
            >
              <RecursiveDataForm
                schema={JSON.parse(jsonSchema)}
                value={formData}
                onChange={setFormData}
                required={JSON.parse(jsonSchema).required}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mt-4"
              >
                Create
              </button>
              {formErrors && (
                <div className="mt-2 text-sm text-red-600">{formErrors}</div>
              )}
              {createDataResult && (
                <div className="mt-2 text-sm">{createDataResult}</div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
} 