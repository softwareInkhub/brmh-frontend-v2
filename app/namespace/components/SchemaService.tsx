import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

const FIELD_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'enum'];

type Field = {
  name: string;
  type: string;
  children?: Field[];
  required?: boolean;
  allowNull?: boolean;
  fields?: Field[];
  itemType?: string;
  itemFields?: Field[];
  enumValues?: string[];
};

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Recursive field form
function NestedFieldsEditor({ fields, onChange, level = 0, collapsedNodes, setCollapsedNodes, nodePath }: { fields: Field[]; onChange: (fields: Field[]) => void; level?: number; collapsedNodes: Set<string>; setCollapsedNodes: (s: Set<string>) => void; nodePath: string }) {
  const addField = () => onChange([...fields, { name: '', type: 'string', required: false, allowNull: false }]);
  const removeField = (idx: number) => onChange(fields.filter((_, i) => i !== idx));
  const updateField = (idx: number, key: keyof Field, value: any) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };
  const updateSubFields = (idx: number, subFields: Field[]) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, fields: subFields } : f)));
  };
  const updateItemFields = (idx: number, subFields: Field[]) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, itemFields: subFields } : f)));
  };
  const toggleCollapse = (path: string) => {
    const newSet = new Set(collapsedNodes);
    if (collapsedNodes.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setCollapsedNodes(newSet);
  };

  const handleEnumValuesChange = (idx: number, value: string) => {
    // Split by comma and clean up each value
    const newValues = value.split(',')
      .map(v => v.trim())
      .filter(Boolean);
    
    // Use Set to ensure uniqueness
    const uniqueValues = Array.from(new Set([...(fields[idx].enumValues || []), ...newValues]));
    
    onChange(fields.map((f, i) => (i === idx ? { ...f, enumValues: uniqueValues } : f)));
  };

  const removeEnumValue = (idx: number, valueToRemove: string) => {
    const newValues = (fields[idx].enumValues || []).filter(v => v !== valueToRemove);
    onChange(fields.map((f, i) => (i === idx ? { ...f, enumValues: newValues } : f)));
  };

  return (
    <div className={level > 0 ? 'ml-4 pl-3 border-l-2 border-blue-100 bg-blue-50/10 rounded-lg py-1' : ''}>
      {fields.map((field, idx) => {
        const thisPath = `${nodePath}.${field.name || idx}`;
        const isCollapsible = field.type === 'object' || field.type === 'array';
        const isCollapsed = collapsedNodes.has(thisPath);
        return (
          <React.Fragment key={idx}>
            <div
              className="flex flex-nowrap items-center gap-2 mb-1 min-w-fit"
              style={{ marginLeft: level * 8 }}
            >
              <span style={{ width: 24, display: 'inline-block' }}>
                {isCollapsible ? (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-700 p-1 focus:outline-none"
                    onClick={() => toggleCollapse(thisPath)}
                    tabIndex={-1}
                  >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                ) : (
                  <span style={{ display: 'inline-block', width: 16, height: 16 }} />
                )}
              </span>
              <input
                className="border border-gray-300 p-1 rounded-md w-28 text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400"
                placeholder="Field name"
                value={field.name ?? ''}
                onChange={e => updateField(idx, 'name', e.target.value)}
              />
              <select
                className="border border-gray-300 p-1 rounded-md text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50"
                value={field.type ?? 'string'}
                onChange={e => {
                  const newType = e.target.value;
                  updateField(idx, 'type', newType);
                  // Initialize enumValues if type is enum
                  if (newType === 'enum' && !field.enumValues) {
                    updateField(idx, 'enumValues', []);
                  }
                }}
              >
                {FIELD_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {field.type === 'enum' && (
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  <input
                    className="border border-gray-300 p-1 rounded-md text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400 flex-1 min-w-[120px]"
                    placeholder="Add enum value (press Enter or comma)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        handleEnumValuesChange(idx, input.value);
                        input.value = '';
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleEnumValuesChange(idx, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.enumValues?.map((value, valueIdx) => (
                      <div
                        key={valueIdx}
                        className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs"
                      >
                        <span>{value}</span>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-0.5"
                          onClick={() => removeEnumValue(idx, value)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-1 text-xs ml-1 text-gray-700">
                <input
                  type="checkbox"
                  checked={!!field.required}
                  onChange={e => updateField(idx, 'required', e.target.checked)}
                />
                <span>Required</span>
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={!!field.allowNull}
                  onChange={e => updateField(idx, 'allowNull', e.target.checked)}
                />
                <span>Null</span>
              </label>
              <button
                className="ml-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 text-xs transition"
                onClick={() => removeField(idx)}
                title="Remove"
                style={{ minWidth: 24 }}
              >✕</button>
            </div>
            {field.type === 'object' && !isCollapsed && (
              <div className="ml-4">
                <div className="text-xs font-semibold text-gray-600 mb-1">Object Fields:</div>
                <NestedFieldsEditor
                  fields={field.fields || []}
                  onChange={subFields => updateSubFields(idx, subFields)}
                  level={level + 1}
                  collapsedNodes={collapsedNodes}
                  setCollapsedNodes={setCollapsedNodes}
                  nodePath={thisPath}
                />
              </div>
            )}
            {field.type === 'array' && !isCollapsed && (
              <div className="ml-4">
                <div className="text-xs font-semibold text-gray-600 mb-1">Array Item Type:</div>
                <select
                  className="border border-gray-300 p-1 rounded-md text-xs ml-1 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50"
                  value={field.itemType ?? 'string'}
                  onChange={e => updateField(idx, 'itemType', e.target.value)}
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {field.itemType === 'object' && (
                  <div className="mt-1 ml-4">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Object Fields:</div>
                    <NestedFieldsEditor
                      fields={field.itemFields || []}
                      onChange={subFields => updateItemFields(idx, subFields)}
                      level={level + 2}
                      collapsedNodes={collapsedNodes}
                      setCollapsedNodes={setCollapsedNodes}
                      nodePath={thisPath + '.item'}
                    />
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
      <button
        className="mt-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs flex items-center gap-1 transition border border-gray-300"
        onClick={addField}
        type="button"
      >
        <Plus size={12} /> Add Field
      </button>
    </div>
  );
}

// --- OpenAPI-compatible fieldsToSchema ---
function fieldsToSchema(fields: Field[]): Record<string, any> {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const field of fields) {
    let type: any = field.type;
    if (field.allowNull) {
      type = [field.type, 'null'];
    }
    let property: any = { type };
    
    // Handle enum type
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
  // Debug log
  console.log('fieldsToSchema required:', required, fields.map(f => ({ name: f.name, required: f.required })));
  const schema: any = {
    type: 'object',
    properties
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

// --- OpenAPI-compatible schemaToFields ---
function schemaToFields(schema: any): Field[] {
  if (!schema || !schema.properties) return [];
  return Object.entries(schema.properties).map(([name, prop]: [string, any]) => {
    let type = prop.type;
    let allowNull = false;
    if (Array.isArray(type)) {
      allowNull = type.includes('null');
      type = type.find((t: string) => t !== 'null');
    }
    
    // Handle enum type
    if (prop.enum) {
      return {
        name: name ?? '',
        type: 'enum',
        required: (schema.required || []).includes(name),
        allowNull,
        enumValues: prop.enum
      };
    }
    
    return {
      name: name ?? '',
      type: type || 'string',
      required: (schema.required || []).includes(name),
      allowNull,
      fields: type === 'object' ? schemaToFields(prop) : [],
      itemType: type === 'array' ? (Array.isArray(prop.items?.type) ? prop.items.type[0] : prop.items?.type || 'string') : 'string',
      itemFields: type === 'array' && prop.items?.type === 'object' ? schemaToFields(prop.items) : [],
    };
  });
}

// --- TypeScript-like to JSON Schema parser ---
function parseTypeScriptToJsonSchema(ts: string) {
  // Remove comments and newlines
  const cleaned = ts
    .replace(/\/\/.*$/gm, '')
    .replace(/[{}]/g, '')
    .replace(/\n/g, '')
    .trim();
  if (!cleaned) return null;
  const lines = cleaned.split(';').map(l => l.trim()).filter(Boolean);
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (let line of lines) {
    // Match: name: type
    const match = line.match(/^([a-zA-Z0-9_]+):\s*([a-zA-Z0-9_\"' |]+)$/);
    if (!match) continue;
    const name = match[1];
    let type = match[2].replace(/['"]/g, '').trim();
    
    // Handle nullable types
    let allowNull = false;
    if (type.includes('null')) {
      allowNull = true;
      type = type.replace('| null', '').replace('null |', '').trim();
    }

    // Handle enums (values in quotes separated by |)
    if (type.includes('|')) {
      const enumValues = type.split('|').map(v => v.trim().replace(/['"]/g, ''));
      properties[name] = {
        type: allowNull ? ['string', 'null'] : 'string',
        enum: enumValues
      };
      if (!allowNull) required.push(name);
      continue;
    }

    // Map TS types to JSON Schema types
    let jsonType = 'string';
    if (type === 'string') jsonType = 'string';
    else if (type === 'number') jsonType = 'number';
    else if (type === 'boolean') jsonType = 'boolean';
    else if (type === 'object') jsonType = 'object';
    else if (type === 'array' || type === 'any[]') jsonType = 'array';
    else if (type === 'null') continue; // skip null fields
    else if (type === 'Date') jsonType = 'string'; // Handle Date type as string

    properties[name] = { type: allowNull ? [jsonType, 'null'] : jsonType };
    if (!allowNull) required.push(name);
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {})
  };
}

// Add a recursive DynamicForm component for object/array types
interface DynamicFormProps {
  schema: any;
  formData: any;
  setFormData: (data: any) => void;
  path?: string;
}
function DynamicForm({ schema, formData, setFormData, path = '' }: DynamicFormProps) {
  if (!schema || !schema.properties) return null;
  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([key, prop]) => {
        const fullPath = path ? `${path}.${key}` : key;
        const typedProp = prop as any;
        if (typedProp.type === 'object') {
          return (
            <div key={fullPath} className="border rounded p-2 bg-gray-50">
              <div className="font-semibold text-xs mb-1">{key} (object)</div>
              <DynamicForm
                schema={typedProp}
                formData={formData[key] || {}}
                setFormData={(subData: any) => setFormData({ ...formData, [key]: subData })}
                path={fullPath}
              />
            </div>
          );
        }
        if (typedProp.type === 'array') {
          // If items is empty, default to string
          const itemSchema = typedProp.items && Object.keys(typedProp.items).length > 0
            ? typedProp.items
            : { type: 'string' };

          return (
            <div key={fullPath} className="border rounded p-2 bg-gray-50">
              <div className="font-semibold text-xs mb-1">{key} (array)</div>
              {(formData[key] || []).map((item: any, idx: number) => (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  {itemSchema.type === 'object' ? (
                    <DynamicForm
                      schema={itemSchema}
                      formData={item}
                      setFormData={(itemData: any) => {
                        const arr = [...(formData[key] || [])];
                        arr[idx] = itemData;
                        setFormData({ ...formData, [key]: arr });
                      }}
                      path={fullPath + `[${idx}]`}
                    />
                  ) : (
                    <input
                      className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50"
                      type={itemSchema.type === 'number' ? 'number' : itemSchema.type === 'boolean' ? 'checkbox' : 'text'}
                      value={itemSchema.type === 'boolean' ? undefined : item ?? ''}
                      checked={itemSchema.type === 'boolean' ? !!item : undefined}
                      onChange={e => {
                        let value: any = e.target.value;
                        if (itemSchema.type === 'number') value = Number(value);
                        if (itemSchema.type === 'boolean') value = e.target.checked;
                        const arr = [...(formData[key] || [])];
                        arr[idx] = value;
                        setFormData({ ...formData, [key]: arr });
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => {
                      const arr = [...(formData[key] || [])];
                      arr.splice(idx, 1);
                      setFormData({ ...formData, [key]: arr });
                    }}
                  >Remove</button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-blue-600"
                onClick={() => setFormData({ ...formData, [key]: [...(formData[key] || []), itemSchema.type === 'object' ? {} : itemSchema.type === 'boolean' ? false : '' ] })}
              >Add Item</button>
            </div>
          );
        }
        // Primitive types
        return (
          <div key={fullPath}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{key}</label>
            <input
              className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50"
              type={typedProp.type === 'number' ? 'number' : typedProp.type === 'boolean' ? 'checkbox' : 'text'}
              value={typedProp.type === 'boolean' ? undefined : formData[key] ?? ''}
              checked={typedProp.type === 'boolean' ? !!formData[key] : undefined}
              onChange={e => {
                let value: any = e.target.value;
                if (typedProp.type === 'number') value = Number(value);
                if (typedProp.type === 'boolean') value = e.target.checked;
                setFormData({ ...formData, [key]: value });
              }}
              required={schema.required?.includes(key)}
            />
          </div>
        );
      })}
    </div>
  );
}

// Add a helper to generate a random id
function generateRandomId() {
  return Math.random().toString(36).substring(2, 12);
}

const SchemaService = () => {
  const [showModal, setShowModal] = useState(false);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([{ name: '', type: 'string', children: [] }]);
  const [schemaName, setSchemaName] = useState('');
  const [jsonSchema, setJsonSchema] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validated, setValidated] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [dataFormSchema, setDataFormSchema] = useState<any>(null);
  const [dataForm, setDataForm] = useState<any>({});
  const [dataTableName, setDataTableName] = useState<string>('');
  const [tableMetaStatusById, setTableMetaStatusById] = useState<{ [metaId: string]: string }>({});

  // Bidirectional sync: update JSON editor from form fields if not editing JSON
  useEffect(() => {
    if (!isEditingJson) {
      setJsonSchema(JSON.stringify(fieldsToSchema(fields), null, 2));
    }
    // eslint-disable-next-line
  }, [fields]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIsEditingJson(true);
    setJsonSchema(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setJsonError(null);
      if (
        (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && Object.keys(parsed).length > 0) ||
        (Array.isArray(parsed) && parsed.length > 0)
      ) {
        setFields(schemaToFields(parsed));
        setIsEditingJson(false);
      }
      // If parsed is empty ({} or []), do not update fields or clear anything
    } catch {
      setJsonError('Invalid JSON');
      // Do not update fields if JSON is invalid
    }
  };

  const handleValidate = async () => {
    setValidated(false);
    setSaveMessage('');
    setValidationResult(null);
    let schemaToValidate;
    try {
      schemaToValidate = JSON.parse(jsonSchema);
    } catch (err) {
      setValidationResult({ error: 'Invalid JSON in schema editor.' });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/schema/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: schemaToValidate })
      });
      const result = await res.json();
      setValidationResult(result);
      if (result.valid) setValidated(true);
    } catch {
      setValidationResult({ error: 'Validation failed.' });
    }
  };

  const handleConvertRawFields = () => {
    setRawFieldsError(null);
    const parsed = parseTypeScriptToJsonSchema(rawFields);
    if (!parsed) {
      setRawFieldsError('Could not parse the input. Please check the format.');
      return;
    }
    setJsonSchema(JSON.stringify(parsed, null, 2));
    setFields(schemaToFields(parsed));
    setIsEditingJson(false);
  };

  // Fetch all schemas
  const fetchSchemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/schema/list`);
      const data = await res.json();
      setSchemas(data);
    } catch (err) {
      setError('Failed to fetch schemas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete schema
  const handleDeleteSchema = async (schemaId: string) => {
    if (!confirm('Are you sure you want to delete this schema?')) return;
    
    try {
      const res = await fetch(`${API_URL}/schema/${schemaId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSchemas(schemas.filter(s => s.id !== schemaId));
      } else {
        throw new Error('Failed to delete schema');
      }
    } catch (err) {
      setError('Failed to delete schema');
      console.error(err);
    }
  };

  // Load schema for editing
  const handleEditSchema = (schema: any) => {
    setEditingSchemaId(schema.id);
    setSchemaName(schema.schemaName);
    setJsonSchema(JSON.stringify(schema.schema, null, 2));
    setFields(schemaToFields(schema.schema));
    setShowModal(true);
  };

  // Reset form state
  const resetForm = () => {
    setEditingSchemaId(null);
    setSchemaName('');
    setJsonSchema('{}');
    setFields([{ name: '', type: 'string', children: [] }]);
    setJsonError(null);
    setValidationResult(null);
    setValidated(false);
    setSaveMessage('');
    setRawFields('');
    setRawFieldsError(null);
  };

  // Handle save/create/update
  const handleSave = async () => {
    setSaveMessage('');
    if (!schemaName.trim()) {
      setSaveMessage('Schema name is required.');
      return;
    }
    let schemaToSave;
    try {
      schemaToSave = JSON.parse(jsonSchema);
    } catch {
      setSaveMessage('Invalid JSON in schema editor.');
      return;
    }

    try {
      const url = editingSchemaId 
        ? `${API_URL}/schema/${editingSchemaId}`
        : `${API_URL}/schema/create`;
      
      const method = editingSchemaId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaName,
          schema: schemaToSave,
          methodId: 'manual'
        })
      });

      const result = await res.json();
      
      if (result.schemaId || result.id) {
        setSaveMessage('Schema saved successfully!');
        await fetchSchemas(); // Refresh the list
        setShowModal(false);
        resetForm();
      } else {
        setSaveMessage('Failed to save schema.');
      }
    } catch {
      setSaveMessage('Save error.');
    }
  };

  // After fetching schemas, fetch table meta status for each schema with a meta id
  useEffect(() => {
    const fetchTableMetas = async () => {
      const metas: { [metaId: string]: string } = {};
      await Promise.all(
        schemas.map(async (schema) => {
          const metaId = schema['brmh-schema-table-data-id'];
          if (metaId) {
            try {
              const res = await fetch(`${API_URL}/schema/table-meta/${metaId}`);
              if (res.ok) {
                const data = await res.json();
                metas[metaId] = data.status;
              }
            } catch {}
          }
        })
      );
      setTableMetaStatusById(metas);
    };
    if (schemas.length > 0) fetchTableMetas();
  }, [schemas]);

  // Load schemas on component mount
  useEffect(() => {
    fetchSchemas();
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Schema Management</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          Create Schema
        </button>
      </div>

      {/* Schema List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading schemas...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : schemas.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No schemas found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schemas.map((schema) => {
                  const metaId = schema['brmh-schema-table-data-id'];
                  const isTableActive = metaId && tableMetaStatusById[metaId] === 'ACTIVE';
                  return (
                    <tr key={schema.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {schema.schemaName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schema.isArray ? 'Array' : schema.originalType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(schema.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(schema.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-2 justify-end">
                          {!isTableActive && (
                            <button
                              type="button"
                              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-full shadow-sm hover:from-blue-600 hover:to-blue-500 hover:shadow-md transition font-semibold text-xs"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${API_URL}/schema/table`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ schemaId: schema.id, tableName: schema.schemaName })
                                  });
                                  const data = await res.json();
                                  if (res.ok) {
                                    alert('Table created successfully!');
                                  } else {
                                    alert('Failed to create table: ' + (data.error || 'Unknown error'));
                                  }
                                } catch (err) {
                                  alert('Failed to create table: ' + err);
                                }
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" />
                                <path d="M3 10h18M9 21V7" stroke="currentColor" />
                              </svg>
                              Create Table
                            </button>
                          )}
                          <button
                            type="button"
                            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-400 text-white rounded-full shadow-sm hover:from-green-600 hover:to-green-500 hover:shadow-md transition font-semibold text-xs"
                            onClick={() => {
                              setDataFormSchema(schema.schema);
                              setDataTableName(schema.tableName || schema.schemaName);
                              setDataForm({});
                              setShowDataModal(true);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" />
                              <path d="M8 12h8M12 8v8" stroke="currentColor" />
                            </svg>
                            Create Data
                          </button>
                          <span className="mx-2 border-l border-gray-200 h-5"></span>
                          <button
                            onClick={() => handleEditSchema(schema)}
                            aria-label="Edit"
                            className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition flex items-center justify-center"
                            type="button"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M12 20h9" strokeLinecap="round"/>
                              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" strokeLinecap="round"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSchema(schema.id)}
                            aria-label="Delete"
                            className="p-2 rounded-full hover:bg-red-100 text-red-600 transition flex items-center justify-center"
                            type="button"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Schema Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-7xl relative z-10 max-h-[98vh] flex flex-col overflow-hidden border border-gray-200">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-2 tracking-tight text-gray-900">
              {editingSchemaId ? 'Edit Schema' : 'Create Schema'}
            </h2>
            <input
              className="border border-gray-300 p-2 rounded-lg mb-3 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition outline-none bg-gray-50 placeholder-gray-400 max-w-xs w-full"
              placeholder="Schema Name (required)"
              value={schemaName}
              onChange={e => setSchemaName(e.target.value)}
              required
            />
            <div className="flex flex-col md:flex-row gap-0 md:gap-6 flex-1 min-h-0 w-full overflow-hidden">
              {/* Recursive Form */}
              <div className="flex-1 min-w-0 max-w-full overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto', minWidth: 0 }}>
                <div className="font-semibold mb-2 text-base text-gray-800">Form Editor</div>
                <div className="border-b border-gray-200 mb-2" />
                <NestedFieldsEditor fields={fields} onChange={setFields} collapsedNodes={collapsedNodes} setCollapsedNodes={setCollapsedNodes} nodePath="root" />
              </div>
              {/* Divider for desktop */}
              <div className="hidden md:block w-px bg-gray-200 mx-4" />
              {/* JSON Tree (simple textarea) */}
              <div className="flex-1 min-w-0 max-w-full flex flex-col mt-4 md:mt-0">
                {/* New: Raw fields input */}
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
                  {/* OpenAPI 3.0+ spec: Use <code>type: ["string", "null"]</code> for nullable fields, and <code>required: ["field1", ...]</code> for required fields. */}
                  <span>OpenAPI 3.0+ spec: Use <code>type: ["string", "null"]</code> for nullable fields, and <code>required: ["field1", ...]</code> for required fields.</span>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg">
                  <textarea
                    className="w-full h-full border-0 rounded-lg p-2 font-mono text-xs resize-none bg-transparent focus:outline-none text-gray-800"
                    value={jsonSchema}
                    onChange={handleJsonChange}
                    spellCheck={false}
                    style={{ minHeight: 180, maxHeight: '40vh', overflow: 'auto' }}
                  />
                  {jsonError && (
                    <div className="text-xs text-red-600 mt-1">{jsonError}</div>
                  )}
                </div>
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
                onClick={handleSave}
              >
                {editingSchemaId ? 'Update' : 'Create'}
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
      )}

      {showDataModal && dataFormSchema && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col relative z-10 max-h-[95vh] border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold">Create Data for {dataTableName}</h2>
              <button className="text-gray-500 hover:text-gray-700 text-xl" onClick={() => setShowDataModal(false)}>✕</button>
            </div>
            {/* Main content */}
            <div className="flex-1 flex min-h-0">
              {/* Schema view */}
              <div className="w-1/2 border-r bg-gray-50 p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 64px - 64px)' }}>
                <div className="font-semibold text-sm mb-2">Schema</div>
                <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">{JSON.stringify(dataFormSchema, null, 2)}</pre>
              </div>
              {/* Data form */}
              <div className="w-1/2 p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 64px - 64px)' }}>
                <DynamicForm
                  schema={dataFormSchema}
                  formData={dataForm}
                  setFormData={setDataForm}
                />
              </div>
            </div>
            {/* Sticky action bar */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white rounded-b-2xl z-10">
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition"
                onClick={async () => {
                  const itemToSave = { ...dataForm };
                  if (!itemToSave.id) {
                    itemToSave.id = generateRandomId();
                  }
                  const res = await fetch(`${API_URL}/schema/data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tableName: dataTableName,
                      item: itemToSave
                    })
                  });
                  if (res.ok) {
                    alert('Data saved!');
                    setShowDataModal(false);
                  } else {
                    let errMsg = 'Unknown error';
                    try {
                      const err = await res.json();
                      errMsg = err.error || errMsg;
                    } catch {}
                    alert('Failed to save data: ' + errMsg);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemaService;