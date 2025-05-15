'use client';
import { useState, useEffect } from 'react';
import Namespace from './components/Namespace';
import SchemaService from './components/SchemaService';
import Tables from './components/Tables';
import LLMTerminal from './components/LLMTerminal';
import SchemaModal from './components/SchemaModal';
import { NestedFieldsEditor, schemaToFields } from './components/SchemaService';

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

const NamespacePage = () => {
  const [activeTab, setActiveTab] = useState('namespace');

  // Modal state for schema creation
  const [showModal, setShowModal] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [schemaName, setSchemaName] = useState('');
  const [jsonSchema, setJsonSchema] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [rawFields, setRawFields] = useState('');
  const [rawFieldsError, setRawFieldsError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [saveMessage, setSaveMessage] = useState('');

  // Bidirectional sync
  useEffect(() => {
    setJsonSchema(JSON.stringify(fieldsToSchema(fields), null, 2));
    // eslint-disable-next-line
  }, [fields]);

  const handleValidate = async (fieldsArg: any[], jsonSchemaArg: string) => {
    setValidationResult(null);
    try {
      const parsed = JSON.parse(jsonSchemaArg);
      setJsonError(null);
      // Make API call to validate schema
      const response = await fetch('http://localhost:5000/schema/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema: parsed })
      });
      if (!response.ok) {
        throw new Error('Validation failed');
      }
      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating schema:', error);
      setJsonError('Invalid JSON or validation failed');
      setValidationResult({ valid: false, message: 'Validation failed. Please check your schema.' });
    }
  };

  const handleSave = async (fieldsArg: any[], jsonSchemaArg: string) => {
    if (!schemaName.trim()) {
      setSaveMessage('Schema name is required.');
      return;
    }
    try {
      const parsed = JSON.parse(jsonSchemaArg);
      setJsonError(null);
      // Make API call to save schema
      const response = await fetch('http://localhost:5000/schema/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schemaName: schemaName.trim(),
          schema: parsed
        })
      });
      if (!response.ok) {
        throw new Error('Failed to save schema');
      }
      const result = await response.json();
      if (result && (result.schemaId || result.id)) {
        setSaveMessage('Schema created successfully!');
        setShowModal(false);
        resetForm();
      } else {
        setSaveMessage(result?.error || 'Failed to save schema. Please try again.');
      }
    } catch (error) {
      console.error('Error saving schema:', error);
      setJsonError('Invalid JSON or save failed');
      setSaveMessage('Failed to save schema. Please try again.');
    }
  };

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

  const resetForm = () => {
    setSchemaName('');
    setJsonSchema('{}');
    setFields([]);
    setJsonError(null);
    setRawFields('');
    setRawFieldsError(null);
    setCollapsedNodes(new Set());
    setValidationResult(null);
    setSaveMessage('');
  };

  // Function to open modal from LLMTerminal
  const openSchemaModal = (name: string, schema: any) => {
    setSchemaName(name);
    setJsonSchema(JSON.stringify(schema, null, 2));
    setFields(schemaToFields(schema));
    setShowModal(true);
  };

  // On mount, update from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastTab = localStorage.getItem('brhm-last-tab');
      if (lastTab && lastTab !== activeTab) {
        setActiveTab(lastTab);
      }
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('brhm-last-tab', activeTab);
    }
  }, [activeTab]);

    return (
    <div className="w-full h-full">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-gray-100">
          <button
          className={`px-6  text-sm font-medium transition-all relative ${
            activeTab === 'namespace'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('namespace')}
        >
          Namespace
          {activeTab === 'namespace' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>
          )}
            </button>
          
          <button
            className={`px-6 py-2 text-sm font-medium transition-all relative ${
              activeTab === 'schemaService'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('schemaService')}
          >
            Schema Service
            {activeTab === 'schemaService' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>
          )}
                  </button>
        <button
          className={`px-6 py-2 text-sm font-medium transition-all relative ${
            activeTab === 'tables'
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('tables')}
        >
          Tables
          {activeTab === 'tables' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transition-all"></div>
          )}
        </button>
              </div>

      {/* Main Content Container */}
      <div className="max-w-8xl mx-auto w-full relative h-[90vh] overflow-hidden">
        {/* Tab Content */}
        <div className="w-full pt-4">
          {activeTab === 'namespace' && <Namespace />}
          {activeTab === 'schemaService' && <SchemaService />}
          {activeTab === 'tables' && <Tables />}
        </div>
        <LLMTerminal openSchemaModal={openSchemaModal} />
        <SchemaModal
          key={showModal ? schemaName : 'closed'}
          showModal={showModal}
          setShowModal={setShowModal}
          resetForm={resetForm}
          editingSchemaId={null}
          schemaName={schemaName}
          setSchemaName={setSchemaName}
          fields={fields}
          setFields={setFields}
          collapsedNodes={collapsedNodes}
          setCollapsedNodes={setCollapsedNodes}
          rawFields={rawFields}
          setRawFields={setRawFields}
          handleConvertRawFields={() => {}}
          rawFieldsError={rawFieldsError}
          jsonSchema={jsonSchema}
          setJsonSchema={setJsonSchema}
          handleJsonChange={handleJsonChange}
          jsonError={jsonError}
          handleValidate={handleValidate}
          handleSave={handleSave}
          validationResult={validationResult}
          saveMessage={saveMessage}
          NestedFieldsEditor={NestedFieldsEditor}
        />
      </div>
    </div>
  );
};

export default NamespacePage;