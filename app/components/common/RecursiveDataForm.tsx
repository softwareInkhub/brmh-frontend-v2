import React, { useState } from 'react';

// Recursive form for OpenAPI/JSON Schema
export default function RecursiveDataForm({ schema, value, onChange, required = [] }: { schema: any, value: any, onChange: (v: any) => void, required?: string[] }) {
  if (!schema) return null;

  function renderFields(properties: any, required: string[] = [], path: string[] = []) {
    return Object.entries(properties).map(([key, prop]: [string, any]) => {
      const fullPath = [...path, key];
      const v = getValue(value, fullPath);
      const setValue = (val: any) => onChange(setDeepValue({ ...value }, fullPath, val));
      const fieldName = fullPath.join('.');

      // Object
      if (prop.type === 'object' && prop.properties) {
        return (
          <div key={fieldName} className="border rounded p-2 bg-gray-50 mb-2">
            <div className="font-semibold text-xs mb-1">{key} (object)</div>
            {renderFields(prop.properties, prop.required, fullPath)}
          </div>
        );
      }

      // Array
      if (prop.type === 'array' && prop.items) {
        const arr: any[] = Array.isArray(v) ? v : [];
        return (
          <div key={fieldName} className="border rounded p-2 bg-gray-50 mb-2">
            <div className="font-semibold text-xs mb-1">{key} (array)</div>
            {arr.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                {prop.items.type === 'object' && prop.items.properties ? (
                  <div className="flex-1">{renderFields(prop.items.properties, prop.items.required, [...fullPath, idx.toString()])}</div>
                ) : prop.items.enum ? (
                  <select
                    className="border border-gray-300 p-1 rounded w-full text-xs"
                    value={item ?? ''}
                    onChange={e => {
                      const newArr = [...arr];
                      newArr[idx] = e.target.value;
                      setValue(newArr);
                    }}
                  >
                    <option value="">Select...</option>
                    {prop.items.enum.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : prop.items.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={!!item}
                    onChange={e => {
                      const newArr = [...arr];
                      newArr[idx] = e.target.checked;
                      setValue(newArr);
                    }}
                  />
                ) : (
                  <input
                    className="border border-gray-300 p-1 rounded w-full text-xs"
                    type={prop.items.type === 'number' ? 'number' : 'text'}
                    value={item ?? ''}
                    onChange={e => {
                      const newArr = [...arr];
                      newArr[idx] = prop.items.type === 'number' ? Number(e.target.value) : e.target.value;
                      setValue(newArr);
                    }}
                  />
                )}
                <button type="button" className="text-xs text-red-600 px-2" onClick={() => {
                  const newArr = [...arr];
                  newArr.splice(idx, 1);
                  setValue(newArr);
                }}>Remove</button>
              </div>
            ))}
            <button type="button" className="text-xs text-blue-600" onClick={() => setValue([...(arr || []), prop.items.type === 'object' ? {} : prop.items.type === 'boolean' ? false : ''])}>Add Item</button>
          </div>
        );
      }

      // Enum
      if (prop.enum) {
        return (
          <div key={fieldName} className="mb-2">
            <label className="block text-xs font-medium mb-1">{key}</label>
            <select
              className="border border-gray-300 p-2 rounded w-full text-xs"
              value={v ?? ''}
              onChange={e => setValue(e.target.value)}
              required={required?.includes(key)}
            >
              <option value="">Select...</option>
              {prop.enum.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      }

      // Boolean
      if (prop.type === 'boolean') {
        return (
          <div key={fieldName} className="mb-2 flex items-center gap-2">
            <label className="block text-xs font-medium">{key}</label>
            <input
              type="checkbox"
              checked={!!v}
              onChange={e => setValue(e.target.checked)}
            />
          </div>
        );
      }

      // Primitive
      return (
        <div key={fieldName} className="mb-2">
          <label className="block text-xs font-medium mb-1">{key}</label>
          <input
            className="border border-gray-300 p-2 rounded w-full text-xs"
            type={prop.type === 'number' ? 'number' : 'text'}
            value={v ?? ''}
            onChange={e => setValue(prop.type === 'number' ? Number(e.target.value) : e.target.value)}
            required={required?.includes(key)}
            step={prop.type === 'number' ? 'any' : undefined}
            min={prop.minimum}
            max={prop.maximum}
            pattern={prop.pattern}
          />
        </div>
      );
    });
  }

  // Helpers for deep value get/set
  function getValue(obj: any, path: string[]) {
    return path.reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
  }
  function setDeepValue(obj: any, path: string[], value: any) {
    if (path.length === 0) return value;
    const [head, ...rest] = path;
    return {
      ...obj,
      [head]: rest.length === 0 ? value : setDeepValue(obj[head] || (isNaN(Number(rest[0])) ? {} : []), rest, value)
    };
  }

  return <>{schema.properties && renderFields(schema.properties, required)}</>;
} 