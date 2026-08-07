import React, { useState, useEffect } from 'react';
import { NestedFieldsEditor, schemaToFields } from '../components/SchemaService';
import RecursiveDataForm from '../../components/common/RecursiveDataForm';
import MockDataPanel from '../components/MockDataPanel';
import Ajv from 'ajv';
import { v4 as uuidv4 } from 'uuid';
import { Edit, PlusCircle, RefreshCw, Eye, Trash2 } from "lucide-react";

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
      } else if (field.itemType === 'schema') {
        property.items = { 
          $ref: `#/components/schemas/${field.schemaId}`,
          type: field.allowNull ? ['object', 'null'] : 'object'
        };
      } else {
        property.items = { type: field.allowNull ? [field.itemType, 'null'] : field.itemType };
      }
    } else if (field.type === 'schema') {
      property = {
        $ref: `#/components/schemas/${field.schemaId}`,
        type: field.allowNull ? ['object', 'null'] : 'object'
      };
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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

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
  // Resolved schema state
  const [resolvedView, setResolvedView] = useState(false);
  const [resolvedSchema, setResolvedSchema] = useState<any | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'createData' | 'updateData' | 'readData' | 'deleteData'>('edit');
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

  // 1. Add state for accounts and selected account
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccountForData, setSelectedAccountForData] = useState<string>('');
  const [methodName, setMethodName] = useState<string>('');
  const [resolvedNamespaceName, setResolvedNamespaceName] = useState('');

  // Add state for update, read, delete forms
  const [updateKey, setUpdateKey] = useState('');
  const [updateFields, setUpdateFields] = useState('');
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [readKey, setReadKey] = useState('');
  const [readResult, setReadResult] = useState<string | null>(null);
  const [readAllResult, setReadAllResult] = useState<string | null>(null);

  // Mock data panel state
  const [showMockDataPanel, setShowMockDataPanel] = useState(false);
  const [deleteKey, setDeleteKey] = useState('');
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  
  // Auto-fill mock data state
  const [isGeneratingMockData, setIsGeneratingMockData] = useState(false);
  const [mockDataContext, setMockDataContext] = useState('');
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);

  // If query param create=1 is present, ensure we're in create mode (no-op if editing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === '1') {
        // No explicit UI needed; page defaults to editor ready for creation
      }
    }
  }, []);

  // 2. Fetch accounts for the namespace on mount or when schemaObj changes
  useEffect(() => {
    const nsId = namespace?.['namespace-id'] || schemaObj?.namespaceId;
    if (!nsId) return;
    fetch(`${API_BASE_URL}/unified/namespaces/${nsId}/accounts`)
      .then(res => res.json())
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, [namespace, schemaObj]);



  // 3. Fetch method name if methodId is present, but prefer schemaObj.methodName
  useEffect(() => {
    if (schemaObj && schemaObj.methodName) {
      setMethodName(schemaObj.methodName);
    } else if (methodId) {
      fetch(`${API_BASE_URL}/unified/methods/${methodId}`)
        .then(res => res.json())
        .then(methodData => {
          const name = methodData.data
            ? methodData.data['namespace-method-name'] || methodData.data['methodName']
            : methodData['namespace-method-name'] || methodData['methodName'];
          setMethodName(name || '');
        })
        .catch(() => setMethodName(''));
    } else {
      setMethodName('');
    }
  }, [schemaObj, methodId]);

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
            // Invalidate previously resolved schema when switching
            setResolvedSchema(null);
            setResolveError(null);
          } else {
            setSchemaObj(null);
            setTableName(null);
            setResolvedSchema(null);
            setResolveError(null);
          }
        }
      } catch {
        setSchemaObj(null);
        setTableName(null);
        setResolvedSchema(null);
        setResolveError('');
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

  // Load resolved schema from backend using schema id
  const loadResolvedSchema = async () => {
    if (!schemaObj || !(schemaObj.id || schemaObj.schemaId)) {
      setResolveError('Save the schema first to view resolved references.');
      return;
    }
    setIsResolving(true);
    setResolveError(null);
    try {
      const id = schemaObj.id || schemaObj.schemaId;
      const res = await fetch(`${API_BASE_URL}/unified/schema/${id}/resolved?resolveReferences=true`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to resolve schema');
      }
      const data = await res.json();
      // Prefer data.schema if present, else the whole response
      const resolved = data.schema ? data.schema : data;
      setResolvedSchema(resolved);
    } catch (err: any) {
      setResolveError(err.message || 'Failed to resolve schema');
    } finally {
      setIsResolving(false);
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
      let methodNameToSave = null;
      if (methodId) {
        try {
          const methodRes = await fetch(`${API_BASE_URL}/unified/methods/${methodId}`);
          if (methodRes.ok) {
            const methodData = await methodRes.json();
            methodNameToSave = methodData.data
              ? methodData.data['namespace-method-name'] || methodData.data['methodName']
              : methodData['namespace-method-name'] || methodData['methodName'];
          }
        } catch (err) {
          // fallback: leave as null
        }
      }

      const payload = {
        methodId: methodId || null,
        schemaName: schemaName.trim(),
        methodName: methodNameToSave,
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
      // Refresh resolved schema view after successful save if in edit mode
      if (isEditing) {
        try {
          await loadResolvedSchema();
        } catch {}
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

  // When the modal opens, resolve the namespace name if needed
  useEffect(() => {
    if (!showTableModal) return;
    let nsName = namespace?.['namespace-name'] || schemaObj?.namespaceName;
    const nsId = namespace?.['namespace-id'] || schemaObj?.namespaceId;
    if (!nsName && nsId) {
      fetch(`${API_BASE_URL}/unified/namespaces/${nsId}`)
        .then(res => res.json())
        .then(ns => setResolvedNamespaceName(ns['namespace-name'] || ''))
        .catch(() => setResolvedNamespaceName(''));
    } else {
      setResolvedNamespaceName(nsName || '');
    }
  }, [showTableModal, namespace, schemaObj]);

  // Auto-generate table name when modal opens or dependencies change, using resolvedNamespaceName
  useEffect(() => {
    if (!showTableModal) return;
    const nsName = (resolvedNamespaceName || '').toLowerCase().replace(/\s+/g, '-');
    const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountId);
    const accName = (acc?.['namespace-account-name'] || '').toLowerCase().replace(/\s+/g, '-');
    const mName = (methodName || '').toLowerCase().replace(/\s+/g, '-');
    if (nsName && accName && mName) {
      setNewTableName(`${nsName}-${accName}-${mName}`);
    }
  }, [showTableModal, resolvedNamespaceName, accounts, selectedAccountId, methodName]);

  const getStringId = (id: any) => (typeof id === 'object' && id !== null && 'S' in id ? id.S : id);

  // Handle mock data insertion
  const handleInsertMockData = async (data: any[]) => {
    try {
      const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
      const tableNameMap = acc?.tableName || {};
      const tableNameForMethod = tableNameMap[methodName];
      
      if (!tableNameForMethod) {
        throw new Error('No table exists for this account and method. Please create a table first.');
      }

      for (const item of data) {
        const res = await fetch(`${API_BASE_URL}/crud?tableName=${tableNameForMethod}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to insert data');
        }
      }
      
      setCreateDataResult(`Successfully inserted ${data.length} record(s)`);
      setFormData({});
    } catch (err) {
      setCreateDataResult('Error: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    }
  };



  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header Section - Method and Schema Name */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Method:</span> {methodName || <span className="italic text-gray-400">None</span>}
            </div>
            {namespace && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Namespace:</span> {namespace['namespace-name']}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700" htmlFor="schema-name">
              Schema Name <span className="text-red-500">*</span>
            </label>
            <input
              id="schema-name"
              className="border border-gray-200 px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-white placeholder-gray-400 w-48"
              placeholder="Schema Name (required)"
              value={schemaName}
              onChange={e => {
                setSchemaName(e.target.value);
                if (onSchemaNameChange) onSchemaNameChange(e.target.value);
              }}
              required
            />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <nav className="flex gap-1 px-4 py-2 overflow-x-auto" role="tablist">
          {[
            { key: 'edit', label: 'Edit Schema', icon: <Edit size={14} /> },
            { key: 'createData', label: 'Create Data', icon: <PlusCircle size={14} /> },
            { key: 'updateData', label: 'Update Data', icon: <RefreshCw size={14} /> },
            { key: 'readData', label: 'Read Data', icon: <Eye size={14} /> },
            { key: 'deleteData', label: 'Delete Data', icon: <Trash2 size={14} /> },
          ].map(tab => (
            (tab.key === 'edit' || isEditing) && (
        <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition
                  ${activeTab === tab.key
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                {tab.icon}
                <span>{tab.label}</span>
        </button>
            )
          ))}
        </nav>
      </div>

      {/* Edit Schema Tab */}
      {activeTab === 'edit' && (
        <>
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 w-full px-4 pb-4">
        {/* Form Editor */}
        <div className="flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <div className="font-semibold text-sm text-gray-800">Form Editor</div>
            <div className="text-xs text-gray-500">
              {fields.length} fields
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NestedFieldsEditor fields={fields} onChange={setFields} collapsedNodes={collapsedNodes} setCollapsedNodes={setCollapsedNodes} nodePath="root" />
          </div>
        </div>

        {/* JSON Schema Editor */}
        <div className="flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <div className="font-semibold text-sm text-gray-800">JSON Schema Editor</div>
            <div className="flex items-center space-x-2">
              <button
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs border border-gray-200 font-medium transition"
                onClick={() => {
                  try {
                    setJsonSchema(JSON.stringify(JSON.parse(jsonSchema), null, 2));
                  } catch {}
                }}
                title="Format JSON"
              >
                Format
              </button>
              <button
                className={`px-2 py-1 rounded text-xs border font-medium transition ${resolvedView ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'}`}
                onClick={async () => {
                  const next = !resolvedView;
                  setResolvedView(next);
                  if (next && !resolvedSchema) {
                    await loadResolvedSchema();
                  }
                }}
                title="Toggle resolved view"
              >
                {isResolving ? 'Resolving...' : (resolvedView ? 'Resolved ✓' : 'Resolved')}
              </button>
            </div>
          </div>
          
          {/* Raw Fields Section */}
          <div className="border-b border-gray-100">
            <div
              className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => setShowRawFields(v => !v)}
            >
              <span className="text-xs font-medium text-gray-700">TypeScript/Raw Fields</span>
              <span className="text-blue-500 text-xs">{showRawFields ? '▲' : '▼'}</span>
            </div>
            {showRawFields && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <textarea
                  className="w-full border border-gray-200 rounded p-2 font-mono text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder={`Paste fields like:\nid: string;\nemail: string;\nrole: \"ADMIN\" | \"USER\";\ndepartmentId: string | null;`}
                  value={rawFields}
                  onChange={e => setRawFields(e.target.value)}
                  rows={3}
                  style={{ minHeight: 50 }}
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium border border-blue-600 transition"
                    onClick={handleConvertRawFields}
                    type="button"
                  >
                    Convert to JSON Schema
                  </button>
                  {rawFieldsError && (
                    <div className="text-xs text-red-600">{rawFieldsError}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* JSON Schema Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-500">
                OpenAPI 3.0+ spec: Use type: <code>["string", "null"]</code> for nullable fields, and <code>required: ["field1", ...]</code> for required fields.
              </div>
            </div>
            {resolvedView ? (
              <textarea
                className="flex-1 border-0 p-3 font-mono text-xs bg-white focus:outline-none focus:ring-0 resize-none overflow-y-auto"
                value={resolvedSchema ? JSON.stringify(resolvedSchema, null, 2) : (resolveError ? `// ${resolveError}` : (isResolving ? '// Resolving...' : '// No resolved schema yet'))}
                readOnly
              />
            ) : (
              <textarea
                className="flex-1 border-0 p-3 font-mono text-xs bg-white focus:outline-none focus:ring-0 resize-none overflow-y-auto"
                value={jsonSchema}
                onChange={handleJsonChange}
              />
            )}
            {jsonError && (
              <div className="p-2 border-t border-gray-100 bg-red-50">
                <div className="text-xs text-red-600">{jsonError}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Sticky action buttons */}
      <div className="flex flex-col md:flex-row justify-end md:gap-2 gap-2 mt-3 bg-white pt-2 pb-1 border-t border-gray-100 px-4">
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-xs font-medium w-full md:w-auto transition"
          onClick={handleValidate}
        >
          Validate
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium w-full md:w-auto transition"
          disabled={isSaving}
          onClick={handleSave}
        >
              {isEditing ? (isSaving ? 'Saving...' : 'Edit') : (isSaving ? 'Saving...' : 'Create')}
        </button>
        {isEditing && schemaObj && (schemaObj.id || schemaObj.schemaId) && (
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium w-full md:w-auto transition"
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
        <div className="mt-2 px-4">
          <div className="font-semibold text-xs">Validation Result:</div>
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(validationResult, null, 2)}
          </pre>
        </div>
      )}
      {saveMessage && (
        <div className="mt-2 text-blue-700 font-semibold text-xs px-4">{saveMessage}</div>
          )}
        </>
      )}

      {/* Create Data Tab */}
      {isEditing && activeTab === 'createData' && (
        <div className="px-8 pb-8">
          <h2 className="text-lg font-semibold mb-4">Create Data for Table</h2>
          
          <label className="block text-sm font-medium mb-2">Account</label>
          <select
            className="border border-gray-200 p-2 rounded text-xs w-full mb-3"
            value={selectedAccountForData}
            onChange={e => setSelectedAccountForData(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map(acc => (
              <option key={acc['namespace-account-id']} value={acc['namespace-account-id']}>
                {acc['namespace-account-name']}
              </option>
            ))}
          </select>
          {selectedAccountForData && (() => {
            const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
            const tableNameMap = acc?.tableName || {};
            const tableNameForMethod = tableNameMap[methodName];
            if (!tableNameForMethod) {
              return (
            <div>
                  <div className="text-red-600 mb-2">
                    No table exists for this account and method. Please create a table first.
                  </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
                onClick={() => {
                  setShowTableModal(true);
                      setSelectedAccountId(selectedAccountForData); // pre-select account
                      setNewTableName(''); // or auto-generate
                  setTableCreateError(null);
                }}
              >
                Create Table
                    </button>
                  </div>
              );
            }
            // If table exists, show the form
            return (
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
                  // Ensure partition key is present (assume 'id' as PK, update if needed)
                  const partitionKey = 'id'; // Change this if your PK is different
                  const dataToSend: Record<string, any> = { ...(typeof formData === 'object' && formData !== null ? formData : {}) };
                  if (!dataToSend[partitionKey]) {
                    dataToSend[partitionKey] = uuidv4();
                  }
                  const res = await fetch(`${API_BASE_URL}/crud?tableName=${tableNameForMethod}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item: dataToSend }),
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

              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create
                </button>
                <button
                  type="button"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  onClick={() => {
                    const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
                    const tableNameMap = acc?.tableName || {};
                    const tableNameForMethod = tableNameMap[methodName];
                    if (tableNameForMethod) {
                      setShowMockDataPanel(true);
                    } else {
                      setCreateDataResult('Error: No table exists for this account and method. Please create a table first.');
                    }
                  }}
                >
                  Insert Mock Data
                </button>
              </div>
              {formErrors && (
                <div className="mt-2 text-xs text-red-600">{formErrors}</div>
              )}
              {createDataResult && (
                <div className="mt-2 text-xs">{createDataResult}</div>
              )}
            </form>
            );
          })()}
        </div>
      )}
      {/* Update Data Tab */}
      {isEditing && activeTab === 'updateData' && (
        <div className="px-4 pb-4">
          <h2 className="text-base font-semibold mb-3">Update Data in Table</h2>
          <label className="block text-xs font-medium mb-1">Account</label>
          <select
            className="border border-gray-200 p-2 rounded text-xs w-full mb-3"
            value={selectedAccountForData}
            onChange={e => setSelectedAccountForData(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map(acc => (
              <option key={acc['namespace-account-id']} value={acc['namespace-account-id']}>
                {acc['namespace-account-name']}
              </option>
            ))}
          </select>
          {selectedAccountForData && (() => {
            const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
            const tableNameMap = acc?.tableName || {};
            const tableNameForMethod = tableNameMap[methodName];
            if (!tableNameForMethod) {
              return <div className="text-red-600 mb-2">No table exists for this account and method. Please create a table first.</div>;
            }
            return (
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  setUpdateResult(null);
                  try {
                    const key = JSON.parse(updateKey || '{}');
                    const updates = JSON.parse(updateFields || '{}');
                    const res = await fetch(`${API_BASE_URL}/crud?tableName=${tableNameForMethod}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key, updates }),
                    });
                    const data = await res.json();
                    setUpdateResult(JSON.stringify(data, null, 2));
                  } catch (err: any) {
                    setUpdateResult('Error: ' + err.message);
                  }
                }}
                className="max-w-xl"
              >
                <label className="block text-xs font-medium mb-1">Key (JSON)</label>
                <input
                  className="border border-gray-200 p-2 rounded text-xs w-full mb-2 font-mono"
                  value={updateKey}
                  onChange={e => setUpdateKey(e.target.value)}
                  placeholder='{"id": "..."}'
                  required
                />
                <label className="block text-xs font-medium mb-1">Updates (JSON)</label>
                <input
                  className="border border-gray-200 p-2 rounded text-xs w-full mb-2 font-mono"
                  value={updateFields}
                  onChange={e => setUpdateFields(e.target.value)}
                  placeholder='{"field1": "new value"}'
                  required
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs mt-2">Update</button>
                {updateResult ? <div className="mt-2 text-xs"><pre>{updateResult}</pre></div> : null}
              </form>
            );
          })()}
        </div>
      )}
      {/* Read Data Tab */}
      {isEditing && activeTab === 'readData' && (
        <div className="px-4 pb-4">
          <h2 className="text-base font-semibold mb-3">Read Data from Table</h2>
          <label className="block text-xs font-medium mb-1">Account</label>
          <select
            className="border border-gray-200 p-2 rounded text-xs w-full mb-3"
            value={selectedAccountForData}
            onChange={e => setSelectedAccountForData(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map(acc => (
              <option key={acc['namespace-account-id']} value={acc['namespace-account-id']}>
                {acc['namespace-account-name']}
              </option>
            ))}
          </select>
          {selectedAccountForData && (() => {
            const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
            const tableNameMap = acc?.tableName || {};
            const tableNameForMethod = tableNameMap[methodName];
            if (!tableNameForMethod) {
              return <div className="text-red-600 mb-2">No table exists for this account and method. Please create a table first.</div>;
            }
            return (
              <div>
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    setReadResult(null);
                    try {
                      const key = JSON.parse(readKey || '{}');
                      const params = new URLSearchParams({ tableName: tableNameForMethod, ...key }).toString();
                      const res = await fetch(`${API_BASE_URL}/crud?${params}`, { method: 'GET' });
                      const data = await res.json();
                      setReadResult(JSON.stringify(data, null, 2));
                    } catch (err: any) {
                      setReadResult('Error: ' + err.message);
                    }
                  }}
                  className="max-w-xl"
                >
                                  <label className="block text-xs font-medium mb-1">Key (JSON, optional)</label>
                <input
                  className="border border-gray-200 p-2 rounded text-xs w-full mb-2 font-mono"
                  value={readKey}
                  onChange={e => setReadKey(e.target.value)}
                  placeholder='{"id": "..."}'
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs mt-2">Read</button>
                {readResult ? <div className="mt-2 text-xs"><pre>{readResult}</pre></div> : null}
              </form>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs mt-3"
                onClick={async () => {
                    setReadAllResult(null);
                    try {
                      const params = new URLSearchParams({
                        tableName: tableNameForMethod,
                        pagination: 'true',
                        itemPerPage: '50',
                        maxPage: '1',
                      }).toString();
                      const res = await fetch(`${API_BASE_URL}/crud?${params}`, { method: 'GET' });
                      const data = await res.json();
                      setReadAllResult(JSON.stringify(data, null, 2));
                    } catch (err: any) {
                      setReadAllResult('Error: ' + err.message);
                    }
                  }}
                >Read All</button>
                {readAllResult ? <div className="mt-2 text-xs"><pre>{readAllResult}</pre></div> : null}
              </div>
            );
          })()}
        </div>
      )}
      {/* Delete Data Tab */}
      {isEditing && activeTab === 'deleteData' && (
        <div className="px-4 pb-4">
          <h2 className="text-base font-semibold mb-3">Delete Data from Table</h2>
          <label className="block text-xs font-medium mb-1">Account</label>
          <select
            className="border border-gray-200 p-2 rounded text-xs w-full mb-3"
            value={selectedAccountForData}
            onChange={e => setSelectedAccountForData(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map(acc => (
              <option key={acc['namespace-account-id']} value={acc['namespace-account-id']}>
                {acc['namespace-account-name']}
              </option>
            ))}
          </select>
          {selectedAccountForData && (() => {
            const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
            const tableNameMap = acc?.tableName || {};
            const tableNameForMethod = tableNameMap[methodName];
            if (!tableNameForMethod) {
              return <div className="text-red-600 mb-2">No table exists for this account and method. Please create a table first.</div>;
            }
            return (
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  setDeleteResult(null);
                  try {
                    const key = JSON.parse(deleteKey || '{}');
                    const res = await fetch(`${API_BASE_URL}/crud?tableName=${tableNameForMethod}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(key),
                    });
                    const data = await res.json();
                    setDeleteResult(JSON.stringify(data, null, 2));
                  } catch (err: any) {
                    setDeleteResult('Error: ' + err.message);
                  }
                }}
                className="max-w-xl"
              >
                <label className="block text-xs font-medium mb-1">Key (JSON)</label>
                <input
                  className="border border-gray-200 p-2 rounded text-xs w-full mb-2 font-mono"
                  value={deleteKey}
                  onChange={e => setDeleteKey(e.target.value)}
                  placeholder='{"id": "..."}'
                  required
                />
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs mt-2">Delete</button>
                {deleteResult ? <div className="mt-2 text-xs"><pre>{deleteResult}</pre></div> : null}
              </form>
            );
          })()}
        </div>
      )}
      {/* Move modal here so it always renders when showTableModal is true */}
      {showTableModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30 backdrop-blur-sm"></div>
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-sm relative z-10 border border-gray-200">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowTableModal(false)}
            >✕</button>
            <h2 className="text-base font-semibold mb-3">Create Table for Schema</h2>
            <label className="block text-xs font-medium mb-1">Account</label>
            <select
              className="border border-gray-200 p-2 rounded text-xs w-full mb-2"
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              disabled={!!selectedAccountId}
            >
              <option value="">Select account</option>
              {accounts.map(acc => (
                <option key={acc['namespace-account-id']} value={acc['namespace-account-id']}>
                  {acc['namespace-account-name']}
                </option>
              ))}
            </select>
            <label className="block text-xs font-medium mb-1">Method Name</label>
            <input
              className="border border-gray-200 p-2 rounded text-xs w-full mb-2 bg-gray-100"
              value={methodName}
              readOnly
            />
            <label className="block text-xs font-medium mb-1">Table Name (auto-generated, can override)</label>
            <input
              className="border border-gray-200 p-2 rounded text-xs w-full mb-2"
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              placeholder="Enter table name"
              autoFocus
            />
            {tableCreateError && <div className="text-xs text-red-600 mb-2">{tableCreateError}</div>}
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs w-full"
              disabled={creatingTable || !selectedAccountId || !methodName}
              onClick={async () => {
                if (!selectedAccountId || !methodName) {
                  setTableCreateError('Please select an account and ensure method name is set.');
                  return;
                }
                setCreatingTable(true);
                setTableCreateError(null);
                try {
                  // 1. Fetch schemaId by schemaName
                  const resSchemas = await fetch(`${API_BASE_URL}/unified/schema`);
                  if (!resSchemas.ok) throw new Error('Failed to fetch schemas');
                  const schemas = await resSchemas.json();
                  let schemaId = schemas.find((s: any) => s.schemaName === schemaName)?.id || schemas.find((s: any) => s.schemaName === schemaName)?.schemaId;
                  // Ensure schemaId and accountId are plain strings
                  const schemaIdStr = getStringId(schemaId);
                  const accountIdStr = getStringId(selectedAccountId);
                  if (!schemaIdStr) throw new Error('Schema ID not found');
                  // 2. Create table (send accountId and methodName)
                  const reqBody = {
                    schemaId: schemaIdStr,
                    accountId: accountIdStr,
                    methodName,
                    tableName: newTableName.trim() || undefined,
                  };
                  console.log('Creating table with:', reqBody);
                  const res = await fetch(`${API_BASE_URL}/unified/schema/table`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqBody),
                  });
                  if (!res.ok) {
                    let errMsg = 'Failed to create table';
                    try {
                      const err = await res.json();
                      errMsg = err.error || errMsg;
                    } catch {}
                    throw new Error(errMsg);
                  }
                  setShowTableModal(false);
                  setSelectedAccountId('');
                  setNewTableName(schemaName || '');
                  setTableCreateError(null);
                } catch (err: any) {
                  setTableCreateError(err.message);
                } finally {
                  setCreatingTable(false);
                }
              }}
            >
              {creatingTable ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </div>
      )}

      {/* Mock Data Panel */}
      <MockDataPanel
        isOpen={showMockDataPanel}
        onClose={() => setShowMockDataPanel(false)}
        tableName={(() => {
          const acc = accounts.find(a => a['namespace-account-id'] === selectedAccountForData);
          const tableNameMap = acc?.tableName || {};
          return tableNameMap[methodName] || '';
        })()}
        schema={JSON.parse(jsonSchema)}
        onInsertData={handleInsertMockData}
        onFillForm={(data) => {
          setFormData(data);
          setShowMockDataPanel(false);
        }}
      />
    </div>
  );
} 